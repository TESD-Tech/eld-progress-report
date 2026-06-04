// PAIRS student summary API client.
// Fetches the full PAIRS summary for a student from the IS API.
// Uses the same JWT auth flow as interventionsApi.
//
// Dev:  fetches public/pairs.json fixture (no auth, no API call)
// Prod: fetches /api/v1/pairs/student-summary?student_id=S_{n} with JWT auth

import { getAccessToken } from './auth'

export interface PairsResult {
  area: string
  criteria: string
  result: string | null
  answered: string | null
  descriptor: string | null
}

export interface PairsAssessment {
  id: number
  date: string
  grade: string
  assessment_name: string
  season: string | null
  results: PairsResult[]
}

export interface PairsIntervention {
  student_intervention_id: number
  startDate: string
  endDate: string | null
  readingLevel: string
  attended: boolean
  goal: string
  comments: string
  intervention_name: string
  year: number
}

export interface PairsSummary {
  student_id: string
  assessments: PairsAssessment[]
  interventions: PairsIntervention[]
}

// Unwrap API envelope: [{success, data}] or {success, data} or raw PairsSummary
function unwrap(json: unknown): PairsSummary | null {
  if (!json) return null
  if (Array.isArray(json)) {
    const first = json[0]
    return first?.data ?? null
  }
  const obj = json as Record<string, unknown>
  return (obj.data as PairsSummary) ?? (obj as PairsSummary) ?? null
}

const IS_API_BASE_URL = import.meta.env.VITE_IS_API_URL ?? 'https://is.tesd.net'

/**
 * Fetches the PAIRS student summary.
 * In dev, loads the local public/pairs.json fixture.
 * In prod, calls the IS API with JWT auth.
 * Returns `null` on auth failure or API error.
 */
export async function loadPairsSummary(
  studentNumber: number
): Promise<PairsSummary | null> {
  if (import.meta.env.DEV) {
    try {
      const r = await fetch(`${import.meta.env.BASE_URL}pairs.json`)
      if (!r.ok) return null
      const json = await r.json()
      return unwrap(json)
    } catch {
      return null
    }
  }

  const token = await getAccessToken()
  if (!token) {
    console.warn('[pairsApi] No access token — skipping PAIRS fetch.')
    return null
  }

  const url = `${IS_API_BASE_URL}/api/v1/pairs/student-summary?student_id=S_${studentNumber}`
  try {
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!response.ok) {
      console.warn(`[pairsApi] Request failed: ${response.status} ${response.statusText}`)
      return null
    }
    return unwrap(await response.json())
  } catch (err) {
    console.warn('[pairsApi] Fetch error:', err)
    return null
  }
}
