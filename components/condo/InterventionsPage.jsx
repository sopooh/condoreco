'use client'

import { CalendarDays, Check, ChevronRight, Info, Mail, Megaphone, MessageCircle, Phone, Plus, UserRound, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useSession } from '@/components/providers/SessionProvider'
import { getProfile } from '@/lib/profile'
import { MAINTENANCE_CATEGORIES, maintenanceCategory, maintenanceCategoryLabel } from '@/lib/maintenanceCategories'
import MaintenanceIcon from '@/components/condo/MaintenanceIcon'
import { ToolboxArt } from '@/components/condo/CondoArt'
import { useInterventions, INTERVENTION_STATUS, isActiveIntervention } from '@/hooks/useInterventions'
import { contactMessage, telLink, waLink, mailLink } from '@/lib/contact'
import { toLocalISODate } from '@/lib/localDate'
import { useNeighbourNotices } from '@/hooks/useNeighbourNotices'
import { NoticeForm, NoticeIcon } from '@/components/condo/NeighbourNotice'

// "I tuoi interventi" (area personale): il residente segnala un problema,
// sceglie o aggiunge un manutentore e lo contatta direttamente, senza
// passare dall'amministratore. Quando fissa la data l'intervento diventa
// "Programmato" e compare in bacheca/calendario per tutti (solo titolo,
// categoria, data, orario e luogo). Il resto resta privato.

const fmtDay = (iso) => new Date(iso + 'T00:00:00').toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short' })

