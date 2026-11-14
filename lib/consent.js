// Consenso cookie (Linee guida Garante 10/06/2021).
// La scelta resta salvata sul dispositivo e non viene richiesta di nuovo
// prima di 6 mesi; dopo 6 mesi il banner ricompare.
const KEY = 'condoreco:consent'
const VERSION = 1
const MAX_AGE_MS = 1000 * 60 * 60 * 24 * 183

export const CONSENT_EVENT = 'condoreco:consent'
export const CONSENT_OPEN_EVENT = 'condoreco:consent-open'

export const analyticsEnabled = () => Boolean(process.env.NEXT_PUBLIC_POSTHOG_KEY)

export function getConsent() {
  try {
    const raw = window.localStorage.getItem(KEY)
    if (!raw) return null
    const c = JSON.parse(raw)
    if (c?.v !== VERSION || typeof c.analytics !== 'boolean') return null
    if (Date.now() - Number(c.ts) > MAX_AGE_MS) return null
    return c
  } catch {
    return null
  }
}

export function setConsent(analytics) {
  const c = { v: VERSION, analytics: Boolean(analytics), ts: Date.now() }
  try { window.localStorage.setItem(KEY, JSON.stringify(c)) } catch {}
  window.dispatchEvent(new CustomEvent(CONSENT_EVENT, { detail: c }))
  return c
}

export function openConsentPreferences() {
  window.dispatchEvent(new CustomEvent(CONSENT_OPEN_EVENT))
}

// Stato per useSyncExternalStore: 'granted' | 'denied' | 'unset' ('unknown' sul server).
export function consentSnapshot() {
  const c = getConsent()
  return c ? (c.analytics ? 'granted' : 'denied') : 'unset'
}
export const consentServerSnapshot = () => 'unknown'
export function subscribeConsent(cb) {
  window.addEventListener(CONSENT_EVENT, cb)
  window.addEventListener('storage', cb)
  return () => {
    window.removeEventListener(CONSENT_EVENT, cb)
    window.removeEventListener('storage', cb)
  }
}
