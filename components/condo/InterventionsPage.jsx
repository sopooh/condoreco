'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useSession } from '@/components/providers/SessionProvider'
import { getProfile } from '@/lib/profile'
import { REPORT_CATEGORIES, reportCategoryLabel } from '@/lib/reviewOptions'
import { useInterventions, INTERVENTION_STATUS, isActiveIntervention } from '@/hooks/useInterventions'
import { contactMessage, telLink, waLink, mailLink } from '@/lib/contact'
import { toLocalISODate } from '@/lib/localDate'

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

  useEffect(() => {
    const id = session?.user?.id
    if (!id) return
    getProfile(id).then(({ data }) => setSenderName(data?.display_name || null))
  }, [session?.user?.id])

  const [tab, setTab] = useState('active')
  const [creating, setCreating] = useState(false)
  const [scheduling, setScheduling] = useState(null)
  const [contacting, setContacting] = useState(null)
  const [addingMaintainer, setAddingMaintainer] = useState(false)

  const active = interventions.filter(isActiveIntervention)
  const closed = interventions.filter((i) => !isActiveIntervention(i))
  const list = tab === 'active' ? active : closed
  const byId = useMemo(() => Object.fromEntries(maintainers.map((m) => [m.id, m])), [maintainers])

  const msgFor = (intervention) => contactMessage({ maintainer: byId[intervention.maintainer_id], intervention, senderName, address })

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '20px 16px 64px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Link href={`/edificio/${buildingId}/condominio`} style={backLink}>‹ Torna al condominio</Link>

      <div>
        <span style={tag}><PersonIcon /> Area personale</span>
        <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.5px', margin: '10px 0 6px' }}>I tuoi interventi</h1>
        <p style={{ display: 'flex', gap: 8, fontSize: 14, color: 'var(--text-3)', lineHeight: 1.5, margin: 0 }}>
          <span style={{ color: 'var(--teal)', flexShrink: 0, marginTop: 2 }}><LockIcon /></span>
          Visibili solo a te. Quando fissi una data, titolo, giorno e luogo compaiono in bacheca per tutti i residenti.
        </p>
      </div>

      <button onClick={() => setCreating(true)} style={{ ...primaryBtn, height: 52 }}>+ Nuovo intervento</button>

      <div role="tablist" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, padding: 4, borderRadius: 12, background: '#EBEFEF' }}>
        <Tab active={tab === 'active'} onClick={() => setTab('active')} label="In corso" count={active.length} />
        <Tab active={tab === 'closed'} onClick={() => setTab('closed')} label="Conclusi" count={closed.length} />
      </div>

      {error && <p style={errText}>Non riesco a caricare gli interventi. Riprova tra poco.</p>}

      {loading ? (
        <p style={{ fontSize: 14, color: 'var(--text-3)' }}>Caricamento...</p>
      ) : list.length === 0 ? (
        <div style={{ ...card, textAlign: 'center', padding: '28px 20px' }}>
          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>
            {tab === 'active' ? 'Nessun intervento in corso' : 'Nessun intervento concluso'}
          </div>
          <p style={{ fontSize: 14, color: 'var(--text-3)', margin: 0 }}>
            {tab === 'active' ? 'Hai un problema in casa o nelle parti comuni? Apri un intervento e contatta subito un manutentore.' : 'Qui trovi gli interventi completati o annullati.'}
          </p>
        </div>
      ) : (
        list.map((i) => (
          <InterventionCard
            key={i.id}
            intervention={i}
            maintainer={byId[i.maintainer_id]}
            onContact={() => setContacting(i)}
            onSchedule={() => setScheduling(i)}
            onUpdate={(patch) => updateIntervention(i.id, patch)}
            onDelete={() => deleteIntervention(i.id)}
          />
        ))
      )}

      {/* rubrica manutentori */}
      <section style={{ marginTop: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 10 }}>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>Manutentori del condominio</h2>
            <p style={{ fontSize: 13, color: 'var(--text-3)', margin: '2px 0 0' }}>Rubrica condivisa tra i residenti verificati.</p>
          </div>
          <button onClick={() => setAddingMaintainer(true)} style={{ ...ghostBtn, height: 40, padding: '0 12px', flexShrink: 0 }}>+ Aggiungi</button>
        </div>
        {maintainers.length === 0 ? (
          <p style={{ fontSize: 14, color: 'var(--text-3)', margin: 0 }}>Nessun manutentore ancora. Aggiungi il primo: idraulico, elettricista, ascensorista...</p>
        ) : (
          <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
            {maintainers.map((m, idx) => (
              <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderTop: idx ? '1px solid var(--border)' : 'none' }}>
                <span style={{ ...iconTile, width: 40, height: 40 }}><WrenchIcon /></span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.name}</div>
                  <div style={{ fontSize: 12.5, color: 'var(--text-3)' }}>{reportCategoryLabel(m.category)}{m.company ? ` · ${m.company}` : ''}</div>
                </div>
                {m.phone && <a href={telLink(m.phone)} aria-label={`Chiama ${m.name}`} style={roundIcon}><PhoneIcon /></a>}
                {m.email && <a href={`mailto:${m.email}`} aria-label={`Scrivi a ${m.name}`} style={roundIcon}><MailIcon /></a>}
              </div>
            ))}
          </div>
        )}
      </section>

      {creating && (
        <NewInterventionSheet
          maintainers={maintainers}
          onClose={() => setCreating(false)}
          onAddMaintainer={addMaintainer}
          onCreate={createIntervention}
          onCreated={(draft) => { setCreating(false); if (draft.maintainer_id) setContacting(draft) }}
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
        <Sheet onClose={() => setAddingMaintainer(false)} title="Aggiungi manutentore">
          <MaintainerForm onCancel={() => setAddingMaintainer(false)} onSave={async (v) => {
            const { error } = await addMaintainer(v)
            if (!error) setAddingMaintainer(false)
            return error
          }} />
        </Sheet>
      )}
    </div>
  )
}

