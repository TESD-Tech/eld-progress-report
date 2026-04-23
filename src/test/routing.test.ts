/**
 * Tests for BASE_URL and routing consistency across dev/prod environments
 * This test suite prevents the exact issues we encountered with hardcoded paths
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { Environment } from '../lib/utils/environment'
import { entryUrl, reportUrl, dashboardUrl, printUrl } from '../lib/utils/linkHelpers'

describe('Environment Detection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should detect development mode correctly', () => {
    expect(Environment.isDevelopment()).toBe(true)
    expect(Environment.isProduction()).toBe(false)
  })

  it('should return correct base path from Vite config', () => {
    expect(Environment.getBasePath()).toBe('/eld-progress-report/')
  })

  it('should return correct hostname', () => {
    expect(Environment.getHost()).toBe('http://localhost:5173')
  })

  it('should detect context from pathname', () => {
    // Mock different pathnames
    const originalPathname = window.location.pathname
    
    Object.defineProperty(window.location, 'pathname', {
      value: '/eld-progress-report/src/powerschool/WEB_ROOT/admin/eld-progress-report/dashboard.html',
      writable: true,
    })
    expect(Environment.getContext()).toBe('admin')

    Object.defineProperty(window.location, 'pathname', {
      value: '/eld-progress-report/src/powerschool/WEB_ROOT/teachers/eld-progress-report/dashboard.html',
      writable: true,
    })
    expect(Environment.getContext()).toBe('teacher')

    Object.defineProperty(window.location, 'pathname', {
      value: '/eld-progress-report/src/powerschool/WEB_ROOT/guardian/eld-progress-report/report.html',
      writable: true,
    })
    expect(Environment.getContext()).toBe('guardian')

    // Restore original pathname
    Object.defineProperty(window.location, 'pathname', {
      value: originalPathname,
      writable: true,
    })
  })
})

describe('Link Helpers - BASE_URL Consistency', () => {
  it('should generate BASE_URL aware entry URLs', () => {
    expect(entryUrl('report.html')).toBe('/eld-progress-report/report.html')
    expect(entryUrl('dashboard.html')).toBe('/eld-progress-report/dashboard.html')
    expect(entryUrl('print.html')).toBe('/eld-progress-report/print.html')
  })

  it('should handle parameters correctly', () => {
    expect(entryUrl('report.html', { student_dcid: '42318' }))
      .toBe('/eld-progress-report/report.html?student_dcid=42318')
    
    expect(entryUrl('report.html', { student_dcid: '42318', portal: 'admin' }))
      .toBe('/eld-progress-report/report.html?student_dcid=42318&portal=admin')
  })

  it('should filter out null/undefined parameters', () => {
    expect(entryUrl('report.html', { student_dcid: '42318', portal: null, grade: undefined }))
      .toBe('/eld-progress-report/report.html?student_dcid=42318')
  })

  it('should provide convenient helper functions', () => {
    expect(reportUrl('42318')).toBe('/eld-progress-report/report.html?student_dcid=42318')
    expect(dashboardUrl()).toBe('/eld-progress-report/dashboard.html')
    expect(printUrl()).toBe('/eld-progress-report/print.html')
  })
})

describe('Production vs Development URL Generation', () => {
  it('should use BASE_URL in both environments', () => {
    // Current test environment (dev mode)
    expect(reportUrl('12345')).toBe('/eld-progress-report/report.html?student_dcid=12345')
    
    // Test production mode by mocking import.meta.env.DEV
    vi.stubEnv('DEV', false)
    expect(Environment.isDevelopment()).toBe(false)
    expect(reportUrl('12345')).toBe('/eld-progress-report/report.html?student_dcid=12345')
  })
})

describe('Portal-Specific Navigation', () => {
  it('should handle portal contexts correctly', () => {
    // Test that we can detect different portal contexts
    const adminPath = '/eld-progress-report/src/powerschool/WEB_ROOT/admin/eld-progress-report/dashboard.html'
    const teacherPath = '/eld-progress-report/src/powerschool/WEB_ROOT/teachers/eld-progress-report/dashboard.html'
    const guardianPath = '/eld-progress-report/src/powerschool/WEB_ROOT/guardian/eld-progress-report/report.html'

    // Mock pathname changes
    Object.defineProperty(window.location, 'pathname', {
      value: adminPath,
      writable: true,
    })
    expect(Environment.getContext()).toBe('admin')

    Object.defineProperty(window.location, 'pathname', {
      value: teacherPath,
      writable: true,
    })
    expect(Environment.getContext()).toBe('teacher')

    Object.defineProperty(window.location, 'pathname', {
      value: guardianPath,
      writable: true,
    })
    expect(Environment.getContext()).toBe('guardian')
  })
})

/**
 * CRITICAL: Tests for the exact issues we encountered
 */
describe('Regression Tests - BASE_URL Issues', () => {
  it('should never generate hardcoded /src/ paths', () => {
    // These patterns were causing the routing errors
    const badPatterns = [
      '/src/Report.svelte',
      '/src/Dashboard.svelte', 
      '/src/PrintPage.svelte'
    ]
    
    // Our link helpers should never generate these patterns
    const validUrls = [
      reportUrl('42318'),
      dashboardUrl(),
      printUrl()
    ]

    validUrls.forEach(url => {
      badPatterns.forEach(pattern => {
        expect(url).not.toBe(pattern)
        expect(url).not.toContain('/src/')
      })
    })
  })

  it('should always include BASE_URL prefix', () => {
    const urls = [
      reportUrl('42318'),
      dashboardUrl(),
      printUrl(),
      entryUrl('any-page.html')
    ]

    urls.forEach(url => {
      expect(url).toMatch(/^\/eld-progress-report\//)
    })
  })

  it('should work correctly in Vite dev server environment', () => {
    // This test specifically checks the issue we had where
    // Vite serves files under the base path but components
    // were generating wrong URLs
    
    const baseUrl = Environment.getBasePath()
    expect(baseUrl).toBe('/eld-progress-report/')
    
    // Report URLs should work in both dev and prod
    const reportUrlResult = reportUrl('42318')
    expect(reportUrlResult).toBe('/eld-progress-report/report.html?student_dcid=42318')
    
    // When Vite serves this, it should be accessible at:
    // http://localhost:5173/eld-progress-report/report.html?student_dcid=42318
    expect(`http://localhost:5173${reportUrlResult}`).toBe(
      'http://localhost:5173/eld-progress-report/report.html?student_dcid=42318'
    )
  })
})