export default function InterventionsPage({ building }) {
  const buildingId = building.id
  const address = `${building.address}${building.street_number ? `, ${building.street_number}` : ''}`
  const session = useSession()
  const [senderName, setSenderName] = useState(null)
  const { interventions, maintainers, loading, error, createIntervention, updateIntervention, deleteIntervention, addMaintainer } = useInterventions(buildingId)
  const notices = useNeighbourNotices(buildingId)

  useEffect(() => {
    const id = session?.user?.id
    if (!id) return
    getProfile(id).then(({ data }) => setSenderName(data?.display_name || null))
  }, [session?.user?.id])

  const [filter, setFilter] = useState(null)        // categoria selezionata (null = tutte)
  const [creating, setCreating] = useState(false)
  const [detail, setDetail] = useState(null)
  const [scheduling, setScheduling] = useState(null)
  const [contacting, setContacting] = useState(null)
  const [addingMaintainer, setAddingMaintainer] = useState(false)

  const byId = useMemo(() => Object.fromEntries(maintainers.map((m) => [m.id, m])), [maintainers])
  // in corso prima, poi conclusi; dentro, i piu' recenti prima
  const list = interventions
    .filter((i) => !filter || i.category === filter)
    .sort((a, b) => (isActiveIntervention(b) - isActiveIntervention(a)) || (b.created_at > a.created_at ? 1 : -1))
  const current = detail ? interventions.find((i) => i.id === detail) : null
  const msgFor = (intervention) => contactMessage({ maintainer: byId[intervention.maintainer_id], intervention, senderName, address })

  return (
    <div style={{ background: 'var(--bg)' }}>
      {/* ---- hero ---- */}
      <div style={{ position: 'relative', overflow: 'hidden', color: '#fff', background: 'linear-gradient(160deg, #0D676F 0%, #0A5258 70%, #08464B 100%)', padding: '18px 20px 30px', borderRadius: '0 0 30px 30px' }}>
        <div style={{ position: 'absolute', right: -50, top: -20, width: 230, height: 230, borderRadius: '50%', background: 'rgba(255,255,255,0.07)' }} />
        <div style={{ maxWidth: 720, margin: '0 auto', position: 'relative' }}>
          <Link href={`/edificio/${buildingId}/condominio`} style={{ fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.85)' }}>‹ Torna al condominio</Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 14 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 15, opacity: 0.92 }}><PersonIcon /> Area personale</div>
              <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.6px', margin: '6px 0 8px', lineHeight: 1.1 }}>I tuoi interventi</h1>
              <p style={{ fontSize: 15, lineHeight: 1.45, margin: 0, opacity: 0.92 }}>Le tue segnalazioni, gli appuntamenti e lo stato degli interventi.</p>
            </div>
            <div style={{ width: 92, height: 92, flexShrink: 0, background: 'rgba(255,255,255,0.92)', borderRadius: 24, padding: 10 }}><ToolboxArt /></div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 720, margin: '0 auto', padding: '18px 16px 64px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* ---- categorie ---- */}
        <div style={{ display: 'flex', gap: 10, overflowX: 'auto', margin: '0 -16px', padding: '2px 16px 6px', scrollbarWidth: 'none' }}>
          {MAINTENANCE_CATEGORIES.map((c) => {
            const on = filter === c.value
            return (
              <button key={c.value} onClick={() => setFilter(on ? null : c.value)} aria-pressed={on} style={{
                flex: '0 0 auto', width: 96, minHeight: 0, padding: '14px 6px 12px', borderRadius: 18, cursor: 'pointer',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                border: `1.5px solid ${on ? 'var(--teal)' : 'var(--border)'}`, background: on ? 'var(--teal-lt)' : 'var(--white)',
                color: 'var(--teal-dk)', boxShadow: on ? '0 4px 14px rgba(13,103,111,0.15)' : 'none',
              }}>
                <MaintenanceIcon name={c.icon} size={30} />
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', lineHeight: 1.2, textAlign: 'center' }}>{c.label}</span>
              </button>
            )
          })}
        </div>

        {/* ---- segnalazioni ---- */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, borderTop: '1px solid var(--border)', paddingTop: 16 }}>
          <h2 style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.4px', margin: 0, minWidth: 0 }}>
            {filter ? maintenanceCategoryLabel(filter) : 'Le mie segnalazioni'}
          </h2>
          <button onClick={() => setCreating(true)} aria-label="Nuova segnalazione" style={{ ...ghostBtn, height: 42, padding: '0 14px', fontSize: 14, borderRadius: 999, border: '1.5px solid var(--teal)', color: 'var(--teal-dk)', flexShrink: 0, whiteSpace: 'nowrap' }}>
            <PlusIcon /> Nuova
          </button>
        </div>

        {error && <p style={errText}>Non riesco a caricare gli interventi. Riprova tra poco.</p>}

        {loading ? (
          <p style={{ fontSize: 14, color: 'var(--text-3)' }}>Caricamento...</p>
        ) : list.length === 0 ? (
          <div style={{ ...card, textAlign: 'center', padding: '26px 20px' }}>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>{filter ? 'Nessuna segnalazione in questa categoria' : 'Nessuna segnalazione'}</div>
            <p style={{ fontSize: 14, color: 'var(--text-3)', margin: 0 }}>Hai un problema in casa o nelle parti comuni? Apri una segnalazione e contatta subito il fornitore giusto.</p>
          </div>
        ) : (
          list.map((i) => <InterventionCard key={i.id} intervention={i} maintainer={byId[i.maintainer_id]} onOpen={() => setDetail(i.id)} />)
        )}

        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '14px 16px', borderRadius: 16, background: '#E6F1F1', color: 'var(--teal-dk)', fontSize: 14.5, lineHeight: 1.45 }}>
          <span style={{ flexShrink: 0, marginTop: 1 }}><InfoIcon /></span>
          <span><strong>Tutti gli interventi sono visibili solo a te.</strong> Quando fissi una data, titolo, giorno e luogo compaiono in bacheca per gli altri residenti.</span>
        </div>

        {/* ---- fornitori ---- */}
        <section style={{ marginTop: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 10 }}>
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>Fornitori del condominio</h2>
              <p style={{ fontSize: 13, color: 'var(--text-3)', margin: '2px 0 0' }}>Rubrica condivisa tra i residenti verificati.</p>
            </div>
            <button onClick={() => setAddingMaintainer(true)} style={{ ...ghostBtn, height: 40, padding: '0 12px', flexShrink: 0 }}>+ Aggiungi</button>
          </div>
          {maintainers.length === 0 ? (
            <p style={{ fontSize: 14, color: 'var(--text-3)', margin: 0 }}>Nessun fornitore ancora: aggiungi ascensorista, idraulico, elettricista...</p>
          ) : (
            <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
              {MAINTENANCE_CATEGORIES.flatMap((c) => maintainers.filter((m) => m.category === c.value)).map((m, idx) => (
                <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderTop: idx ? '1px solid var(--border)' : 'none' }}>
                  <span style={{ ...iconTile, width: 42, height: 42 }}><MaintenanceIcon name={maintenanceCategory(m.category).icon} size={22} /></span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 15, fontWeight: 700 }}>{m.name}</div>
                    <div style={{ fontSize: 12.5, color: 'var(--text-3)' }}>{maintenanceCategoryLabel(m.category)}{m.company ? ` · ${m.company}` : ''}</div>
                    {m.notes && <div style={{ fontSize: 12.5, color: 'var(--text-3)' }}>{m.notes}</div>}
                  </div>
                  {m.phone && <a href={telLink(m.phone)} aria-label={`Chiama ${m.name}`} style={roundIcon}><PhoneIcon /></a>}
                  {m.email && <a href={`mailto:${m.email}`} aria-label={`Scrivi a ${m.name}`} style={roundIcon}><MailIcon /></a>}
                </div>
              ))}
            </div>
          )}
          <p style={{ fontSize: 13, color: 'var(--text-3)', margin: '10px 2px 0' }}>
            Emergenze per persone o cose: <a href="tel:112" style={{ color: '#B42318', fontWeight: 700 }}>112</a>
          </p>
        </section>
      </div>

      {current && !contacting && !scheduling && (
        <DetailSheet
          intervention={current}
          maintainer={byId[current.maintainer_id]}
          onClose={() => setDetail(null)}
          onContact={() => setContacting(current)}
          onSchedule={() => setScheduling(current)}
          onUpdate={(patch) => updateIntervention(current.id, patch)}
          onDelete={async () => { const r = await deleteIntervention(current.id); if (!r.error) setDetail(null); return r }}
        />
      )}
      {creating && (
        <NewInterventionSheet
          maintainers={maintainers}
          defaultCategory={filter || 'elevator'}
          onClose={() => setCreating(false)}
          onAddMaintainer={addMaintainer}
          onCreate={createIntervention}
          onCreated={(draft) => { setCreating(false); if (draft.maintainer_id) setContacting(draft) }}
          building={building}
          notices={notices}
        />
      )}
      {contacting && (
        <ContactSheet
          intervention={contacting}
          maintainer={byId[contacting.maintainer_id]}
          message={msgFor(contacting)}
          onClose={() => setContacting(null)}
          onSchedule={() => { setScheduling(contacting); setContacting(null) }}
        />
      )}
      {scheduling && (
        <ScheduleSheet
          intervention={scheduling}
          onClose={() => setScheduling(null)}
          onSave={async (v) => {
            const { error } = await updateIntervention(scheduling.id, { status: 'scheduled', scheduled_date: v.date, time_start: v.start || null, time_end: v.end || null })
            if (!error) setScheduling(null)
            return error
          }}
        />
      )}
      {addingMaintainer && (
        <Sheet onClose={() => setAddingMaintainer(false)} title="Aggiungi fornitore">
          <MaintainerForm defaultCategory={filter || 'elevator'} onCancel={() => setAddingMaintainer(false)} onSave={async (v) => {
            const { error } = await addMaintainer(v)
            if (!error) setAddingMaintainer(false)
            return error
          }} />
        </Sheet>
      )}
    </div>
  )
}

