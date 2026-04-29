#!/bin/bash

# File Survey Script with SQLite - Analyzes codebase files and generates FILE_SURVEY.md
# Usage: ./file-survey-sqlite.sh [directory] [file_patterns...]
# Example: ./file-survey-sqlite.sh src "*.svelte" "*.ts" "*.js" "*.html"

set -e

# Default values
SURVEY_DIR="${1:-src}"
OUTPUT_FILE="FILE_SURVEY.md"
DB_FILE="file_survey.db"
TEMP_DIR=$(mktemp -d)

# Default file patterns if none provided
if [ $# -lt 2 ]; then
    FILE_PATTERNS=("*.svelte" "*.html" "*.js" "*.ts" "*.jsx" "*.tsx" "*.vue" "*.css" "*.scss")
else
    shift # Remove directory argument
    FILE_PATTERNS=("$@")
fi

echo "🔍 Starting file survey of: $SURVEY_DIR"
echo "📁 Patterns: ${FILE_PATTERNS[*]}"
echo "🗄️  Database: $DB_FILE"
echo "📄 Output: $OUTPUT_FILE"

# Initialize SQLite database
sqlite3 "$DB_FILE" << 'EOF'
CREATE TABLE IF NOT EXISTS file_analysis (
    id INTEGER PRIMARY KEY,
    file_path TEXT UNIQUE,
    relative_path TEXT,
    file_size INTEGER,
    status TEXT DEFAULT 'pending',  -- pending, analyzing, complete, failed
    description TEXT,
    error_message TEXT,
    analyzed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_status ON file_analysis(status);
CREATE INDEX IF NOT EXISTS idx_path ON file_analysis(relative_path);
EOF

echo "📊 Database initialized"

# Function to analyze a single file
analyze_file() {
    local file_path="$1"
    local relative_path="${file_path#./}"
    local file_size=$(stat -f%z "$file_path" 2>/dev/null || stat -c%s "$file_path" 2>/dev/null || echo "0")
    local temp_output="$TEMP_DIR/$(basename "$file_path").analysis"
    
    # Mark as analyzing
    sqlite3 "$DB_FILE" "INSERT OR REPLACE INTO file_analysis (file_path, relative_path, file_size, status) VALUES (?, ?, ?, 'analyzing');" "$file_path" "$relative_path" "$file_size"
    
    echo "📝 Analyzing: $relative_path"
    
    # Create Hermes prompt for file analysis
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

Respond with ONLY the description text, no markdown formatting, no file path repetition.
EOF

    # Run Hermes analysis
    if hermes chat -q "$(cat "$temp_output.prompt")" --quiet > "$temp_output.result" 2>"$temp_output.error"; then
        # Success - update database (use parameterized query to avoid SQL injection)
        local description=$(cat "$temp_output.result")
        sqlite3 "$DB_FILE" "UPDATE file_analysis SET status='complete', description=?, analyzed_at=CURRENT_TIMESTAMP WHERE file_path=?;" "$description" "$file_path"
        echo "✅ Complete: $relative_path"
    else
        # Error - update with error message
        local error_msg=$(cat "$temp_output.error" 2>/dev/null || echo "Analysis failed")
        sqlite3 "$DB_FILE" "UPDATE file_analysis SET status='failed', error_message=?, analyzed_at=CURRENT_TIMESTAMP WHERE file_path=?;" "$error_msg" "$file_path"
        echo "❌ Failed: $relative_path"
    fi
}

# Find and queue files for analysis
echo "🔍 Finding files..."
total_files=0
for pattern in "${FILE_PATTERNS[@]}"; do
    while IFS= read -r -d '' file; do
        if [ -f "$file" ] && [ -s "$file" ]; then  # File exists and is not empty
            relative_path="${file#./}"
            file_size=$(stat -f%z "$file" 2>/dev/null || stat -c%s "$file" 2>/dev/null || echo "0")
            
            # Check if already analyzed
            existing=$(sqlite3 "$DB_FILE" "SELECT status FROM file_analysis WHERE file_path=? AND status='complete';" "$file" || echo "")
            
            if [ -z "$existing" ]; then
                # Queue for analysis (run in background for concurrency)
                analyze_file "$file" &
                ((total_files++))
                
                # Limit to 10 concurrent processes
                if (( total_files % 10 == 0 )); then
                    wait
                fi
            else
                echo "⏭️  Skipping (already analyzed): $relative_path"
            fi
        fi
    done < <(find "$SURVEY_DIR" -name "$pattern" -type f -print0 2>/dev/null)
done

# Wait for all analyses to complete
wait

# Generate markdown report from database
echo "📄 Generating markdown report..."
{
    echo "# File Survey Report"
    echo ""
    echo "> Auto-generated file analysis and descriptions"
    echo ""
    echo "## Overview"
    echo ""
    echo "This document provides a comprehensive overview of all analyzed files in the codebase, with AI-generated descriptions of purpose, functionality, and key features."
    echo ""
    echo "**Generated:** $(date)"
    echo "**Directory:** $SURVEY_DIR"
    echo "**Patterns:** ${FILE_PATTERNS[*]}"
    echo ""
    
    # Get summary stats
    total=$(sqlite3 "$DB_FILE" "SELECT COUNT(*) FROM file_analysis;")
    complete=$(sqlite3 "$DB_FILE" "SELECT COUNT(*) FROM file_analysis WHERE status='complete';")
    failed=$(sqlite3 "$DB_FILE" "SELECT COUNT(*) FROM file_analysis WHERE status='failed';")
    
    echo "**Files Found:** $total | **Analyzed:** $complete | **Failed:** $failed"
    echo ""
    echo "---"
    echo ""
    
    # Output completed analyses
    sqlite3 "$DB_FILE" "SELECT relative_path, description FROM file_analysis WHERE status='complete' ORDER BY relative_path;" | while IFS='|' read -r path desc; do
        echo "### \`$path\`"
        echo ""
        echo "$desc"
        echo ""
        echo "---"
        echo ""
    done
    
    # Output failed analyses
    if [ "$failed" -gt 0 ]; then
        echo "## Failed Analyses"
        echo ""
        sqlite3 "$DB_FILE" "SELECT relative_path, error_message FROM file_analysis WHERE status='failed' ORDER BY relative_path;" | while IFS='|' read -r path error; do
            echo "### \`$path\`"
            echo ""
            echo "*Analysis failed: $error*"
            echo ""
            echo "---"
            echo ""
        done
    fi
    
    echo "## Summary"
    echo ""
    echo "**Total Files:** $total"
    echo "**Successfully Analyzed:** $complete"
    echo "**Failed:** $failed"
    echo "**Database:** $DB_FILE"
    echo "**Generated:** $(date)"
    echo ""
    echo "---"
    echo ""
    echo "*This survey was auto-generated by file-survey-sqlite.sh. Re-run the script to update with new files or retry failed analyses.*"
    
} > "$OUTPUT_FILE"

# Cleanup
rm -rf "$TEMP_DIR"

echo ""
echo "✅ Survey complete!"
echo "📄 Results written to: $OUTPUT_FILE"
echo "🗄️  Database saved to: $DB_FILE"
echo "📊 Stats: $complete/$total files analyzed ($failed failed)"
echo ""
echo "📖 View results:"
echo "   cat $OUTPUT_FILE"
echo "   code $OUTPUT_FILE"
echo ""
echo "🔍 Query database:"
echo "   sqlite3 $DB_FILE \"SELECT * FROM file_analysis WHERE status='complete';\""
echo "   sqlite3 $DB_FILE \"SELECT relative_path, LENGTH(description) as desc_len FROM file_analysis ORDER BY desc_len DESC;\""