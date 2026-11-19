// Query HogQL verso PostHog (cloud UE) lato server.
// Serve una personal API key con permesso "Query: read" limitata al progetto:
// POSTHOG_PERSONAL_API_KEY (segreta, mai NEXT_PUBLIC_) e POSTHOG_PROJECT_ID.
const HOST = 'https://eu.posthog.com'

export const posthogProjectId = () => process.env.POSTHOG_PROJECT_ID || '349667'
export const posthogConfigured = () => Boolean(process.env.POSTHOG_PERSONAL_API_KEY)
export const posthogAppUrl = (path = '') => `${HOST}/project/${posthogProjectId()}${path}`

export async function hogql(query, name) {
  const res = await fetch(`${HOST}/api/projects/${posthogProjectId()}/query/`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.POSTHOG_PERSONAL_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: { kind: 'HogQLQuery', query }, name }),
    cache: 'no-store',
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`PostHog ${res.status}: ${text.slice(0, 200)}`)
  }
  const data = await res.json()
  const cols = data.columns || []
  return (data.results || []).map((row) => Object.fromEntries(cols.map((c, i) => [c, row[i]])))
}
