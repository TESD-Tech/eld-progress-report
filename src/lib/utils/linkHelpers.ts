/** 
 * SPA Navigation helpers for ELD Progress Report
 * Uses client-side routing instead of separate HTML pages
 */

/** Navigate to a view within the SPA */
export function navigate(view: string, params: Record<string, string> = {}) {
  if (typeof window !== 'undefined' && (window as any).eldNavigate) {
    (window as any).eldNavigate(view, params)
  }
}

/** Generate URL for a view (for href attributes) */
export function buildUrl(view: string, params: Record<string, string> = {}): string {
  const url = new URL(window.location.href)
  url.searchParams.set('view', view)
  
  // Clear existing params except view
  const paramsToKeep = ['view']
  for (const key of Array.from(url.searchParams.keys())) {
    if (!paramsToKeep.includes(key)) {
      url.searchParams.delete(key)
    }
  }
  
  // Add new params
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value)
  }
  
  return url.toString()
}

/** Get the report URL for a student ID */
export function reportUrl(student_dcid: string): string {
  return buildUrl('report', { student_dcid })
}

/** Get the print page URL */
export function printUrl(student_dcid?: string): string {
  const params = student_dcid ? { student_dcid } : {}
  return buildUrl('print', params)
}

/** Get the dashboard URL */
export function dashboardUrl(): string {
  return buildUrl('dashboard')
}

/** Navigate to report view programmatically */
export function goToReport(student_dcid: string) {
  navigate('report', { student_dcid })
}

/** Navigate to dashboard programmatically */
export function goToDashboard() {
  navigate('dashboard')
}

/** Navigate to print page programmatically */
export function goToPrint(student_dcid?: string) {
  const params = student_dcid ? { student_dcid } : {}
  navigate('print', params)
}
