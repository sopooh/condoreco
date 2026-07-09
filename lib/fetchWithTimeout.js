/**
 * fetch() con timeout compatibile con tutti i browser e ambienti Node.
 * Sostituisce AbortSignal.timeout() che non è supportato ovunque.
 */
export async function fetchWithTimeout(url, options = {}, timeoutMs = 6000) {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetch(url, { ...options, signal: controller.signal })
    return response
  } finally {
    clearTimeout(timeoutId)
  }
}
