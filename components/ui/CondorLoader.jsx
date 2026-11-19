'use client'

import { useEffect, useState } from 'react'
import { useNavPending } from '@/lib/navPending'

// Loader del condor in volo (SVG animato, funziona su computer e telefono).
export default function CondorLoader({ label = 'Carico i dati…', size = 72, fullPage = false }) {
  return (
    <div className={`cl-wrap${fullPage ? ' is-page' : ''}`} role="status" aria-live="polite">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/brand/condor-loader.svg" width={size} height={size} alt="" className="cl-bird" />
      {label && <p className="cl-label">{label}</p>}
    </div>
  )
}

// Sovrapposto alla lista mentre i filtri caricano nuovi risultati.
// Compare dopo un attimo, così le risposte veloci non fanno lampeggiare nulla.
export function NavPendingOverlay({ label = 'Aggiorno i risultati…' }) {
  const pending = useNavPending()
  const [show, setShow] = useState(false)
  useEffect(() => {
    if (!pending) { const t = setTimeout(() => setShow(false), 0); return () => clearTimeout(t) }
    const t = setTimeout(() => setShow(true), 250)
    return () => clearTimeout(t)
  }, [pending])
  if (!show) return null
  return (
    <div className="cl-overlay">
      <CondorLoader label={label} />
    </div>
  )
}