function relDate(isoTs) {
  const d = new Date(isoTs)
  const today = new Date()
  const time = d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
  if (d.toDateString() === today.toDateString()) return `Oggi, ${time}`
  const s = d.toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short' })
  return s.replace(/(^|\s)\S/g, (m) => m.toUpperCase())
}
const capDay = (iso) => fmtDay(iso).replace(/(^|\s)\S/g, (m) => m.toUpperCase())

function InterventionCard({ intervention: i, maintainer, onOpen }) {
  const st = INTERVENTION_STATUS[i.status]
  const cat = maintenanceCategory(i.category)
  return (
    <button onClick={onOpen} style={{ ...card, padding: 0, width: '100%', textAlign: 'left', cursor: 'pointer', boxShadow: '0 4px 14px rgba(13,103,111,0.06)', opacity: i.status === 'cancelled' ? 0.6 : 1 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, padding: '16px 16px 14px' }}>
        <span style={{ ...iconTile, width: 50, height: 50, borderRadius: 15 }}><MaintenanceIcon name={cat.icon} size={27} /></span>
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: 'block', fontSize: 16.5, fontWeight: 800, color: 'var(--text)', lineHeight: 1.25 }}>{i.title}</span>
          <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 13.5, color: 'var(--text-3)' }}>{i.ref_number ? `#IT-${i.ref_number} · ` : ''}{relDate(i.created_at)}</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 999, fontSize: 12.5, fontWeight: 700, background: st.bg, color: st.tx, whiteSpace: 'nowrap' }}>
              {st.check && <CheckIcon size={14} />}{st.label}
            </span>
          </span>
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderTop: '1px solid var(--border)', fontSize: 14, color: 'var(--text-2)' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
          <span style={{ color: 'var(--teal)', flexShrink: 0 }}><PersonIcon /></span>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: maintainer ? 'var(--text-2)' : '#B4510F', fontWeight: maintainer ? 500 : 600 }}>
            {maintainer ? maintainer.name : 'Scegli il fornitore'}
          </span>
        </span>
        {i.scheduled_date && i.status !== 'cancelled' && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
            <span style={{ color: 'var(--teal)' }}><CalendarIcon /></span>
            {capDay(i.scheduled_date)}{i.time_start ? ` · ${i.time_start.slice(0, 5)}${i.time_end ? `-${i.time_end.slice(0, 5)}` : ''}` : ''}
          </span>
        )}
        <span style={{ color: 'var(--text-3)', flexShrink: 0 }}><ChevronIcon /></span>
      </div>
    </button>
  )
}

