'use client'

import { useMemo, useState } from 'react'
import { AlertTriangle, ArrowRight, BarChart3, CheckCircle2, Clock3, Coins, Lock, ReceiptText } from 'lucide-react'
import { useMyAccount } from '@/hooks/useAccounting'
import { SPESA_CATEGORIES, categoryOf, euro, fmtDay, isOverdue, todayISO } from '@/lib/accounting'
import PayNowSheet from '@/components/condo/accounting/PayNowSheet'
import { ReceiptSheet, ReceiptsBox } from '@/components/condo/accounting/Receipts'
import { CHARGE_STATUS, statusKey } from '@/lib/accounting'

// Prima sezione privata della Bacheca: situazione economica del condomino.
export default function Rendicontazione({ building }) {
  const acc = useMyAccount(building.id)
  const [payOpen, setPayOpen] = useState(false)
  const [showAllPaid, setShowAllPaid] = useState(false)
  const [showItems, setShowItems] = useState(false)
  const [receiptFor, setReceiptFor] = useState(null) // ids preselezionati
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
      yearCharges: acc.charges.filter((c) => c.due_date.startsWith(today.slice(0, 4))),
    }
  }, [acc.charges, acc.budget, today])

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
                {view.installment != null ? <b>{euro(view.installment)}<em> / {perInst}</em></b> : <b style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-3)', whiteSpace: 'normal' }}>Preventivo non ancora caricato</b>}
              </span>
            </div>
          </div>

          <div className="rc-box">
            <div className="rc-box-head">
              <span><BarChart3 size={20} aria-hidden="true" />Riepilogo spese <em>(anno {acc.budget?.year || today.slice(0, 4)})</em></span>
              {(items.length > 0 || view.yearCharges.length > 0) && (
                <button type="button" className="rc-link" onClick={() => setShowItems((v) => !v)} aria-expanded={showItems}>
                  {showItems ? 'Chiudi' : 'Vedi dettaglio'}<ArrowRight size={16} aria-hidden="true" style={{ transform: showItems ? 'rotate(90deg)' : 'none', transition: 'transform .15s' }} />
                </button>
              )}
            </div>

            <YearSummary charges={view.yearCharges} />

            {items.length > 0 ? (
              <div className="rc-spese" style={{ marginTop: 6 }}>
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
            ) : (
              <p className="rc-muted" style={{ margin: '4px 0 0', fontSize: 13 }}>Il preventivo del condominio non è ancora stato caricato: qui sotto trovi le spese che ti sono state addebitate.</p>
            )}

            {showItems && items.length > 0 && (
              <ul className="rc-items">
                {[...items].sort((x, y) => x.position - y.position).map((i) => (
                  <li key={i.id}>
                    <span className="rc-dot" style={{ background: categoryOf(i.category).color }} />
                    <span style={{ flex: 1, minWidth: 0 }}>{i.label}<small>{categoryOf(i.category).label}</small></span>
                    <b>{euro(i.amount)}</b>
                  </li>
                ))}
              </ul>
            )}
            {(showItems || items.length === 0) && view.yearCharges.length > 0 && (
              <ul className="rc-lines" style={{ marginTop: 8 }}>
                {view.yearCharges.map((c) => {
                  const st = CHARGE_STATUS[statusKey(c, today)]
                  return (
                    <li key={c.id}>
                      <span style={{ flex: 1, minWidth: 0 }}><strong>{c.title}</strong><small>Scadenza {fmtDay(c.due_date)}</small></span>
                      <span style={{ textAlign: 'right' }}><b>{euro(c.amount)}</b><span className="acc-pill" style={{ display: 'block', width: 'fit-content', marginLeft: 'auto', background: st.bg, color: st.fg }}>{st.label}</span></span>
                    </li>
                  )
                })}
              </ul>
            )}
            {view.myYearly > 0 && <p className="rc-share">La tua quota per il {acc.budget.year}: <b>{euro(view.myYearly)}</b></p>}
          </div>

          <ReceiptsBox receipts={acc.receipts} canUpload={view.open.length + view.pending.length > 0}
            onUpload={() => setReceiptFor(view.overdue.map((c) => c.id))} />

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
          onReport={acc.reportTransfer} onCheckout={acc.startCheckout}
          onUploadReceipt={(ids) => { setPayOpen(false); setReceiptFor(ids) }} />
      )}
      {receiptFor && (
        <ReceiptSheet charges={[...view.open, ...view.pending].sort((a, b) => a.due_date.localeCompare(b.due_date))} preselected={receiptFor}
          onClose={() => setReceiptFor(null)} onSubmit={acc.submitReceipt} />
      )}
    </section>
  )
}

function YearSummary({ charges }) {
  if (!charges.length) return null
  const sum = (l) => l.reduce((n, c) => n + Number(c.amount), 0)
  const live = charges.filter((c) => c.status !== 'cancelled')
  const paid = live.filter((c) => c.status === 'paid')
  const due = live.filter((c) => c.status !== 'paid')
  return (
    <div className="rc-sum">
      <div><small>Totale addebitato</small><b>{euro(sum(live))}</b></div>
      <div><small>Pagato</small><b style={{ color: '#067647' }}>{euro(sum(paid))}</b></div>
      <div><small>Da pagare</small><b style={{ color: due.length ? '#C4320A' : undefined }}>{euro(sum(due))}</b></div>
    </div>
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
      <span className="rc-donut-c"><b>{euro(total)}</b><small>Totale spese</small></span>
    </div>
  )
}
