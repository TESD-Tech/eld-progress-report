/**
 * Tests for link helper URL generation
 */
import { describe, it, expect } from 'vitest'
import { Environment } from '../lib/utils/environment'
import { entryUrl, reportUrl, dashboardUrl, printUrl } from '../lib/utils/linkHelpers'

describe('Environment Detection', () => {
  it('should detect development mode correctly', () => {
    expect(Environment.isDevelopment()).toBe(true)
    expect(Environment.isProduction()).toBe(false)
  })

  it('should return a non-empty base path', () => {
    expect(Environment.getBasePath().length).toBeGreaterThan(0)
  })

  it('should detect context from pathname', () => {
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
      value: '/eld-progress-report/src/powerschool/WEB_ROOT/guardian/eld-progress-report/dashboard.html',
      writable: true,
    })
    expect(Environment.getContext()).toBe('guardian')
  })
})

describe('Link Helpers — page-relative URLs', () => {
  it('entryUrl generates relative page URLs', () => {
    expect(entryUrl('report.html')).toBe('./report.html')
    expect(entryUrl('dashboard.html')).toBe('./dashboard.html')
    expect(entryUrl('print.html')).toBe('./print.html')
  })

  it('entryUrl appends query params, omits null/undefined', () => {
    expect(entryUrl('report.html', { student_dcid: '42318' }))
      .toBe('./report.html?student_dcid=42318')

    expect(entryUrl('report.html', { student_dcid: '42318', portal: null, grade: undefined }))
      .toBe('./report.html?student_dcid=42318')
  })

  it('convenience helpers return correct relative URLs', () => {
    expect(reportUrl('42318')).toBe('./report.html?student_dcid=42318')
    expect(dashboardUrl()).toBe('./dashboard.html')
    expect(printUrl()).toBe('./print.html')
    expect(printUrl('42318')).toBe('./print.html?student_dcid=42318')
  })

  it('URLs never contain /src/ paths', () => {
    const urls = [reportUrl('42318'), dashboardUrl(), printUrl(), entryUrl('any.html')]
    urls.forEach(url => {
      expect(url).not.toContain('/src/')
    })
  })
})