function DetailSheet({ intervention: i, maintainer, onClose, onContact, onSchedule, onUpdate, onDelete }) {
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)
  const st = INTERVENTION_STATUS[i.status]
  const active = isActiveIntervention(i)
  const run = async (fn) => { setBusy(true); const { error } = await fn(); setErr(error); setBusy(false) }
  return (
    <Sheet onClose={onClose} title={i.title} subtitle={`${i.ref_number ? `#IT-${i.ref_number} · ` : ''}${maintenanceCategoryLabel(i.category)}${i.location ? ` · ${i.location}` : ''}`}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 11px', borderRadius: 999, fontSize: 13, fontWeight: 700, background: st.bg, color: st.tx }}>{st.check && <CheckIcon size={15} />}{st.label}</span>
          {i.scheduled_date && i.status !== 'cancelled' && (
            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--teal-dk)' }}>{capDay(i.scheduled_date)}{i.time_start ? ` · ${i.time_start.slice(0, 5)}${i.time_end ? `-${i.time_end.slice(0, 5)}` : ''}` : ''}</span>
          )}
        </div>
        {i.description && <p style={{ fontSize: 15, color: 'var(--text-2)', lineHeight: 1.5, margin: 0, whiteSpace: 'pre-wrap' }}>{i.description}</p>}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderRadius: 14, background: '#F5F7F7' }}>
          <span style={{ color: 'var(--teal)' }}><PersonIcon /></span>
          <span style={{ flex: 1, fontSize: 14.5, fontWeight: 600 }}>{maintainer ? maintainer.name : 'Nessun fornitore scelto'}</span>
          {maintainer?.phone && <span style={{ fontSize: 13, color: 'var(--text-3)' }}>{maintainer.phone}</span>}
        </div>
        {active && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <button onClick={onContact} disabled={!maintainer} style={{ ...primaryBtn, opacity: maintainer ? 1 : 0.5 }}><PhoneIcon /> Contatta</button>
            <button onClick={onSchedule} style={ghostBtn}><CalendarIcon /> {i.status === 'scheduled' ? 'Cambia data' : 'Fissa data'}</button>
            <button disabled={busy} onClick={() => run(() => onUpdate({ status: 'done', scheduled_date: i.scheduled_date || toLocalISODate(new Date()) }))} style={ghostBtn}><CheckIcon size={18} /> Completato</button>
            <button disabled={busy} onClick={() => run(() => onUpdate({ status: 'cancelled' }))} style={{ ...ghostBtn, color: '#B42318' }}>Annulla</button>
          </div>
        )}
        {!active && (
          <button disabled={busy} onClick={() => { if (confirm('Eliminare definitivamente questa segnalazione?')) run(onDelete) }} style={{ ...ghostBtn, color: '#B42318' }}>Elimina</button>
        )}
        {err && <p style={errText}>{err}</p>}
      </div>
    </Sheet>
  )
}

