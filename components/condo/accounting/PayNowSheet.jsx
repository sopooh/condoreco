'use client'

import { useState } from 'react'
import { Building2, Check, Copy, CreditCard, Landmark, X } from 'lucide-react'
import { causaleFor, euro, fmtDay, formatIban } from '@/lib/accounting'

// "Paga ora": scelta delle rate e del metodo.
// Online (carta, PayPal, Apple Pay, Google Pay) con Stripe se il condominio l'ha attivato;
// bonifico con IBAN e causale pronti, poi l'amministratore conferma.
export default function PayNowSheet({ charges, overdueIds, settings, onClose, onReport, onCheckout }) {
  const [sel, setSel] = useState(() => new Set(overdueIds.length ? overdueIds : charges.slice(0, 1).map((c) => c.id)))
  const [method, setMethod] = useState(settings?.stripe_ready ? 'online' : 'bonifico')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)
  const [done, setDone] = useState(false)
  const [copied, setCopied] = useState(null)

  const chosen = charges.filter((c) => sel.has(c.id))
  const total = chosen.reduce((n, c) => n + Number(c.amount), 0)
  const causale = causaleFor(chosen)
  const toggle = (id) => setSel((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n })
  const copy = async (k, v) => { try { await navigator.clipboard.writeText(v); setCopied(k); setTimeout(() => setCopied(null), 1500) } catch { /* niente appunti */ } }

  async function payOnline() {
    setBusy(true); setErr(null)
    const r = await onCheckout(chosen.map((c) => c.id))
    if (r?.error) { setErr(r.error); setBusy(false) }
  }
  async function reported() {
    setBusy(true); setErr(null)
    const r = await onReport(chosen.map((c) => c.id))
    setBusy(false)
    if (r?.error) setErr(r.error); else setDone(true)
  }

  return (
    <div className="dir-sheet-wrap" role="dialog" aria-modal="true" aria-label="Paga le quote">
      <div className="dir-sheet-backdrop" onClick={busy ? undefined : onClose} />
      <div className="dir-sheet" style={{ maxHeight: '92vh', overflowY: 'auto', maxWidth: 520 }}>
        <div className="dir-sheet-head">
          <div>
            <div className="dir-sheet-kicker">Paga ora</div>
            <div className="dir-sheet-title">{done ? 'Grazie!' : euro(total)}</div>
          </div>
          <button type="button" className="dir-sheet-close" onClick={onClose} aria-label="Chiudi"><X size={22} /></button>
        </div>

        {done ? (
          <>
            <p style={{ fontSize: 15, lineHeight: 1.55, color: 'var(--text-2)', margin: '0 0 16px' }}>
              Abbiamo avvisato l&apos;amministratore. Le rate restano &quot;da confermare&quot; finché non vede il bonifico sul conto, poi diventano pagate.
            </p>
            <button type="button" className="ep-save" onClick={onClose}>Chiudi</button>
          </>
        ) : (
          <>
            <div className="pay-list">
              {charges.map((c) => {
                const on = sel.has(c.id)
                return (
                  <label key={c.id} className={`pay-row${on ? ' is-on' : ''}`}>
                    <input type="checkbox" checked={on} onChange={() => toggle(c.id)} />
                    <span className="pay-box" aria-hidden="true">{on && <Check size={14} strokeWidth={3} />}</span>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <strong>{c.title}</strong>
                      <small className={overdueIds.includes(c.id) ? 'is-late' : ''}>{overdueIds.includes(c.id) ? 'Scaduta il ' : 'Scade il '}{fmtDay(c.due_date)}</small>
                    </span>
                    <b>{euro(c.amount)}</b>
                  </label>
                )
              })}
            </div>

            <div className="pay-methods" role="radiogroup" aria-label="Metodo di pagamento">
              <button type="button" role="radio" aria-checked={method === 'online'} className={`pay-method${method === 'online' ? ' is-on' : ''}`}
                onClick={() => setMethod('online')} disabled={!settings?.stripe_ready}>
                <CreditCard size={22} aria-hidden="true" />
                <span><strong>Carta o PayPal</strong><small>{settings?.stripe_ready ? 'Anche Apple Pay e Google Pay' : 'Non ancora attivo in questo condominio'}</small></span>
              </button>
              <button type="button" role="radio" aria-checked={method === 'bonifico'} className={`pay-method${method === 'bonifico' ? ' is-on' : ''}`} onClick={() => setMethod('bonifico')}>
                <Landmark size={22} aria-hidden="true" />
                <span><strong>Bonifico</strong><small>L&apos;amministratore conferma il pagamento</small></span>
              </button>
            </div>

            {method === 'online' ? (
              <button type="button" className="ep-save" disabled={!chosen.length || busy} onClick={payOnline}>
                {busy ? 'Apro il pagamento sicuro…' : `Paga ${euro(total)}`}
              </button>
            ) : !settings?.iban ? (
              <p className="auth-err">L&apos;amministratore non ha ancora inserito l&apos;IBAN del condominio. Chiedigli i dati per il bonifico in chat.</p>
            ) : (
              <>
                <div className="pay-bank">
                  {[
                    ['Intestatario', settings.holder || 'Condominio', 'holder'],
                    ['IBAN', formatIban(settings.iban), 'iban'],
                    ['Importo', euro(total), 'amount'],
                    ['Causale', causale, 'causale'],
                  ].map(([label, value, k]) => (
                    <div key={k} className="pay-bank-row">
                      <span style={{ minWidth: 0 }}><small>{label}</small><strong>{value}</strong></span>
                      <button type="button" onClick={() => copy(k, k === 'amount' ? total.toFixed(2).replace('.', ',') : k === 'iban' ? settings.iban : value)} aria-label={`Copia ${label}`}>
                        {copied === k ? <Check size={18} aria-hidden="true" /> : <Copy size={18} aria-hidden="true" />}
                      </button>
                    </div>
                  ))}
                  {settings.bank_name && <p className="pay-note"><Building2 size={14} aria-hidden="true" />{settings.bank_name}</p>}
                  <p className="pay-note">Copia la causale così com&apos;è: contiene il codice delle rate e il pagamento viene riconosciuto in automatico.</p>
                </div>
                <button type="button" className="ep-save" disabled={!chosen.length || busy} onClick={reported}>
                  {busy ? 'Invio…' : 'Ho fatto il bonifico'}
                </button>
              </>
            )}
            {err && <p className="auth-err" style={{ marginTop: 10 }}>{err}</p>}
          </>
        )}
      </div>
    </div>
  )
}
