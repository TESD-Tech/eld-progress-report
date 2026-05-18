export interface FieldMetadata {
  title: string | null
  container_title: string | null
}

export interface StudentField {
  element_id: string
  value: string | null
}

export interface StudentResponse {
  id: string
  submitted_at: string
  fields: StudentField[]
}

export interface Student {
  student_dcid: string
  student_number: number
  first_name: string
  last_name: string
  grade_level: number
  home_room: string
  response: StudentResponse | null
}

export interface ELDData {
  metadata: Record<string, FieldMetadata>;
  students: Student[];
}

export function isMarkingPeriodTitle(title: string | null | undefined): title is string {
  return typeof title === 'string' && /^Marking Period \d+$/.test(title)
}

export function normalizeELDStudents(students: Student[]): Student[] {
  const grouped = new Map<string, Student[]>()

  for (const student of students) {
    const group = grouped.get(student.student_dcid)
    if (group) {
      group.push(student)
    } else {
      grouped.set(student.student_dcid, [student])
    }
  }

  return Array.from(grouped.values(), group => {
    const ordered = [...group].sort((a, b) => {
      const aTime = a.response?.submitted_at ? Date.parse(a.response.submitted_at) : 0
      const bTime = b.response?.submitted_at ? Date.parse(b.response.submitted_at) : 0
      if (aTime !== bTime) return bTime - aTime
      return Number(String(b.response?.id ?? 0)) - Number(String(a.response?.id ?? 0))
    })
    const latest = ordered[0]
    const mergedFields = ordered.flatMap(student => student.response?.fields ?? [])

    return {
      ...latest,
      response: latest.response
        ? {
            ...latest.response,
            fields: mergedFields,
          }
        : null,
    }
  })
}


const isDev = import.meta.env.DEV
// In dev: Vite serves public/ under the base path, so use BASE_URL (/eld-progress-report/eld.json)
// In prod: ./eld.json is relative to the HTML page, which resolves to the PS wildcard next to it
export const DATA_URL = isDev ? `${import.meta.env.BASE_URL}eld.json` : './eld.json'

export async function loadELDData(): Promise<ELDData> {
  const r = await fetch(DATA_URL)
  const raw = await r.json()
  if (raw.metadata && raw.data) {
    return { metadata: raw.metadata, students: normalizeELDStudents(Array.isArray(raw.data) ? raw.data : []) }
  }
  return { metadata: {}, students: normalizeELDStudents(Array.isArray(raw) ? raw : []) }
}

export const loadStudents = loadELDData

export function filterStudents(
  students: Student[],
  search: string,
  grade: string,
  room: string,
): Student[] {
  return students.filter(s => {
    if (grade && String(s.grade_level) !== grade) return false
    if (room && s.home_room !== room) return false
    if (search) {
      const q = search.toLowerCase()
      const name = `${s.first_name} ${s.last_name}`.toLowerCase()
      if (!name.includes(q) && !String(s.student_number).includes(q)) return false
    }
    return true
  })
}

export function getDashboardSummary(students: Student[], metadata: Record<string, FieldMetadata>) {
  const withData = students.filter(s => s.response?.fields?.length)
  const progress = withData.map(s => {
    const fields = (s.response!.fields ?? []).filter(f => {
      const title = metadata[f.element_id]?.title
      return isMarkingPeriodTitle(title)
    })
    const assessed = fields.filter(f => {
      const value = f.value?.trim()
      return Boolean(value && value !== '/')
    })
    const meets = assessed.filter(f => {
      const value = f.value?.trim()
      return value === '+' || value === '✓'
    }).length
    return assessed.length > 0 ? (meets / assessed.length) * 100 : 0
  })
  const avgProgress =
    progress.length > 0
      ? Math.round(progress.reduce((a, b) => a + b, 0) / progress.length)
      : 0
  return {
    totalStudents: students.length,
    studentsWithData: withData.length,
    studentsWithoutData: students.length - withData.length,
    avgProgress,
  }
}
