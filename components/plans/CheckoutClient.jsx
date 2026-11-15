'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { ArrowLeft, Check, CreditCard, Info, Lock, Sparkles } from 'lucide-react'
import { findPlan } from '@/lib/plans'

// Pagamento dell'abbonamento a Condoreco (anteprima: Stripe e PayPal non ancora collegati).
export default function CheckoutClient() {
  const sp = useSearchParams()
  const plan = findPlan(sp.get('piano'))
  const [method, setMethod] = useState('card')
  const [condos, setCondos] = useState(6)
  const [done, setDone] = useState(false)

  if (!plan || plan.free) {
    return (
      <div className="co-page">
        <Link href="/profilo" className="co-back"><ArrowLeft size={16} aria-hidden="true" />Torna al profilo</Link>
        <section className="co-card"><h1>Piano non trovato</h1><p className="co-muted">Scegli un piano dal tuo profilo.</p></section>
      </div>
    )
  }

  const perCondo = plan.id === 'admin_pro'
  const total = perCondo ? Math.max(plan.minimum || 0, plan.amount * condos) : plan.amount
  const fmt = (n) => n.toLocaleString('it-IT', { style: 'currency', currency: 'EUR', minimumFractionDigits: n % 1 ? 2 : 0 })

  return (
    <div className="co-page">
      <Link href="/profilo" className="co-back"><ArrowLeft size={16} aria-hidden="true" />Torna al profilo</Link>
      <div className="co-preview"><Info size={17} aria-hidden="true" />Anteprima: i pagamenti non sono ancora attivi, nessun addebito verrà effettuato.</div>

      <div className="co-grid">
        <section className="co-card">
          <span className="co-kicker">{plan.groupTitle}</span>
          <h1>Piano {plan.name}</h1>
          <p className="co-muted">{plan.tagline}</p>
          <ul className="co-feat">
            {plan.features.map((f) => typeof f === 'string'
              ? <li key={f}><Check size={16} strokeWidth={2.6} aria-hidden="true" />{f}</li>
              : <li key={f.text}><Sparkles size={16} aria-hidden="true" />{f.text}{f.sub ? ` (${f.sub})` : ''}</li>)}
          </ul>
          {perCondo && (
            <label className="co-qty">
              <span>Quanti condomini gestisci?</span>
              <input type="number" min={1} max={60} value={condos} onChange={(e) => setCondos(Math.max(1, Math.min(60, Number(e.target.value) || 1)))} />
            </label>
          )}
          <div className="co-sum">
            <div><span>{perCondo ? `${condos} × ${fmt(plan.amount)}` : `Piano ${plan.name}`}</span><b>{fmt(total)}</b></div>
            {perCondo && total === plan.minimum && <small>Si applica il minimo di {fmt(plan.minimum)} al mese.</small>}
            {plan.note && !perCondo && <small>{plan.note}</small>}
            <div className="co-total"><span>Totale al mese</span><b>{fmt(total)}</b></div>
            <small>IVA inclusa. Rinnovo mensile, disdici quando vuoi dal profilo.</small>
          </div>
        </section>

        <section className="co-card">
          <h2>Metodo di pagamento</h2>
          <div className="co-methods" role="radiogroup" aria-label="Metodo di pagamento">
            <button type="button" role="radio" aria-checked={method === 'card'} className={method === 'card' ? 'is-on' : ''} onClick={() => setMethod('card')}>
              <CreditCard size={20} aria-hidden="true" /><span><b>Carta</b><small>con Stripe · Apple Pay · Google Pay</small></span>
            </button>
            <button type="button" role="radio" aria-checked={method === 'paypal'} className={method === 'paypal' ? 'is-on' : ''} onClick={() => setMethod('paypal')}>
              <span className="co-pp">Pay<i>Pal</i></span><span><b>PayPal</b><small>paghi dal tuo conto PayPal</small></span>
            </button>
          </div>

          {method === 'card' ? (
            <div className="co-fields" aria-disabled="true">
              <label>Numero carta<input disabled placeholder="1234 1234 1234 1234" /></label>
              <div className="co-row">
                <label>Scadenza<input disabled placeholder="MM / AA" /></label>
                <label>CVC<input disabled placeholder="123" /></label>
              </div>
              <label>Intestatario<input disabled placeholder="Nome e cognome" /></label>
            </div>
          ) : (
            <p className="co-muted" style={{ margin: '14px 0' }}>Verrai portato su PayPal per confermare l&apos;abbonamento e poi tornerai qui.</p>
          )}

          {done ? (
            <div className="co-done"><Check size={18} aria-hidden="true" />Anteprima completata: quando i pagamenti saranno attivi, da qui partirà l&apos;abbonamento.</div>
          ) : (
            <button type="button" className="co-pay" onClick={() => setDone(true)}>
              <Lock size={16} aria-hidden="true" />{method === 'card' ? `Paga ${fmt(total)} al mese` : 'Continua con PayPal'}
            </button>
          )}
          <p className="co-legal">
            Il pagamento va a Condoreco per l&apos;uso dell&apos;app, non all&apos;amministratore del condominio.
            Le quote condominiali si pagano a parte, nella sezione Contabilità del condominio.
          </p>
        </section>
      </div>
    </div>
  )
}
