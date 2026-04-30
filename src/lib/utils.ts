import type { Student, StudentField, FieldMetadata } from './data'

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

export function calculateProgress(fields: StudentField[], metadata: Record<string, FieldMetadata>): {
  meets: number
  approaching: number
  below: number
  total: number
  percent: number
} {
  const assessment = fields.filter(f => {
    const title = metadata[f.element_id]?.title
    return title === 'Marking Period 1' || title === 'Marking Period 2'
  })
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
  metadata: Record<string, FieldMetadata>,
): Map<string, Map<string, string>> {
  const result = new Map<string, Map<string, string>>()
  for (const f of fields) {
    const title = metadata[f.element_id]?.title
    const container_title = metadata[f.element_id]?.container_title
    if (!container_title || !title) continue
    if (title !== 'Marking Period 1' && title !== 'Marking Period 2') continue
    if (!result.has(container_title)) result.set(container_title, new Map())
    result.get(container_title)!.set(title, f.value ?? '')
  }
  return result
}

export function getMarkingPeriods(fields: StudentField[], metadata: Record<string, FieldMetadata>): string[] {
  const periods = new Set<string>()
  for (const f of fields) {
    const title = metadata[f.element_id]?.title
    if (title === 'Marking Period 1' || title === 'Marking Period 2') {
      periods.add(title)
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

const METADATA_TITLES = ['Proficiency Level', 'ELD Teacher', 'Current English Proficiency Level']

// Titles that are form header scaffolding, not meaningful narrative content
const SKIP_TITLES = new Set(['Student', 'School', ...METADATA_TITLES])

export function getNarrativeFields(
  fields: StudentField[],
  metadata: Record<string, FieldMetadata>,
): { title: string; value: string }[] {
  const result: { title: string; value: string }[] = []
  for (const f of fields) {
    const { title, container_title } = metadata[f.element_id] ?? {}
    if (!title || container_title !== null) continue
    if (SKIP_TITLES.has(title)) continue
    if (!f.value?.trim()) continue
    result.push({ title, value: f.value.trim() })
  }
  return result.sort((a, b) => a.title.localeCompare(b.title, undefined, { numeric: true }))
}

export function getMetadataFields(fields: StudentField[], metadata: Record<string, FieldMetadata>): Record<string, string> {
  const result: Record<string, string> = {}
  for (const f of fields) {
    const title = metadata[f.element_id]?.title
    if (title && METADATA_TITLES.includes(title) && f.value) {
      result[title] = f.value
    }
  }
  return result
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
