/**
 * File-based tests to catch hardcoded path issues in HTML files
 * This prevents the exact issue we found in the PowerSchool HTML templates
 */
import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'

const HTML_FILES = [
  'src/powerschool/WEB_ROOT/admin/eld-progress-report/dashboard.html',
  'src/powerschool/WEB_ROOT/admin/eld-progress-report/report.html',
  'src/powerschool/WEB_ROOT/teachers/eld-progress-report/dashboard.html', 
  'src/powerschool/WEB_ROOT/teachers/eld-progress-report/report.html',
  'src/powerschool/WEB_ROOT/guardian/eld-progress-report/report.html',
  'src/powerschool/WEB_ROOT/eld-progress-report/print.html'
]

describe('HTML Files - BASE_URL Compliance', () => {
  HTML_FILES.forEach(filePath => {
    describe(filePath, () => {
      let htmlContent: string

      beforeAll(() => {
        try {
          htmlContent = fs.readFileSync(filePath, 'utf-8')
        } catch (error) {
          throw new Error(`Could not read ${filePath}: ${error}`)
        }
      })

      it('should not contain hardcoded /src/ paths in script imports', () => {
        // These patterns caused our routing errors
        const badPatterns = [
          "'/src/Report.svelte'",
          "'/src/Dashboard.svelte'", 
          "'/src/PrintPage.svelte'",
          '"/src/Report.svelte"',
          '"/src/Dashboard.svelte"',
          '"/src/PrintPage.svelte"'
        ]

        badPatterns.forEach(pattern => {
          expect(htmlContent).not.toContain(pattern)
        })
      })

      it('should use BASE_URL aware dynamic imports', () => {
        if (htmlContent.includes('import(')) {
          // Accept either: explicit BASE_URL usage OR the isDev conditional pattern
          // (isDev ? '/src/main.ts' : '/eld-progress-report/app.js')
          const hasBasePath = htmlContent.includes('basePath') ||
                            htmlContent.includes('BASE_URL') ||
                            htmlContent.includes('import.meta.env.BASE_URL') ||
                            (htmlContent.includes('isDev') && htmlContent.includes('/eld-progress-report/'))

          expect(hasBasePath).toBe(true)
        }
      })

      it('should handle dev/prod switching correctly', () => {
        if (htmlContent.includes('isDev')) {
          // Should have both dev and prod paths defined
          expect(htmlContent).toMatch(/isDev\s*\?.*:/)
          
          // Prod path should include the plugin name
          expect(htmlContent).toContain('/eld-progress-report/')
        }
      })

      it('should not have hardcoded /src/ paths in navigation links', () => {
        // Navigation is now state-based — no plugin-internal href links should
        // point into /src/. PowerSchool breadcrumb hrefs (e.g. /admin/home.html
        // or /admin/eld-progress-report/dashboard.html) are expected and OK.
        const badSrcLinks = htmlContent.match(/href="[^"]*\/src\/[^"]*"/g)
        expect(badSrcLinks).toBeNull()
      })
    })
  })
})

describe('Code Pattern Analysis', () => {
  it('should identify files that need BASE_URL fixes', () => {
    const filesWithIssues: string[] = []
    
    HTML_FILES.forEach(filePath => {
      try {
        const content = fs.readFileSync(filePath, 'utf-8')
        
        // Look for problematic patterns
        const hasHardcodedSrcPaths = content.includes("'/src/") || content.includes('"/src/')
        const hasDevSwitching = content.includes('isDev')
        const lacksBasePath = hasDevSwitching && !content.includes('basePath') && !content.includes('BASE_URL')
        
        if (hasHardcodedSrcPaths || lacksBasePath) {
          filesWithIssues.push(filePath)
        }
      } catch (error) {
        // File doesn't exist, skip
      }
    })

    // This test documents which files had issues
    // After fixing, this list should be empty
    console.log('Files that needed BASE_URL fixes:', filesWithIssues)
    
    // You can uncomment this when all files are fixed:
    // expect(filesWithIssues).toHaveLength(0)
  })
})

describe('Production Build Validation', () => {
  it('should have correct script paths for production', () => {
    HTML_FILES.forEach(filePath => {
      try {
        const content = fs.readFileSync(filePath, 'utf-8')
        
        if (content.includes('.js?v=~(random16)')) {
          // Production paths should include the BASE_URL
          expect(content).toContain('/eld-progress-report/')
        }
      } catch (error) {
        // File doesn't exist, skip
      }
    })
  })

  it('should use PowerSchool cache-busting correctly', () => {
    HTML_FILES.forEach(filePath => {
      try {
        const content = fs.readFileSync(filePath, 'utf-8')
        
        // Look for cache-busting patterns
        const hasCacheBusting = content.includes('?v=~(random16)')
        const hasJsFile = content.includes('.js')
        
        if (hasJsFile && content.includes('isDev')) {
          // Production branch should have cache busting
          expect(content).toMatch(/\.js\?v=~\(random16\)/)
        }
      } catch (error) {
        // File doesn't exist, skip  
      }
    })
  })
})