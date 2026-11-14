import posthog from 'posthog-js'

// Evento personalizzato PostHog. Non fa nulla se PostHog non è stato avviato
// (chiave assente o consenso non dato) o se l'utente ha revocato il consenso.
// Mai dati personali o contenuti nelle proprietà: solo conteggi e categorie.
export function track(event, properties) {
  try {
    if (!posthog.__loaded || posthog.has_opted_out_capturing()) return
    posthog.capture(event, properties)
  } catch {}
}
