// Data types and loading for Student Dashboard.
// Shape mirrors public/data.json (dev fixture) and the PS wildcard ./data.json (prod).

export interface BenchmarkRecord {
  benchmark: string
  template: string | null
  grade: string
  metric_name: string
  period: string
  period_label: string
  score: string
  target: string
  row_number: number
  column_number: number
  year: string
  period_order: number
  test_id: string
  red: string | null
  yellow: string | null
  green: string | null
  blue: string | null
}

export interface ScheduleCourse {
  course_name: string
  course_number: string
  section_number: string
  credittype: string | null
  sched_department?: string | null
  teacher_name?: string | null
  school_name?: string | null
  termid: number
  dateenrolled: string
  dateleft: string
}

export interface AttendanceRecord {
  att_date: string
  attendance_school: string
  att_code: string | null
  att_code_name: string | null
}

export interface StudentInfo {
  student_dcid: string
  student_number: number
  first_name: string
  last_name: string
  grade_level: number
  home_room?: string | null
  school_enrollment?: EnrollmentRecord[]
  student_schedule?: ScheduleCourse[]
  attendance_records?: AttendanceRecord[]
  discipline_records?: unknown | null
  benchmarks?: BenchmarkRecord[] | null
  acadience_reading_data?: unknown | null
  pssa_ela_math_scores?: unknown | null
  intervention_history?: unknown | null
  evaluation_special_ed_history?: unknown | null
  eld_levels_access_scores?: unknown | null
  reading_inventories?: unknown | null
}

export interface DashboardData {
  student: StudentInfo
  [key: string]: unknown
}

const isDev = import.meta.env.DEV
// Dev:  Vite serves public/ under the base path → /student-dashboard/data.json
// Prod: ./data.json is relative to the HTML page (PS wildcard)
export const DATA_URL = isDev ? `${import.meta.env.BASE_URL}data.json` : './data.json'

export async function loadData(): Promise<DashboardData> {
  const r = await fetch(DATA_URL)
  if (!r.ok) throw new Error(`Failed to fetch data: ${r.status} ${r.statusText}`)
  const raw = await r.json()

  // Support { data: [...] } envelope — take the first student
  if (raw.data && Array.isArray(raw.data) && raw.data.length > 0) {
    const { data, ...rest } = raw
    return { student: data[0] as StudentInfo, ...rest }
  }

  // Support { student: {...} } envelope directly
  if (raw.student) return raw as DashboardData

  // Bare object — treat as the student itself
  return { student: raw as StudentInfo }
}

/** Derive the current PS yearid from enrollment records (max yearid present). */
export function currentYearId(enrollment: EnrollmentRecord[] | undefined): number {
  if (!enrollment?.length) return 0
  return Math.max(...enrollment.map(e => e.yearid))
}
