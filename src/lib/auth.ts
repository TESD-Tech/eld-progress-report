// IS API authentication via PowerSchool session token exchange.
//
// Flow (production):
//   1. PS renders the page and injects window.__PS_TOKEN__ = '~[pstoken]' server-side
//   2. On first API call, browser POSTs the psToken to IS API /api/v1/auth/ps-session
//   3. IS API verifies the token against PS Oracle USERSSESSIONS and returns a 15-min JWT
//   4. All subsequent /api/v1/* calls use that JWT in the Authorization header
//   5. JWT refreshes automatically 60s before expiry
//
// Dev: skipped entirely — data.ts uses public/data.json instead.

const IS_API_BASE_URL = import.meta.env.VITE_IS_API_URL ?? 'https://is.tesd.net'

interface TokenCache {
  token: string
  expiresAt: number
}

let tokenCache: TokenCache | null = null
let pendingExchange: Promise<string | null> | null = null

function getPsToken(): string | null {
  const meta = document.querySelector('meta[name="ps-session-token"]')
  const t = meta?.getAttribute('content') ?? ''
  // Guard against PS returning the literal wildcard text when not rendered server-side
  return t.length > 0 && !t.includes('~[') ? t : null
}

async function exchangeToken(psToken: string): Promise<string | null> {
  try {
    const response = await fetch(`${IS_API_BASE_URL}/api/v1/auth/ps-session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ psToken }),
    })

    if (!response.ok) {
      const body = await response.json().catch(() => ({}))
      console.warn(`[auth] Session exchange failed (${response.status}):`, body)
      if (body.detail) console.warn('[auth] Server detail:', body.detail)
      return null
    }

    const { token, expiresIn } = await response.json()
    tokenCache = { token, expiresAt: Date.now() + expiresIn * 1_000 }
    return token
  } catch (err) {
    console.warn('[auth] Session exchange error:', err)
    return null
  }
}

/**
 * Returns a valid IS-API JWT, exchanging or refreshing as needed.
 * Returns `null` if the PS token is missing or the exchange fails —
 * callers should treat `null` as "data unavailable" and continue gracefully.
 */
export async function getAccessToken(): Promise<string | null> {
  // Return cached token with a 60-second buffer before expiry
  if (tokenCache && Date.now() < tokenCache.expiresAt - 60_000) {
    return tokenCache.token
  }

  const psToken = getPsToken()
  if (!psToken) {
    console.warn('[auth] window.__PS_TOKEN__ not set or not yet replaced by PS — skipping.')
    return null
  }

  // Deduplicate concurrent calls — only one exchange in flight at a time
  if (!pendingExchange) {
    pendingExchange = exchangeToken(psToken).finally(() => { pendingExchange = null })
  }
  return pendingExchange
}