function InterventionCard({ intervention: i, maintainer, onContact, onSchedule, onUpdate, onDelete }) {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)
  const st = INTERVENTION_STATUS[i.status]
  const active = isActiveIntervention(i)

  const run = async (fn) => { setBusy(true); const { error } = await fn(); setErr(error); setBusy(false) }

  return (
    <div style={{ ...card, padding: 0, borderColor: i.status === 'scheduled' ? 'rgba(13,103,111,0.35)' : 'var(--border)' }}>
      <button onClick={() => setOpen((o) => !o)} aria-expanded={open} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, width: '100%', padding: 16, background: 'none', border: 'none', textAlign: 'left', cursor: 'pointer', minHeight: 0 }}>
        <span style={iconTile}><WrenchIcon /></span>
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
            <span style={{ padding: '3px 10px', borderRadius: 999, fontSize: 12, fontWeight: 700, background: st.bg, color: st.tx }}>{st.label}</span>
            {i.scheduled_date && i.status !== 'cancelled' && (
              <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--teal-dk)', textTransform: 'capitalize' }}>
                {fmtDay(i.scheduled_date)}{i.time_start ? ` · ${i.time_start.slice(0, 5)}` : ''}
              </span>
            )}
          </span>
          <span style={{ display: 'block', fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>{i.title}</span>
          <span style={{ display: 'block', fontSize: 13, color: 'var(--text-3)', marginTop: 2 }}>
            {reportCategoryLabel(i.category)}{i.location ? ` · ${i.location}` : ''}
          </span>
          <span style={{ display: 'block', fontSize: 13, color: maintainer ? 'var(--text-2)' : '#B4510F', marginTop: 4, fontWeight: 600 }}>
            {maintainer ? `Manutentore: ${maintainer.name}` : 'Nessun manutentore scelto'}
          </span>
        </span>
        <span style={{ color: 'var(--text-3)', transform: open ? 'rotate(90deg)' : 'none', transition: 'transform 150ms ease', marginTop: 4 }}><ChevronIcon /></span>
      </button>

      {open && (
        <div style={{ padding: '0 16px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {i.description && <p style={{ fontSize: 14, color: 'var(--text-2)', lineHeight: 1.5, margin: 0, whiteSpace: 'pre-wrap' }}>{i.description}</p>}
          {active && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <button onClick={onContact} disabled={!maintainer} style={{ ...primaryBtn, opacity: maintainer ? 1 : 0.5 }}><PhoneIcon /> Contatta</button>
              <button onClick={onSchedule} style={ghostBtn}><CalendarIcon /> {i.status === 'scheduled' ? 'Cambia data' : 'Fissa data'}</button>
            </div>
          )}
          {active && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <button disabled={busy} onClick={() => run(() => onUpdate({ status: 'done', scheduled_date: i.scheduled_date || toLocalISODate(new Date()) }))} style={ghostBtn}>Completato</button>
              <button disabled={busy} onClick={() => run(() => onUpdate({ status: 'cancelled' }))} style={{ ...ghostBtn, color: '#B42318' }}>Annulla</button>
            </div>
          )}
          {!active && (
            <button disabled={busy} onClick={() => { if (confirm('Eliminare definitivamente questo intervento?')) run(onDelete) }} style={{ ...ghostBtn, color: '#B42318' }}>Elimina</button>
          )}
          {err && <p style={errText}>{err}</p>}
        </div>
      )}
    </div>
  )
}

