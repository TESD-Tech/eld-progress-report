/**
 * Navigation helpers for ELD Progress Report.
 * Uses real page URLs — the view is determined by which HTML file you're on,
 * not by a ?view= query param.
 */

/**
 * Build a relative URL to a page in the same portal directory.
 * Null/undefined param values are omitted.
 */
export function entryUrl(page: string, params: Record<string, string | null | undefined> = {}): string {
  const filtered = Object.entries(params).filter(([, v]) => v != null) as [string, string][]
  if (filtered.length === 0) return `./${page}`
  const qs = new URLSearchParams(filtered).toString()
  return `./${page}?${qs}`
}

/** URL for the student report page */
export function reportUrl(student_dcid: string): string {
  return entryUrl('report.html', { student_dcid })
}

/** URL for the dashboard page */
export function dashboardUrl(): string {
  return entryUrl('dashboard.html')
}

/** URL for the print page */
export function printUrl(student_dcid?: string): string {
  return entryUrl('print.html', student_dcid ? { student_dcid } : {})
}
