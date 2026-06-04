// PAIRS student summary API client.
// Fetches the full PAIRS summary for a student from the IS API.
// Uses the same JWT auth flow as interventionsApi.

import { getAccessToken } from './auth'

// Flexible shape — tighten once the live response structure is confirmed.
export type PairsSummary = Record<string, unknown>

const IS_API_BASE_URL = import.meta.env.VITE_IS_API_URL ?? 'https://is.tesd.net'

/**
 * Fetches the PAIRS student summary from the IS API.
 * Returns `null` (and logs a warning) if auth fails or the request errors —
 * callers should treat `null` as "data unavailable" rather than an error.
 */
export async function loadPairsSummary(
  studentNumber: number
): Promise<PairsSummary | null> {
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
    return await response.json()
  } catch (err) {
    console.warn('[pairsApi] Fetch error:', err)
    return null
  }
}
