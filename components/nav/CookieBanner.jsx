'use client'

import { useEffect, useState, useSyncExternalStore } from 'react'
import Link from 'next/link'
import { X } from 'lucide-react'
import { CONSENT_OPEN_EVENT, analyticsEnabled, consentServerSnapshot, consentSnapshot, setConsent, subscribeConsent } from '@/lib/consent'

// Rifiuta e Accetta hanno lo stesso peso visivo; la X equivale a Rifiuta
// (Linee guida Garante cookie, 10/06/2021).
export default function CookieBanner() {
  const consent = useSyncExternalStore(subscribeConsent, consentSnapshot, consentServerSnapshot)
  const [reopened, setReopened] = useState(false)
  const open = analyticsEnabled() && (consent === 'unset' || reopened)

  useEffect(() => {
    const onOpen = () => setReopened(true)
    window.addEventListener(CONSENT_OPEN_EVENT, onOpen)
    return () => window.removeEventListener(CONSENT_OPEN_EVENT, onOpen)
  }, [])

  if (!open) return null

  const choose = (analytics) => { setConsent(analytics); setReopened(false) }

  return (
    <div className="cookie-banner" role="dialog" aria-live="polite" aria-labelledby="cookie-banner-title">
      <button type="button" className="cookie-banner-close" aria-label="Chiudi e rifiuta" onClick={() => choose(false)}>
        <X size={18} />
      </button>
      <h2 id="cookie-banner-title" className="cookie-banner-title">Cookie e statistiche</h2>
      <p className="cookie-banner-text">
        Usiamo cookie tecnici per farti accedere e ricordare le tue preferenze. Se accetti, usiamo anche
        PostHog (server nell&apos;UE) per statistiche di utilizzo, mappe dei clic e registrazioni anonimizzate
        della navigazione nelle pagine pubbliche, così capiamo come migliorare il sito. Niente pubblicità e
        nessuna vendita di dati. Puoi cambiare idea quando vuoi da &quot;Preferenze cookie&quot; in fondo alla pagina.{' '}
        <Link href="/cookie-policy" className="cookie-banner-link">Cookie Policy</Link>
      </p>
      <div className="cookie-banner-actions">
        <button type="button" className="btn btn-primary cookie-banner-btn" onClick={() => choose(false)}>Rifiuta</button>
        <button type="button" className="btn btn-primary cookie-banner-btn" onClick={() => choose(true)}>Accetta</button>
      </div>
    </div>
  )
}
