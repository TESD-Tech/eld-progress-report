#!/bin/bash

# Advanced File Survey with Best Practices Validation
# Uses Hermes for descriptions + ctx7 for section-based best practices analysis
# Usage: ./file-survey-advanced.sh [directory] [file_patterns...]

set -e

# Default values
SURVEY_DIR="${1:-src}"
OUTPUT_FILE="FILE_SURVEY_ADVANCED.md"
DB_FILE="file_survey_advanced.db"
TEMP_DIR=$(mktemp -d)

# Default file patterns if none provided
if [ $# -lt 2 ]; then
    FILE_PATTERNS=("*.svelte" "*.html" "*.js" "*.ts" "*.jsx" "*.tsx" "*.vue" "*.css" "*.scss")
else
    shift # Remove directory argument
    FILE_PATTERNS=("$@")
fi

echo "🔍 Advanced File Survey with Best Practices Validation"
echo "📁 Directory: $SURVEY_DIR"
echo "🎯 Patterns: ${FILE_PATTERNS[*]}"
echo "🗄️  Database: $DB_FILE"
echo "📄 Output: $OUTPUT_FILE"

# Initialize SQLite database with enhanced schema
sqlite3 "$DB_FILE" << 'EOF'
CREATE TABLE IF NOT EXISTS file_analysis (
    id INTEGER PRIMARY KEY,
    file_path TEXT UNIQUE,
    relative_path TEXT,
    file_size INTEGER,
    file_extension TEXT,
    status TEXT DEFAULT 'pending',  -- pending, analyzing, complete, failed
    description TEXT,
    error_message TEXT,
    analyzed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS file_sections (
    id INTEGER PRIMARY KEY,
    file_id INTEGER,
    section_type TEXT,  -- imports, exports, component, function, style, etc.
    section_content TEXT,
    line_start INTEGER,
    line_end INTEGER,
    status TEXT DEFAULT 'pending',
    best_practices_score REAL,
    best_practices_feedback TEXT,
    ctx7_library TEXT,
    analyzed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (file_id) REFERENCES file_analysis(id)
);

CREATE TABLE IF NOT EXISTS best_practices_summary (
    id INTEGER PRIMARY KEY,
    file_id INTEGER,
    overall_score REAL,
    total_sections INTEGER,
    sections_analyzed INTEGER,
    top_issues TEXT,
    recommendations TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (file_id) REFERENCES file_analysis(id)
);

CREATE INDEX IF NOT EXISTS idx_file_status ON file_analysis(status);
CREATE INDEX IF NOT EXISTS idx_file_path ON file_analysis(relative_path);
CREATE INDEX IF NOT EXISTS idx_section_status ON file_sections(status);
CREATE INDEX IF NOT EXISTS idx_section_type ON file_sections(section_type);
EOF

echo "📊 Enhanced database initialized"

# Function to detect file sections using intelligent parsing
detect_file_sections() {
    local file_path="$1"
    local file_id="$2"
    local temp_output="$TEMP_DIR/sections_$(basename "$file_path")"
    
    echo "🔍 Detecting sections in: ${file_path#./}"
    
    # Use Hermes to intelligently parse file structure
    cat > "$temp_output.prompt" << EOF
Analyze this file and break it down into logical sections for best practices validation.

For each section, return ONLY a JSON array with objects containing:
- section_type: (imports, exports, component_props, component_logic, functions, styles, tests, config, etc.)
- line_start: starting line number
- line_end: ending line number  
- content: the actual code/content for that section

Focus on meaningful sections that can be validated for best practices. Be precise with line numbers.

File: $file_path
Content:
---
$(cat "$file_path" | nl -nln)
---

Return ONLY the JSON array, no other text:
EOF

    if hermes chat -q "$(cat "$temp_output.prompt")" --quiet > "$temp_output.result" 2>/dev/null; then
        # Parse JSON response and insert sections
        local sections_json=$(cat "$temp_output.result")
        echo "✅ Sections detected for: ${file_path#./}"
        
        # Use Python to parse JSON and insert into database
        python3 << EOF
import json
import sqlite3
import sys

try:
    sections = json.loads('''$sections_json''')
    conn = sqlite3.connect('$DB_FILE')
    
    for section in sections:
        conn.execute('''
            INSERT INTO file_sections (file_id, section_type, section_content, line_start, line_end)
            VALUES (?, ?, ?, ?, ?)
        ''', (
            $file_id,
            section.get('section_type', 'unknown'),
            section.get('content', ''),
            section.get('line_start', 0),
            section.get('line_end', 0)
        ))
    
    conn.commit()
    conn.close()
    print(f"Inserted {len(sections)} sections for file ID $file_id")
    
except Exception as e:
    print(f"Error parsing sections: {e}", file=sys.stderr)
    # Fallback: create single section for whole file
    conn = sqlite3.connect('$DB_FILE')
    conn.execute('''
        INSERT INTO file_sections (file_id, section_type, section_content, line_start, line_end)
        VALUES (?, ?, ?, ?, ?)
    ''', ($file_id, 'entire_file', open('$file_path').read(), 1, len(open('$file_path').readlines())))
    conn.commit()
    conn.close()
EOF
    else
        echo "❌ Failed to detect sections for: ${file_path#./}"
        # Fallback: create single section for whole file
        local content=$(cat "$file_path")
        local total_lines=$(wc -l < "$file_path")
        sqlite3 "$DB_FILE" "INSERT INTO file_sections (file_id, section_type, section_content, line_start, line_end) VALUES (?, 'entire_file', ?, 1, ?);" "$file_id" "$content" "$total_lines"
    fi
}

# Function to validate section with ctx7
validate_section_with_ctx7() {
    local section_id="$1"
    local section_type="$2"
    local section_content="$3"
    local file_extension="$4"
    local temp_output="$TEMP_DIR/validation_${section_id}"
    
    echo "🎯 Validating $section_type section (ID: $section_id)"
    
    # Determine appropriate ctx7 library based on file extension
    local ctx7_library=""
    case "$file_extension" in
        .svelte) ctx7_library="svelte" ;;
        .ts|.tsx) ctx7_library="typescript" ;;
        .js|.jsx) ctx7_library="javascript" ;;
        .css|.scss) ctx7_library="css" ;;
        .html) ctx7_library="html" ;;
        *) ctx7_library="javascript" ;;  # default fallback
    esac
    
    # Create ctx7 query for best practices validation
    local ctx7_query="Analyze this $section_type code section for best practices violations and provide a score 0-100 with specific feedback:"
    
    # Save section content to temp file for ctx7
    echo "$section_content" > "$temp_output.code"
    
    # Query ctx7 for best practices (with timeout)
    if timeout 30 npx ctx7 library "$ctx7_library" "$ctx7_query $(head -20 "$temp_output.code")" > "$temp_output.ctx7" 2>/dev/null; then
        # Use Hermes to extract score and feedback from ctx7 response
        cat > "$temp_output.parse" << EOF
