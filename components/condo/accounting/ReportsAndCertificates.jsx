'use client'

import { useEffect, useMemo, useState } from 'react'
import { CalendarRange, FileCheck2, Send, Sparkles, Users, Home } from 'lucide-react'
import { euro, fmtDay } from '@/lib/accounting'
import { useMonthlyReports, useCouncillors, useCertificates, loadTenantSplit, amICouncillor } from '@/hooks/useCondoReports'

// Punto 10: rendiconto mensile per i consiglieri, attestazione dei pagamenti per il rogito,
// quota a carico dell'inquilino separata da quella del proprietario.

const MESI = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre']
const monthLabel = (iso) => { const [y, m] = String(iso).split('-'); return `${MESI[Number(m) - 1]} ${y}` }
const CAT = { maintenance: 'Manutenzione', services: 'Servizi', utilities: 'Utenze', insurance: 'Assicurazione', admin: 'Amministrazione', other: 'Altro' }
const pad = (n) => String(n).padStart(2, '0')

function lastMonths(n) {
  const out = []
  const d = new Date(); d.setDate(1)
  for (let i = 0; i < n; i++) { out.push(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-01`); d.setMonth(d.getMonth() - 1) }
  return out
}

const Msg = ({ m }) => (m ? <p className="acc-msg" style={{ margin: '8px 0 0', color: m.err ? '#B42318' : 'var(--teal-dk)' }}>{m.text}</p> : null)

// ---------------- Rendiconto mensile ----------------
function ReportView({ r }) {
  const d = r.data || {}
  const rows = [
    ['Rate emesse nel mese', euro(Number(d.issued?.ordinaria || 0) + Number(d.issued?.straordinaria || 0))],
    ['Incassato nel mese', euro(d.collected?.amount || 0)],
    ['Spese del mese', euro(d.expenses_total || 0)],
    ['Entrate / uscite in banca', `${euro(d.bank?.in || 0)} / ${euro(d.bank?.out || 0)}`],
    ['Morosità a fine mese', `${euro(d.arrears?.amount || 0)} · ${d.arrears?.members || 0} condomini`],
    ['Di cui oltre 90 giorni', euro(d.arrears?.over_90_days || 0)],
  ]
  const ytd = d.year_to_date || {}
  const pct = ytd.budget > 0 ? Math.round((ytd.spent / ytd.budget) * 100) : null
  return (
    <div>
      {r.ai_comment && (
        <p style={{ background: 'var(--teal-lt)', color: 'var(--teal-dk)', borderRadius: 12, padding: '10px 12px', margin: '0 0 12px', lineHeight: 1.5 }}>
          <Sparkles size={15} aria-hidden="true" style={{ verticalAlign: '-2px' }} /> {r.ai_comment}
        </p>
      )}
      <ul className="rc-lines">
        {rows.map(([k, v]) => <li key={k}><span style={{ flex: 1 }}>{k}</span><b>{v}</b></li>)}
      </ul>
      {Object.keys(d.expenses || {}).length > 0 && (
        <>
          <h3 className="acc-h2" style={{ fontSize: 15, marginTop: 12 }}>Spese per categoria</h3>
          <ul className="rc-lines">{Object.entries(d.expenses).map(([k, v]) => <li key={k}><span style={{ flex: 1 }}>{CAT[k] || k}</span><b>{euro(v)}</b></li>)}</ul>
        </>
      )}
      <h3 className="acc-h2" style={{ fontSize: 15, marginTop: 12 }}>Da inizio anno</h3>
      <ul className="rc-lines">
        <li><span style={{ flex: 1 }}>Preventivo</span><b>{euro(ytd.budget || 0)}</b></li>
        <li><span style={{ flex: 1 }}>Speso{pct !== null ? ` (${pct}% del preventivo)` : ''}</span><b style={{ color: pct !== null && pct > 100 ? '#B42318' : undefined }}>{euro(ytd.spent || 0)}</b></li>
        <li><span style={{ flex: 1 }}>Rate emesse / incassate</span><b>{euro(ytd.issued || 0)} / {euro(ytd.collected || 0)}</b></li>
      </ul>
      <p className="rc-muted" style={{ fontSize: 12.5, margin: '8px 0 0' }}>
        Interventi completati {d.works?.interventions_done ?? 0} · pratiche aperte {d.works?.practices_open ?? 0} · segnalazioni aperte {d.works?.tickets_open ?? 0}
        {r.emailed_at ? ` · inviato il ${fmtDay(r.emailed_at)}` : ''}
      </p>
    </div>
  )
}

export function MonthlyReports({ buildingId, isAdmin }) {
  const R = useMonthlyReports(buildingId, true)
  const [sel, setSel] = useState(null)
  const [busy, setBusy] = useState(null)
  const [msg, setMsg] = useState(null)
  const months = useMemo(() => lastMonths(12), [])
  const [genMonth, setGenMonth] = useState(months[1])
  const current = R.list.find((r) => r.id === sel) || R.list[0]

  async function run(kind, opts) {
    setBusy(kind); setMsg(null)
    const r = await R.generate(genMonth, opts)
    setBusy(null)
    if (r.error) setMsg({ err: true, text: r.error })
    else setMsg({ err: false, text: opts.send ? `Rendiconto inviato a ${r.data?.emailed ?? 0} persone.` : 'Rendiconto aggiornato.' })
  }

  return (
    <div className="acc-card">
      <h2 className="acc-h2" style={{ display: 'flex', alignItems: 'center', gap: 8 }}><CalendarRange size={18} aria-hidden="true" />Rendiconto mensile per i consiglieri</h2>
      <p className="rc-muted" style={{ marginTop: 0 }}>Si prepara da solo il primo di ogni mese e arriva per email a consiglieri e amministratore. Solo totali: nessun nome dei condomini in ritardo.</p>
      {isAdmin && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 10 }}>
          <select value={genMonth} onChange={(e) => setGenMonth(e.target.value)} className="acc-match" style={{ width: 'auto', marginTop: 0 }} aria-label="Mese">
            {months.map((m) => <option key={m} value={m}>{monthLabel(m)}</option>)}
          </select>
          <button type="button" className="acc-btn" disabled={!!busy} onClick={() => run('gen', { send: false, regenerateComment: true })}>{busy === 'gen' ? 'Calcolo…' : 'Calcola ora'}</button>
          <button type="button" className="acc-btn is-primary" disabled={!!busy} onClick={() => run('send', { send: true })}><Send size={15} aria-hidden="true" />{busy === 'send' ? 'Invio…' : 'Calcola e invia'}</button>
        </div>
      )}
      <Msg m={msg} />
      {R.loading ? <p className="rc-muted">Caricamento…</p> : R.list.length === 0 ? (
        <p className="rc-muted" style={{ margin: 0 }}>Nessun rendiconto ancora. {isAdmin ? 'Il primo arriva il 1° del mese prossimo, oppure calcolalo ora.' : 'Il primo arriva il 1° del mese prossimo.'}</p>
      ) : (
        <>
          <div className="p2-chips" style={{ margin: '4px 0 12px', flexWrap: 'wrap' }}>
            {R.list.map((r) => <button key={r.id} type="button" className={`p2-chip${current?.id === r.id ? ' is-on' : ''}`} onClick={() => setSel(r.id)}>{monthLabel(r.month)}</button>)}
          </div>
          {current && <ReportView r={current} />}
        </>
      )}
    </div>
  )
}

export function CouncillorsPicker({ buildingId }) {
  const C = useCouncillors(buildingId, true)
  const [err, setErr] = useState(null)
  return (
    <div className="acc-card">
      <h2 className="acc-h2" style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Users size={18} aria-hidden="true" />Consiglieri</h2>
      <p className="rc-muted" style={{ marginTop: 0 }}>Il consiglio di condominio (art. 1130-bis c.c.) riceve il rendiconto mensile. Segna chi ne fa parte.</p>
      {C.list.length === 0 ? <p className="rc-muted" style={{ margin: 0 }}>Nessun condomino iscritto.</p> : (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {C.list.map((m) => (
            <button key={m.user_id} type="button" className={`p2-chip${m.is_councillor ? ' is-on' : ''}`} onClick={async () => { const r = await C.toggle(m.user_id, !m.is_councillor); setErr(r.error) }}>
              {m.display_name}
            </button>
          ))}
        </div>
      )}
      {err && <p className="acc-msg" style={{ color: '#B42318' }}>{err}</p>}
    </div>
  )
}

// ---------------- Attestazione per il rogito ----------------
async function openUrl(promise) {
  const w = window.open('', '_blank')
  const r = await promise
  const url = r.data?.url
  if (!url) { w?.close(); return r }
  if (w) w.location.assign(url); else window.location.assign(url)
  return r
}

export function CertificatesAdmin({ buildingId, members }) {
  const C = useCertificates(buildingId, null, true)
  const [today] = useState(() => new Date().toISOString().slice(0, 10))
  const [v, setV] = useState({ user_id: '', as_of: today, notes: '' })
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState(null)
  const nameOf = (id) => members.find((m) => m.user_id === id)?.display_name || 'Condomino'

  async function create() {
    if (!v.user_id) { setMsg({ err: true, text: 'Scegli il condomino.' }); return }
    setBusy(true); setMsg(null)
    const r = await openUrl(C.create(v))
    setBusy(false)
    if (r.error) setMsg({ err: true, text: r.error })
    else setMsg({ err: false, text: Number(r.data?.totals?.open_due) > 0 ? `Attestazione creata: risultano ${euro(r.data.totals.open_due)} di rate scadute non pagate.` : 'Attestazione creata: il condomino risulta in regola.' })
  }

  return (
    <div className="acc-card">
      <h2 className="acc-h2" style={{ display: 'flex', alignItems: 'center', gap: 8 }}><FileCheck2 size={18} aria-hidden="true" />Attestazione dei pagamenti per il rogito</h2>
      <p className="rc-muted" style={{ marginTop: 0 }}>Si crea dallo stato delle rate dell&apos;anno in corso e del precedente (art. 1130 n. 9 c.c. e art. 63 disp. att.). Va nell&apos;archivio come documento riservato e il condomino la trova nella sua Rendicontazione.</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 8 }}>
        <select className="acc-match" style={{ maxWidth: 'none', marginTop: 0, height: 42 }} value={v.user_id} onChange={(e) => setV({ ...v, user_id: e.target.value })} aria-label="Condomino">
          <option value="">Scegli il condomino…</option>
          {members.map((m) => <option key={m.user_id} value={m.user_id}>{m.display_name}</option>)}
        </select>
        <input type="date" className="acc-match" style={{ maxWidth: 'none', marginTop: 0, height: 42 }} value={v.as_of} max={today} onChange={(e) => setV({ ...v, as_of: e.target.value })} aria-label="Alla data" />
      </div>
      <textarea value={v.notes} onChange={(e) => setV({ ...v, notes: e.target.value })} rows={2} maxLength={2000}
        placeholder="Note facoltative: liti in corso, spese straordinarie deliberate e non ancora ripartite…"
        style={{ width: '100%', marginTop: 8, border: '1px solid var(--border)', borderRadius: 10, padding: 10, font: 'inherit', fontSize: 14 }} />
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
        <button type="button" className="acc-btn is-primary" disabled={busy} onClick={create}>{busy ? 'Preparo il PDF…' : 'Crea attestazione'}</button>
      </div>
      <Msg m={msg} />
      {C.list.length > 0 && (
        <ul className="rc-lines" style={{ marginTop: 12 }}>
          {C.list.map((c) => (
            <li key={c.id}>
              <span style={{ flex: 1, minWidth: 0 }}><strong>{nameOf(c.user_id)}</strong><small>al {fmtDay(c.as_of)} · scaduto non pagato {euro(c.totals?.open_due || 0)}</small></span>
              <button type="button" className="acc-btn" onClick={() => openUrl(C.download(c.id))}>Apri</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export function MyCertificates({ buildingId, userId }) {
  const C = useCertificates(buildingId, userId, false)
  if (!C.list.length) return null
  return (
    <div className="acc-card">
      <h2 className="acc-h2" style={{ display: 'flex', alignItems: 'center', gap: 8 }}><FileCheck2 size={18} aria-hidden="true" />Attestazioni dei pagamenti</h2>
      <p className="rc-muted" style={{ marginTop: 0 }}>Rilasciate dall&apos;amministratore, ad esempio per il rogito.</p>
      <ul className="rc-lines">
        {C.list.map((c) => (
          <li key={c.id}>
            <span style={{ flex: 1 }}><strong>Situazione al {fmtDay(c.as_of)}</strong><small>{Number(c.totals?.open_due) > 0 ? `Scaduto non pagato ${euro(c.totals.open_due)}` : 'In regola con le rate scadute'}</small></span>
            <button type="button" className="acc-btn" onClick={() => openUrl(C.download(c.id))}>Apri</button>
          </li>
        ))}
      </ul>
    </div>
  )
}

// ---------------- Quota inquilino ----------------
export function TenantSplit({ buildingId, userId, members, title = 'Quota inquilino e quota proprietario' }) {
  const [year, setYear] = useState(() => new Date().getFullYear())
  const [who, setWho] = useState(userId || '')
  const [res, setRes] = useState({ loading: false, rows: [], error: null })

  useEffect(() => {
    if (!who) return
    let alive = true
    loadTenantSplit(buildingId, who, year).then((r) => { if (alive) setRes({ loading: false, ...r }) })
    return () => { alive = false }
  }, [buildingId, who, year])

  const tot = res.rows.reduce((a, r) => ({ amount: a.amount + Number(r.amount), tenant: a.tenant + Number(r.tenant_amount), owner: a.owner + Number(r.owner_amount) }), { amount: 0, tenant: 0, owner: 0 })
  return (
    <div className="acc-card">
      <h2 className="acc-h2" style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Home size={18} aria-hidden="true" />{title}</h2>
      <p className="rc-muted" style={{ marginTop: 0 }}>Separa le spese che spettano all&apos;inquilino (servizi, utenze, piccola manutenzione) da quelle del proprietario, secondo le percentuali delle voci del preventivo. Le spese straordinarie restano al proprietario.</p>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
        {members && (
          <select className="acc-match" style={{ width: 'auto', marginTop: 0 }} value={who} onChange={(e) => setWho(e.target.value)} aria-label="Condomino">
            <option value="">Scegli il condomino…</option>
            {members.map((m) => <option key={m.user_id} value={m.user_id}>{m.display_name}</option>)}
          </select>
        )}
        <select className="acc-match" style={{ width: 'auto', marginTop: 0 }} value={year} onChange={(e) => setYear(Number(e.target.value))} aria-label="Anno">
          {[0, 1, 2].map((i) => { const y = new Date().getFullYear() - i; return <option key={y} value={y}>{y}</option> })}
        </select>
      </div>
      {!who ? null : res.error ? <p className="acc-msg" style={{ color: '#B42318' }}>{res.error}</p> : res.rows.length === 0 ? (
        <p className="rc-muted" style={{ margin: 0 }}>Nessuna rata nel {year}.</p>
      ) : (
        <>
          <ul className="rc-lines">
            <li><span style={{ flex: 1 }}><strong>Totale rate {year}</strong></span><b>{euro(tot.amount)}</b></li>
            <li><span style={{ flex: 1 }}>A carico dell&apos;inquilino</span><b style={{ color: 'var(--teal-dk)' }}>{euro(tot.tenant)}</b></li>
            <li><span style={{ flex: 1 }}>A carico del proprietario</span><b>{euro(tot.owner)}</b></li>
          </ul>
          <details style={{ marginTop: 8 }}>
            <summary style={{ cursor: 'pointer', fontWeight: 700, fontSize: 14 }}>Dettaglio per rata</summary>
            <ul className="rc-lines" style={{ marginTop: 6 }}>
              {res.rows.map((r) => (
                <li key={r.charge_id}>
                  <span style={{ flex: 1, minWidth: 0 }}><strong>{r.title}</strong><small>{fmtDay(r.due_date)} · inquilino {euro(r.tenant_amount)} · proprietario {euro(r.owner_amount)}</small></span>
                  <b>{euro(r.amount)}</b>
                </li>
              ))}
            </ul>
          </details>
        </>
      )}
      <p className="rc-muted" style={{ fontSize: 12.5, margin: '8px 0 0' }}>Ripartizione indicativa: il contratto di affitto può prevedere accordi diversi.</p>
    </div>
  )
}

// ---------------- Sezione per il condomino ----------------
export function ResidentReportsSection({ buildingId, userId }) {
  const [councillor, setCouncillor] = useState(false)
  useEffect(() => {
    let alive = true
    amICouncillor(buildingId).then((v) => { if (alive) setCouncillor(v) })
    return () => { alive = false }
  }, [buildingId])
  return (
    <>
      <MyCertificates buildingId={buildingId} userId={userId} />
      <TenantSplit buildingId={buildingId} userId={userId} title="Quanto spetta all'inquilino" />
      {councillor && <MonthlyReports buildingId={buildingId} isAdmin={false} />}
    </>
  )
}