function NewInterventionSheet({ maintainers, defaultCategory, onClose, onAddMaintainer, onCreate, onCreated, building, notices }) {
  const [mode, setMode] = useState(null) // null = scelta, 'repair' = guasto, 'notice' = avviso ai vicini
  const [step, setStep] = useState(0)
  const [v, setV] = useState({ title: '', category: defaultCategory, location: '', description: '', maintainerId: null })
  const [addingNew, setAddingNew] = useState(false)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState(null)
  const set = (k) => (e) => setV((x) => ({ ...x, [k]: e.target.value }))

  const sorted = [...maintainers].sort((a, b) => (b.category === v.category) - (a.category === v.category))

  async function save() {
    setSaving(true)
    const { error, id } = await onCreate(v)
    setSaving(false)
    if (error) { setErr(error); return }
    onCreated({ id, title: v.title, category: v.category, location: v.location, description: v.description, maintainer_id: v.maintainerId, status: 'requested' })
  }

  if (mode === null) {
    return (
      <Sheet onClose={onClose} title="Nuova segnalazione" subtitle="Che tipo di segnalazione?">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[
            { m: 'notice', icon: 'megaphone', t: 'Avviso ai vicini', d: "Porte dell'ascensore aperte, portone aperto, perdita d'acqua: avvisa chi abita a un piano o tutto il palazzo." },
            { m: 'repair', icon: 'wrench', t: 'Guasto da riparare', d: 'Serve un tecnico: scegli il fornitore e contattalo direttamente.' },
          ].map((o) => (
            <button key={o.m} type="button" onClick={() => setMode(o.m)} style={{
              display: 'flex', alignItems: 'center', gap: 14, padding: 16, borderRadius: 16, minHeight: 0, cursor: 'pointer', textAlign: 'left',
              border: '1.5px solid var(--border)', background: 'var(--white)', color: 'var(--text)',
            }}>
              <span style={{ ...iconTile, width: 48, height: 48 }}><NoticeIcon name={o.icon} size={24} /></span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: 'block', fontSize: 16, fontWeight: 800 }}>{o.t}</span>
                <span style={{ display: 'block', fontSize: 13, color: 'var(--text-3)', lineHeight: 1.4, marginTop: 2 }}>{o.d}</span>
              </span>
              <span style={{ color: 'var(--text-4)' }}><ChevronIcon /></span>
            </button>
          ))}
        </div>
      </Sheet>
    )
  }

  if (mode === 'notice') {
    return (
      <Sheet onClose={onClose} title="Avviso ai vicini" subtitle="Arriva solo ai residenti verificati">
        <NoticeForm building={building} {...notices} onBack={() => setMode(null)} onDone={onClose} />
      </Sheet>
    )
  }

  return (
    <Sheet onClose={onClose} title="Nuova segnalazione" subtitle={`Passo ${step + 1} di 2 · ${step === 0 ? 'Il problema' : 'Il fornitore'}`}>
      <div style={{ display: 'flex', gap: 6, marginBottom: 18 }}>
        {[0, 1].map((s) => <div key={s} style={{ flex: 1, height: 6, borderRadius: 99, background: s <= step ? 'var(--teal)' : '#E5E7EB' }} />)}
      </div>

      {step === 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <label><div style={label}>Cosa succede?</div>
            <input autoFocus style={field} placeholder="Es. Ascensore bloccato al 3° piano" value={v.title} onChange={set('title')} />
          </label>
          <div><div style={label}>Categoria</div><CategoryPills value={v.category} onChange={(c) => setV((x) => ({ ...x, category: c }))} /></div>
          <label><div style={label}>Dove</div>
            <input style={field} placeholder="Es. Scala B, 3° piano, cantina" value={v.location} onChange={set('location')} />
          </label>
          <label><div style={label}>Dettagli (solo per te e il manutentore)</div>
            <textarea style={{ ...field, minHeight: 80, resize: 'vertical' }} placeholder="Da quando, cosa hai notato, orari in cui sei disponibile" value={v.description} onChange={set('description')} />
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: 8 }}>
            <button type="button" onClick={() => setMode(null)} style={ghostBtn}>Indietro</button>
            <button disabled={v.title.trim().length < 3} onClick={() => setStep(1)} style={{ ...primaryBtn, height: 48, opacity: v.title.trim().length < 3 ? 0.5 : 1 }}>Continua</button>
          </div>
        </div>
      )}

      {step === 1 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {addingNew ? (
            <MaintainerForm defaultCategory={v.category} onCancel={() => setAddingNew(false)} onSave={async (m) => {
              const { error, id } = await onAddMaintainer(m)
              if (!error) { setV((x) => ({ ...x, maintainerId: id })); setAddingNew(false) }
              return error
            }} />
          ) : (
            <>
              <p style={{ fontSize: 14, color: 'var(--text-3)', margin: '0 0 4px' }}>Scegli il fornitore da contattare. Ti prepariamo il messaggio da inviare.</p>
              {sorted.map((m) => {
                const on = v.maintainerId === m.id
                return (
                  <button key={m.id} onClick={() => setV((x) => ({ ...x, maintainerId: on ? null : m.id }))} style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: 14, borderRadius: 14, textAlign: 'left', cursor: 'pointer', minHeight: 0,
                    border: `${on ? 2 : 1}px solid ${on ? 'var(--teal)' : 'var(--border)'}`, margin: on ? 0 : 1,
                    background: on ? 'rgba(13,103,111,0.05)' : 'var(--white)',
                  }}>
                    <span style={{ ...iconTile, width: 40, height: 40 }}><MaintenanceIcon name={maintenanceCategory(m.category).icon} size={22} /></span>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ display: 'block', fontSize: 15, fontWeight: 700 }}>{m.name}</span>
                      <span style={{ display: 'block', fontSize: 12.5, color: 'var(--text-3)' }}>
                        {maintenanceCategoryLabel(m.category)}{m.company ? ` · ${m.company}` : ''}{m.category === v.category ? ' · consigliato' : ''}
                      </span>
                    </span>
                    {on && <span style={{ color: 'var(--teal)' }}><CheckIcon /></span>}
                  </button>
                )
              })}
              <button onClick={() => setAddingNew(true)} style={{ ...ghostBtn, borderStyle: 'dashed' }}>+ Aggiungi un fornitore</button>
              {err && <p style={errText}>{err}</p>}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: 8, marginTop: 6 }}>
                <button onClick={() => setStep(0)} style={ghostBtn}>Indietro</button>
                <button disabled={saving} onClick={save} style={{ ...primaryBtn, height: 48 }}>
                  {saving ? 'Salvataggio...' : v.maintainerId ? 'Salva e contatta' : 'Salva, scelgo dopo'}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </Sheet>
  )
}