Extract best practices information from this ctx7 response:

$(cat "$temp_output.ctx7")

Return ONLY a JSON object with:
{
  "score": (number 0-100),
  "feedback": "concise summary of issues and recommendations",
  "top_issue": "most critical issue if any"
}

No other text, just the JSON:
EOF

        if hermes chat -q "$(cat "$temp_output.parse")" --quiet > "$temp_output.parsed" 2>/dev/null; then
            # Parse the response and update database
            python3 << EOF
import json
import sqlite3
import sys

try:
    result = json.loads(open('$temp_output.parsed').read().strip())
    
    conn = sqlite3.connect('$DB_FILE')
    conn.execute('''
        UPDATE file_sections 
        SET status='complete', 
            best_practices_score=?, 
            best_practices_feedback=?, 
            ctx7_library=?,
            analyzed_at=CURRENT_TIMESTAMP 
        WHERE id=?
    ''', (
        result.get('score', 0),
        result.get('feedback', ''),
        '$ctx7_library',
        $section_id
    ))
    conn.commit()
    conn.close()
    print(f"✅ Section {$section_id} scored: {result.get('score', 0)}/100")
    
except Exception as e:
    print(f"❌ Failed to parse validation for section {$section_id}: {e}")
    # Mark as failed
    conn = sqlite3.connect('$DB_FILE')
    conn.execute('UPDATE file_sections SET status=? WHERE id=?', ('failed', $section_id))
    conn.commit()
    conn.close()
EOF
        else
            echo "❌ Failed to parse ctx7 response for section $section_id"
            sqlite3 "$DB_FILE" "UPDATE file_sections SET status='failed' WHERE id=?;" "$section_id"
        fi
    else
        echo "❌ ctx7 query failed for section $section_id"
        sqlite3 "$DB_FILE" "UPDATE file_sections SET status='failed' WHERE id=?;" "$section_id"
    fi
}