function NewInterventionSheet({ maintainers, onClose, onAddMaintainer, onCreate, onCreated }) {
  const [step, setStep] = useState(0)
  const [v, setV] = useState({ title: '', category: 'maintenance', location: '', description: '', maintainerId: null })
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

  return (
    <Sheet onClose={onClose} title="Nuovo intervento" subtitle={`Passo ${step + 1} di 2 · ${step === 0 ? 'Il problema' : 'Il manutentore'}`}>
      <div style={{ display: 'flex', gap: 6, marginBottom: 18 }}>
        {[0, 1].map((s) => <div key={s} style={{ flex: 1, height: 6, borderRadius: 99, background: s <= step ? 'var(--teal)' : '#E5E7EB' }} />)}
      </div>

      {step === 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <label><div style={label}>Cosa succede?</div>
            <input autoFocus style={field} placeholder="Es. Perdita d'acqua sotto il lavello" value={v.title} onChange={set('title')} />
          </label>
          <div><div style={label}>Categoria</div><CategoryPills value={v.category} onChange={(c) => setV((x) => ({ ...x, category: c }))} /></div>
          <label><div style={label}>Dove</div>
            <input style={field} placeholder="Es. Scala B, 3° piano, cantina" value={v.location} onChange={set('location')} />
          </label>
          <label><div style={label}>Dettagli (solo per te e il manutentore)</div>
            <textarea style={{ ...field, minHeight: 80, resize: 'vertical' }} placeholder="Da quando, cosa hai notato, orari in cui sei disponibile" value={v.description} onChange={set('description')} />
          </label>
          <button disabled={v.title.trim().length < 3} onClick={() => setStep(1)} style={{ ...primaryBtn, height: 52, opacity: v.title.trim().length < 3 ? 0.5 : 1 }}>Continua</button>
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
              <p style={{ fontSize: 14, color: 'var(--text-3)', margin: '0 0 4px' }}>Scegli chi contattare. Ti prepariamo il messaggio da inviare.</p>
              {sorted.map((m) => {
                const on = v.maintainerId === m.id
                return (
                  <button key={m.id} onClick={() => setV((x) => ({ ...x, maintainerId: on ? null : m.id }))} style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: 14, borderRadius: 14, textAlign: 'left', cursor: 'pointer', minHeight: 0,
                    border: `${on ? 2 : 1}px solid ${on ? 'var(--teal)' : 'var(--border)'}`, margin: on ? 0 : 1,
                    background: on ? 'rgba(13,103,111,0.05)' : 'var(--white)',
                  }}>
                    <span style={{ ...iconTile, width: 40, height: 40 }}><WrenchIcon /></span>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ display: 'block', fontSize: 15, fontWeight: 700 }}>{m.name}</span>
                      <span style={{ display: 'block', fontSize: 12.5, color: 'var(--text-3)' }}>
                        {reportCategoryLabel(m.category)}{m.company ? ` · ${m.company}` : ''}{m.category === v.category ? ' · consigliato' : ''}
                      </span>
                    </span>
                    {on && <span style={{ color: 'var(--teal)' }}><CheckIcon /></span>}
                  </button>
                )
              })}
              <button onClick={() => setAddingNew(true)} style={{ ...ghostBtn, borderStyle: 'dashed' }}>+ Aggiungi un manutentore</button>
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

