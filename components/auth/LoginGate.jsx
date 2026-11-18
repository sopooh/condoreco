'use client'

import { Lock } from 'lucide-react'

// Schermata per le pagine che richiedono l'accesso: titolo, spiegazione e
// due pulsanti come nell'onboarding (registrati / accedi). Dopo l'accesso
// si torna a `next`.
export default function LoginGate({ title, text, next, icon }) {
  const open = (mode) => window.dispatchEvent(new CustomEvent('condoreco:open-auth', { detail: { mode, next } }))
  return (
    <div className="lg-wrap">
      <section className="lg-card">
        <span className="lg-ico" aria-hidden="true">{icon || <Lock size={28} strokeWidth={2} />}</span>
        <h1>{title}</h1>
        {text && <p>{text}</p>}
        <button type="button" className="lg-btn is-main" onClick={() => open('signup')}>Registrati gratis</button>
        <button type="button" className="lg-btn" onClick={() => open('login')}>Ho già un account, accedi</button>
        <small>Ci vuole un minuto: puoi usare Google o un link via email.</small>
      </section>
    </div>
  )
}
