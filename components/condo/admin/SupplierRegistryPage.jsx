'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { AlertTriangle, CalendarClock, CheckCircle2, FileText, Plus, Search, ShieldCheck, Trash2, Truck, XCircle } from 'lucide-react'
import { useCondoRole } from '@/hooks/useCondoRole'
import { useSupplierRegistry, SUPPLIER_DOC_KINDS, AMOUNT_PERIODS, docKindLabel, deadlineLabel } from '@/hooks/useSupplierRegistry'
import { MAINTENANCE_CATEGORIES, maintenanceCategoryLabel } from '@/lib/maintenanceCategories'
import { euro } from '@/lib/accounting'
import Sheet, { toNumber } from '@/components/condo/admin/Sheet'

// Fornitori del condominio: rubrica + contratti, scadenze, DURC e polizze.
// Solo amministratori. I fornitori si aggiungono da "I tuoi interventi" o dalla ricerca fornitori.

const fmtDate = (d) => (d ? new Date(d + 'T00:00:00').toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' }) : '')
const today = () => new Date().toISOString().slice(0, 10)

function latestByKind(docs) {
  const m = new Map()
  docs.forEach((d) => {
    const prev = m.get(d.kind)
    if (!prev || (d.expires_on || '9999') > (prev.expires_on || '9999')) m.set(d.kind, d)
  })
  return m
}

function docState(doc) {
  if (!doc) return 'missing'
  if (!doc.expires_on) return 'ok'
  const days = Math.round((new Date(doc.expires_on + 'T00:00:00') - new Date(today() + 'T00:00:00')) / 86400000)
  return days < 0 ? 'expired' : days <= 30 ? 'soon' : 'ok'
}

function Badge({ label, state }) {
  const map = {
    ok: { Icon: CheckCircle2, color: 'var(--teal-dk)', bg: 'var(--teal-lt)', text: label },
    soon: { Icon: CalendarClock, color: '#B54708', bg: '#FEF0C7', text: `${label} in scadenza` },
    expired: { Icon: XCircle, color: '#B42318', bg: '#FEE4E2', text: `${label} scaduto` },
    missing: { Icon: AlertTriangle, color: 'var(--text-3)', bg: '#F2F4F4', text: `${label} mancante` },
  }
  const { Icon, color, bg, text } = map[state]
  return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 700, color, background: bg, borderRadius: 999, padding: '3px 8px' }}><Icon size={13} aria-hidden="true" />{text}</span>
}