function MaintainerForm({ defaultCategory = 'maintenance', onCancel, onSave }) {
  const [m, setM] = useState({ name: '', company: '', category: defaultCategory, phone: '', email: '' })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState(null)
  const set = (k) => (e) => setM((x) => ({ ...x, [k]: e.target.value }))
  const ok = m.name.trim().length >= 2 && (m.phone.trim() || m.email.trim()) && !saving
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <input autoFocus style={field} placeholder="Nome (es. Mario Rossi)" value={m.name} onChange={set('name')} />
      <input style={field} placeholder="Azienda (facoltativo)" value={m.company} onChange={set('company')} />
      <div><div style={label}>Si occupa di</div><CategoryPills value={m.category} onChange={(c) => setM((x) => ({ ...x, category: c }))} /></div>
      <input type="tel" style={field} placeholder="Telefono / WhatsApp" value={m.phone} onChange={set('phone')} />
      <input type="email" style={field} placeholder="Email" value={m.email} onChange={set('email')} />
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
      {REPORT_CATEGORIES.map((c) => {
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

function Tab({ active, onClick, label: text, count }) {
  return (
    <button role="tab" aria-selected={active} onClick={onClick} style={{
      height: 40, minHeight: 0, borderRadius: 9, border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
      background: active ? 'var(--white)' : 'transparent', boxShadow: active ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
      fontSize: 14, fontWeight: 700, color: active ? 'var(--text)' : 'var(--text-3)',
    }}>
      {text}<span style={{ fontSize: 12, padding: '1px 8px', borderRadius: 999, background: active ? '#EEF3F3' : 'rgba(0,0,0,0.05)' }}>{count}</span>
    </button>
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
          <button onClick={onClose} aria-label="Chiudi" style={{ width: 36, height: 36, minHeight: 0, borderRadius: '50%', border: 'none', background: 'var(--bg)', color: 'var(--text-3)', cursor: 'pointer', flexShrink: 0 }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  )
}

/* ---- stili ---- */
const backLink = { fontSize: 14, fontWeight: 600, color: 'var(--teal)', alignSelf: 'flex-start' }
const tag = { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 999, background: 'var(--teal-lt)', color: 'var(--teal-dk)', fontSize: 12.5, fontWeight: 600 }
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
function WrenchIcon() { return <svg {...ico} width={20} height={20}><path d="M14.7 6.3a4 4 0 00-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 005.4-5.4l-2.1 2.1-2-2z" /></svg> }
function PhoneIcon() { return <svg {...ico} width={18} height={18}><path d="M5 4h4l2 5-2.5 1.5a11 11 0 005 5L15 13l5 2v4a2 2 0 01-2 2A16 16 0 013 6a2 2 0 012-2" /></svg> }
function MailIcon() { return <svg {...ico} width={18} height={18}><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 7l9 6 9-6" /></svg> }
function ChatIcon() { return <svg {...ico} width={18} height={18}><path d="M21 12a8 8 0 01-11.6 7.1L4 20l1-4.6A8 8 0 1121 12z" /></svg> }
function CalendarIcon() { return <svg {...ico} width={18} height={18}><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></svg> }
function ChevronIcon() { return <svg {...ico} width={18} height={18}><path d="M9 6l6 6-6 6" /></svg> }
function CheckIcon() { return <svg {...ico} width={22} height={22} strokeWidth={2.4}><path d="M5 12.5l4.5 4.5L19 7.5" /></svg> }
function PersonIcon() { return <svg {...ico} width={15} height={15}><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0116 0" /></svg> }
function LockIcon() { return <svg {...ico} width={16} height={16}><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V8a4 4 0 018 0v3" /></svg> }
function MegaphoneIcon() { return <svg {...ico} width={18} height={18}><path d="M3 11v2a1 1 0 001 1h2l5 4V6L6 10H4a1 1 0 00-1 1z" /><path d="M15 9a4 4 0 010 6M18 6a8 8 0 010 12" /></svg> }
