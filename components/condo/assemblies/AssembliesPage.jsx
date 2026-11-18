'use client'

import { Suspense, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { CalendarDays, CheckCircle2, ChevronRight, FileText, Plus, Trash2, Video } from 'lucide-react'
import Sheet from '@/components/condo/admin/Sheet'
import AssemblyAdmin, { ProxySheet } from '@/components/condo/assemblies/AssemblyAdmin'
import ResidentPecCard from '@/components/condo/ResidentPecCard'
import { useAssemblyList, useAssembly, STATUS_LABEL, MODE_LABEL, majorityLabel } from '@/hooks/useAssemblies'

// Assemblee del condominio. Una sola pagina: elenco, oppure dettaglio con ?a=<id>.

const fmt = (d) => (d ? new Date(d).toLocaleString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'data da definire')

export default function AssembliesPage({ building }) {
  return (
    <Suspense fallback={<div className="acc-wrap"><p className="rc-muted">Caricamento…</p></div>}>
      <AssembliesInner building={building} />
    </Suspense>
  )
}

function AssembliesInner({ building }) {
  const sp = useSearchParams()
  const id = sp.get('a')
  return id ? <AssemblyDetail building={building} assemblyId={id} /> : <AssemblyList building={building} />
}

function AssemblyList({ building }) {
  const base = `/edificio/${building.id}/condominio`
  const router = useRouter()
  const L = useAssemblyList(building.id)
  const [create, setCreate] = useState(false)
  return (
    <div className="acc-wrap" style={{ maxWidth: 900 }}>
      <Link href={base} className="acc-back">‹ Torna al condominio</Link>
      <header className="acc-toolbar" style={{ marginBottom: 14 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 className="acc-h1">Assemblee</h1>
          <p className="rc-muted" style={{ margin: 0 }}>Convocazioni, deleghe, voti e verbali</p>
        </div>
        {L.isCondoAdmin && <button type="button" className="acc-btn is-primary" onClick={() => setCreate(true)}><Plus size={16} aria-hidden="true" />Nuova assemblea</button>}
      </header>
      {L.error && <p className="acc-msg" style={{ color: '#B42318' }}>{L.error}</p>}
      <div className="acc-card" style={{ padding: 0 }}>
        {L.loading ? <p className="rc-muted" style={{ padding: 16, margin: 0 }}>Caricamento…</p> : L.list.length === 0 ? (
          <div className="acc-empty"><CalendarDays size={28} aria-hidden="true" /><strong>Nessuna assemblea</strong><p>{L.isCondoAdmin ? 'Crea la prima: Condor ti aiuta con l\'ordine del giorno e il verbale.' : 'Quando l\'amministratore convoca un\'assemblea la trovi qui.'}</p></div>
        ) : (
          <ul className="ppl-list">
            {L.list.map((x) => (
              <li key={x.id} onClick={() => router.push(`?a=${x.id}`)} style={{ cursor: 'pointer' }}>
                <span className="ppl-avatar">{x.mode === 'in_person' ? <CalendarDays size={16} aria-hidden="true" /> : <Video size={16} aria-hidden="true" />}</span>
                <span className="ppl-main">
                  <strong>{x.title}<em className="ppl-tag">{STATUS_LABEL[x.status]}</em></strong>
                  <small>{x.kind === 'extraordinary' ? 'Straordinaria' : 'Ordinaria'} · {MODE_LABEL[x.mode]} · {fmt(x.first_call_at)}</small>
                </span>
                <ChevronRight size={18} aria-hidden="true" />
              </li>
            ))}
          </ul>
        )}
      </div>
      {create && <CreateSheet L={L} onClose={() => setCreate(false)} onCreated={(id) => router.push(`?a=${id}`)} />}
    </div>
  )
}

// "YYYY-MM-DDTHH:mm" in ora locale <-> Date
const pad = (n) => String(n).padStart(2, '0')
const toLocalInput = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
const DAY = 86400000

function CreateSheet({ L, onClose, onCreated }) {
  const [v, setV] = useState({ title: 'Assemblea ordinaria', kind: 'ordinary', mode: 'in_person', first: '', second: '', location: '', video_link: '' })
  const [err, setErr] = useState(null)
  const [busy, setBusy] = useState(false)
  const [minDate] = useState(() => toLocalInput(new Date(Date.now() + DAY)).slice(0, 10) + 'T00:00')
  const field = (label, input, hint) => (
    <label className="ep-field">
      <span className="ep-label">{label}</span>
      <span className="ep-input">{input}</span>
      {hint && <small className="rc-muted" style={{ display: 'block', marginTop: 4 }}>{hint}</small>}
    </label>
  )

  // Seconda convocazione proposta: il giorno dopo alla stessa ora (modificabile).
  function setFirst(val) {
    const next = { ...v, first: val }
    if (val && (!v.second || (v.first && v.second === toLocalInput(new Date(new Date(v.first).getTime() + DAY))))) {
      next.second = toLocalInput(new Date(new Date(val).getTime() + DAY))
    }
    setV(next)
  }

  const firstMs = v.first ? new Date(v.first).getTime() : null
  const secondMs = v.second ? new Date(v.second).getTime() : null
  const daysToFirst = firstMs ? Math.floor((firstMs - new Date(minDate).getTime() + DAY) / DAY) : null

  async function create() {
    setErr(null)
    if (v.title.trim().length < 3) { setErr('Scrivi un titolo.'); return }
    if (!v.first || !v.second) { setErr('Indica giorno e ora di prima e seconda convocazione.'); return }
    if (secondMs <= firstMs) { setErr('La seconda convocazione deve essere dopo la prima.'); return }
    if (secondMs - firstMs > 10 * DAY) { setErr('La seconda convocazione va fissata entro 10 giorni dalla prima (art. 1136 c. 3 c.c.).'); return }
    setBusy(true)
    const r = await L.create({
      ...v,
      first_call_at: new Date(v.first).toISOString(),
      second_call_at: new Date(v.second).toISOString(),
      location: v.mode !== 'video' ? v.location : '',
      video_link: v.mode !== 'in_person' ? v.video_link : '',
    })
    setBusy(false)
    if (r.error) setErr(r.error); else { onClose(); onCreated(r.id) }
  }

  return (
    <Sheet title="Nuova assemblea" kicker="Assemblee" onClose={onClose}>
      {field('Titolo', <input value={v.title} onChange={(e) => setV({ ...v, title: e.target.value })} maxLength={160} />)}
      {field('Tipo', <select value={v.kind} onChange={(e) => setV({ ...v, kind: e.target.value, title: v.title === 'Assemblea ordinaria' || v.title === 'Assemblea straordinaria' ? (e.target.value === 'ordinary' ? 'Assemblea ordinaria' : 'Assemblea straordinaria') : v.title })}><option value="ordinary">Ordinaria</option><option value="extraordinary">Straordinaria</option></select>)}
      {field('Prima convocazione: giorno e ora', <input type="datetime-local" value={v.first} min={minDate} onChange={(e) => setFirst(e.target.value)} />,
        'Di solito va deserta: è la seconda quella in cui ci si riunisce davvero.')}
      {field('Seconda convocazione: giorno e ora', <input type="datetime-local" value={v.second} min={v.first || minDate} onChange={(e) => setV({ ...v, second: e.target.value })} />,
        'Dopo la prima ed entro 10 giorni (art. 1136 c. 3 c.c.).')}
      {daysToFirst !== null && daysToFirst < 7 && (
        <p style={{ color: '#B54708', fontSize: 13.5, margin: '0 0 8px' }}>
          Mancano {Math.max(daysToFirst, 0)} giorni alla prima convocazione: la convocazione deve arrivare almeno 5 giorni prima e una raccomandata impiega 4-7 giorni. Meglio scegliere una data più lontana.
        </p>
      )}
      {field('Modalità', <select value={v.mode} onChange={(e) => setV({ ...v, mode: e.target.value })}>{Object.entries(MODE_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>)}
      {v.mode !== 'video' && field('Luogo', <input value={v.location} onChange={(e) => setV({ ...v, location: e.target.value })} maxLength={300} placeholder="Es. androne scala A, Via Roma 1" />)}
      {v.mode !== 'in_person' && field('Link del collegamento video (anche dopo)', <input value={v.video_link} onChange={(e) => setV({ ...v, video_link: e.target.value })} maxLength={500} placeholder="https://meet.google.com/..." />)}
      <p className="rc-muted">L&apos;ordine del giorno lo prepari nel passo successivo, anche con Condor.</p>
      {err && <p className="acc-msg" style={{ color: '#B42318' }}>{err}</p>}
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button type="button" className="acc-btn is-primary" disabled={busy} onClick={create}>{busy ? 'Creo…' : 'Crea'}</button>
      </div>
    </Sheet>
  )
}

function AssemblyDetail({ building, assemblyId }) {
  const router = useRouter()
  const A = useAssembly(building.id, assemblyId)
  const a = A.assembly
  return (
    <div className="acc-wrap" style={{ maxWidth: 960 }}>
      <button type="button" className="acc-back" onClick={() => router.push('?')} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}>‹ Tutte le assemblee</button>
      {A.loading ? <p className="rc-muted">Caricamento…</p> : !a ? <p className="rc-muted">Assemblea non trovata.</p> : (
        <>
          <header className="acc-toolbar" style={{ marginBottom: 14 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h1 className="acc-h1">{a.title}</h1>
              <p className="rc-muted" style={{ margin: 0 }}>{STATUS_LABEL[a.status]} · {a.kind === 'extraordinary' ? 'Straordinaria' : 'Ordinaria'} · {MODE_LABEL[a.mode]}</p>
            </div>
            {A.isCondoAdmin && a.status === 'draft' && (
              <button type="button" className="acc-btn" style={{ color: '#B42318' }} onClick={async () => { if (window.confirm('Eliminare questa bozza?')) { const r = await A.remove(); if (!r.error) router.push('?') } }}><Trash2 size={15} aria-hidden="true" />Elimina</button>
            )}
          </header>
          {A.error && <p className="acc-msg" style={{ color: '#B42318' }}>{A.error}</p>}
          {A.isCondoAdmin ? <AssemblyAdmin A={A} /> : <ResidentView A={A} />}
        </>
      )}
    </div>
  )
}

function ResidentView({ A }) {
  const a = A.assembly
  const [proxy, setProxy] = useState(false)
  const [err, setErr] = useState(null)
  const myPeople = A.people.filter((p) => p.user_id === A.userId && p.role !== 'tenant')
  const myUnits = A.units.filter((u) => myPeople.some((p) => p.unit_id === u.id))
  const consentOf = (unitId) => A.consents.find((c) => c.unit_id === unitId)
  const myProxies = A.proxies.filter((p) => myUnits.some((u) => u.id === p.unit_id))
  const t = A.tally
  const resultOf = (itemId) => t?.items?.find((x) => x.item_id === itemId)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div className="acc-card">
        <p style={{ margin: 0 }}><b>Prima convocazione:</b> {fmt(a.first_call_at)}</p>
        <p style={{ margin: '4px 0 0' }}><b>Seconda convocazione:</b> {fmt(a.second_call_at)}</p>
        {a.location && a.mode !== 'video' && <p style={{ margin: '4px 0 0' }}><b>Luogo:</b> {a.location}</p>}
        {a.video_link && a.mode !== 'in_person' && ['convened', 'in_session'].includes(a.status) && <p style={{ margin: '4px 0 0' }}><b>Collegamento:</b> <a href={a.video_link} target="_blank" rel="noopener noreferrer">{a.video_link}</a></p>}
        <p className="rc-muted" style={{ margin: '8px 0 0' }}>La convocazione ufficiale arriva per PEC, raccomandata o a mano: questa pagina è una copia per comodità.</p>
      </div>

      {myUnits.length > 0 && <ResidentPecCard buildingId={a.building_id} />}

      {a.status === 'consent' && (
        <div className="acc-card">
          <strong style={{ display: 'flex', gap: 6, alignItems: 'center' }}><Video size={17} aria-hidden="true" />Sei d&apos;accordo a fare l&apos;assemblea anche in videoconferenza?</strong>
          <p className="rc-muted">Serve il sì della maggioranza dei condomini prima della convocazione.</p>
          {myUnits.length === 0 ? <p className="rc-muted" style={{ margin: 0 }}>L&apos;amministratore non ti ha ancora collegato alla tua unità: rispondigli in chat o per email.</p> : myUnits.map((u) => {
            const c = consentOf(u.id)
            return (
              <div key={u.id} style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginTop: 6 }}>
                <span style={{ minWidth: 80, fontWeight: 700 }}>{u.code}</span>
                <button type="button" className={`p2-chip${c?.consent === true ? ' is-on' : ''}`} onClick={async () => { const r = await A.answerConsent(u.id, true); setErr(r.error) }}>Sì</button>
                <button type="button" className={`p2-chip${c?.consent === false ? ' is-on' : ''}`} onClick={async () => { const r = await A.answerConsent(u.id, false); setErr(r.error) }}>No</button>
              </div>
            )
          })}
        </div>
      )}

      <div className="acc-card">
        <strong>Ordine del giorno</strong>
        <ol style={{ listStyle: 'none', padding: 0, margin: '10px 0 0', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {A.items.map((it) => {
            const r = resultOf(it.id)
            return (
              <li key={it.id} style={{ borderBottom: '1px solid var(--border)', paddingBottom: 8 }}>
                <strong>{it.position}. {it.title}</strong>
                {it.description && <p className="rc-muted" style={{ margin: '2px 0 0', whiteSpace: 'pre-line' }}>{it.description}</p>}
                <small className="rc-muted">{majorityLabel(it.majority_rule)}</small>
                {r && it.majority_rule !== 'info' && (
                  <p style={{ margin: '4px 0 0', fontWeight: 700, color: r.passed ? 'var(--teal-dk)' : '#B42318' }}>
                    {r.passed ? 'Approvato' : 'Non approvato'} · sì {r.yes_heads} ({Number(r.yes_value).toLocaleString('it-IT')}‰), no {r.no_heads}, astenuti {r.abstain_heads}
                  </p>
                )}
              </li>
            )
          })}
        </ol>
      </div>

      {['consent', 'convened'].includes(a.status) && myUnits.length > 0 && (
        <div className="acc-card">
          <strong>Non puoi partecipare?</strong>
          <p className="rc-muted">Puoi delegare per iscritto un&apos;altra persona, anche un vicino. Non puoi delegare l&apos;amministratore.</p>
          {myProxies.map((p) => (
            <p key={p.id} style={{ margin: '4px 0', display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <CheckCircle2 size={15} aria-hidden="true" style={{ color: 'var(--teal)' }} />Delega a <b>{p.delegate_name}</b> · {p.status === 'accepted' ? 'accettata' : p.status === 'rejected' ? 'respinta' : 'in attesa'}
              {p.status === 'submitted' && <button type="button" className="acc-btn" onClick={() => A.withdrawProxy(p.id)}>Ritira</button>}
            </p>
          ))}
          {myProxies.length < myUnits.length && <button type="button" className="acc-btn is-primary" onClick={() => setProxy(true)}>Delega qualcuno</button>}
        </div>
      )}

      {a.status === 'minutes_final' && A.minutes && (
        <div className="acc-card">
          {A.minutes.summary && (
            <>
              <strong>In breve</strong>
              <p style={{ whiteSpace: 'pre-line' }}>{A.minutes.summary}</p>
            </>
          )}
          <details>
            <summary style={{ cursor: 'pointer', fontWeight: 700 }}><FileText size={15} aria-hidden="true" style={{ verticalAlign: '-2px' }} /> Leggi il verbale completo</summary>
            <div style={{ whiteSpace: 'pre-line', marginTop: 8, fontSize: 14.5, lineHeight: 1.55 }}>{A.minutes.draft}</div>
          </details>
        </div>
      )}
      {err && <p className="acc-msg" style={{ color: '#B42318' }}>{err}</p>}
      {proxy && <ProxySheet A={A} units={myUnits.filter((u) => !myProxies.some((p) => p.unit_id === u.id))} defaultGrantor={myPeople[0]?.full_name || ''} onClose={() => setProxy(false)} />}
    </div>
  )
}
