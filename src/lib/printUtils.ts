import type { Student } from './data'

const PRINT_STORAGE_KEY = 'eld_print_data'
const SIZE_THRESHOLD = 2000

function printUrl(): string {
  const base = import.meta.env.BASE_URL  // /eld-progress-report/
  return `${base}print.html`
}

export function printReport(student: Student): void {
  const data = JSON.stringify([student])
  const url = printUrl()
  if (data.length > SIZE_THRESHOLD) {
    sessionStorage.setItem(PRINT_STORAGE_KEY, data)
    window.open(`${url}?src=session`, '_blank')
  } else {
    window.open(`${url}?data=${encodeURIComponent(data)}`, '_blank')
  }
}

export function printMultipleReports(students: Student[]): void {
  const data = JSON.stringify(students)
  const url = printUrl()
  sessionStorage.setItem(PRINT_STORAGE_KEY, data)
  window.open(`${url}?src=session`, '_blank')
}
