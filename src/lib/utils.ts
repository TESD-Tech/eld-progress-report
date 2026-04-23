import type { Student, StudentField } from './data'

export function formatName(student: Student): string {
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

export function calculateProgress(fields: StudentField[]): {
  meets: number
  approaching: number
  below: number
  total: number
  percent: number
} {
  const assessment = fields.filter(
    f => f.title === 'Marking Period 1' || f.title === 'Marking Period 2',
  )
  let meets = 0,
    approaching = 0,
    below = 0
  for (const f of assessment) {
    const v = f.value?.trim()
    if (v === '✓') meets++
    else if (v === '●') approaching++
    else if (v === '/') below++
  }
  const total = assessment.length
  return {
    meets,
    approaching,
    below,
    total,
    percent: total > 0 ? Math.round((meets / total) * 100) : 0,
  }
}

export function groupAssessmentFields(
  fields: StudentField[],
): Map<string, Map<string, string>> {
  const result = new Map<string, Map<string, string>>()
  for (const f of fields) {
    if (!f.container_title || !f.title) continue
    if (f.title !== 'Marking Period 1' && f.title !== 'Marking Period 2') continue
    if (!result.has(f.container_title)) result.set(f.container_title, new Map())
    result.get(f.container_title)!.set(f.title, f.value ?? '')
  }
  return result
}

export function getMarkingPeriods(fields: StudentField[]): string[] {
  const periods = new Set<string>()
  for (const f of fields) {
    if (f.title === 'Marking Period 1' || f.title === 'Marking Period 2') {
      periods.add(f.title)
    }
  }
  return Array.from(periods).sort()
}

export function parseStudentDcid(): string | null {
  return new URLSearchParams(location.search).get('student_dcid')
}

export function getUniqueGrades(students: Student[]): string[] {
  return [
    ...new Set(students.map(s => String(s.grade_level)).filter(Boolean)),
  ].sort((a, b) => Number(a) - Number(b))
}

export function getUniqueRooms(students: Student[]): string[] {
  return [...new Set(students.map(s => s.home_room).filter(Boolean))].sort()
}

export function getAssessmentLabel(value: string | null | undefined): {
  symbol: string
  meaning: string
  cssClass: string
} {
  switch (value?.trim()) {
    case '✓':
      return { symbol: '✓', meaning: 'Meets Expectation', cssClass: 'val-meets' }
    case '●':
      return { symbol: '●', meaning: 'Approaching Expectation', cssClass: 'val-approaching' }
    case '/':
      return { symbol: '/', meaning: 'Below Expectation', cssClass: 'val-below' }
    case '+':
      return { symbol: '+', meaning: 'Exceeds Expectation', cssClass: 'val-exceeds' }
    default:
      return { symbol: '—', meaning: 'Not Yet Assessed', cssClass: 'val-empty' }
  }
}
