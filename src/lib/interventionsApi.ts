// Interventions API client — authenticates via Azure AD (MSAL) rather than
// a static Bearer key. See src/lib/auth.ts for the token acquisition flow.

import { getAccessToken } from './auth'

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
 * Fetches intervention records for a student from the external Interventions API.
 * Returns `null` (and logs a warning) if auth fails or the request errors —
 * the caller should treat a `null` result as "data unavailable" rather than an error.
 */
export async function loadInterventions(
  studentNumber: number
): Promise<InterventionRecord[] | null> {
  const token = await getAccessToken()
  if (!token) {
    console.warn('[interventionsApi] No access token — skipping intervention fetch.')
    return null
  }

  const url = `${INTERVENTIONS_BASE_URL}?student_id=${studentNumber}`
  try {
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
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
