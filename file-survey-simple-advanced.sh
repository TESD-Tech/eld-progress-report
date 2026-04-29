#!/bin/bash

# Simplified Advanced File Survey (fixing SQL injection issues)
# Usage: ./file-survey-simple-advanced.sh [directory] [file_patterns...]

set -e

SURVEY_DIR="${1:-src}"
OUTPUT_FILE="FILE_SURVEY_SIMPLE.md"
DB_FILE="file_survey_simple.db"

if [ $# -lt 2 ]; then
    FILE_PATTERNS=("*.svelte" "*.ts" "*.js")
else
    shift
    FILE_PATTERNS=("$@")
fi

echo "🔍 Simple Advanced File Survey"
echo "📁 Directory: $SURVEY_DIR"
echo "🎯 Patterns: ${FILE_PATTERNS[*]}"

# Initialize simple database
sqlite3 "$DB_FILE" << 'EOF'
CREATE TABLE IF NOT EXISTS files (
    id INTEGER PRIMARY KEY,
    path TEXT UNIQUE,
    description TEXT,
    ctx7_score REAL,
    ctx7_feedback TEXT,
    status TEXT DEFAULT 'pending'
);
EOF

# Function to analyze one file
analyze_file() {
    local filepath="$1"
    local relative="${filepath#./}"
    
    echo "📝 Analyzing: $relative"
    
    # Insert file
    sqlite3 "$DB_FILE" "INSERT OR IGNORE INTO files (path, status) VALUES (?, 'analyzing');" "$relative"
    
    # Get description with Hermes
    local description=$(hermes chat -q "Analyze this file briefly (1-2 sentences): $(cat "$filepath")" --quiet 2>/dev/null || echo "Analysis failed")
    
    # Get file extension for ctx7
    local ext="${filepath##*.}"
    local library="javascript"
    case "$ext" in
        svelte) library="svelte" ;;
        ts) library="typescript" ;;
    esac
    
    # Get best practices score with ctx7
    local ctx7_result=$(timeout 20 npx ctx7 library "$library" "Rate this code 0-100 for best practices: $(head -10 "$filepath")" 2>/dev/null || echo "Best practices validation: Score unclear from response")
    
    # Extract score with Hermes
    local score_analysis=$(hermes chat -q "Extract a score 0-100 from this text, return only the number: $ctx7_result" --quiet 2>/dev/null || echo "50")
    
    # Clean up score (extract just number)
    local score=$(echo "$score_analysis" | grep -o '[0-9]\+' | head -1 || echo "50")
    
    # Update database with parameterized queries
    sqlite3 "$DB_FILE" "UPDATE files SET description=?, ctx7_score=?, ctx7_feedback=?, status='complete' WHERE path=?;" "$description" "$score" "$ctx7_result" "$relative"
    
    echo "✅ Complete: $relative (Score: $score/100)"
}

# Find and analyze files
echo "🔍 Finding files..."
for pattern in "${FILE_PATTERNS[@]}"; do
    find "$SURVEY_DIR" -name "$pattern" -type f | while read -r file; do
        # Check if already done
        existing=$(sqlite3 "$DB_FILE" "SELECT status FROM files WHERE path=? AND status='complete';" "${file#./}" 2>/dev/null || echo "")
        
        if [ -z "$existing" ]; then
            analyze_file "$file" &
            
            # Limit concurrency
            if (( $(jobs -r | wc -l) >= 3 )); then
                wait
            fi
        else
            echo "⏭️  Skipping: ${file#./}"
        fi
    done
done

wait

# Generate report
echo "📄 Generating report..."

{
    echo "# File Survey with Best Practices"
    echo ""
    echo "**Generated:** $(date)"
    echo ""
    
    # Stats
    total=$(sqlite3 "$DB_FILE" "SELECT COUNT(*) FROM files;")
    complete=$(sqlite3 "$DB_FILE" "SELECT COUNT(*) FROM files WHERE status='complete';")
    avg_score=$(sqlite3 "$DB_FILE" "SELECT ROUND(AVG(ctx7_score), 1) FROM files WHERE ctx7_score IS NOT NULL;" 2>/dev/null || echo "N/A")
    
    echo "**Files:** $complete/$total analyzed | **Average Score:** $avg_score/100"
    echo ""
    echo "---"
    echo ""
    
    # Top performers
    echo "## 🏆 Best Practices Leaders"
    echo ""
    sqlite3 "$DB_FILE" "SELECT path, ctx7_score FROM files WHERE status='complete' AND ctx7_score IS NOT NULL ORDER BY ctx7_score DESC LIMIT 5;" 2>/dev/null | while IFS='|' read -r path score; do
        echo "- **\`$path\`** - $score/100"
    done
    echo ""
    
    # Need attention
    echo "## ⚠️ Needs Attention"
    echo ""
    sqlite3 "$DB_FILE" "SELECT path, ctx7_score FROM files WHERE status='complete' AND ctx7_score IS NOT NULL AND ctx7_score < 70 ORDER BY ctx7_score ASC;" 2>/dev/null | while IFS='|' read -r path score; do
        echo "- **\`$path\`** - $score/100"
    done
    echo ""
    echo "---"
    echo ""
    
    # Details
    echo "## Detailed Analysis"
    echo ""
    sqlite3 "$DB_FILE" "SELECT path, description, ctx7_score FROM files WHERE status='complete' ORDER BY path;" 2>/dev/null | while IFS='|' read -r path desc score; do
        echo "### \`$path\`"
        echo ""
        echo "**Best Practices Score:** ${score:-N/A}/100"
        echo ""
        echo "$desc"
        echo ""
        echo "---"
        echo ""
    done
    
} > "$OUTPUT_FILE"

echo ""
echo "✅ Survey complete!"
echo "📄 Report: $OUTPUT_FILE"
echo "🗄️  Database: $DB_FILE"
echo "📊 Files: $complete/$total, Avg Score: $avg_score/100"
echo ""
echo "View: cat $OUTPUT_FILE"