function ContactSheet({ intervention, maintainer, message, onClose, onSchedule }) {
  if (!maintainer) return null
  const subject = `Richiesta intervento: ${intervention.title}`
  return (
    <Sheet onClose={onClose} title={`Contatta ${maintainer.name}`} subtitle="Direttamente, senza passare dall'amministratore">
      {maintainer.notes && <p style={{ fontSize: 13, color: 'var(--text-3)', margin: '0 0 10px' }}>{maintainer.notes}</p>}
      <div style={{ background: '#F5F7F7', borderRadius: 14, padding: 14, fontSize: 14, color: 'var(--text-2)', lineHeight: 1.5, whiteSpace: 'pre-wrap', marginBottom: 14 }}>{message}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {maintainer.phone && <a href={waLink(maintainer.phone, message)} target="_blank" rel="noopener noreferrer" style={{ ...primaryBtn, height: 50 }}><ChatIcon /> Scrivi su WhatsApp</a>}
        {maintainer.phone && <a href={telLink(maintainer.phone)} style={{ ...ghostBtn, height: 50 }}><PhoneIcon /> Chiama {maintainer.phone}</a>}
        {maintainer.email && <a href={mailLink(maintainer.email, subject, message)} style={{ ...ghostBtn, height: 50 }}><MailIcon /> Invia email</a>}
      </div>
      <div style={{ borderTop: '1px solid var(--border)', marginTop: 16, paddingTop: 14 }}>
        <p style={{ fontSize: 13, color: 'var(--text-3)', margin: '0 0 8px' }}>Hai concordato un giorno? Segnalo: comparirà in bacheca per tutti.</p>
        <button onClick={onSchedule} style={{ ...ghostBtn, width: '100%' }}><CalendarIcon /> Fissa la data dell&apos;intervento</button>
      </div>
    </Sheet>
  )
}

