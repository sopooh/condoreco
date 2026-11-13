'use client'

import { Fragment, Suspense, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { AlertTriangle, BarChart3, CheckCircle2, ChevronDown, FileDown, Pencil, Plus, Receipt, Search, Upload, Users, Wallet } from 'lucide-react'
import { useCondoRole } from '@/hooks/useCondoRole'
import { useBilancio } from '@/hooks/useAdminArea'
import { CHARGE_STATUS, KIND_LABEL, SPESA_CATEGORIES, categoryOf, euro, fmtDay, guessCategory, readBankFile, statusKey, todayISO } from '@/lib/accounting'
import Sheet, { toNumber } from '@/components/condo/admin/Sheet'

// Bilancio del condominio (amministratore): situazione di ogni condomino,
// registro delle spese sostenute, confronto con preventivo e incassi, PDF.

const TABS = [
  { id: 'condomini', label: 'Condomini', icon: Users },
  { id: 'spese', label: 'Spese', icon: Receipt },
  { id: 'confronto', label: 'Confronto', icon: BarChart3 },
]
const yearOf = (d) => Number(String(d).slice(0, 4))
const sum = (arr, f = (x) => x.amount) => arr.reduce((n, x) => n + Number(f(x) || 0), 0)

export default function BilancioPage({ building }) {
  return (
    <Suspense fallback={<p style={{ padding: 24, color: 'var(--text-3)' }}>Caricamento…</p>}>
      <Inner building={building} />
    </Suspense>
  )
}

function Inner({ building }) {
  const base = `/edificio/${building.id}/condominio`
  const { isCondoAdmin, loading: roleLoading } = useCondoRole(building.id)
  const bil = useBilancio(isCondoAdmin ? building.id : null)
  const sp = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const tab = TABS.some((t) => t.id === sp.get('tab')) ? sp.get('tab') : 'condomini'
  const [year, setYear] = useState(() => new Date().getFullYear())
  const go = (id) => router.replace(`${pathname}?tab=${id}`, { scroll: false })

  const years = useMemo(() => {
    const ys = new Set([new Date().getFullYear()])
    bil.expenses.forEach((e) => ys.add(yearOf(e.spent_on)))
    bil.charges.forEach((c) => ys.add(yearOf(c.due_date)))
    bil.budgets.forEach((b) => ys.add(b.year))
    return [...ys].sort((a, b) => b - a)
  }, [bil.expenses, bil.charges, bil.budgets])

  if (roleLoading) return <p style={{ padding: 24, color: 'var(--text-3)' }}>Caricamento…</p>
  if (!isCondoAdmin) {
    return (
      <div className="acc-wrap">
        <Link href={base} className="acc-back">‹ Torna al condominio</Link>
        <p className="rc-muted">Il bilancio è gestito dall&apos;amministratore. La tua situazione è nella pagina Rendicontazione.</p>
      </div>
    )
  }

  return (
    <div className="acc-wrap">
      <Link href={base} className="acc-back">‹ Torna al condominio</Link>
      <header className="bil-head">
        <div className="bil-head-txt">
          <h1 className="acc-h1">Bilancio</h1>
          <p className="rc-muted" style={{ margin: 0 }}>{building.address}{building.street_number ? `, ${building.street_number}` : ''}</p>
        </div>
        <div className="bil-head-act">
          <label className="bil-year"><span>Anno</span>
            <select value={year} onChange={(e) => setYear(Number(e.target.value))}>{years.map((y) => <option key={y} value={y}>{y}</option>)}</select>
          </label>
          <Link href={`${base}/bilancio/stampa?anno=${year}`} className="acc-btn is-primary"><FileDown size={16} aria-hidden="true" /><span className="bil-pdf-long">PDF bilancio provvisorio</span><span className="bil-pdf-short">PDF provvisorio</span></Link>
        </div>
      </header>

      <nav className="acc-tabs" aria-label="Sezioni bilancio">
        {TABS.map((t) => (
          <button key={t.id} type="button" className={tab === t.id ? 'is-on' : ''} aria-current={tab === t.id ? 'page' : undefined} onClick={() => go(t.id)}>
            <t.icon size={18} aria-hidden="true" />{t.label}
          </button>
        ))}
      </nav>

      {bil.loading ? <p className="rc-muted">Caricamento…</p> : bil.error ? <p className="auth-err">{bil.error}</p> : (
        <>
          {tab === 'condomini' && <MemberBalances bil={bil} />}
          {tab === 'spese' && <Expenses bil={bil} year={year} practiceId={sp.get('pratica')} />}
          {tab === 'confronto' && <Comparison bil={bil} year={year} />}
        </>
      )}
    </div>
  )
}

/* ───────────── Situazione per condomino ───────────── */

export function MemberBalances({ bil, compact = false }) {
  const [filter, setFilter] = useState('all')
  const [q, setQ] = useState('')
  const [openId, setOpenId] = useState(null)
  const today = todayISO()
  const rows = bil.balances
  const tot = {
    due: sum(rows, (r) => Number(r.ord_total) + Number(r.straord_total)),
    ord: sum(rows, (r) => r.ord_total), straord: sum(rows, (r) => r.straord_total),
    paid: sum(rows, (r) => r.paid), open: sum(rows, (r) => r.open_amount), overdue: sum(rows, (r) => r.overdue),
  }
  const late = rows.filter((r) => Number(r.overdue) > 0)
  const shown = rows
    .filter((r) => filter === 'all' || (filter === 'late' ? Number(r.overdue) > 0 : filter === 'ok' ? Number(r.open_amount) === 0 : Number(r.open_amount) > 0 && Number(r.overdue) === 0))
    .filter((r) => !q || (r.display_name || '').toLowerCase().includes(q.toLowerCase()))
  const chargesOf = (uid) => bil.charges.filter((c) => c.user_id === uid).sort((a, b) => a.due_date.localeCompare(b.due_date))

  return (
    <>
      <div className="acc-kpis">
        <div className="acc-kpi"><small>Quote emesse</small><b>{euro(tot.due)}</b><em>Ordinarie {euro(tot.ord)} · Straord. {euro(tot.straord)}</em></div>
        <div className="acc-kpi is-ok"><small>Incassato</small><b>{euro(tot.paid)}</b><em>{tot.due > 0 ? `${Math.round((tot.paid / tot.due) * 100)}% del totale` : ' '}</em></div>
        <div className="acc-kpi is-info"><small>Da incassare</small><b>{euro(tot.open)}</b><em>Rate non ancora scadute incluse</em></div>
        <div className={`acc-kpi${tot.overdue > 0 ? ' is-danger' : ''}`}><AlertTriangle size={18} className="acc-kpi-ico" aria-hidden="true" /><small>Arretrati</small><b>{euro(tot.overdue)}</b><em>{late.length} {late.length === 1 ? 'condomino' : 'condomini'} fuori</em></div>
      </div>

      <div className="acc-card" style={{ padding: 0 }}>
        <div className="bil-filters">
          <div className="p2-chips">
            {[['all', `Tutti (${rows.length})`], ['late', `In arretrato (${late.length})`], ['due', 'Da pagare'], ['ok', 'In regola']].map(([k, l]) => (
              <button key={k} type="button" className={`p2-chip${filter === k ? ' is-on' : ''}`} onClick={() => setFilter(k)}>{l}</button>
            ))}
          </div>
          {!compact && <label className="acc-search" style={{ maxWidth: 260 }}><Search size={16} aria-hidden="true" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cerca condomino" aria-label="Cerca condomino" /></label>}
        </div>
        {rows.length === 0 ? <p className="rc-muted" style={{ padding: 16, margin: 0 }}>Nessun condomino iscritto con quote.</p> : (
          <>
          <ul className="bil-cards">
            {shown.map((r) => {
              const isOpen = openId === r.user_id
              const late = Number(r.overdue) > 0
              return (
                <li key={r.user_id} className={late ? 'is-late' : ''}>
                  <button type="button" className="bil-card-head" onClick={() => setOpenId(isOpen ? null : r.user_id)} aria-expanded={isOpen}>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <strong>{r.display_name || 'Condomino'}</strong>
                      <small>{[r.floor ? `Piano ${r.floor}` : null, r.millesimi != null ? `${Number(r.millesimi).toLocaleString('it-IT')}‰` : null].filter(Boolean).join(' · ')}</small>
                    </span>
                    <span className="bil-card-state">
                      {late ? <><small>Arretrato</small><b className="is-danger">{euro(r.overdue)}</b></>
                        : Number(r.open_amount) > 0 ? <><small>Da pagare</small><b>{euro(r.open_amount)}</b></>
                        : <span className="bil-ok"><CheckCircle2 size={15} aria-hidden="true" />In regola</span>}
                    </span>
                    <ChevronDown size={16} aria-hidden="true" style={{ color: 'var(--text-4)', transform: isOpen ? 'rotate(180deg)' : 'none', flexShrink: 0 }} />
                  </button>
                  <div className="bil-card-nums">
                    <span><small>Ordinarie</small>{euro(r.ord_total)}</span>
                    <span><small>Straord.</small>{euro(r.straord_total)}</span>
                    <span><small>Pagato</small><em>{euro(r.paid)}</em></span>
                  </div>
                  {r.pending > 0 && <small className="bil-pending">{r.pending} {r.pending === 1 ? 'pagamento' : 'pagamenti'} da confermare</small>}
                  {isOpen && <div className="bil-card-detail"><ChargeLines charges={chargesOf(r.user_id)} today={today} /></div>}
                </li>
              )
            })}
          </ul>
          <div className="bil-scroll bil-desktop">
            <table className="bil-table">
              <thead>
                <tr><th>Condomino</th><th>Ordinarie</th><th>Straord.</th><th>Pagato</th><th>Da pagare</th><th>Arretrato</th></tr>
              </thead>
              <tbody>
                {shown.map((r) => {
                  const isOpen = openId === r.user_id
                  return (
                    <Fragment key={r.user_id}>
                      <tr className={`bil-row${Number(r.overdue) > 0 ? ' is-late' : ''}`} onClick={() => setOpenId(isOpen ? null : r.user_id)} aria-expanded={isOpen}>
                        <td>
                          <span className="bil-name"><ChevronDown size={15} aria-hidden="true" style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }} />
                            <span><strong>{r.display_name || 'Condomino'}</strong><small>{[r.floor ? `Piano ${r.floor}` : null, r.millesimi != null ? `${Number(r.millesimi).toLocaleString('it-IT')}‰` : null, r.tenure === 'tenant' ? 'Inquilino' : null].filter(Boolean).join(' · ') || ' '}</small></span>
                          </span>
                        </td>
                        <td>{euro(r.ord_total)}</td>
                        <td>{euro(r.straord_total)}</td>
                        <td className="is-ok">{euro(r.paid)}</td>
                        <td>{euro(r.open_amount)}{r.pending > 0 && <small className="bil-pending">{r.pending} da confermare</small>}</td>
                        <td className={Number(r.overdue) > 0 ? 'is-danger' : ''}>{Number(r.overdue) > 0 ? euro(r.overdue) : <CheckCircle2 size={16} aria-label="In regola" style={{ color: '#12B76A' }} />}</td>
                      </tr>
                      {isOpen && (
                        <tr className="bil-detail"><td colSpan={6}><ChargeLines charges={chargesOf(r.user_id)} today={today} /></td></tr>
                      )}
                    </Fragment>
                  )
                })}
              </tbody>
              <tfoot>
                <tr><td>Totale</td><td>{euro(tot.ord)}</td><td>{euro(tot.straord)}</td><td>{euro(tot.paid)}</td><td>{euro(tot.open)}</td><td className={tot.overdue > 0 ? 'is-danger' : ''}>{euro(tot.overdue)}</td></tr>
              </tfoot>
            </table>
          </div>
          </>
        )}
      </div>
    </>
  )
}

