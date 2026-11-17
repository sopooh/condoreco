'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { AlertTriangle, CheckCircle2, Home, Plus, Search, Table2, Trash2, UserRound } from 'lucide-react'
import { useUnits, UNIT_KINDS, PERSON_ROLES, TABLE_KINDS, labelOf } from '@/hooks/useUnits'
import Sheet, { toNumber } from '@/components/condo/admin/Sheet'

// Unità e millesimi: anagrafe ufficiale del condominio tenuta dall'amministratore.
// Il residente vede solo la propria unità e i suoi millesimi.

const fmtMill = (v) => (v == null ? '' : Number(v).toLocaleString('it-IT', { maximumFractionDigits: 3 }))

const CHECK_LABEL = {
  ok: { text: 'Corrispondono', tone: 'ok' },
  mismatch: { text: 'Non corrispondono', tone: 'warn' },
  not_linked: { text: 'Non collegato a un\'unità', tone: 'muted' },
  not_declared: { text: 'Millesimi non dichiarati', tone: 'muted' },
  registry_missing: { text: 'Manca il valore in tabella A', tone: 'muted' },
  tenant: { text: 'Inquilino', tone: 'muted' },
}

export default function UnitsPage({ building }) {
  const base = `/edificio/${building.id}/condominio`
  const u = useUnits(building.id)
  const [tab, setTab] = useState('units')
  const [q, setQ] = useState('')
  const [editUnit, setEditUnit] = useState(null)
  const [editTable, setEditTable] = useState(null)
  const [valuesFor, setValuesFor] = useState(null)

  const peopleByUnit = useMemo(() => {
    const m = new Map()
    u.people.forEach((p) => m.set(p.unit_id, [...(m.get(p.unit_id) || []), p]))
    return m
  }, [u.people])
  const valueOf = (tableId, unitId) => u.values.find((v) => v.table_id === tableId && v.unit_id === unitId)?.value
  const ownership = u.tables.find((t) => t.kind === 'ownership')
  const sums = useMemo(() => Object.fromEntries(u.tables.map((t) => [t.id, u.values.filter((v) => v.table_id === t.id).reduce((n, v) => n + Number(v.value), 0)])), [u.tables, u.values])
  const mismatches = u.check.filter((c) => c.status === 'mismatch').length

  const units = u.units.filter((x) => {
    if (!q) return true
    const hay = [x.code, x.floor, x.staircase, ...(peopleByUnit.get(x.id) || []).map((p) => p.full_name)].join(' ').toLowerCase()
    return hay.includes(q.toLowerCase())
  })

  if (!u.loading && !u.isCondoAdmin) return <ResidentView base={base} u={u} peopleByUnit={peopleByUnit} valueOf={valueOf} />

  return (
    <div className="acc-wrap" style={{ maxWidth: 960 }}>
      <Link href={base} className="acc-back">‹ Torna al condominio</Link>
      <header className="acc-toolbar" style={{ marginBottom: 14 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 className="acc-h1">Unità e millesimi</h1>
          <p className="rc-muted" style={{ margin: 0 }}>
            {u.loading ? 'Caricamento…' : `${u.units.length} ${u.units.length === 1 ? 'unità' : 'unità'} · ${u.tables.length} ${u.tables.length === 1 ? 'tabella' : 'tabelle'} millesimali`}
          </p>
        </div>
        {tab === 'units' && <button type="button" className="acc-btn is-primary" onClick={() => setEditUnit({ code: '', kind: 'apartment' })}><Plus size={16} aria-hidden="true" />Aggiungi unità</button>}
        {tab === 'tables' && <button type="button" className="acc-btn is-primary" onClick={() => setEditTable(nextTable(u.tables))}><Plus size={16} aria-hidden="true" />Nuova tabella</button>}
      </header>

      <div className="p2-chips" style={{ marginBottom: 12 }}>
        {[['units', 'Unità'], ['tables', 'Tabelle millesimali'], ['check', `Verifica millesimi${mismatches ? ` (${mismatches})` : ''}`]].map(([k, l]) => (
          <button key={k} type="button" className={`p2-chip${tab === k ? ' is-on' : ''}`} onClick={() => setTab(k)}>{l}</button>
        ))}
      </div>
      {u.error && <p className="acc-msg" style={{ color: '#B42318' }}>{u.error}</p>}

      {tab === 'units' && (
        <div className="acc-card" style={{ padding: 0 }}>
          <div className="bil-filters">
            <label className="acc-search" style={{ maxWidth: 320 }}><Search size={16} aria-hidden="true" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cerca unità, piano o nome" aria-label="Cerca" /></label>
          </div>
          {u.loading ? <p className="rc-muted" style={{ padding: 16, margin: 0 }}>Caricamento…</p> : units.length === 0 ? (
            <div className="acc-empty"><Home size={28} aria-hidden="true" /><strong>Nessuna unità</strong><p>Aggiungi gli appartamenti, i negozi e i box del condominio, con proprietari e inquilini.</p></div>
          ) : (
            <ul className="ppl-list">
              {units.map((x) => {
                const ppl = peopleByUnit.get(x.id) || []
                const owners = ppl.filter((p) => p.role !== 'tenant').map((p) => p.full_name + (Number(p.share) < 100 ? ` (${fmtMill(p.share)}%)` : ''))
                const tenants = ppl.filter((p) => p.role === 'tenant').map((p) => p.full_name)
                const a = ownership ? valueOf(ownership.id, x.id) : null
                return (
                  <li key={x.id} onClick={() => setEditUnit(x)} style={{ cursor: 'pointer' }}>
                    <span className="ppl-avatar" style={{ fontSize: 13 }}>{x.code.slice(0, 3)}</span>
                    <span className="ppl-main">
                      <strong>{x.code}<em className="ppl-tag" style={{ background: 'var(--teal-lt)', color: 'var(--teal-dk)' }}>{labelOf(UNIT_KINDS, x.kind)}</em></strong>
                      <small>{[x.floor ? `Piano ${x.floor}` : null, x.staircase ? `Scala ${x.staircase}` : null, owners.length ? `Prop. ${owners.join(', ')}` : 'Proprietario non indicato', tenants.length ? `Inq. ${tenants.join(', ')}` : null].filter(Boolean).join(' · ')}</small>
                    </span>
                    <span className="ppl-state">{a != null ? <><small>Tab. {ownership.code}</small><b>{fmtMill(a)}‰</b></> : <small>—</small>}</span>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      )}

      {tab === 'tables' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {u.tables.length === 0 && !u.loading && (
            <div className="acc-card"><div className="acc-empty"><Table2 size={28} aria-hidden="true" /><strong>Nessuna tabella millesimale</strong><p>Inizia dalla tabella A (proprietà generale), poi aggiungi scale, ascensore e riscaldamento se ci sono.</p></div></div>
          )}
          {u.tables.map((t) => {
            const sum = sums[t.id] || 0
            const ok = Math.abs(sum - Number(t.total)) < 0.01
            const filled = u.values.filter((v) => v.table_id === t.id).length
            return (
              <div key={t.id} className="acc-card" style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <span className="ppl-avatar">{t.code}</span>
                <span style={{ flex: 1, minWidth: 180 }}>
                  <strong style={{ display: 'block' }}>{t.name}</strong>
                  <small className="rc-muted">{labelOf(TABLE_KINDS, t.kind)} · {filled} di {u.units.length} unità compilate</small>
                </span>
                <span style={{ textAlign: 'right' }}>
                  <small className="rc-muted" style={{ display: 'block' }}>Totale</small>
                  <b style={{ color: ok ? 'var(--text)' : '#B42318' }}>{fmtMill(sum)} / {fmtMill(t.total)}</b>
                </span>
                <span style={{ display: 'flex', gap: 6 }}>
                  <button type="button" className="acc-btn is-primary" onClick={() => setValuesFor(t)} disabled={!u.units.length}>Compila valori</button>
                  <button type="button" className="acc-btn" onClick={() => setEditTable(t)}>Modifica</button>
                </span>
                {!ok && filled > 0 && <p className="rc-muted" style={{ width: '100%', margin: 0, color: '#B42318' }}><AlertTriangle size={14} aria-hidden="true" style={{ verticalAlign: '-2px' }} /> La somma non arriva al totale: mancano {fmtMill(Number(t.total) - sum)}‰.</p>}
              </div>
            )
          })}
        </div>
      )}

      {tab === 'check' && (
        <div className="acc-card" style={{ padding: 0 }}>
          <p className="rc-muted" style={{ padding: '14px 16px 0', margin: 0 }}>
            Confronta i millesimi dichiarati da ogni condomino in fase di verifica con la tabella {ownership ? ownership.code : 'A'} dell&apos;anagrafe.
            Collega ogni iscritto alla sua unità dalla scheda dell&apos;unità.
          </p>
          {!ownership ? (
            <div className="acc-empty"><Table2 size={28} aria-hidden="true" /><strong>Manca la tabella di proprietà generale</strong><p>Creala in &quot;Tabelle millesimali&quot; per avviare la verifica.</p></div>
          ) : (
            <ul className="ppl-list">
              {u.check.map((c) => {
                const l = CHECK_LABEL[c.status] || CHECK_LABEL.not_linked
                return (
                  <li key={c.user_id}>
                    <span className="ppl-avatar">{(c.display_name || '?').slice(0, 1).toUpperCase()}</span>
                    <span className="ppl-main">
                      <strong>{c.display_name || 'Condomino'}</strong>
                      <small>{[c.units ? `Unità ${c.units}` : null, c.declared != null ? `Dichiarati ${fmtMill(c.declared)}‰` : null, c.registry != null ? `Anagrafe ${fmtMill(c.registry)}‰` : null].filter(Boolean).join(' · ') || ' '}</small>
                    </span>
                    <span className="ppl-state">
                      {l.tone === 'ok' ? <span className="bil-ok"><CheckCircle2 size={15} aria-hidden="true" />{l.text}</span>
                        : <small style={{ color: l.tone === 'warn' ? '#B42318' : undefined, fontWeight: l.tone === 'warn' ? 700 : undefined }}>{l.text}</small>}
                    </span>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      )}

      {editUnit && <UnitSheet unit={editUnit} u={u} people={peopleByUnit.get(editUnit.id) || []} onClose={() => setEditUnit(null)} />}
      {editTable && <TableSheet table={editTable} u={u} onClose={() => setEditTable(null)} />}
      {valuesFor && <ValuesSheet table={valuesFor} u={u} valueOf={valueOf} peopleByUnit={peopleByUnit} onClose={() => setValuesFor(null)} />}
    </div>
  )
}

function nextTable(tables) {
  const used = new Set(tables.map((t) => t.kind))
  const k = TABLE_KINDS.find((x) => x.value !== 'other' && !used.has(x.value)) || TABLE_KINDS[TABLE_KINDS.length - 1]
  return { code: k.code, name: k.value === 'other' ? '' : k.label, kind: k.value, total: 1000 }
}

function Field({ label, children }) {
  return <label className="ep-field"><span className="ep-label">{label}</span><span className="ep-input">{children}</span></label>
}

function UnitSheet({ unit, u, people, onClose }) {
  const [v, setV] = useState({ floor: '', staircase: '', cadastral_ref: '', notes: '', ...unit })
  const [err, setErr] = useState(null)
  const [busy, setBusy] = useState(false)
  const [person, setPerson] = useState(null)
  const linked = new Set(u.people.filter((p) => p.user_id).map((p) => p.user_id))

  async function save() {
    if (!v.code.trim()) { setErr('Indica il codice dell\'unità (es. Int. 5, A3, Box 2).'); return }
    setBusy(true); setErr(null)
    const r = await u.saveUnit(v)
    setBusy(false)
    if (r.error) setErr(r.error); else if (!unit.id) onClose()
  }

  return (
    <Sheet title={unit.id ? `Unità ${unit.code}` : 'Nuova unità'} kicker="Unità e millesimi" onClose={onClose} wide>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <Field label="Codice"><input value={v.code} onChange={(e) => setV({ ...v, code: e.target.value })} maxLength={30} placeholder="Es. Int. 5" /></Field>
        <Field label="Tipo"><select value={v.kind} onChange={(e) => setV({ ...v, kind: e.target.value })}>{UNIT_KINDS.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}</select></Field>
        <Field label="Piano"><input value={v.floor || ''} onChange={(e) => setV({ ...v, floor: e.target.value })} maxLength={10} placeholder="Es. 3 o T" /></Field>
        <Field label="Scala"><input value={v.staircase || ''} onChange={(e) => setV({ ...v, staircase: e.target.value })} maxLength={20} placeholder="Es. B" /></Field>
      </div>
      <Field label="Dati catastali (facoltativi)"><input value={v.cadastral_ref || ''} onChange={(e) => setV({ ...v, cadastral_ref: e.target.value })} maxLength={80} placeholder="Foglio, particella, subalterno" /></Field>
      {err && <p className="acc-msg" style={{ color: '#B42318' }}>{err}</p>}
      <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between', marginTop: 8 }}>
        {unit.id ? <button type="button" className="acc-btn" style={{ color: '#B42318' }} onClick={async () => {
          if (!window.confirm(`Eliminare l'unità ${unit.code} con le sue persone e i suoi millesimi?`)) return
          const r = await u.deleteUnit(unit.id); if (r.error) setErr(r.error); else onClose()
        }}><Trash2 size={15} aria-hidden="true" />Elimina</button> : <span />}
        <button type="button" className="acc-btn is-primary" disabled={busy} onClick={save}>{busy ? 'Salvataggio…' : 'Salva unità'}</button>
      </div>

      {unit.id && (
        <div style={{ marginTop: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <strong>Proprietari e inquilini</strong>
            <button type="button" className="acc-btn" onClick={() => setPerson({ unit_id: unit.id, full_name: '', role: 'owner', share: 100 })}><Plus size={15} aria-hidden="true" />Aggiungi</button>
          </div>
          {people.length === 0 ? <p className="rc-muted">Nessuna persona indicata.</p> : (
            <ul className="ppl-list">
              {people.map((p) => (
                <li key={p.id} onClick={() => setPerson(p)} style={{ cursor: 'pointer' }}>
                  <span className="ppl-avatar"><UserRound size={16} aria-hidden="true" /></span>
                  <span className="ppl-main">
                    <strong>{p.full_name}{p.user_id && <em className="ppl-tag">Su Condoreco</em>}</strong>
                    <small>{[labelOf(PERSON_ROLES, p.role), Number(p.share) < 100 ? `quota ${fmtMill(p.share)}%` : null, p.until ? `fino al ${new Date(p.until).toLocaleDateString('it-IT')}` : null].filter(Boolean).join(' · ')}</small>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      {person && <PersonSheet person={person} u={u} linked={linked} onClose={() => setPerson(null)} />}
    </Sheet>
  )
}

function PersonSheet({ person, u, linked, onClose }) {
  const [v, setV] = useState({ email: '', phone: '', since: '', until: '', user_id: '', ...person })
  const [err, setErr] = useState(null)
  const [busy, setBusy] = useState(false)
  const choices = u.members.filter((m) => !linked.has(m.user_id) || m.user_id === person.user_id)

  async function save() {
    if (v.full_name.trim().length < 2) { setErr('Indica nome e cognome.'); return }
    const share = toNumber(v.share)
    if (!(share > 0 && share <= 100)) { setErr('La quota va da 0,01 a 100.'); return }
    setBusy(true); setErr(null)
    const r = await u.savePerson({ ...v, share })
    setBusy(false)
    if (r.error) setErr(r.error); else onClose()
  }

  return (
    <Sheet title={person.id ? person.full_name : 'Nuova persona'} kicker="Proprietari e inquilini" onClose={onClose}>
      <Field label="Nome e cognome (come sull'atto o sul contratto)"><input value={v.full_name} onChange={(e) => setV({ ...v, full_name: e.target.value })} maxLength={120} /></Field>
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 10 }}>
        <Field label="Titolo"><select value={v.role} onChange={(e) => setV({ ...v, role: e.target.value })}>{PERSON_ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}</select></Field>
        <Field label="Quota %"><input value={v.share} onChange={(e) => setV({ ...v, share: e.target.value })} inputMode="decimal" /></Field>
      </div>
      <Field label="Iscritto su Condoreco">
        <select value={v.user_id || ''} onChange={(e) => {
          const m = u.members.find((x) => x.user_id === e.target.value)
          setV({ ...v, user_id: e.target.value, full_name: v.full_name || m?.display_name || '' })
        }}>
          <option value="">Non iscritto o non collegato</option>
          {choices.map((m) => <option key={m.user_id} value={m.user_id}>{m.display_name || 'Condomino'}{m.floor ? ` · piano ${m.floor}` : ''}</option>)}
        </select>
      </Field>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <Field label="Email"><input type="email" value={v.email || ''} onChange={(e) => setV({ ...v, email: e.target.value })} maxLength={200} /></Field>
        <Field label="Telefono"><input value={v.phone || ''} onChange={(e) => setV({ ...v, phone: e.target.value })} maxLength={40} /></Field>
        <Field label="Dal"><input type="date" value={v.since || ''} onChange={(e) => setV({ ...v, since: e.target.value })} /></Field>
        <Field label="Al (se è subentrato qualcuno)"><input type="date" value={v.until || ''} onChange={(e) => setV({ ...v, until: e.target.value })} /></Field>
      </div>
      {err && <p className="acc-msg" style={{ color: '#B42318' }}>{err}</p>}
      <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between', marginTop: 8 }}>
        {person.id ? <button type="button" className="acc-btn" style={{ color: '#B42318' }} onClick={async () => {
          if (!window.confirm(`Togliere ${person.full_name} da questa unità?`)) return
          const r = await u.deletePerson(person.id); if (r.error) setErr(r.error); else onClose()
        }}><Trash2 size={15} aria-hidden="true" />Togli</button> : <span />}
        <button type="button" className="acc-btn is-primary" disabled={busy} onClick={save}>{busy ? 'Salvataggio…' : 'Salva'}</button>
      </div>
    </Sheet>
  )
}

function TableSheet({ table, u, onClose }) {
  const [v, setV] = useState({ notes: '', ...table })
  const [err, setErr] = useState(null)
  const [busy, setBusy] = useState(false)
  async function save() {
    if (!v.code.trim() || v.name.trim().length < 2) { setErr('Indica codice e nome della tabella.'); return }
    const total = toNumber(v.total)
    if (!(total > 0)) { setErr('Il totale deve essere maggiore di zero (di solito 1000).'); return }
    setBusy(true); setErr(null)
    const r = await u.saveTable({ ...v, total })
    setBusy(false)
    if (r.error) setErr(/codice/.test(r.error) && v.kind === 'ownership' ? 'Esiste già una tabella con questo codice o una tabella di proprietà generale.' : r.error)
    else onClose()
  }
  return (
    <Sheet title={table.id ? `Tabella ${table.code}` : 'Nuova tabella millesimale'} kicker="Unità e millesimi" onClose={onClose}>
      <div style={{ display: 'grid', gridTemplateColumns: '0.6fr 1.4fr', gap: 10 }}>
        <Field label="Codice"><input value={v.code} onChange={(e) => setV({ ...v, code: e.target.value })} maxLength={10} placeholder="A" /></Field>
        <Field label="Nome"><input value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} maxLength={80} placeholder="Proprietà generale" /></Field>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 0.6fr', gap: 10 }}>
        <Field label="Uso"><select value={v.kind} onChange={(e) => setV({ ...v, kind: e.target.value })}>{TABLE_KINDS.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}</select></Field>
        <Field label="Totale"><input value={v.total} onChange={(e) => setV({ ...v, total: e.target.value })} inputMode="decimal" /></Field>
      </div>
      {err && <p className="acc-msg" style={{ color: '#B42318' }}>{err}</p>}
      <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between', marginTop: 8 }}>
        {table.id ? <button type="button" className="acc-btn" style={{ color: '#B42318' }} onClick={async () => {
          if (!window.confirm(`Eliminare la tabella ${table.code} con tutti i suoi valori?`)) return
          const r = await u.deleteTable(table.id); if (r.error) setErr(r.error); else onClose()
        }}><Trash2 size={15} aria-hidden="true" />Elimina</button> : <span />}
        <button type="button" className="acc-btn is-primary" disabled={busy} onClick={save}>{busy ? 'Salvataggio…' : 'Salva tabella'}</button>
      </div>
    </Sheet>
  )
}

function ValuesSheet({ table, u, valueOf, peopleByUnit, onClose }) {
  const [vals, setVals] = useState(() => Object.fromEntries(u.units.map((x) => {
    const v = valueOf(table.id, x.id)
    return [x.id, v == null ? '' : String(v).replace('.', ',')]
  })))
  const [err, setErr] = useState(null)
  const [busy, setBusy] = useState(false)
  const sum = Object.values(vals).reduce((n, v) => n + (Number.isFinite(toNumber(v)) && v !== '' ? toNumber(v) : 0), 0)
  const ok = Math.abs(sum - Number(table.total)) < 0.01

  async function save() {
    const parsed = {}
    for (const [id, v] of Object.entries(vals)) {
      if (v === '') { parsed[id] = ''; continue }
      const n = toNumber(v)
      if (!(n >= 0)) { setErr('Ci sono valori non validi: usa numeri come 45,320.'); return }
      parsed[id] = n
    }
    setBusy(true); setErr(null)
    const r = await u.saveValues(table.id, parsed)
    setBusy(false)
    if (r.error) setErr(r.error); else onClose()
  }

  return (
    <Sheet title={`Tabella ${table.code} · ${table.name}`} kicker="Valori per unità" onClose={onClose} wide>
      <p className="rc-muted" style={{ marginTop: 0 }}>Copia i valori dalla tabella millesimale del regolamento. Lascia vuoto se l&apos;unità non partecipa.</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {u.units.map((x) => {
          const owner = (peopleByUnit.get(x.id) || []).find((p) => p.role !== 'tenant')
          return (
            <label key={x.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ flex: 1, minWidth: 0 }}>
                <strong style={{ fontSize: 14 }}>{x.code}</strong>
                <small className="rc-muted" style={{ display: 'block' }}>{[x.floor ? `Piano ${x.floor}` : null, owner?.full_name].filter(Boolean).join(' · ') || ' '}</small>
              </span>
              <span className="ep-input" style={{ width: 120 }}>
                <input value={vals[x.id]} onChange={(e) => setVals({ ...vals, [x.id]: e.target.value })} inputMode="decimal" aria-label={`Millesimi ${x.code}`} style={{ textAlign: 'right' }} />
              </span>
            </label>
          )
        })}
      </div>
      <p style={{ margin: '12px 0 0', fontWeight: 700, color: ok ? 'var(--teal-dk)' : '#B42318' }}>
        Totale {fmtMill(sum)} su {fmtMill(table.total)}{ok ? '' : ` (mancano ${fmtMill(Number(table.total) - sum)})`}
      </p>
      {err && <p className="acc-msg" style={{ color: '#B42318' }}>{err}</p>}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
        <button type="button" className="acc-btn is-primary" disabled={busy} onClick={save}>{busy ? 'Salvataggio…' : 'Salva valori'}</button>
      </div>
    </Sheet>
  )
}

function ResidentView({ base, u, peopleByUnit, valueOf }) {
  const mine = u.units.filter((x) => peopleByUnit.has(x.id))
  return (
    <div className="acc-wrap" style={{ maxWidth: 760 }}>
      <Link href={base} className="acc-back">‹ Torna al condominio</Link>
      <h1 className="acc-h1">La mia unità</h1>
      {u.loading ? <p className="rc-muted">Caricamento…</p> : mine.length === 0 ? (
        <div className="acc-card"><div className="acc-empty"><Home size={28} aria-hidden="true" /><strong>Unità non ancora collegata</strong><p>L&apos;amministratore deve collegarti alla tua unità nell&apos;anagrafe del condominio.</p></div></div>
      ) : mine.map((x) => (
        <div key={x.id} className="acc-card" style={{ marginBottom: 10 }}>
          <strong style={{ fontSize: 17 }}>{x.code}</strong>
          <p className="rc-muted" style={{ margin: '2px 0 10px' }}>{[labelOf(UNIT_KINDS, x.kind), x.floor ? `Piano ${x.floor}` : null, x.staircase ? `Scala ${x.staircase}` : null].filter(Boolean).join(' · ')}</p>
          {u.tables.length === 0 ? <p className="rc-muted" style={{ margin: 0 }}>Le tabelle millesimali non sono ancora state caricate.</p> : (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {u.tables.map((t) => (
                <li key={t.id} style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Tabella {t.code} · {t.name}</span>
                  <b>{valueOf(t.id, x.id) != null ? `${fmtMill(valueOf(t.id, x.id))}‰` : '—'}</b>
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </div>
  )
}