# Function to analyze a single file (description + sections)
analyze_file() {
    local file_path="$1"
    local relative_path="${file_path#./}"
    local file_size=$(stat -f%z "$file_path" 2>/dev/null || stat -c%s "$file_path" 2>/dev/null || echo "0")
    local file_extension="${file_path##*.}"
    local temp_output="$TEMP_DIR/$(basename "$file_path").analysis"
    
    # Insert file record and get ID
    sqlite3 "$DB_FILE" "INSERT OR REPLACE INTO file_analysis (file_path, relative_path, file_size, file_extension, status) VALUES (?, ?, ?, ?, 'analyzing');" "$file_path" "$relative_path" "$file_size" ".$file_extension"
    
    local file_id=$(sqlite3 "$DB_FILE" "SELECT id FROM file_analysis WHERE file_path=?;" "$file_path")
    
    echo "📝 Analyzing: $relative_path (ID: $file_id)"
    
    # Step 1: Get file description with Hermes
    cat > "$temp_output.prompt" << EOF
Analyze this file and provide a brief, focused description (2-3 sentences max).

Focus on:
- Primary purpose/functionality  
- Key components or exports
- Role in the application

File: $relative_path
Content:
---
$(cat "$file_path")
---

Respond with ONLY the description text, no markdown formatting:
EOF

    if hermes chat -q "$(cat "$temp_output.prompt")" --quiet > "$temp_output.result" 2>/dev/null; then
        local description=$(cat "$temp_output.result")
        sqlite3 "$DB_FILE" "UPDATE file_analysis SET description=? WHERE id=?;" "$description" "$file_id"
        echo "✅ Description complete: $relative_path"
    else
        echo "❌ Description failed: $relative_path"
    fi
    
    # Step 2: Detect and analyze sections
    detect_file_sections "$file_path" "$file_id"
    
    # Step 3: Validate each section with ctx7
    sqlite3 "$DB_FILE" "SELECT id, section_type, section_content FROM file_sections WHERE file_id=? AND status='pending';" "$file_id" | while IFS='|' read -r section_id section_type section_content; do
        validate_section_with_ctx7 "$section_id" "$section_type" "$section_content" ".$file_extension" &
        
        # Limit concurrent validations
        if (( $(jobs -r | wc -l) >= 5 )); then
            wait
        fi
    done
    
    # Wait for all validations to complete
    wait
    
    # Step 4: Calculate overall best practices score
    sqlite3 "$DB_FILE" << EOF
INSERT OR REPLACE INTO best_practices_summary (file_id, overall_score, total_sections, sections_analyzed, created_at)
SELECT 
    $file_id,
    ROUND(AVG(best_practices_score), 2) as overall_score,
    COUNT(*) as total_sections,
    COUNT(CASE WHEN status='complete' THEN 1 END) as sections_analyzed,
    CURRENT_TIMESTAMP
FROM file_sections 
WHERE file_id=$file_id;
EOF
    
    sqlite3 "$DB_FILE" "UPDATE file_analysis SET status='complete', analyzed_at=CURRENT_TIMESTAMP WHERE id=?;" "$file_id"
    echo "✅ Complete: $relative_path"
}

# Find and analyze files
echo "🔍 Finding files..."
total_files=0

for pattern in "${FILE_PATTERNS[@]}"; do
    while IFS= read -r -d '' file; do
        if [ -f "$file" ] && [ -s "$file" ]; then
            # Check if already analyzed
            existing=$(sqlite3 "$DB_FILE" "SELECT status FROM file_analysis WHERE file_path=? AND status='complete';" "$file" || echo "")
            
            if [ -z "$existing" ]; then
                analyze_file "$file" &
                ((total_files++))
                
                # Limit concurrent file analyses
                if (( total_files % 3 == 0 )); then
                    wait
                fi
            else
                echo "⏭️  Skipping (already analyzed): ${file#./}"
            fi
        fi
    done < <(find "$SURVEY_DIR" -name "$pattern" -type f -print0 2>/dev/null)
done

# Wait for all analyses to complete
wait

# Generate comprehensive report
echo "📄 Generating advanced report with best practices analysis..."

