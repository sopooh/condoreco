'use client'

import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, ArrowRight, BarChart3, CheckCircle2, Clock3, Coins, Lock, ReceiptText } from 'lucide-react'
import { useMyAccount } from '@/hooks/useAccounting'
import { SPESA_CATEGORIES, categoryOf, euro, fmtDay, isOverdue, todayISO } from '@/lib/accounting'
import PayNowSheet from '@/components/condo/accounting/PayNowSheet'

// Prima sezione privata della Bacheca: situazione economica del condomino.
export default function Rendicontazione({ building }) {
  const acc = useMyAccount(building.id)
  const [payOpen, setPayOpen] = useState(false)
  const [showAllPaid, setShowAllPaid] = useState(false)
  // ritorno da Stripe: ?pagamento=ok | annullato
  const [returned] = useState(() => (typeof window === 'undefined' ? null : new URLSearchParams(window.location.search).get('pagamento')))
  const today = todayISO()

  const view = useMemo(() => {
    const open = acc.charges.filter((c) => c.status === 'open')
    const overdue = open.filter((c) => isOverdue(c, today))
    const pending = acc.charges.filter((c) => c.status === 'pending')
    const paid = acc.charges.filter((c) => c.status === 'paid').sort((a, b) => (b.paid_at || '').localeCompare(a.paid_at || ''))
    const next = open.find((c) => c.due_date >= today)
    const sum = (l) => l.reduce((n, c) => n + Number(c.amount), 0)
    const budgetCharges = acc.budget ? acc.charges.filter((c) => c.budget_id === acc.budget.id) : []
    return {
      open, overdue, pending, paid, next,
      overdueSum: sum(overdue), pendingSum: sum(pending),
      installment: budgetCharges[0]?.amount ?? null,
      myYearly: sum(budgetCharges),
    }
  }, [acc.charges, acc.budget, today])

  // arrivo dalla scheda "Rendicontazione" della home del condominio
  useEffect(() => {
    if (!acc.loading && window.location.hash === '#rendicontazione') document.getElementById('rendicontazione')?.scrollIntoView({ block: 'start' })
  }, [acc.loading])

  if (acc.loading) return <section className="rc"><p className="rc-muted">Caricamento della rendicontazione…</p></section>

  const items = acc.budget?.condo_budget_items || []
  const total = items.reduce((n, i) => n + Number(i.amount), 0)
  const perInst = acc.budget ? ({ 12: 'mese', 6: 'bimestre', 4: 'trimestre', 3: 'quadrimestre', 2: 'semestre', 1: 'anno' })[acc.budget.installments] : 'mese'
  const empty = !acc.charges.length && !acc.budget

  return (
    <section className="rc" id="rendicontazione" aria-labelledby="rc-title">
      <header className="rc-head">
        <span className="rc-head-ico"><Coins size={28} strokeWidth={1.8} aria-hidden="true" /></span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h2 id="rc-title">Rendicontazione</h2>
          <p>La tua situazione economica condominiale</p>
        </div>
        <span className="rc-private"><Lock size={14} strokeWidth={2.2} aria-hidden="true" />Privata</span>
      </header>

      {returned === 'ok' && <p className="rc-pending" style={{ background: '#ECFDF3', color: '#067647' }}><CheckCircle2 size={16} aria-hidden="true" />Pagamento ricevuto. La rata risulta pagata appena Stripe lo conferma, di solito in pochi secondi.</p>}
      {returned === 'annullato' && <p className="rc-pending" style={{ background: '#FFF7E6', color: '#8A5A00' }}>Pagamento annullato: non è stato addebitato nulla.</p>}

      {empty ? (
        <p className="rc-muted" style={{ marginTop: 14 }}>L&apos;amministratore non ha ancora caricato il preventivo e le quote. Appena lo fa, qui trovi rate, scadenze e pagamenti.</p>
      ) : (
        <>
          {view.overdue.length > 0 ? (
            <div className="rc-alert is-danger">
              <AlertTriangle size={30} strokeWidth={1.8} aria-hidden="true" className="rc-alert-ico" />
              <div style={{ flex: 1, minWidth: 0 }}>
                <strong>Quote arretrate</strong>
                <span>Importo: <b>{euro(view.overdueSum)}</b></span>
                <span>Scadenza: {fmtDay(view.overdue[0].due_date)}{view.overdue.length > 1 ? ` (${view.overdue.length} rate)` : ''}</span>
              </div>
              <button type="button" className="rc-pay is-danger" onClick={() => setPayOpen(true)}>Paga ora<ArrowRight size={18} aria-hidden="true" /></button>
            </div>
          ) : view.next ? (
            <div className="rc-alert">
              <Clock3 size={28} strokeWidth={1.8} aria-hidden="true" className="rc-alert-ico" />
              <div style={{ flex: 1, minWidth: 0 }}>
                <strong>Prossima rata</strong>
                <span><b>{euro(view.next.amount)}</b> entro il {fmtDay(view.next.due_date)}</span>
              </div>
              <button type="button" className="rc-pay" onClick={() => setPayOpen(true)}>Paga<ArrowRight size={18} aria-hidden="true" /></button>
            </div>
          ) : (
            <div className="rc-alert is-ok">
              <CheckCircle2 size={28} strokeWidth={1.8} aria-hidden="true" className="rc-alert-ico" />
              <div><strong>Sei in regola</strong><span>Nessuna rata da pagare.</span></div>
            </div>
          )}

          {view.pending.length > 0 && (
            <p className="rc-pending"><Clock3 size={16} aria-hidden="true" />Bonifico di {euro(view.pendingSum)} in attesa di conferma dall&apos;amministratore.</p>
          )}

          <div className="rc-tiles">
            <div className="rc-tile">
              <span className={`rc-tile-ico${view.overdueSum ? ' is-danger' : ''}`}><ReceiptText size={24} strokeWidth={1.8} aria-hidden="true" /></span>
              <span>
                <small>Saldo corrente</small>
                <b className={view.overdueSum ? 'is-danger' : 'is-ok'}>{view.overdueSum ? `- ${euro(view.overdueSum)}` : euro(0)}</b>
              </span>
            </div>
            <div className="rc-tile">
              <span className="rc-tile-ico"><Coins size={24} strokeWidth={1.8} aria-hidden="true" /></span>
              <span>
                <small>Quote condominiali</small>
                <b>{view.installment != null ? euro(view.installment) : '–'}<em> / {perInst}</em></b>
              </span>
            </div>
          </div>

          {acc.budget && items.length > 0 && (
            <div className="rc-box">
              <div className="rc-box-head">
                <span><BarChart3 size={20} aria-hidden="true" />Riepilogo spese <em>(anno {acc.budget.year})</em></span>
              </div>
              <div className="rc-spese">
                <Donut items={items} total={total} />
                <ul className="rc-legend">
                  {SPESA_CATEGORIES.map((cat) => {
                    const amt = items.filter((i) => i.category === cat.id).reduce((n, i) => n + Number(i.amount), 0)
                    if (!amt) return null
                    return (
                      <li key={cat.id}>
                        <span className="rc-dot" style={{ background: cat.color }} />
                        <span className="rc-legend-l">{cat.label}</span>
                        <span className="rc-legend-a">{euro(amt)}</span>
                        <span className="rc-legend-p">{Math.round((amt / total) * 100)}%</span>
                      </li>
                    )
                  })}
                </ul>
              </div>
              {view.myYearly > 0 && <p className="rc-share">La tua quota per il {acc.budget.year}: <b>{euro(view.myYearly)}</b></p>}
            </div>
          )}

          <div className="rc-box">
            <div className="rc-box-head">
              <span><CheckCircle2 size={20} aria-hidden="true" />Pagamenti effettuati</span>
              {view.paid.length > 3 && (
                <button type="button" className="rc-link" onClick={() => setShowAllPaid((v) => !v)}>
                  {showAllPaid ? 'Mostra meno' : 'Vedi tutti'}<ArrowRight size={16} aria-hidden="true" />
                </button>
              )}
            </div>
            {view.paid.length === 0 ? <p className="rc-muted">Ancora nessun pagamento registrato.</p> : (
              <ul className="rc-paid">
                {(showAllPaid ? view.paid : view.paid.slice(0, 3)).map((c) => (
                  <li key={c.id}>
                    <span className="rc-check"><CheckCircle2 size={20} aria-hidden="true" /></span>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <strong>{c.title}</strong>
                      <small>Pagato il {fmtDay(c.paid_at)}</small>
                    </span>
                    <b>{euro(c.paid_amount ?? c.amount)}</b>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}

      {payOpen && (
        <PayNowSheet charges={view.open} overdueIds={view.overdue.map((c) => c.id)} settings={acc.settings}
          onClose={() => setPayOpen(false)}
          onReport={acc.reportTransfer} onCheckout={acc.startCheckout} />
      )}
    </section>
  )
}

function Donut({ items, total }) {
  const R = 52, C = 2 * Math.PI * R
  const amounts = SPESA_CATEGORIES.map((cat) => ({ cat, amt: items.filter((i) => i.category === cat.id).reduce((n, i) => n + Number(i.amount), 0) })).filter((x) => x.amt > 0)
  const segs = amounts.map((x, i) => ({
    color: categoryOf(x.cat.id).color,
    len: (x.amt / total) * C,
    offset: amounts.slice(0, i).reduce((n, y) => n + (y.amt / total) * C, 0),
  }))
  return (
    <div className="rc-donut">
      <svg viewBox="0 0 140 140" aria-hidden="true">
        <circle cx="70" cy="70" r={R} fill="none" stroke="#EEF2F2" strokeWidth="22" />
        {segs.map((s, i) => (
          <circle key={i} cx="70" cy="70" r={R} fill="none" stroke={s.color} strokeWidth="22"
            strokeDasharray={`${Math.max(0, s.len - 1.5)} ${C}`} strokeDashoffset={-s.offset} transform="rotate(-90 70 70)" />
        ))}
      </svg>
      <span className="rc-donut-c"><b>{euro(total, { maximumFractionDigits: 0, minimumFractionDigits: 0 })}</b><small>Totale spese</small></span>
    </div>
  )
}
