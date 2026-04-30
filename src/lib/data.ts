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


const isDev = import.meta.env.DEV
// In dev: Vite serves public/ under the base path, so use BASE_URL (/eld-progress-report/eld.json)
// In prod: ./eld.json is relative to the HTML page, which resolves to the PS wildcard next to it
export const DATA_URL = isDev ? `${import.meta.env.BASE_URL}eld.json` : './eld.json'

export async function loadELDData(): Promise<ELDData> {
  const r = await fetch(DATA_URL)
  const raw = await r.json()
  if (raw.metadata && raw.data) {
    return { metadata: raw.metadata, students: raw.data };
  }
  return { metadata: {}, students: raw };
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
      return title === 'Marking Period 1' || title === 'Marking Period 2'
    })
    const meets = fields.filter(f => f.value?.trim() === '✓').length
    return fields.length > 0 ? (meets / fields.length) * 100 : 0
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
