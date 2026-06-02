import type { StudentInfo } from './data'

export function formatName(student: StudentInfo): string {
  return `${student.first_name || ''} ${student.last_name || ''}`.trim() || 'Unknown Student'
}

export function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return 'No date'
  try {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  } catch {
    return 'Invalid date'
  }
}
