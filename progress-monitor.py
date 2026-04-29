#!/usr/bin/env python3

"""
Progress Monitor for Advanced File Survey
Shows real-time progress of file analysis
"""

import sqlite3
import time
import os
import sys
from datetime import datetime, timedelta

def show_progress(db_file, refresh_interval=5):
    """Show real-time progress of file analysis"""
    
    if not os.path.exists(db_file):
        print(f"❌ Database not found: {db_file}")
        return
    
    print("📊 Real-time File Survey Progress Monitor")
    print("Press Ctrl+C to exit\n")
    
    try:
        while True:
            conn = sqlite3.connect(db_file)
            
            # Get overall stats
            total = conn.execute('SELECT COUNT(*) FROM files').fetchone()[0]
            if total == 0:
                print("⏳ No files found yet...")
                time.sleep(refresh_interval)
                continue
                
            complete = conn.execute('SELECT COUNT(*) FROM files WHERE status="complete"').fetchone()[0]
            analyzing = conn.execute('SELECT COUNT(*) FROM files WHERE status="analyzing"').fetchone()[0]
            failed = conn.execute('SELECT COUNT(*) FROM files WHERE status="failed"').fetchone()[0]
            pending = total - complete - analyzing - failed
            
            # Get timing stats
            timing = conn.execute('''
                SELECT 
                    AVG(analysis_time) as avg_time,
                    MIN(analysis_time) as min_time,
                    MAX(analysis_time) as max_time
                FROM files WHERE analysis_time IS NOT NULL
            ''').fetchone()
            
            avg_time = timing[0] or 0
            min_time = timing[1] or 0
            max_time = timing[2] or 0
            
            # Calculate ETA
            remaining = analyzing + pending
            eta_seconds = remaining * avg_time if avg_time > 0 else 0
            eta = datetime.now() + timedelta(seconds=eta_seconds)
            
            # Get current scores
            scores = conn.execute('''
                SELECT AVG(ctx7_score), MIN(ctx7_score), MAX(ctx7_score)
                FROM files WHERE ctx7_score IS NOT NULL
            ''').fetchone()
            
            avg_score = scores[0] or 0
            min_score = scores[1] or 0
            max_score = scores[2] or 0
            
            # Clear screen and show progress
            os.system('clear' if os.name == 'posix' else 'cls')
            
            print("📊 File Survey Progress Monitor")
            print("=" * 50)
            print(f"🕐 Updated: {datetime.now().strftime('%H:%M:%S')}")
            print()
            
            # Progress bar
            if total > 0:
                progress = complete / total
                bar_width = 30
                filled = int(progress * bar_width)
                bar = "█" * filled + "░" * (bar_width - filled)
                print(f"📋 Overall Progress: [{bar}] {complete}/{total} ({progress:.1%})")
            
            print()
            print("📈 Status Breakdown:")
            print(f"  ✅ Complete:   {complete:2d} files")
            print(f"  🔄 Analyzing:  {analyzing:2d} files") 
            print(f"  ⏳ Pending:    {pending:2d} files")
            if failed > 0:
                print(f"  ❌ Failed:     {failed:2d} files")
            
            print()
            if avg_time > 0:
                print("⏱️  Timing Stats:")
                print(f"  Average: {avg_time:.1f}s per file")
                print(f"  Range:   {min_time:.1f}s - {max_time:.1f}s")
                if eta_seconds > 0:
                    print(f"  ETA:     {eta.strftime('%H:%M:%S')} (~{eta_seconds/60:.1f} min remaining)")
            
            print()
            if complete > 0:
                print("🎯 Quality Scores:")
                print(f"  Average: {avg_score:.1f}/100")
                print(f"  Range:   {min_score:.1f} - {max_score:.1f}")
            
            # Show currently analyzing files
            if analyzing > 0:
                print()
                print("🔄 Currently Analyzing:")
                current = conn.execute('''
                    SELECT relative_path, 
                           (julianday('now') - julianday(created_at)) * 86400 as elapsed
                    FROM files 
                    WHERE status="analyzing"
                    ORDER BY created_at
                ''').fetchall()
                
                for path, elapsed in current:
                    print(f"  📝 {path:<40} ({elapsed:.1f}s elapsed)")
            
            # Show recent completions
            if complete > 0:
                print()
                print("✅ Recent Completions:")
                recent = conn.execute('''
                    SELECT relative_path, ctx7_score, ROUND(analysis_time, 1) as time_sec
                    FROM files 
                    WHERE status="complete" 
                    ORDER BY created_at DESC 
                    LIMIT 5
                ''').fetchall()
                
                for path, score, time_sec in recent:
                    score_str = f"{score}/100" if score else "N/A"
                    print(f"  ✅ {path:<40} {score_str:>6} ({time_sec}s)")
            
            conn.close()
            
            # Check if done
            if analyzing == 0 and pending == 0:
                print()
                print("🎉 Analysis Complete! Generating final report...")
                break
                
            time.sleep(refresh_interval)
            
    except KeyboardInterrupt:
        print("\n\n⏹️  Progress monitoring stopped")
        print(f"📊 Final status: {complete}/{total} files complete")

if __name__ == "__main__":
    db_file = sys.argv[1] if len(sys.argv) > 1 else "file_survey_advanced.db"
    refresh_interval = int(sys.argv[2]) if len(sys.argv) > 2 else 3
    
    show_progress(db_file, refresh_interval)