function ChargeLines({ charges, today }) {
  if (!charges.length) return <p className="rc-muted" style={{ margin: 0 }}>Nessuna rata.</p>
  return (
    <ul className="rc-lines">
      {charges.map((c) => {
        const st = CHARGE_STATUS[statusKey(c, today)]
        return (
          <li key={c.id}>
            <span style={{ flex: 1, minWidth: 0 }}><strong>{c.title}</strong><small>{KIND_LABEL[c.kind] || 'Ordinaria'} · scadenza {fmtDay(c.due_date)}{c.paid_at ? ` · pagata il ${fmtDay(c.paid_at)}` : ''}</small></span>
            <span className="acc-pill" style={{ background: st.bg, color: st.fg, marginTop: 0 }}>{st.label}</span>
            <b>{euro(c.amount)}</b>
          </li>
        )
      })}
    </ul>
  )
}

/* ───────────── Spese sostenute ───────────── */

function Expenses({ bil, year, practiceId }) {
  const [sheet, setSheet] = useState(() => (practiceId ? { practice_id: practiceId, kind: 'straordinaria', category: 'maintenance' } : null))
  const [kind, setKind] = useState('all')
  const [importing, setImporting] = useState(false)
  const [msg, setMsg] = useState(null)
  const list = bil.expenses.filter((e) => yearOf(e.spent_on) === year && (kind === 'all' || e.kind === kind))
  const all = bil.expenses.filter((e) => yearOf(e.spent_on) === year)
  const byCat = SPESA_CATEGORIES.map((c) => ({ ...c, total: sum(list.filter((e) => e.category === c.id)) })).filter((c) => c.total > 0)
  const total = sum(list)

  return (
    <>
      {msg && <p className="acc-msg is-ok">{msg}</p>}
      <div className="acc-toolbar">
        <div className="p2-chips" style={{ flex: 1 }}>
          {[['all', 'Tutte'], ['ordinaria', 'Ordinarie'], ['straordinaria', 'Straordinarie']].map(([k, l]) => <button key={k} type="button" className={`p2-chip${kind === k ? ' is-on' : ''}`} onClick={() => setKind(k)}>{l}</button>)}
        </div>
        <button type="button" className="acc-btn" onClick={() => setImporting((x) => !x)}><Upload size={16} aria-hidden="true" />Importa uscite</button>
        <button type="button" className="acc-btn is-primary" onClick={() => setSheet({})}><Plus size={16} aria-hidden="true" />Nuova spesa</button>
      </div>

      {importing && <ExpenseImport bil={bil} onDone={(m) => { setImporting(false); setMsg(m) }} />}

      <div className="acc-kpis bil-kpis3">
        <div className="acc-kpi"><small>Spese {year}</small><b>{euro(total)}</b><em>{list.length} {list.length === 1 ? 'registrazione' : 'registrazioni'}</em></div>
        <div className="acc-kpi"><small>Ordinarie</small><b>{euro(sum(all.filter((e) => e.kind === 'ordinaria')))}</b></div>
        <div className="acc-kpi"><small>Straordinarie</small><b>{euro(sum(all.filter((e) => e.kind === 'straordinaria')))}</b></div>
      </div>

      {byCat.length > 0 && (
        <div className="acc-card">
          <div className="bil-bar" aria-hidden="true">{byCat.map((c) => <span key={c.id} style={{ width: `${(c.total / total) * 100}%`, background: c.color }} />)}</div>
          <ul className="bil-legend">{byCat.map((c) => <li key={c.id}><i style={{ background: c.color }} />{c.label}<b>{euro(c.total)}</b></li>)}</ul>
        </div>
      )}

      <div className="acc-card" style={{ padding: 0 }}>
        {list.length === 0 ? (
          <div className="acc-empty"><Receipt size={28} aria-hidden="true" /><strong>Nessuna spesa registrata nel {year}</strong><p>Registra fatture, utenze e lavori pagati, o importa le uscite dall&apos;estratto conto della banca.</p></div>
        ) : (
          <ul className="acc-rows">
            {list.map((e) => (
              <li key={e.id}>
                <i className="bil-dot" style={{ background: categoryOf(e.category).color }} />
                <span style={{ flex: 1, minWidth: 0 }}>
                  <strong>{e.description}</strong>
                  <small>{fmtDay(e.spent_on)} · {categoryOf(e.category).label}{e.supplier ? ` · ${e.supplier}` : ''} · {KIND_LABEL[e.kind]}{e.movement_id ? ' · da estratto conto' : ''}</small>
                </span>
                <b>{euro(e.amount)}</b>
                <button type="button" className="acc-more" aria-label="Modifica spesa" onClick={() => setSheet(e)}><Pencil size={15} /></button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {sheet && <ExpenseSheet expense={sheet} onClose={() => setSheet(null)}
        onSave={async (v) => { const r = await bil.saveExpense(v); if (!r.error) { setSheet(null); setMsg('Spesa salvata.') } return r.error }}
        onDelete={sheet.id ? async () => { const r = await bil.deleteExpense(sheet.id); if (!r.error) { setSheet(null); setMsg('Spesa eliminata.') } return r.error } : null} />}
    </>
  )
}

function ExpenseSheet({ expense, onClose, onSave, onDelete }) {
  const [v, setV] = useState({
    description: expense.description || '', supplier: expense.supplier || '', spent_on: expense.spent_on || todayISO(),
    amount: expense.amount != null ? String(expense.amount).replace('.', ',') : '',
    category: expense.category || 'maintenance', kind: expense.kind || 'ordinaria',
  })
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)
  const set = (k) => (e) => setV({ ...v, [k]: e.target.value })
  async function submit(e) {
    e.preventDefault()
    const amount = toNumber(v.amount)
    if (v.description.trim().length < 2) return setErr('Scrivi a cosa si riferisce la spesa.')
    if (!(amount > 0)) return setErr('Importo non valido.')
    setBusy(true); setErr(null)
    const e2 = await onSave({ id: expense.id, practice_id: expense.practice_id, ...v, description: v.description.trim(), supplier: v.supplier.trim(), amount: Math.round(amount * 100) / 100 })
    setBusy(false)
    if (e2) setErr(e2)
  }
  return (
    <Sheet title={expense.id ? 'Modifica spesa' : 'Nuova spesa'} kicker={expense.practice_id && !expense.id ? 'Fattura della pratica' : 'Fattura, utenza, lavoro'} onClose={onClose}>
      <form onSubmit={submit}>
        <label className="ep-field"><span className="ep-label">Descrizione</span>
          <span className="ep-input"><input value={v.description} onChange={set('description')} maxLength={200} placeholder="Es. Fattura pulizie scale ottobre" /></span>
        </label>
        <label className="ep-field"><span className="ep-label">Fornitore</span>
          <span className="ep-input"><input value={v.supplier} onChange={set('supplier')} maxLength={120} placeholder="Facoltativo" /></span>
        </label>
        <div className="ep-row2" style={{ gridTemplateColumns: '1fr 1fr' }}>
          <label className="ep-field"><span className="ep-label">Importo</span>
            <span className="ep-input"><span className="ep-prefix">€</span><input inputMode="decimal" value={v.amount} onChange={set('amount')} placeholder="0,00" /></span>
          </label>
          <label className="ep-field"><span className="ep-label">Data</span>
            <span className="ep-input"><input type="date" value={v.spent_on} onChange={set('spent_on')} /></span>
          </label>
        </div>
        <label className="ep-field"><span className="ep-label">Voce</span>
          <span className="ep-input"><select value={v.category} onChange={set('category')}>{SPESA_CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}</select></span>
        </label>
        <span className="ep-label">Tipo</span>
        <div className="p2-chips" style={{ marginBottom: 14 }}>
          {['ordinaria', 'straordinaria'].map((k) => <button key={k} type="button" className={`p2-chip${v.kind === k ? ' is-on' : ''}`} onClick={() => setV({ ...v, kind: k })}>{KIND_LABEL[k]}</button>)}
        </div>
        {err && <p className="auth-err">{err}</p>}
        <button type="submit" className="ep-save" disabled={busy}>{busy ? 'Salvataggio…' : 'Salva spesa'}</button>
        {onDelete && <button type="button" className="acc-btn is-danger" style={{ width: '100%', marginTop: 10 }} disabled={busy}
          onClick={async () => { if (!window.confirm('Elimini questa spesa?')) return; setBusy(true); const e2 = await onDelete(); setBusy(false); if (e2) setErr(e2) }}>Elimina</button>}
      </form>
    </Sheet>
  )
}

function ExpenseImport({ bil, onDone }) {
  const input = useRef(null)
  const [rows, setRows] = useState(null)
  const [err, setErr] = useState(null)
  const [busy, setBusy] = useState(false)

  async function onFile(e) {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    setErr(null); setBusy(true)
    const r = await readBankFile(f, { direction: 'out' })
    if (r.error) { setBusy(false); setRows(null); return setErr(r.error) }
    const known = await bil.knownFingerprints(r.rows.map((x) => x.fingerprint))
    setRows(r.rows.map((x) => ({ ...x, dup: known.has(x.fingerprint), on: !known.has(x.fingerprint), category: guessCategory(`${x.description} ${x.payer}`), kind: 'ordinaria' })))
    setBusy(false)
  }
  const upd = (i, k, val) => setRows((rs) => rs.map((r, j) => (j === i ? { ...r, [k]: val } : r)))
  const picked = rows?.filter((r) => r.on) || []

  async function confirm() {
    setBusy(true)
    const r = await bil.importExpenses(picked.map(({ date, amount, description, payer, fingerprint, category, kind }) => ({ date, amount, description, payer, fingerprint, category, kind })))
    setBusy(false)
    if (r.error) return setErr(r.error)
    onDone(`${r.data.saved} ${r.data.saved === 1 ? 'spesa importata' : 'spese importate'}${r.data.duplicates ? `, ${r.data.duplicates} già presenti` : ''}.`)
  }

  return (
    <div className="acc-card">
      <h2 className="acc-h2"><Upload size={18} aria-hidden="true" />Uscite dall&apos;estratto conto</h2>
      <button type="button" className="acc-drop" style={{ width: '100%' }} onClick={() => input.current?.click()} disabled={busy}>
        <strong>{busy ? 'Lettura…' : 'Scegli il file CSV o Excel della banca'}</strong>
        <small>Prendo solo le uscite: le voci si possono correggere prima di salvare</small>
      </button>
      <input ref={input} type="file" accept=".csv,.xlsx,.txt" hidden onChange={onFile} />
      {err && <p className="auth-err">{err}</p>}
      {rows && (
        <>
          <ul className="acc-rows" style={{ marginTop: 12 }}>
            {rows.map((r, i) => (
              <li key={r.fingerprint} style={{ flexWrap: 'wrap', opacity: r.dup ? 0.55 : 1 }}>
                <input type="checkbox" checked={r.on} disabled={r.dup} onChange={(e) => upd(i, 'on', e.target.checked)} aria-label="Importa" />
                <span style={{ flex: 1, minWidth: 160 }}><strong>{r.description || r.payer || 'Uscita'}</strong><small>{fmtDay(r.date)}{r.payer ? ` · ${r.payer}` : ''}{r.dup ? ' · già importata' : ''}</small></span>
                <b>{euro(r.amount)}</b>
                {!r.dup && (
                  <span className="bil-import-pick">
                    <select value={r.category} onChange={(e) => upd(i, 'category', e.target.value)} aria-label="Voce">{SPESA_CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}</select>
                    <select value={r.kind} onChange={(e) => upd(i, 'kind', e.target.value)} aria-label="Tipo"><option value="ordinaria">Ordinaria</option><option value="straordinaria">Straordinaria</option></select>
                  </span>
                )}
              </li>
            ))}
          </ul>
          <button type="button" className="ep-save" style={{ marginTop: 12 }} disabled={busy || !picked.length} onClick={confirm}>
            {busy ? 'Salvataggio…' : `Importa ${picked.length} ${picked.length === 1 ? 'spesa' : 'spese'}`}
          </button>
        </>
      )}
    </div>
  )
}

/* ───────────── Confronto: preventivo, speso, incassato ───────────── */

export function yearFigures(bil, year) {
  const budgets = bil.budgets.filter((b) => b.year === year && b.status === 'issued')
  const items = budgets.flatMap((b) => (b.condo_budget_items || []).map((i) => ({ ...i, kind: b.kind || 'ordinaria' })))
  const expenses = bil.expenses.filter((e) => yearOf(e.spent_on) === year)
  const charges = bil.charges.filter((c) => yearOf(c.due_date) === year)
  const cats = SPESA_CATEGORIES.map((c) => ({
    ...c,
    budget: sum(items.filter((i) => i.category === c.id)),
    spent: sum(expenses.filter((e) => e.category === c.id)),
  })).filter((c) => c.budget || c.spent)
  const kinds = ['ordinaria', 'straordinaria'].map((k) => ({
    kind: k,
    budget: sum(items.filter((i) => i.kind === k)),
    charged: sum(charges.filter((c) => (c.kind || 'ordinaria') === k)),
    collected: sum(charges.filter((c) => (c.kind || 'ordinaria') === k && c.status === 'paid')),
    spent: sum(expenses.filter((e) => e.kind === k)),
  }))
  const t = {
    budget: sum(items), charged: sum(charges), collected: sum(charges.filter((c) => c.status === 'paid')), spent: sum(expenses),
  }
  return { cats, kinds, t, expenses, charges, items }
}

function Comparison({ bil, year }) {
  const { cats, kinds, t } = yearFigures(bil, year)
  const max = Math.max(1, ...cats.map((c) => Math.max(c.budget, c.spent)))
  const cash = t.collected - t.spent
  return (
    <>
      <div className="acc-kpis">
        <div className="acc-kpi"><small>Preventivato</small><b>{euro(t.budget)}</b></div>
        <div className="acc-kpi"><small>Speso</small><b>{euro(t.spent)}</b><em>{t.budget > 0 ? `${Math.round((t.spent / t.budget) * 100)}% del preventivo` : ' '}</em></div>
        <div className="acc-kpi is-ok"><small>Incassato</small><b>{euro(t.collected)}</b><em>su {euro(t.charged)} di quote</em></div>
        <div className={`acc-kpi${cash < 0 ? ' is-danger' : ' is-ok'}`}><Wallet size={18} className="acc-kpi-ico" aria-hidden="true" /><small>Saldo di cassa</small><b>{euro(cash)}</b><em>incassato meno speso</em></div>
      </div>

      <div className="acc-card">
        <h2 className="acc-h2"><BarChart3 size={18} aria-hidden="true" />Preventivo e spese per voce</h2>
        {cats.length === 0 ? <p className="rc-muted" style={{ margin: 0 }}>Nessun preventivo emesso o spesa registrata per il {year}.</p> : (
          <ul className="bil-cmp">
            {cats.map((c) => {
              const over = c.budget > 0 && c.spent > c.budget
              return (
                <li key={c.id}>
                  <div className="bil-cmp-head"><span><i style={{ background: c.color }} />{c.label}</span><b className={over ? 'is-danger' : ''}>{euro(c.spent)} <small>di {euro(c.budget)}</small></b></div>
                  <div className="bil-cmp-bars">
                    <span className="is-budget" style={{ width: `${(c.budget / max) * 100}%` }} />
                    <span className={`is-spent${over ? ' is-over' : ''}`} style={{ width: `${(c.spent / max) * 100}%`, background: over ? '#D92D20' : c.color }} />
                  </div>
                </li>
              )
            })}
          </ul>
        )}
        <p className="bil-key"><span className="is-budget" />Preventivo <span className="is-spent" />Speso</p>
      </div>

      <div className="acc-card">
        <h2 className="acc-h2"><Receipt size={18} aria-hidden="true" />Ordinarie e straordinarie</h2>
        <div className="bil-scroll">
          <table className="bil-table is-plain">
            <thead><tr><th>Gestione</th><th>Preventivo</th><th>Quote emesse</th><th>Incassato</th><th>Speso</th></tr></thead>
            <tbody>
              {kinds.map((k) => (
                <tr key={k.kind}><td><strong>{KIND_LABEL[k.kind]}</strong></td><td>{euro(k.budget)}</td><td>{euro(k.charged)}</td><td className="is-ok">{euro(k.collected)}</td><td>{euro(k.spent)}</td></tr>
              ))}
            </tbody>
            <tfoot><tr><td>Totale</td><td>{euro(t.budget)}</td><td>{euro(t.charged)}</td><td>{euro(t.collected)}</td><td>{euro(t.spent)}</td></tr></tfoot>
          </table>
        </div>
      </div>
    </>
  )
}