export default function SupplierRegistryPage({ building }) {
  const base = `/edificio/${building.id}/condominio`
  const { isCondoAdmin, loading: roleLoading } = useCondoRole(building.id)
  const r = useSupplierRegistry(building.id)
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(null)

  const bySupplier = useMemo(() => {
    const m = new Map()
    r.suppliers.forEach((s) => m.set(s.id, { contracts: [], documents: [] }))
    r.contracts.forEach((c) => m.get(c.maintainer_id)?.contracts.push(c))
    r.documents.forEach((d) => m.get(d.maintainer_id)?.documents.push(d))
    return m
  }, [r.suppliers, r.contracts, r.documents])

  if (!roleLoading && !isCondoAdmin) {
    return (
      <div className="acc-wrap"><Link href={base} className="acc-back">‹ Torna al condominio</Link>
        <div className="acc-card"><div className="acc-empty"><ShieldCheck size={28} aria-hidden="true" /><strong>Sezione dell&apos;amministratore</strong><p>Contratti e documenti dei fornitori li gestisce l&apos;amministratore del condominio.</p></div></div>
      </div>
    )
  }

  const list = r.suppliers.filter((s) => !q || [s.name, s.company, maintenanceCategoryLabel(s.category)].join(' ').toLowerCase().includes(q.toLowerCase()))
  const overdue = r.deadlines.filter((d) => d.days_left < 0).length

  return (
    <div className="acc-wrap" style={{ maxWidth: 960 }}>
      <Link href={base} className="acc-back">‹ Torna al condominio</Link>
      <header className="acc-toolbar" style={{ marginBottom: 14 }}>
        <div style={{ flex: '1 1 260px', minWidth: 0 }}>
          <h1 className="acc-h1">Fornitori del condominio</h1>
          <p className="rc-muted" style={{ margin: 0 }}>{r.loading ? 'Caricamento…' : `${r.suppliers.length} fornitori · ${r.contracts.filter((c) => c.status === 'active').length} contratti attivi`}</p>
        </div>
        <Link href={`${base}/fornitori`} className="acc-btn"><Search size={16} aria-hidden="true" />Trova un fornitore</Link>
      </header>
      {r.error && <p className="acc-msg" style={{ color: '#B42318' }}>{r.error}</p>}

      {r.deadlines.length > 0 && (
        <div className="acc-card" style={{ marginBottom: 12 }}>
          <strong style={{ display: 'flex', alignItems: 'center', gap: 6 }}><CalendarClock size={17} aria-hidden="true" style={{ color: overdue ? '#B42318' : 'var(--teal)' }} />Scadenze dei prossimi 60 giorni{overdue ? ` · ${overdue} già passate` : ''}</strong>
          <ul style={{ listStyle: 'none', padding: 0, margin: '10px 0 0', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {r.deadlines.map((d) => (
              <li key={`${d.kind}-${d.item_id}`} style={{ display: 'flex', gap: 10, alignItems: 'baseline', cursor: 'pointer' }} onClick={() => setOpen(r.suppliers.find((s) => s.id === d.maintainer_id))}>
                <b style={{ minWidth: 92, color: d.days_left < 0 ? '#B42318' : d.days_left <= 15 ? '#B54708' : 'var(--text)' }}>{fmtDate(d.due_date)}</b>
                <span style={{ flex: 1 }}>{deadlineLabel(d.kind)} · <strong>{d.supplier}</strong>{d.kind.startsWith('contract') ? ` (${d.title})` : ''}</span>
                <small className="rc-muted">{d.days_left < 0 ? `${-d.days_left} gg fa` : d.days_left === 0 ? 'oggi' : `tra ${d.days_left} gg`}</small>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="acc-card" style={{ padding: 0 }}>
        <div className="bil-filters">
          <label className="acc-search" style={{ maxWidth: 320 }}><Search size={16} aria-hidden="true" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cerca fornitore o categoria" aria-label="Cerca" /></label>
        </div>
        {r.loading ? <p className="rc-muted" style={{ padding: 16, margin: 0 }}>Caricamento…</p> : list.length === 0 ? (
          <div className="acc-empty"><Truck size={28} aria-hidden="true" /><strong>Nessun fornitore</strong><p>I fornitori aggiunti in &quot;I tuoi interventi&quot; o scelti dalla ricerca compaiono qui.</p></div>
        ) : (
          <ul className="ppl-list">
            {list.map((s) => {
              const x = bySupplier.get(s.id)
              const latest = latestByKind(x.documents)
              const active = x.contracts.filter((c) => c.status === 'active')
              return (
                <li key={s.id} onClick={() => setOpen(s)} style={{ cursor: 'pointer', flexWrap: 'wrap' }}>
                  <span className="ppl-avatar">{(s.company || s.name || '?').slice(0, 1).toUpperCase()}</span>
                  <span className="ppl-main">
                    <strong>{s.company || s.name}</strong>
                    <small>{[maintenanceCategoryLabel(s.category), s.company && s.name ? s.name : null, active.length ? `${active.length} ${active.length === 1 ? 'contratto' : 'contratti'}` : 'Nessun contratto'].filter(Boolean).join(' · ')}</small>
                    <span style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
                      <Badge label="DURC" state={docState(latest.get('durc'))} />
                      <Badge label="RC" state={docState(latest.get('insurance_rc'))} />
                    </span>
                  </span>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {open && <SupplierSheet supplier={open} data={bySupplier.get(open.id) || { contracts: [], documents: [] }} r={r} onClose={() => setOpen(null)} />}
    </div>
  )
}

function Field({ label, children }) {
  return <label className="ep-field"><span className="ep-label">{label}</span><span className="ep-input">{children}</span></label>
}

function SupplierSheet({ supplier, data, r, onClose }) {
  const [contract, setContract] = useState(null)
  const [doc, setDoc] = useState(null)
  const [err, setErr] = useState(null)
  const name = supplier.company || supplier.name

  async function openFile(id) {
    const w = window.open('', '_blank')
    const url = await r.openFile(id)
    if (!url) { w?.close(); setErr('Non riesco ad aprire il file.'); return }
    if (w) w.location.assign(url); else window.location.assign(url)
  }

  return (
    <Sheet title={name} kicker={maintenanceCategoryLabel(supplier.category)} onClose={onClose} wide>
      <p className="rc-muted" style={{ marginTop: 0 }}>{[supplier.phone, supplier.email].filter(Boolean).join(' · ') || 'Nessun contatto indicato'}</p>
      {err && <p className="acc-msg" style={{ color: '#B42318' }}>{err}</p>}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
        <strong>Contratti</strong>
        <button type="button" className="acc-btn" onClick={() => setContract({ maintainer_id: supplier.id, title: '', service_category: supplier.category, auto_renew: false, renewal_months: 12, notice_days: '', amount: '', amount_period: 'yearly' })}><Plus size={15} aria-hidden="true" />Aggiungi</button>
      </div>
      {data.contracts.length === 0 ? <p className="rc-muted">Nessun contratto registrato.</p> : (
        <ul className="ppl-list">
          {data.contracts.map((c) => (
            <li key={c.id} onClick={() => setContract({ ...c, amount: c.amount_cents == null ? '' : String(c.amount_cents / 100).replace('.', ','), notice_days: c.notice_days ?? '' })} style={{ cursor: 'pointer' }}>
              <span className="ppl-avatar"><FileText size={16} aria-hidden="true" /></span>
              <span className="ppl-main">
                <strong>{c.title}{c.status !== 'active' && <em className="ppl-tag">{c.status === 'expired' ? 'Scaduto' : 'Disdetto'}</em>}</strong>
                <small>{[
                  c.start_date || c.end_date ? `${fmtDate(c.start_date) || '…'} → ${fmtDate(c.end_date) || 'senza scadenza'}` : null,
                  c.auto_renew ? 'rinnovo tacito' : null,
                  c.notice_days ? `disdetta ${c.notice_days} gg prima` : null,
                  c.amount_cents != null ? `${euro(c.amount_cents / 100)} ${AMOUNT_PERIODS.find((p) => p.value === c.amount_period)?.label || ''}` : null,
                ].filter(Boolean).join(' · ')}</small>
              </span>
              {c.document_id && <button type="button" className="acc-btn" onClick={(e) => { e.stopPropagation(); openFile(c.document_id) }}>Apri</button>}
            </li>
          ))}
        </ul>
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 16 }}>
        <strong>DURC, polizze e documenti</strong>
        <button type="button" className="acc-btn" onClick={() => setDoc({ maintainer_id: supplier.id, kind: 'durc', issued_on: '', expires_on: '' })}><Plus size={15} aria-hidden="true" />Aggiungi</button>
      </div>
      {data.documents.length === 0 ? <p className="rc-muted">Nessun documento. Chiedi al fornitore DURC e polizza RC prima di affidargli lavori.</p> : (
        <ul className="ppl-list">
          {data.documents.map((d) => (
            <li key={d.id} onClick={() => setDoc({ ...d, coverage: d.coverage_cents == null ? '' : String(d.coverage_cents / 100).replace('.', ',') })} style={{ cursor: 'pointer' }}>
              <span className="ppl-avatar"><ShieldCheck size={16} aria-hidden="true" /></span>
              <span className="ppl-main">
                <strong>{docKindLabel(d.kind)}</strong>
                <small>{[d.insurer, d.policy_number ? `n. ${d.policy_number}` : null, d.coverage_cents != null ? `massimale ${euro(d.coverage_cents / 100, { maximumFractionDigits: 0, minimumFractionDigits: 0 })}` : null, d.expires_on ? `scade il ${fmtDate(d.expires_on)}` : null].filter(Boolean).join(' · ')}</small>
              </span>
              <span className="ppl-state" style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <Badge label={docKindLabel(d.kind)} state={docState(d)} />
                {d.document_id && <button type="button" className="acc-btn" onClick={(e) => { e.stopPropagation(); openFile(d.document_id) }}>Apri</button>}
              </span>
            </li>
          ))}
        </ul>
      )}

      {contract && <ContractSheet value={contract} r={r} onClose={() => setContract(null)} />}
      {doc && <DocSheet value={doc} r={r} supplierName={name} onClose={() => setDoc(null)} />}
    </Sheet>
  )
}

function FilePick({ file, setFile, existing }) {
  return (
    <Field label={existing ? 'Sostituisci il file (facoltativo)' : 'File (facoltativo)'}>
      <input type="file" accept=".pdf,image/*,.doc,.docx" onChange={(e) => setFile(e.target.files?.[0] || null)} aria-label="Scegli file" />
      {file && <small className="rc-muted" style={{ marginLeft: 6 }}>{file.name}</small>}
    </Field>
  )
}

function ContractSheet({ value, r, onClose }) {
  const [v, setV] = useState(value)
  const [file, setFile] = useState(null)
  const [err, setErr] = useState(null)
  const [busy, setBusy] = useState(false)

  async function save() {
    if (v.title.trim().length < 2) { setErr('Dai un nome al contratto (es. Manutenzione ascensore).'); return }
    const amount = v.amount === '' ? '' : toNumber(v.amount)
    if (amount !== '' && !(amount >= 0)) { setErr('Importo non valido.'); return }
    if (v.start_date && v.end_date && v.end_date < v.start_date) { setErr('La fine non può essere prima dell\'inizio.'); return }
    setBusy(true); setErr(null)
    const res = await r.saveContract({ ...v, amount }, file)
    setBusy(false)
    if (res.error) setErr(res.error); else onClose()
  }

  return (
    <Sheet title={value.id ? value.title : 'Nuovo contratto'} kicker="Contratto fornitore" onClose={onClose}>
      <Field label="Oggetto"><input value={v.title} onChange={(e) => setV({ ...v, title: e.target.value })} maxLength={160} placeholder="Es. Manutenzione ordinaria ascensore" /></Field>
      <Field label="Categoria"><select value={v.service_category || ''} onChange={(e) => setV({ ...v, service_category: e.target.value })}>{MAINTENANCE_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}</select></Field>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <Field label="Inizio"><input type="date" value={v.start_date || ''} onChange={(e) => setV({ ...v, start_date: e.target.value })} /></Field>
        <Field label="Scadenza"><input type="date" value={v.end_date || ''} onChange={(e) => setV({ ...v, end_date: e.target.value })} /></Field>
        <Field label="Preavviso disdetta (giorni)"><input value={v.notice_days} onChange={(e) => setV({ ...v, notice_days: e.target.value.replace(/\D/g, '') })} inputMode="numeric" placeholder="Es. 90" /></Field>
        <Field label="Rinnovo tacito">
          <select value={v.auto_renew ? 'yes' : 'no'} onChange={(e) => setV({ ...v, auto_renew: e.target.value === 'yes' })}><option value="no">No</option><option value="yes">Sì</option></select>
        </Field>
        {v.auto_renew && <Field label="Si rinnova per (mesi)"><input value={v.renewal_months ?? 12} onChange={(e) => setV({ ...v, renewal_months: e.target.value.replace(/\D/g, '') })} inputMode="numeric" /></Field>}
        <Field label="Importo €"><input value={v.amount} onChange={(e) => setV({ ...v, amount: e.target.value })} inputMode="decimal" placeholder="Es. 1.200,00" /></Field>
        <Field label="Periodicità"><select value={v.amount_period || 'yearly'} onChange={(e) => setV({ ...v, amount_period: e.target.value })}>{AMOUNT_PERIODS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}</select></Field>
        {value.id && <Field label="Stato"><select value={v.status} onChange={(e) => setV({ ...v, status: e.target.value })}><option value="active">Attivo</option><option value="terminated">Disdetto</option><option value="expired">Scaduto</option></select></Field>}
      </div>
      <FilePick file={file} setFile={setFile} existing={!!value.document_id} />
      <p className="rc-muted" style={{ marginTop: 0 }}>Il file va nell&apos;archivio documenti come riservato: lo vedi solo tu.</p>
      {err && <p className="acc-msg" style={{ color: '#B42318' }}>{err}</p>}
      <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between', marginTop: 8 }}>
        {value.id ? <button type="button" className="acc-btn" style={{ color: '#B42318' }} onClick={async () => {
          if (!window.confirm('Eliminare questo contratto? Il file resta nell\'archivio.')) return
          const res = await r.deleteContract(value.id); if (res.error) setErr(res.error); else onClose()
        }}><Trash2 size={15} aria-hidden="true" />Elimina</button> : <span />}
        <button type="button" className="acc-btn is-primary" disabled={busy} onClick={save}>{busy ? 'Salvataggio…' : 'Salva contratto'}</button>
      </div>
    </Sheet>
  )
}

function DocSheet({ value, r, supplierName, onClose }) {
  const [v, setV] = useState({ insurer: '', policy_number: '', coverage: '', notes: '', ...value })
  const [file, setFile] = useState(null)
  const [err, setErr] = useState(null)
  const [busy, setBusy] = useState(false)
  const kind = SUPPLIER_DOC_KINDS.find((k) => k.value === v.kind)
  const insurance = v.kind.startsWith('insurance')

  async function save() {
    const coverage = v.coverage === '' ? '' : toNumber(v.coverage)
    if (coverage !== '' && !(coverage >= 0)) { setErr('Massimale non valido.'); return }
    if (v.issued_on && v.expires_on && v.expires_on < v.issued_on) { setErr('La scadenza non può essere prima del rilascio.'); return }
    if (!v.expires_on && !(v.kind === 'durc' && v.issued_on) && ['durc', 'insurance_rc', 'insurance_other'].includes(v.kind)) { setErr('Indica la scadenza.'); return }
    setBusy(true); setErr(null)
    const res = await r.saveDocument({ ...v, coverage }, file, supplierName)
    setBusy(false)
    if (res.error) setErr(res.error); else onClose()
  }

  return (
    <Sheet title={value.id ? docKindLabel(value.kind) : 'Nuovo documento'} kicker={supplierName} onClose={onClose}>
      <Field label="Tipo"><select value={v.kind} onChange={(e) => setV({ ...v, kind: e.target.value })}>{SUPPLIER_DOC_KINDS.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}</select></Field>
      {kind?.hint && <p className="rc-muted" style={{ marginTop: 0 }}>{kind.hint}</p>}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <Field label="Rilasciato il"><input type="date" value={v.issued_on || ''} onChange={(e) => setV({ ...v, issued_on: e.target.value })} /></Field>
        <Field label={v.kind === 'durc' ? 'Scade il (se vuoto: +120 gg)' : 'Scade il'}><input type="date" value={v.expires_on || ''} onChange={(e) => setV({ ...v, expires_on: e.target.value })} /></Field>
        {insurance && <>
          <Field label="Compagnia"><input value={v.insurer || ''} onChange={(e) => setV({ ...v, insurer: e.target.value })} maxLength={120} /></Field>
          <Field label="Numero polizza"><input value={v.policy_number || ''} onChange={(e) => setV({ ...v, policy_number: e.target.value })} maxLength={60} /></Field>
          <Field label="Massimale €"><input value={v.coverage} onChange={(e) => setV({ ...v, coverage: e.target.value })} inputMode="decimal" placeholder="Es. 1.500.000" /></Field>
        </>}
      </div>
      <FilePick file={file} setFile={setFile} existing={!!value.document_id} />
      {err && <p className="acc-msg" style={{ color: '#B42318' }}>{err}</p>}
      <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between', marginTop: 8 }}>
        {value.id ? <button type="button" className="acc-btn" style={{ color: '#B42318' }} onClick={async () => {
          if (!window.confirm('Eliminare questo documento dall\'elenco? Il file resta nell\'archivio.')) return
          const res = await r.deleteDocument(value.id); if (res.error) setErr(res.error); else onClose()
        }}><Trash2 size={15} aria-hidden="true" />Elimina</button> : <span />}
        <button type="button" className="acc-btn is-primary" disabled={busy} onClick={save}>{busy ? 'Salvataggio…' : 'Salva'}</button>
      </div>
    </Sheet>
  )
}