{
    echo "# Advanced File Survey Report"
    echo ""
    echo "> Auto-generated file analysis with best practices validation"
    echo ""
    echo "## Overview"
    echo ""
    echo "This document provides comprehensive analysis of all files including AI-generated descriptions and section-by-section best practices validation using ctx7."
    echo ""
    echo "**Generated:** $(date)"
    echo "**Directory:** $SURVEY_DIR"
    echo "**Patterns:** ${FILE_PATTERNS[*]}"
    echo ""
    
    # Get summary stats
    total=$(sqlite3 "$DB_FILE" "SELECT COUNT(*) FROM file_analysis;")
    complete=$(sqlite3 "$DB_FILE" "SELECT COUNT(*) FROM file_analysis WHERE status='complete';")
    total_sections=$(sqlite3 "$DB_FILE" "SELECT COUNT(*) FROM file_sections;")
    validated_sections=$(sqlite3 "$DB_FILE" "SELECT COUNT(*) FROM file_sections WHERE status='complete';")
    avg_score=$(sqlite3 "$DB_FILE" "SELECT ROUND(AVG(overall_score), 2) FROM best_practices_summary WHERE overall_score IS NOT NULL;")
    
    echo "**Files:** $complete/$total analyzed | **Sections:** $validated_sections/$total_sections validated | **Avg Score:** ${avg_score:-N/A}/100"
    echo ""
    echo "---"
    echo ""
    
    # Top scoring files
    echo "## 🏆 Top Performing Files"
    echo ""
    sqlite3 "$DB_FILE" "
    SELECT 
        fa.relative_path,
        bps.overall_score,
        bps.sections_analyzed || '/' || bps.total_sections as sections
    FROM file_analysis fa 
    JOIN best_practices_summary bps ON fa.id = bps.file_id 
    WHERE bps.overall_score IS NOT NULL 
    ORDER BY bps.overall_score DESC 
    LIMIT 5;" | while IFS='|' read -r path score sections; do
        echo "- **\`$path\`** - Score: $score/100 (${sections} sections)"
    done
    echo ""
    
    # Files needing attention
    echo "## ⚠️ Files Needing Attention"
    echo ""
    sqlite3 "$DB_FILE" "
    SELECT 
        fa.relative_path,
        bps.overall_score,
        bps.sections_analyzed || '/' || bps.total_sections as sections
    FROM file_analysis fa 
    JOIN best_practices_summary bps ON fa.id = bps.file_id 
    WHERE bps.overall_score IS NOT NULL AND bps.overall_score < 70
    ORDER BY bps.overall_score ASC;" | while IFS='|' read -r path score sections; do
        echo "- **\`$path\`** - Score: $score/100 (${sections} sections)"
    done
    echo ""
    echo "---"
    echo ""
    
    # Detailed file analysis
    echo "## 📋 Detailed Analysis"
    echo ""
    
    sqlite3 "$DB_FILE" "
    SELECT 
        fa.relative_path,
        fa.description,
        COALESCE(bps.overall_score, 'Not scored') as score,
        COALESCE(bps.sections_analyzed, 0) || '/' || COALESCE(bps.total_sections, 0) as sections
    FROM file_analysis fa 
    LEFT JOIN best_practices_summary bps ON fa.id = bps.file_id 
    WHERE fa.status='complete' 
    ORDER BY fa.relative_path;" | while IFS='|' read -r path description score sections; do
        echo "### \`$path\`"
        echo ""
        echo "**Best Practices Score:** $score/100 ($sections sections analyzed)"
        echo ""
        echo "$description"
        echo ""
        
        # Show section details if scored
        if [[ "$score" != "Not scored" ]]; then
            sqlite3 "$DB_FILE" "
            SELECT section_type, best_practices_score, best_practices_feedback 
            FROM file_sections 
            WHERE file_id=(SELECT id FROM file_analysis WHERE relative_path='$path') 
            AND status='complete' 
            ORDER BY best_practices_score ASC;" | while IFS='|' read -r sec_type sec_score sec_feedback; do
                echo "- **$sec_type:** $sec_score/100 - $sec_feedback"
            done
            echo ""
        fi
        
        echo "---"
        echo ""
    done
    
} > "$OUTPUT_FILE"

# Cleanup
rm -rf "$TEMP_DIR"

echo ""
echo "✅ Advanced survey complete!"
echo "📄 Report: $OUTPUT_FILE"
echo "🗄️  Database: $DB_FILE"
echo "📊 Stats: $complete/$total files, $validated_sections/$total_sections sections, avg score: ${avg_score:-N/A}/100"
echo ""
echo "🔍 Database queries:"
echo "   sqlite3 $DB_FILE \"SELECT relative_path, overall_score FROM file_analysis fa JOIN best_practices_summary bps ON fa.id=bps.file_id ORDER BY overall_score DESC;\""