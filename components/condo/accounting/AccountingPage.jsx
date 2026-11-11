'use client'

import { Suspense, useMemo, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { AlertTriangle, Check, CheckCircle2, ChevronDown, Clock3, CreditCard, FileSpreadsheet, Landmark, Plus, Search, Settings, Trash2, Upload, Wallet, X } from 'lucide-react'
import { useAccountingAdmin } from '@/hooks/useAccounting'
import { useCondoRole } from '@/hooks/useCondoRole'
import { createClient } from '@/lib/supabase/client'
import { CHARGE_STATUS, METHOD_LABEL, SPESA_CATEGORIES, categoryOf, euro, fmtDay, formatIban, isOverdue, matchMovements, normalizeIban, readBankFile, statusKey, todayISO } from '@/lib/accounting'

const TABS = [
  { id: 'panoramica', label: 'Panoramica', icon: Wallet },
  { id: 'rate', label: 'Rate', icon: CreditCard },
  { id: 'preventivo', label: 'Preventivo', icon: FileSpreadsheet },
  { id: 'importa', label: 'Estratto conto', icon: Upload },
  { id: 'impostazioni', label: 'Impostazioni', icon: Settings },
]

export default function AccountingPage({ building }) {
  return (
    <Suspense fallback={<p style={{ padding: 24, color: 'var(--text-3)' }}>Caricamento…</p>}>
      <Inner building={building} />
    </Suspense>
  )
}

function Inner({ building }) {
  const base = `/edificio/${building.id}/condominio`
  const { isCondoAdmin, loading: roleLoading } = useCondoRole(building.id)
  const acc = useAccountingAdmin(isCondoAdmin ? building.id : null)
  const sp = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const tab = TABS.some((t) => t.id === sp.get('tab')) ? sp.get('tab') : 'panoramica'
  const go = (id) => router.replace(`${pathname}?tab=${id}`, { scroll: false })
  const names = useMemo(() => Object.fromEntries(acc.members.map((m) => [m.user_id, m.display_name || 'Condomino'])), [acc.members])

  if (roleLoading) return <p style={{ padding: 24, color: 'var(--text-3)' }}>Caricamento…</p>
  if (!isCondoAdmin) {
    return (
      <div className="acc-wrap">
        <Link href={`${base}/bacheca`} className="acc-back">‹ Torna alla bacheca</Link>
        <p className="rc-muted">La contabilità è riservata all&apos;amministratore. La tua situazione è nella Bacheca, sezione Rendicontazione.</p>
      </div>
    )
  }

  return (
    <div className="acc-wrap">
      <Link href={base} className="acc-back">‹ Torna al condominio</Link>
      <header style={{ marginBottom: 14 }}>
        <h1 className="acc-h1">Contabilità</h1>
        <p className="rc-muted" style={{ margin: 0 }}>{building.address}{building.street_number ? `, ${building.street_number}` : ''}</p>
      </header>

      <nav className="acc-tabs" aria-label="Sezioni contabilità">
        {TABS.map((t) => (
          <button key={t.id} type="button" className={tab === t.id ? 'is-on' : ''} aria-current={tab === t.id ? 'page' : undefined} onClick={() => go(t.id)}>
            <t.icon size={18} aria-hidden="true" />{t.label}
          </button>
        ))}
      </nav>

      {acc.loading ? <p className="rc-muted">Caricamento…</p> : acc.error ? <p className="auth-err">{acc.error}</p> : (
        <>
          {tab === 'panoramica' && <Overview acc={acc} names={names} go={go} />}
          {tab === 'rate' && <Charges acc={acc} names={names} />}
          {tab === 'preventivo' && <Budgets acc={acc} />}
          {tab === 'importa' && <BankImport acc={acc} names={names} />}
          {tab === 'impostazioni' && <SettingsTab acc={acc} buildingId={building.id} />}
        </>
      )}
    </div>
  )
}

/* ───────────── Panoramica ───────────── */

function Overview({ acc, names, go }) {
  const today = todayISO()
  const year = new Date().getFullYear()
  const live = acc.charges.filter((c) => c.status !== 'cancelled')
  const sum = (l) => l.reduce((n, c) => n + Number(c.amount), 0)
  const paidYear = live.filter((c) => c.status === 'paid' && (c.paid_at || '').startsWith(String(year)))
  const overdue = live.filter((c) => isOverdue(c, today))
  const pending = live.filter((c) => c.status === 'pending')
  const toCollect = live.filter((c) => c.status === 'open' || c.status === 'pending')
  const debtors = Object.values(overdue.reduce((acc2, c) => {
    (acc2[c.user_id] ??= { user_id: c.user_id, total: 0, n: 0, oldest: c.due_date, ids: [] })
    const d = acc2[c.user_id]; d.total += Number(c.amount); d.n += 1; d.ids.push(c.id); if (c.due_date < d.oldest) d.oldest = c.due_date
    return acc2
  }, {})).sort((a, b) => b.total - a.total)

  if (!acc.charges.length) {
    return (
      <div className="acc-card acc-empty">
        <FileSpreadsheet size={30} aria-hidden="true" />
        <strong>Inizia dal preventivo</strong>
        <p>Inserisci le spese previste dell&apos;anno per voce: le quote di ogni condomino vengono calcolate dai millesimi e divise in rate.</p>
        <button type="button" className="p2-btn" onClick={() => go('preventivo')}><Plus size={18} aria-hidden="true" />Crea il preventivo</button>
      </div>
    )
  }

  return (
    <>
      <div className="acc-kpis">
        <Kpi label={`Incassato ${year}`} value={euro(sum(paidYear))} tone="ok" icon={<CheckCircle2 size={20} />} />
        <Kpi label="Da incassare" value={euro(sum(toCollect))} icon={<Wallet size={20} />} />
        <Kpi label="Scaduto" value={euro(sum(overdue))} sub={`${debtors.length} condomin${debtors.length === 1 ? 'o' : 'i'}`} tone={overdue.length ? 'danger' : undefined} icon={<AlertTriangle size={20} />} />
        <Kpi label="Bonifici da confermare" value={String(pending.length)} sub={pending.length ? euro(sum(pending)) : 'nessuno'} tone={pending.length ? 'info' : undefined} icon={<Clock3 size={20} />} />
      </div>

      {pending.length > 0 && (
        <div className="acc-card">
          <h2 className="acc-h2">Bonifici da confermare</h2>
          <p className="rc-muted" style={{ marginTop: 0 }}>Il condomino dice di aver pagato. Conferma quando vedi l&apos;accredito sul conto, oppure importa l&apos;estratto conto.</p>
          <ul className="acc-list">
            {pending.map((c) => (
              <li key={c.id}>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <strong>{names[c.user_id] || 'Condomino'}</strong>
                  <small>{c.title} · segnalato il {fmtDay(c.reported_at)}</small>
                </span>
                <b>{euro(c.amount)}</b>
                <span className="acc-actions">
                  <button type="button" className="acc-btn is-primary" onClick={() => acc.markPaid([c.id], 'bonifico')}><Check size={16} aria-hidden="true" />Conferma</button>
                  <button type="button" className="acc-btn" onClick={() => acc.setStatus(c.id, 'open')}>Non arrivato</button>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="acc-card">
        <h2 className="acc-h2">Quote arretrate</h2>
        {debtors.length === 0 ? <p className="rc-muted">Nessun arretrato: tutti in regola.</p> : (
          <ul className="acc-list">
            {debtors.map((d) => (
              <li key={d.user_id}>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <strong>{names[d.user_id] || 'Condomino'}</strong>
                  <small>{d.n} rat{d.n === 1 ? 'a' : 'e'} · la più vecchia scaduta il {fmtDay(d.oldest)}</small>
                </span>
                <b className="is-danger">{euro(d.total)}</b>
                <span className="acc-actions">
                  <button type="button" className="acc-btn" onClick={() => acc.markPaid(d.ids, 'bonifico')}>Segna tutto pagato</button>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  )
}

function Kpi({ label, value, sub, tone, icon }) {
  return (
    <div className={`acc-kpi${tone ? ` is-${tone}` : ''}`}>
      <span className="acc-kpi-ico">{icon}</span>
      <small>{label}</small>
      <b>{value}</b>
      {sub && <em>{sub}</em>}
    </div>
  )
}

/* ───────────── Rate ───────────── */

const FILTERS = [
  { id: 'todo', label: 'Da incassare' },
  { id: 'overdue', label: 'Scadute' },
  { id: 'pending', label: 'Da confermare' },
  { id: 'paid', label: 'Pagate' },
  { id: 'all', label: 'Tutte' },
]

function Charges({ acc, names }) {
  const today = todayISO()
  const [filter, setFilter] = useState('todo')
  const [q, setQ] = useState('')
  const [sel, setSel] = useState(() => new Set())
  const [payFor, setPayFor] = useState(null) // ids
  const [adding, setAdding] = useState(false)
  const [msg, setMsg] = useState(null)

  const list = acc.charges.filter((c) => {
    if (filter === 'todo' && !['open', 'pending'].includes(c.status)) return false
    if (filter === 'overdue' && !isOverdue(c, today)) return false
    if (filter === 'pending' && c.status !== 'pending') return false
    if (filter === 'paid' && c.status !== 'paid') return false
    const needle = q.trim().toLowerCase()
    return !needle || `${names[c.user_id]} ${c.title} ${c.code}`.toLowerCase().includes(needle)
  })
  const selectable = list.filter((c) => c.status === 'open' || c.status === 'pending')
  const toggle = (id) => setSel((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n })

  return (
    <>
      <div className="acc-toolbar">
        <label className="acc-search"><Search size={18} aria-hidden="true" /><input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cerca condomino o rata" /></label>
        <button type="button" className="acc-btn is-primary" onClick={() => setAdding(true)}><Plus size={16} aria-hidden="true" />Spesa singola</button>
      </div>
      <div className="p2-chips" style={{ marginBottom: 12 }}>
        {FILTERS.map((f) => <button key={f.id} type="button" className={`p2-chip${filter === f.id ? ' is-on' : ''}`} onClick={() => { setFilter(f.id); setSel(new Set()) }}>{f.label}</button>)}
      </div>

      {sel.size > 0 && (
        <div className="acc-bulk">
          <span>{sel.size} selezionat{sel.size === 1 ? 'a' : 'e'} · {euro(acc.charges.filter((c) => sel.has(c.id)).reduce((n, c) => n + Number(c.amount), 0))}</span>
          <button type="button" className="acc-btn is-primary" onClick={() => setPayFor([...sel])}><Check size={16} aria-hidden="true" />Segna pagate</button>
          <button type="button" className="acc-btn" onClick={() => setSel(new Set())}>Annulla</button>
        </div>
      )}
      {msg && <p className="acc-msg">{msg}</p>}

      <div className="acc-card" style={{ padding: 0 }}>
        {list.length === 0 ? <p className="rc-muted" style={{ padding: 18 }}>Nessuna rata in questo elenco.</p> : (
          <ul className="acc-rows">
            {selectable.length > 1 && (
              <li className="acc-rows-head">
                <label><input type="checkbox" checked={selectable.every((c) => sel.has(c.id))} onChange={(e) => setSel(e.target.checked ? new Set(selectable.map((c) => c.id)) : new Set())} /> Seleziona tutte</label>
              </li>
            )}
            {list.map((c) => {
              const st = CHARGE_STATUS[statusKey(c, today)]
              const canPay = c.status === 'open' || c.status === 'pending'
              return (
                <li key={c.id}>
                  {canPay ? <input type="checkbox" checked={sel.has(c.id)} onChange={() => toggle(c.id)} aria-label={`Seleziona ${c.title}`} /> : <span style={{ width: 18 }} />}
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <strong>{names[c.user_id] || 'Condomino'}</strong>
                    <small>{c.title} · scad. {fmtDay(c.due_date)} · CR-{c.code}</small>
                    {c.status === 'paid' && <small>Pagata il {fmtDay(c.paid_at)} · {METHOD_LABEL[c.payment_method] || ''}</small>}
                  </span>
                  <span style={{ textAlign: 'right' }}>
                    <b>{euro(c.amount)}</b>
                    <span className="acc-pill" style={{ background: st.bg, color: st.fg }}>{st.label}</span>
                  </span>
                  <RowMenu c={c} onPay={() => setPayFor([c.id])} acc={acc} onDone={setMsg} />
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {payFor && <MarkPaidSheet count={payFor.length} onClose={() => setPayFor(null)}
        onSave={async (method, day) => { const r = await acc.markPaid(payFor, method, day); if (!r.error) { setPayFor(null); setSel(new Set()); setMsg(`${r.data} rat${r.data === 1 ? 'a segnata pagata' : 'e segnate pagate'}.`) } return r.error }} />}
      {adding && <AddChargeSheet members={acc.members} onClose={() => setAdding(false)}
        onSave={async (v) => { const r = await acc.addCharge(v); if (!r.error) { setAdding(false); setMsg(`${r.data} rat${r.data === 1 ? 'a creata' : 'e create'}.`) } return r.error }} />}
    </>
  )
}

function RowMenu({ c, onPay, acc, onDone }) {
  const [open, setOpen] = useState(false)
  return (
    <span style={{ position: 'relative' }}>
      <button type="button" className="acc-more" onClick={() => setOpen((v) => !v)} aria-label="Azioni" aria-expanded={open}><ChevronDown size={18} /></button>
      {open && (
        <span className="acc-menu" onMouseLeave={() => setOpen(false)}>
          {(c.status === 'open' || c.status === 'pending') && <button type="button" onClick={() => { setOpen(false); onPay() }}>Segna pagata</button>}
          {c.status === 'pending' && <button type="button" onClick={async () => { setOpen(false); await acc.setStatus(c.id, 'open'); onDone('Bonifico segnato come non arrivato.') }}>Bonifico non arrivato</button>}
          {c.status === 'paid' && <button type="button" onClick={async () => { setOpen(false); await acc.setStatus(c.id, 'open'); onDone('Rata riportata a da pagare.') }}>Riporta a da pagare</button>}
          {c.status !== 'cancelled' && c.status !== 'paid' && <button type="button" className="is-danger" onClick={async () => { setOpen(false); await acc.setStatus(c.id, 'cancelled'); onDone('Rata annullata.') }}>Annulla rata</button>}
          {c.status === 'cancelled' && <button type="button" onClick={async () => { setOpen(false); await acc.setStatus(c.id, 'open'); onDone('Rata ripristinata.') }}>Ripristina</button>}
        </span>
      )}
    </span>
  )
}

function SheetShell({ title, kicker, onClose, children }) {
  return (
    <div className="dir-sheet-wrap" role="dialog" aria-modal="true" aria-label={title}>
      <div className="dir-sheet-backdrop" onClick={onClose} />
      <div className="dir-sheet" style={{ maxHeight: '92vh', overflowY: 'auto', maxWidth: 520 }}>
        <div className="dir-sheet-head">
          <div>{kicker && <div className="dir-sheet-kicker">{kicker}</div>}<div className="dir-sheet-title">{title}</div></div>
          <button type="button" className="dir-sheet-close" onClick={onClose} aria-label="Chiudi"><X size={22} /></button>
        </div>
        {children}
      </div>
    </div>
  )
}

function MarkPaidSheet({ count, onClose, onSave }) {
  const [method, setMethod] = useState('bonifico')
  const [day, setDay] = useState(todayISO())
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)
  return (
    <SheetShell title={count === 1 ? 'Segna pagata' : `Segna pagate (${count})`} onClose={onClose}>
      <span className="ep-label">Come è stato pagato</span>
      <div className="p2-chips" style={{ marginBottom: 14 }}>
        {['bonifico', 'contanti', 'carta', 'paypal', 'altro'].map((m) => <button key={m} type="button" className={`p2-chip${method === m ? ' is-on' : ''}`} onClick={() => setMethod(m)}>{METHOD_LABEL[m]}</button>)}
      </div>
      <label className="ep-field"><span className="ep-label">Data del pagamento</span>
        <span className="ep-input"><input type="date" value={day} max={todayISO()} onChange={(e) => setDay(e.target.value)} /></span>
      </label>
      {err && <p className="auth-err">{err}</p>}
      <button type="button" className="ep-save" disabled={busy} onClick={async () => { setBusy(true); const e = await onSave(method, day); setBusy(false); if (e) setErr(e) }}>
        {busy ? 'Salvataggio…' : 'Conferma pagamento'}
      </button>
    </SheetShell>
  )
}

function AddChargeSheet({ members, onClose, onSave }) {
  const [v, setV] = useState({ title: '', amount: '', due: todayISO(), split: true, userId: '' })
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)
  const set = (k) => (e) => setV((x) => ({ ...x, [k]: e.target.value }))
  async function submit(e) {
    e.preventDefault()
    const amount = Number(String(v.amount).replace(',', '.'))
    if (v.title.trim().length < 2) return setErr('Scrivi a cosa si riferisce la spesa.')
    if (!(amount > 0)) return setErr('Importo non valido.')
    if (!v.split && !v.userId) return setErr('Scegli il condomino.')
    setBusy(true); setErr(null)
    const e2 = await onSave({ title: v.title.trim(), amount, due: v.due, split: v.split, userId: v.userId })
    setBusy(false)
    if (e2) setErr(e2)
  }
  return (
    <SheetShell title="Spesa singola" kicker="Conguaglio, straordinaria, rimborso" onClose={onClose}>
      <form onSubmit={submit}>
        <label className="ep-field"><span className="ep-label">Descrizione</span>
          <span className="ep-input"><input value={v.title} onChange={set('title')} maxLength={160} placeholder="Es. Conguaglio 2025" /></span>
        </label>
        <div className="ep-row2" style={{ gridTemplateColumns: '1fr 1fr' }}>
          <label className="ep-field"><span className="ep-label">{v.split ? 'Importo totale' : 'Importo'}</span>
            <span className="ep-input"><span className="ep-prefix">€</span><input inputMode="decimal" value={v.amount} onChange={set('amount')} placeholder="0,00" /></span>
          </label>
          <label className="ep-field"><span className="ep-label">Scadenza</span>
            <span className="ep-input"><input type="date" value={v.due} onChange={set('due')} /></span>
          </label>
        </div>
        <span className="ep-label">A chi</span>
        <div className="p2-chips" style={{ marginBottom: 12 }}>
          <button type="button" className={`p2-chip${v.split ? ' is-on' : ''}`} onClick={() => setV((x) => ({ ...x, split: true }))}>A tutti, in millesimi</button>
          <button type="button" className={`p2-chip${!v.split ? ' is-on' : ''}`} onClick={() => setV((x) => ({ ...x, split: false }))}>A un condomino</button>
        </div>
        {!v.split && (
          <label className="ep-field"><span className="ep-label">Condomino</span>
            <span className="ep-input"><select value={v.userId} onChange={set('userId')}>
              <option value="">Scegli…</option>
              {members.map((m) => <option key={m.user_id} value={m.user_id}>{m.display_name || 'Condomino'}{m.millesimi ? ` · ${Number(m.millesimi)}‰` : ''}</option>)}
            </select></span>
          </label>
        )}
        {err && <p className="auth-err">{err}</p>}
        <button type="submit" className="ep-save" disabled={busy}>{busy ? 'Creazione…' : 'Crea'}</button>
      </form>
    </SheetShell>
  )
}

/* ───────────── Preventivo ───────────── */

function Budgets({ acc }) {
  const [creating, setCreating] = useState(false)
  const [openId, setOpenId] = useState(() => acc.budgets.find((b) => b.status === 'draft')?.id || acc.budgets[0]?.id || null)
  return (
    <>
      <div className="acc-toolbar">
        <p className="rc-muted" style={{ margin: 0, flex: 1 }}>Le voci del preventivo diventano le rate di ogni proprietario, in base ai millesimi dichiarati.</p>
        <button type="button" className="acc-btn is-primary" onClick={() => setCreating(true)}><Plus size={16} aria-hidden="true" />Nuovo preventivo</button>
      </div>
      {acc.budgets.length === 0 && !creating && <div className="acc-card"><p className="rc-muted" style={{ margin: 0 }}>Nessun preventivo. Creane uno per l&apos;anno in corso.</p></div>}
      {acc.budgets.map((b) => <BudgetCard key={b.id} b={b} acc={acc} open={openId === b.id} onToggle={() => setOpenId(openId === b.id ? null : b.id)} />)}
      {creating && <NewBudgetSheet onClose={() => setCreating(false)}
        onSave={async (v) => { const r = await acc.createBudget(v); if (!r.error) { setCreating(false); setOpenId(r.data?.id) } return r.error }} />}
    </>
  )
}

function NewBudgetSheet({ onClose, onSave }) {
  const y = new Date().getFullYear()
  const [v, setV] = useState({ year: y, title: 'Preventivo ordinario', installments: 12, first_due: `${y}-01-10` })
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)
  return (
    <SheetShell title="Nuovo preventivo" onClose={onClose}>
      <div className="ep-row2" style={{ gridTemplateColumns: '1fr 2fr' }}>
        <label className="ep-field"><span className="ep-label">Anno</span>
          <span className="ep-input"><input type="number" value={v.year} min={2020} max={2100} onChange={(e) => setV({ ...v, year: Number(e.target.value), first_due: `${e.target.value}-01-10` })} /></span>
        </label>
        <label className="ep-field"><span className="ep-label">Nome</span>
          <span className="ep-input"><input value={v.title} onChange={(e) => setV({ ...v, title: e.target.value })} maxLength={120} /></span>
        </label>
      </div>
      <span className="ep-label">Rate</span>
      <div className="p2-chips" style={{ marginBottom: 12 }}>
        {[[12, 'Mensili'], [4, 'Trimestrali'], [2, 'Semestrali'], [1, 'Unica']].map(([n, l]) => <button key={n} type="button" className={`p2-chip${v.installments === n ? ' is-on' : ''}`} onClick={() => setV({ ...v, installments: n })}>{l}</button>)}
      </div>
      <label className="ep-field"><span className="ep-label">Scadenza della prima rata</span>
        <span className="ep-input"><input type="date" value={v.first_due} onChange={(e) => setV({ ...v, first_due: e.target.value })} /></span>
      </label>
      {err && <p className="auth-err">{err}</p>}
      <button type="button" className="ep-save" disabled={busy} onClick={async () => { setBusy(true); const e = await onSave(v); setBusy(false); if (e) setErr(e) }}>{busy ? 'Creazione…' : 'Crea preventivo'}</button>
    </SheetShell>
  )
}

function BudgetCard({ b, acc, open, onToggle }) {
  const items = [...(b.condo_budget_items || [])].sort((x, y) => x.position - y.position)
  const total = items.reduce((n, i) => n + Number(i.amount), 0)
  const draft = b.status === 'draft'
  const [split, setSplit] = useState(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)
  const [confirm, setConfirm] = useState(false)
  const owners = acc.members.filter((m) => m.millesimi && m.tenure !== 'tenant')
  const milSum = owners.reduce((n, m) => n + Number(m.millesimi), 0)

  return (
    <div className="acc-card">
      <button type="button" className="acc-budget-head" onClick={onToggle} aria-expanded={open}>
        <span style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
          <strong>{b.title} {b.year}</strong>
          <small>{euro(total)} · {({ 12: 'rate mensili', 4: 'rate trimestrali', 2: 'rate semestrali', 1: 'rata unica', 6: 'rate bimestrali', 3: 'rate quadrimestrali' })[b.installments]} dal {fmtDay(b.first_due)}</small>
        </span>
        <span className="acc-pill" style={draft ? { background: '#FFF7E6', color: '#8A5A00' } : { background: '#ECFDF3', color: '#067647' }}>{draft ? 'Bozza' : 'Rate emesse'}</span>
        <ChevronDown size={20} style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }} aria-hidden="true" />
      </button>
      {open && (
        <div style={{ marginTop: 12 }}>
          <ul className="acc-items">
            {items.map((i) => draft ? <ItemRow key={i.id} item={i} onSave={(v) => acc.saveItem(b.id, v)} onDelete={() => acc.deleteItem(i.id)} />
              : (
                <li key={i.id}><span className="rc-dot" style={{ background: categoryOf(i.category).color }} /><span style={{ flex: 1 }}>{i.label} <small className="rc-muted">· {categoryOf(i.category).label}</small></span><b>{euro(i.amount)}</b></li>
              ))}
          </ul>
          {draft && <ItemRow key={`new-${items.length}`} item={{ category: 'maintenance', label: '', amount: '' }} isNew onSave={(v) => acc.saveItem(b.id, { ...v, position: items.length })} />}
          <div className="acc-total"><span>Totale spese previste</span><b>{euro(total)}</b></div>

          {draft && (
            <>
              <div className={`acc-note${Math.abs(milSum - 1000) > 0.5 ? ' is-warn' : ''}`}>
                {owners.length === 0
                  ? 'Nessun proprietario ha ancora dichiarato i millesimi: le rate non avrebbero destinatari.'
                  : Math.abs(milSum - 1000) > 0.5
                    ? `I proprietari iscritti coprono ${milSum.toLocaleString('it-IT')} millesimi su 1000: le quote degli altri appartamenti non vengono generate finché non si iscrivono (puoi aggiungerle a mano come spesa singola).`
                    : `I proprietari iscritti coprono tutti i 1000 millesimi (${owners.length} unità).`}
              </div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 12 }}>
                <button type="button" className="acc-btn" disabled={busy || !total} onClick={async () => { setBusy(true); const r = await acc.split(b.id); setBusy(false); setSplit(r.rows) }}>Anteprima ripartizione</button>
                <button type="button" className="acc-btn is-primary" disabled={busy || !total || !owners.length} onClick={() => setConfirm(true)}>Emetti le rate</button>
                <button type="button" className="acc-btn is-danger" disabled={busy} onClick={() => acc.deleteBudget(b.id)}><Trash2 size={15} aria-hidden="true" />Elimina bozza</button>
              </div>
              {split && (
                <table className="acc-table">
                  <thead><tr><th>Condomino</th><th>‰</th><th>Anno</th><th>Rata</th></tr></thead>
                  <tbody>{split.map((r) => <tr key={r.user_id}><td>{r.display_name || 'Condomino'}</td><td>{Number(r.millesimi).toLocaleString('it-IT')}</td><td>{euro(r.yearly)}</td><td>{euro(r.per_installment)}</td></tr>)}</tbody>
                </table>
              )}
              {confirm && (
                <div className="acc-confirm">
                  <p>Vengono create {owners.length * b.installments} rate per {owners.length} proprietari. Dopo l&apos;emissione le voci non si modificano più: eventuali differenze si sistemano con un conguaglio.</p>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button type="button" className="acc-btn" onClick={() => setConfirm(false)}>Annulla</button>
                    <button type="button" className="acc-btn is-primary" disabled={busy} onClick={async () => { setBusy(true); const r = await acc.issueBudget(b.id); setBusy(false); setConfirm(false); if (r.error) setErr(r.error) }}>Sì, emetti</button>
                  </div>
                </div>
              )}
              {err && <p className="auth-err" style={{ marginTop: 10 }}>{err}</p>}
            </>
          )}
        </div>
      )}
    </div>
  )
}

function ItemRow({ item, isNew, onSave, onDelete }) {
  const [v, setV] = useState({ category: item.category, label: item.label, amount: item.amount === '' ? '' : String(item.amount).replace('.', ',') })
  const [busy, setBusy] = useState(false)
  const amount = Number(String(v.amount).replace(/\./g, '').replace(',', '.'))
  const dirty = isNew ? v.label.trim().length >= 2 && amount >= 0 && v.amount !== '' : (v.category !== item.category || v.label !== item.label || amount !== Number(item.amount))
  async function save() {
    if (!dirty || busy) return
    setBusy(true)
    const r = await onSave({ id: item.id, category: v.category, label: v.label.trim(), amount })
    setBusy(false)
    if (!r?.error && isNew) setV({ category: v.category, label: '', amount: '' })
  }
  return (
    <div className={`acc-item-edit${isNew ? ' is-new' : ''}`}>
      <select value={v.category} onChange={(e) => setV({ ...v, category: e.target.value })} aria-label="Voce">
        {SPESA_CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
      </select>
      <input value={v.label} onChange={(e) => setV({ ...v, label: e.target.value })} placeholder={isNew ? 'Nuova voce, es. Pulizia scale' : ''} aria-label="Descrizione" maxLength={120} />
      <span className="acc-amount"><span>€</span><input inputMode="decimal" value={v.amount} onChange={(e) => setV({ ...v, amount: e.target.value })} placeholder="0,00" aria-label="Importo"
        onKeyDown={(e) => { if (e.key === 'Enter') save() }} /></span>
      {dirty && <button type="button" className="acc-btn is-primary" onClick={save} disabled={busy}>{isNew ? <Plus size={16} aria-label="Aggiungi" /> : <Check size={16} aria-label="Salva" />}</button>}
      {!isNew && !dirty && <button type="button" className="acc-btn is-danger" onClick={onDelete} aria-label="Elimina voce"><Trash2 size={15} /></button>}
    </div>
  )
}

/* ───────────── Estratto conto ───────────── */

function BankImport({ acc, names }) {
  const [rows, setRows] = useState(null)
  const [fileName, setFileName] = useState('')
  const [err, setErr] = useState(null)
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState(null)
  const openCharges = acc.charges.filter((c) => c.status === 'open' || c.status === 'pending')

  async function onFile(e) {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    setErr(null); setResult(null); setBusy(true); setFileName(f.name)
    const parsed = await readBankFile(f)
    if (parsed.error) { setErr(parsed.error); setRows(null); setBusy(false); return }
    const known = await acc.knownFingerprints(parsed.rows.map((r) => r.fingerprint))
    const fresh = parsed.rows.filter((r) => !known.has(r.fingerprint))
    setRows(matchMovements(fresh, acc.charges, acc.members).map((r) => ({ ...r, use: !!r.charge && r.confidence !== 'da verificare' })))
    if (fresh.length < parsed.rows.length) setResult({ info: `${parsed.rows.length - fresh.length} movimenti erano già stati importati e li ho saltati.` })
    setBusy(false)
  }

  async function confirm() {
    setBusy(true)
    const payload = rows.map((r) => ({ date: r.date, amount: r.amount, description: r.description, payer: r.payer, fingerprint: r.fingerprint, charge_id: r.use && r.charge ? r.charge.id : null }))
    const r = await acc.importMovements(payload)
    setBusy(false)
    if (r.error) { setErr(r.error); return }
    setResult({ done: r.data }); setRows(null)
  }

  const matched = rows?.filter((r) => r.use && r.charge) || []
  return (
    <>
      <div className="acc-card">
        <h2 className="acc-h2">Importa l&apos;estratto conto</h2>
        <p className="rc-muted" style={{ marginTop: 0 }}>Scarica dall&apos;home banking i movimenti del conto del condominio (CSV o Excel .xlsx) e caricali qui. Abbino le entrate alle rate da incassare: prima con il codice CR-… nella causale, poi con importo e nome del condomino. Controlli e confermi tu.</p>
        <label className="acc-drop">
          <Upload size={26} aria-hidden="true" />
          <strong>{busy ? 'Lettura in corso…' : fileName ? `Carica un altro file (ora: ${fileName})` : 'Scegli il file della banca'}</strong>
          <small>CSV o .xlsx · solo le entrate vengono considerate</small>
          <input type="file" hidden accept=".csv,.txt,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={onFile} disabled={busy} />
        </label>
        {err && <p className="auth-err" style={{ marginTop: 10 }}>{err}</p>}
        {result?.info && <p className="acc-msg">{result.info}</p>}
        {result?.done && <p className="acc-msg is-ok">Fatto: {result.done.saved} movimenti salvati, {result.done.paid} rat{result.done.paid === 1 ? 'a segnata pagata' : 'e segnate pagate'}.</p>}
      </div>

      {rows && (
        <div className="acc-card" style={{ padding: 0 }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border-2)' }}>
            <strong>{rows.length} entrate nuove · {matched.length} da segnare pagate</strong>
            <p className="rc-muted" style={{ margin: '2px 0 0', fontSize: 13 }}>&quot;Da verificare&quot; = stesso importo ma nessun nome o codice: spunta solo se sei sicura.</p>
          </div>
          <ul className="acc-rows">
            {rows.map((r, i) => (
              <li key={r.fingerprint} style={{ alignItems: 'flex-start' }}>
                <input type="checkbox" checked={r.use} disabled={!r.charge} onChange={(e) => setRows((l) => l.map((x, j) => (j === i ? { ...x, use: e.target.checked } : x)))} aria-label="Usa questo abbinamento" style={{ marginTop: 4 }} />
                <span style={{ flex: 1, minWidth: 0 }}>
                  <strong>{euro(r.amount)} · {fmtDay(r.date)}</strong>
                  <small style={{ overflowWrap: 'anywhere' }}>{[r.payer, r.description].filter(Boolean).join(' · ').slice(0, 160)}</small>
                  <select className="acc-match" value={r.charge?.id || ''} onChange={(e) => {
                    const c = openCharges.find((x) => x.id === e.target.value) || null
                    setRows((l) => l.map((x, j) => (j === i ? { ...x, charge: c, use: !!c, confidence: c ? 'scelto' : null } : x)))
                  }}>
                    <option value="">Nessuna rata (solo salva il movimento)</option>
                    {openCharges.filter((c) => Math.abs(Number(c.amount) - r.amount) < 0.005 || c.id === r.charge?.id).map((c) => (
                      <option key={c.id} value={c.id}>{names[c.user_id] || 'Condomino'} · {c.title} · {euro(c.amount)}</option>
                    ))}
                    <optgroup label="Altre rate">
                      {openCharges.filter((c) => Math.abs(Number(c.amount) - r.amount) >= 0.005 && c.id !== r.charge?.id).slice(0, 200).map((c) => (
                        <option key={c.id} value={c.id}>{names[c.user_id] || 'Condomino'} · {c.title} · {euro(c.amount)}</option>
                      ))}
                    </optgroup>
                  </select>
                </span>
                {r.confidence && <span className={`acc-pill conf-${r.confidence.replace(' ', '-')}`}>{r.confidence}</span>}
              </li>
            ))}
          </ul>
          <div style={{ padding: 16, borderTop: '1px solid var(--border-2)' }}>
            <button type="button" className="ep-save" disabled={busy} onClick={confirm}>
              {busy ? 'Registrazione…' : matched.length ? `Registra e segna ${matched.length} pagament${matched.length === 1 ? 'o' : 'i'}` : 'Salva i movimenti'}
            </button>
          </div>
        </div>
      )}
    </>
  )
}

/* ───────────── Impostazioni ───────────── */

function SettingsTab({ acc, buildingId }) {
  const s = acc.settings || {}
  const [v, setV] = useState({ iban: s.iban ? formatIban(s.iban) : '', holder: s.holder || '', bank_name: s.bank_name || '' })
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState(null)
  const [stripeBusy, setStripeBusy] = useState(false)
  const iban = normalizeIban(v.iban)
  const ibanOk = !iban || /^[A-Z]{2}[0-9]{2}[A-Z0-9]{10,30}$/.test(iban)

  async function save(e) {
    e.preventDefault()
    if (!ibanOk) return setMsg({ err: 'IBAN non valido.' })
    setBusy(true)
    const r = await acc.saveSettings({ iban: iban || null, holder: v.holder.trim() || null, bank_name: v.bank_name.trim() || null })
    setBusy(false)
    setMsg(r.error ? { err: r.error } : { ok: 'Dati salvati: i condomini li vedono quando scelgono il bonifico.' })
  }

  async function stripe(action) {
    setStripeBusy(true); setMsg(null)
    const { data, error } = await createClient().functions.invoke('stripe-connect', { body: { buildingId, action, returnUrl: window.location.href } })
    setStripeBusy(false)
    if (error || data?.error) { setMsg({ err: data?.error || 'Stripe non è ancora configurato su Condoreco.' }); return }
    if (data?.url) window.location.assign(data.url)
    else { await acc.reload(); setMsg({ ok: data?.ready ? 'Pagamenti online attivi.' : 'Stripe non ha ancora completato la verifica dell’account.' }) }
  }

  return (
    <>
      <form className="acc-card" onSubmit={save}>
        <h2 className="acc-h2"><Landmark size={20} aria-hidden="true" />Conto per i bonifici</h2>
        <label className="ep-field"><span className="ep-label">IBAN del condominio</span>
          <span className="ep-input"><input value={v.iban} onChange={(e) => setV({ ...v, iban: e.target.value.toUpperCase() })} placeholder="IT60 X054 2811 1010 0000 0123 456" autoComplete="off" spellCheck={false} /></span>
        </label>
        {!ibanOk && <p className="auth-err">Controlla l&apos;IBAN: deve iniziare con il codice del paese (IT) e avere le cifre giuste.</p>}
        <div className="ep-row2">
          <label className="ep-field"><span className="ep-label">Intestatario</span>
            <span className="ep-input"><input value={v.holder} onChange={(e) => setV({ ...v, holder: e.target.value })} placeholder="Condominio Via San Dionigi 11" maxLength={120} /></span>
          </label>
          <label className="ep-field"><span className="ep-label">Banca (facoltativo)</span>
            <span className="ep-input"><input value={v.bank_name} onChange={(e) => setV({ ...v, bank_name: e.target.value })} maxLength={80} /></span>
          </label>
        </div>
        <button type="submit" className="ep-save" disabled={busy}>{busy ? 'Salvataggio…' : 'Salva'}</button>
      </form>

      <div className="acc-card">
        <h2 className="acc-h2"><CreditCard size={20} aria-hidden="true" />Pagamenti online</h2>
        <p className="rc-muted" style={{ marginTop: 0 }}>Con Stripe i condomini pagano con carta, PayPal, Apple Pay o Google Pay. I soldi arrivano sul conto collegato e la rata si segna pagata da sola.</p>
        <div className={`acc-note${s.stripe_ready ? '' : ' is-warn'}`}>
          {s.stripe_ready ? 'Attivo: il pulsante "Carta o PayPal" è disponibile per i condomini.' : s.stripe_account_id ? 'Account Stripe creato, ma la verifica non è ancora completa.' : 'Non attivo: collega un account Stripe del condominio o dello studio.'}
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 12 }}>
          <button type="button" className="acc-btn is-primary" disabled={stripeBusy} onClick={() => stripe('onboard')}>{s.stripe_account_id ? 'Completa la verifica su Stripe' : 'Collega Stripe'}</button>
          {s.stripe_account_id && <button type="button" className="acc-btn" disabled={stripeBusy} onClick={() => stripe('status')}>Aggiorna stato</button>}
        </div>
      </div>
      {msg && <p className={msg.err ? 'auth-err' : 'acc-msg is-ok'}>{msg.err || msg.ok}</p>}
    </>
  )
}