function ScheduleSheet({ intervention, onClose, onSave }) {
  const [date, setDate] = useState(intervention.scheduled_date || '')
  const [start, setStart] = useState(intervention.time_start?.slice(0, 5) || '')
  const [end, setEnd] = useState(intervention.time_end?.slice(0, 5) || '')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState(null)
  const ok = date && (!start || !end || end > start)
  return (
    <Sheet onClose={onClose} title="Data dell'intervento" subtitle={intervention.title}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <label><div style={label}>Giorno</div><input type="date" style={field} value={date} onChange={(e) => setDate(e.target.value)} /></label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <label><div style={label}>Dalle</div><input type="time" style={field} value={start} onChange={(e) => setStart(e.target.value)} /></label>
          <label><div style={label}>Alle</div><input type="time" style={field} value={end} onChange={(e) => setEnd(e.target.value)} /></label>
        </div>
        <p style={{ display: 'flex', gap: 8, fontSize: 13, color: 'var(--text-3)', lineHeight: 1.45, margin: 0, padding: '10px 12px', borderRadius: 12, background: '#F5F7F7' }}>
          <span style={{ color: 'var(--teal)', flexShrink: 0 }}><MegaphoneIcon /></span>
          In bacheca e nel calendario gli altri residenti vedranno titolo, categoria, giorno, orario e luogo. Dettagli e manutentore restano privati.
        </p>
        {err && <p style={errText}>{err}</p>}
        <button disabled={!ok || saving} onClick={async () => { setSaving(true); setErr(await onSave({ date, start, end })); setSaving(false) }} style={{ ...primaryBtn, height: 52, opacity: ok ? 1 : 0.5 }}>
          {saving ? 'Salvataggio...' : 'Conferma data'}
        </button>
      </div>
    </Sheet>
  )
}

function MaintainerForm({ defaultCategory = 'other', onCancel, onSave }) {
  const [m, setM] = useState({ name: '', company: '', category: defaultCategory, phone: '', email: '', notes: '' })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState(null)
  const set = (k) => (e) => setM((x) => ({ ...x, [k]: e.target.value }))
  const ok = m.name.trim().length >= 2 && (m.phone.trim() || m.email.trim()) && !saving
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <input autoFocus style={field} placeholder="Nome o ditta (es. Consorzio del Bo)" value={m.name} onChange={set('name')} />
      <input style={field} placeholder="Referente (facoltativo)" value={m.company} onChange={set('company')} />
      <div><div style={label}>Si occupa di</div><CategoryPills value={m.category} onChange={(c) => setM((x) => ({ ...x, category: c }))} /></div>
      <input type="tel" style={field} placeholder="Telefono / WhatsApp" value={m.phone} onChange={set('phone')} />
      <input type="email" style={field} placeholder="Email" value={m.email} onChange={set('email')} />
      <input style={field} placeholder="Altri recapiti (es. referente, numero emergenze)" value={m.notes} onChange={set('notes')} />
      <p style={{ fontSize: 12, color: 'var(--text-4)', margin: 0 }}>Serve almeno un telefono o un&apos;email. Il contatto sarà visibile ai residenti verificati del condominio.</p>
      {err && <p style={errText}>{err}</p>}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <button onClick={onCancel} style={ghostBtn}>Annulla</button>
        <button disabled={!ok} onClick={async () => { setSaving(true); setErr(await onSave(m)); setSaving(false) }} style={{ ...primaryBtn, height: 48, opacity: ok ? 1 : 0.5 }}>Salva</button>
      </div>
    </div>
  )
}

