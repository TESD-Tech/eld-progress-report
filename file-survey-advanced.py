#!/usr/bin/env python3

"""
Advanced File Survey with Best Practices Validation
Analyzes files using Hermes + ctx7 for comprehensive quality assessment
"""

import sqlite3
import subprocess
import json
import os
import sys
import glob
import re
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor, as_completed
import time

def setup_database(db_file):
    """Initialize SQLite database with schema"""
    conn = sqlite3.connect(db_file)
    conn.execute('''
        CREATE TABLE IF NOT EXISTS files (
            id INTEGER PRIMARY KEY,
            path TEXT UNIQUE,
            relative_path TEXT,
            file_size INTEGER,
            extension TEXT,
            description TEXT,
            ctx7_score REAL,
            ctx7_feedback TEXT,
            ctx7_library TEXT,
            analysis_time REAL,
            status TEXT DEFAULT 'pending',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    conn.commit()
    return conn

def run_hermes_analysis(filepath, prompt):
    """Run Hermes analysis with error handling"""
    try:
        result = subprocess.run([
            'hermes', 'chat', '-q', prompt, '--quiet'
        ], capture_output=True, text=True, timeout=60)
        
        if result.returncode == 0 and result.stdout.strip():
            return result.stdout.strip()
        else:
            return f"Analysis failed: {result.stderr or 'Unknown error'}"
    except subprocess.TimeoutExpired:
        return "Analysis timed out"
    except Exception as e:
        return f"Analysis error: {str(e)}"

def run_ctx7_analysis(filepath, library):
    """Run ctx7 best practices analysis"""
    try:
        # Read first 20 lines of file for ctx7
        with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
            content_preview = ''.join(f.readlines()[:20])
        
        query = f"Analyze this {library} code for best practices violations. Rate 0-100 and provide specific feedback: {content_preview[:1000]}"
        
        result = subprocess.run([
            'npx', 'ctx7', 'library', library, query
        ], capture_output=True, text=True, timeout=30)
        
        if result.returncode == 0:
            return result.stdout.strip()
        else:
            return f"ctx7 analysis failed: {result.stderr}"
    except subprocess.TimeoutExpired:
        return "ctx7 analysis timed out"
    except Exception as e:
        return f"ctx7 error: {str(e)}"

def extract_score_from_text(text):
    """Extract numeric score from text using regex"""
    # Look for patterns like "Score: 85", "85/100", "Rating: 85"
    patterns = [
        r'score[:\s]*(\d+)',
        r'rating[:\s]*(\d+)',
        r'(\d+)/100',
        r'(\d+)\s*out\s*of\s*100',
        r'\b(\d+)\b(?=.*(?:score|rating|points))'
    ]
    
    for pattern in patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            score = int(match.group(1))
            if 0 <= score <= 100:
                return score
    
    # Fallback: look for any number between 0-100
    numbers = re.findall(r'\b(\d+)\b', text)
    for num in numbers:
        score = int(num)
        if 0 <= score <= 100:
            return score
    
    return 50  # Default fallback

def get_ctx7_library(filepath):
    """Determine appropriate ctx7 library based on file extension"""
    ext = os.path.splitext(filepath)[1].lower()
    mapping = {
        '.svelte': 'svelte',
        '.ts': 'typescript',
        '.tsx': 'typescript',
        '.js': 'javascript',
        '.jsx': 'javascript',
        '.css': 'css',
        '.scss': 'css',
        '.html': 'html',
        '.vue': 'vue'
    }
    return mapping.get(ext, 'javascript')

def analyze_file(filepath, db_file):
    """Analyze a single file with description and best practices"""
    # Create new connection for this thread
    conn = sqlite3.connect(db_file)
    
    relative_path = os.path.relpath(filepath)
    file_size = os.path.getsize(filepath)
    extension = os.path.splitext(filepath)[1]
    ctx7_library = get_ctx7_library(filepath)
    
    start_time = time.time()
    
    print(f"📝 Analyzing: {relative_path}")
    
    # Insert file record
    conn.execute('''
        INSERT OR REPLACE INTO files 
        (path, relative_path, file_size, extension, ctx7_library, status) 
        VALUES (?, ?, ?, ?, ?, 'analyzing')
    ''', (filepath, relative_path, file_size, extension, ctx7_library))
    conn.commit()
    
    try:
        # Step 1: Get file description
        with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
            content = f.read()
        
        description_prompt = f"""Analyze this file and provide a brief description (1-2 sentences).
        
Focus on:
- Primary purpose and functionality
- Key components or exports
- Role in the application

File: {relative_path}
Content:
---
{content[:2000]}
---

Respond with ONLY the description text, no formatting:"""

        description = run_hermes_analysis(filepath, description_prompt)
        
        # Step 2: Get ctx7 best practices analysis
        ctx7_raw = run_ctx7_analysis(filepath, ctx7_library)
        
        # Step 3: Extract score from ctx7 response
        score_prompt = f"""Extract a numeric score (0-100) for code quality from this analysis:

{ctx7_raw[:1000]}

Return ONLY the number (0-100):"""
        
        score_text = run_hermes_analysis(filepath, score_prompt)
        score = extract_score_from_text(score_text + " " + ctx7_raw)
        
        analysis_time = time.time() - start_time
        
        # Update database
        conn.execute('''
            UPDATE files SET 
            description=?, ctx7_score=?, ctx7_feedback=?, analysis_time=?, status='complete'
            WHERE path=?
        ''', (description, score, ctx7_raw[:1000], analysis_time, filepath))
        conn.commit()
        
        print(f"✅ Complete: {relative_path} (Score: {score}/100, {analysis_time:.1f}s)")
        conn.close()
        return True
        
    except Exception as e:
        print(f"❌ Failed: {relative_path} - {str(e)}")
        conn.execute('UPDATE files SET status=? WHERE path=?', ('failed', filepath))
        conn.commit()
        conn.close()
        return False

def generate_report(db_file, output_file, survey_dir, patterns):
    """Generate markdown report from database"""
    conn = sqlite3.connect(db_file)
    
    # Get stats
    total = conn.execute('SELECT COUNT(*) FROM files').fetchone()[0]
    complete = conn.execute('SELECT COUNT(*) FROM files WHERE status="complete"').fetchone()[0]
    
    avg_score_result = conn.execute('SELECT AVG(ctx7_score) FROM files WHERE ctx7_score IS NOT NULL').fetchone()[0]
    avg_score = round(avg_score_result, 1) if avg_score_result else "N/A"
    
    with open(output_file, 'w') as f:
        f.write(f"""# Advanced File Survey Report

> Auto-generated analysis with AI descriptions and best practices validation

## Overview

Comprehensive file analysis combining Hermes AI descriptions with ctx7 best practices validation.

**Generated:** {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
**Directory:** {survey_dir}
**Patterns:** {', '.join(patterns)}

**Files:** {complete}/{total} analyzed | **Average Score:** {avg_score}/100

---

## 🏆 Top Performing Files

""")
        
        # Top performers
        top_files = conn.execute('''
            SELECT relative_path, ctx7_score 
            FROM files 
            WHERE status='complete' AND ctx7_score IS NOT NULL 
            ORDER BY ctx7_score DESC 
            LIMIT 5
        ''').fetchall()
        
        for path, score in top_files:
            f.write(f"- **`{path}`** - {score}/100\n")
        
        f.write("""
## ⚠️ Files Needing Attention

""")
        
        # Files needing attention
        low_files = conn.execute('''
            SELECT relative_path, ctx7_score 
            FROM files 
            WHERE status='complete' AND ctx7_score IS NOT NULL AND ctx7_score < 70
            ORDER BY ctx7_score ASC
        ''').fetchall()
        
        for path, score in low_files:
            f.write(f"- **`{path}`** - {score}/100\n")
        
        f.write("""
---

## 📋 Detailed Analysis

""")
        
        # Detailed file analysis
        files = conn.execute('''
            SELECT relative_path, description, ctx7_score, ctx7_feedback, analysis_time
            FROM files 
            WHERE status='complete' 
            ORDER BY relative_path
        ''').fetchall()
        
        for path, desc, score, feedback, analysis_time in files:
            f.write(f"""### `{path}`

**Best Practices Score:** {score or 'N/A'}/100 | **Analysis Time:** {analysis_time or 'N/A:.1f'}s

{desc}

""")
            if feedback and len(feedback.strip()) > 10:
                f.write(f"**ctx7 Feedback:** {feedback[:300]}{'...' if len(feedback) > 300 else ''}\n\n")
            
            f.write("---\n\n")
    
    conn.close()

def main():
    if len(sys.argv) < 2:
        survey_dir = "src"
        patterns = ["*.svelte", "*.ts", "*.js"]
    else:
        survey_dir = sys.argv[1]
        patterns = sys.argv[2:] if len(sys.argv) > 2 else ["*.svelte", "*.ts", "*.js"]
    
    db_file = "file_survey_advanced.db"
    output_file = "FILE_SURVEY_ADVANCED.md"
    
    print("🔍 Advanced File Survey with Best Practices Validation")
    print(f"📁 Directory: {survey_dir}")
    print(f"🎯 Patterns: {', '.join(patterns)}")
    print(f"🗄️  Database: {db_file}")
    print(f"📄 Output: {output_file}")
    
    # Setup database
    conn = setup_database(db_file)
    
    # Find files
    all_files = []
    for pattern in patterns:
        files = glob.glob(os.path.join(survey_dir, "**", pattern), recursive=True)
        all_files.extend(files)
    
    all_files = [f for f in all_files if os.path.isfile(f) and os.path.getsize(f) > 0]
    
    print(f"🔍 Found {len(all_files)} files")
    
    # Filter out already analyzed files
    existing = {row[0] for row in conn.execute('SELECT path FROM files WHERE status="complete"').fetchall()}
    to_analyze = [f for f in all_files if f not in existing]
    
    if len(to_analyze) < len(all_files):
        print(f"⏭️  Skipping {len(all_files) - len(to_analyze)} already analyzed files")
    
    # Analyze files with controlled concurrency
    success_count = 0
    max_workers = 3  # Limit concurrent analyses
    
    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        future_to_file = {executor.submit(analyze_file, filepath, db_file): filepath 
                         for filepath in to_analyze}
        
        for future in as_completed(future_to_file):
            if future.result():
                success_count += 1
    
    conn.close()
    
    # Generate report
    print("📄 Generating comprehensive report...")
    generate_report(db_file, output_file, survey_dir, patterns)
    
    print(f"""
✅ Advanced survey complete!
📄 Report: {output_file}
🗄️  Database: {db_file}
📊 Successfully analyzed: {success_count}/{len(to_analyze)} files

🔍 Database queries:
   sqlite3 {db_file} "SELECT relative_path, ctx7_score FROM files WHERE status='complete' ORDER BY ctx7_score DESC;"
   sqlite3 {db_file} "SELECT AVG(ctx7_score) as avg_score FROM files WHERE ctx7_score IS NOT NULL;"

📖 View results: cat {output_file}
""")

if __name__ == "__main__":
    main()