// Interventions API client — temporary bridge to the external Interventions server.
// Long-term intent: migrate this data into PowerSchool so it can be served via the
// PS wildcard alongside the rest of student data.

export interface InterventionRecord {
  studentInterventionID: number
  studentID: number
  details: string | null
  intervention: string
  year: number
  locationID: number
  startDate: string
  endDate: string | null
  refused: number
  attended: number
  goal: string
  studentGroup: string
  readingLevel: string
  teacher: string
  summerAMbus: string
  summerPMbus: string
  transportationComment: string
  additionalInfo: number
  comments: string
  employeeID: number | null
  deleted: number
}

interface InterventionsApiResponse {
  success: boolean
  student_id: string
  count: number
  data: InterventionRecord[]
}

const INTERVENTIONS_BASE_URL = import.meta.env.DEV
  ? '/interventions-proxy/api/v1/interventions'
  : 'https://is.tesd.net/api/v1/interventions'

/**
 * Resolves the Interventions API Bearer token.
 * Production: injected by the PS HTML page as `window.__IS_API_KEY__`.
 * Development: read from the `VITE_IS_API_KEY` environment variable (set in `.env.local`).
 */
export function getInterventionsApiKey(): string {
  if (import.meta.env.DEV) {
    return import.meta.env.VITE_IS_API_KEY ?? ''
  }
  return (window as Record<string, unknown>).__IS_API_KEY__ as string ?? ''
}

/**
 * Fetches intervention records for a student from the external Interventions API.
 * Returns `null` (and logs a warning) if the request fails for any reason —
 * the caller should treat a `null` result as "data unavailable" rather than an error.
 */
export async function loadInterventions(
  studentNumber: number
): Promise<InterventionRecord[] | null> {
  const apiKey = getInterventionsApiKey()
  if (!apiKey) {
    console.warn('[interventionsApi] No API key available — skipping intervention fetch.')
    return null
  }

  const url = `${INTERVENTIONS_BASE_URL}?student_id=${studentNumber}`
  try {
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${apiKey}` },
    })
    if (!response.ok) {
      console.warn(
        `[interventionsApi] Request failed: ${response.status} ${response.statusText}`
      )
      return null
    }
    const json: InterventionsApiResponse = await response.json()
    if (!json.success) {
      console.warn('[interventionsApi] API returned success=false.')
      return null
    }
    return json.data
  } catch (err) {
    console.warn('[interventionsApi] Fetch error (CORS or network):', err)
    return null
  }
}