function CategoryPills({ value, onChange }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
      {MAINTENANCE_CATEGORIES.map((c) => {
        const on = value === c.value
        return (
          <button key={c.value} type="button" onClick={() => onChange(c.value)} style={{
            minHeight: 0, padding: '7px 12px', borderRadius: 999, fontSize: 13, fontWeight: 600, cursor: 'pointer',
            border: `1.5px solid ${on ? 'var(--teal)' : 'var(--border)'}`, background: on ? 'var(--teal)' : 'var(--white)', color: on ? '#fff' : 'var(--text)',
          }}>{c.label}</button>
        )
      })}
    </div>
  )
}

export function Sheet({ title, subtitle, onClose, children }) {
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 600, background: 'rgba(15,41,38,0.45)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: 'var(--white)', width: '100%', maxWidth: 560, borderRadius: '22px 22px 0 0', padding: '10px 20px calc(22px + env(safe-area-inset-bottom))', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ width: 40, height: 5, borderRadius: 3, background: 'var(--border)', margin: '0 auto 14px' }} />
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 14 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.3px' }}>{title}</div>
            {subtitle && <div style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 2 }}>{subtitle}</div>}
          </div>
          <button onClick={onClose} aria-label="Chiudi" style={{ width: 36, height: 36, minHeight: 0, borderRadius: '50%', border: 'none', background: 'var(--bg)', color: 'var(--text-3)', cursor: 'pointer', flexShrink: 0 }}><X size={18} strokeWidth={2} aria-hidden="true" /></button>
        </div>
        {children}
      </div>
    </div>
  )
}

/* ---- stili ---- */
const card = { background: 'var(--white)', border: '1px solid var(--border)', borderRadius: 18, padding: 16 }
const iconTile = { width: 44, height: 44, borderRadius: 13, background: '#EEF3F3', color: 'var(--teal)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }
const roundIcon = { width: 40, height: 40, borderRadius: '50%', border: '1px solid var(--border)', color: 'var(--teal)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }
const primaryBtn = { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, height: 46, padding: '0 16px', borderRadius: 14, border: 'none', background: 'var(--teal)', color: '#fff', fontWeight: 700, fontSize: 15, cursor: 'pointer', textDecoration: 'none' }
const ghostBtn = { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, height: 46, padding: '0 14px', borderRadius: 14, border: '1.5px solid var(--border)', background: 'var(--white)', color: 'var(--text)', fontWeight: 700, fontSize: 14.5, cursor: 'pointer', textDecoration: 'none' }
const field = { width: '100%', border: '1px solid var(--border)', borderRadius: 12, padding: '12px 14px', fontSize: 16, fontFamily: 'inherit', boxSizing: 'border-box', background: 'var(--white)' }
const label = { fontSize: 13.5, fontWeight: 700, color: 'var(--text-2)', marginBottom: 6 }
const errText = { fontSize: 13, color: '#B42318', margin: 0 }

/* ---- icone ---- */
const ico = { fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', viewBox: '0 0 24 24', 'aria-hidden': true }
function PhoneIcon({ size = 18 } = {}) { return <Phone size={size} strokeWidth={2} aria-hidden="true" /> }
function MailIcon({ size = 18 } = {}) { return <Mail size={size} strokeWidth={2} aria-hidden="true" /> }
function ChatIcon({ size = 18 } = {}) { return <MessageCircle size={size} strokeWidth={2} aria-hidden="true" /> }
function CalendarIcon({ size = 18 } = {}) { return <CalendarDays size={size} strokeWidth={2} aria-hidden="true" /> }
function ChevronIcon({ size = 18 } = {}) { return <ChevronRight size={size} strokeWidth={2} aria-hidden="true" /> }
function CheckIcon({ size = 22 }) { return <Check size={size} strokeWidth={2.4} aria-hidden="true" /> }
function PersonIcon({ size = 15 } = {}) { return <UserRound size={size} strokeWidth={2} aria-hidden="true" /> }
function PlusIcon({ size = 20 } = {}) { return <Plus size={size} strokeWidth={2.2} aria-hidden="true" /> }
function InfoIcon({ size = 20 } = {}) { return <Info size={size} strokeWidth={2} aria-hidden="true" /> }
function MegaphoneIcon({ size = 18 } = {}) { return <Megaphone size={size} strokeWidth={2} aria-hidden="true" /> }
