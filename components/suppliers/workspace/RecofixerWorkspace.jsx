'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle, ArrowLeft, ArrowRight, BadgeCheck, CalendarClock, CalendarDays, CheckCircle2, ChevronRight, CircleCheck, Clock3,
  FileText, Filter, Image as ImageIcon, MapPin, MessageCircle, Navigation, Pencil,  Search, DoorStairwell as Stairs,
  UserRound, Users, Wrench, X,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { maintenanceCategoryLabel, MAINTENANCE_CATEGORIES } from '@/lib/maintenanceCategories'
import { useInterventionFiles, FILE_KINDS, euro } from '@/hooks/useInterventionFiles'
import InterventionFiles from '@/components/suppliers/InterventionFiles'
import TeamWorkspace from '@/components/team/TeamWorkspace'
import { useIsMobile } from '@/hooks/useIsMobile'

// Area Recofixer: interventi, calendario, squadra e documenti del fornitore.
// Su desktop lista e dettaglio affiancati; su mobile il dettaglio si apre a
// pagina intera con la barra azioni in basso.

const TABS = [
  { id: 'interventi', label: 'Interventi', icon: Wrench },
  { id: 'calendario', label: 'Calendario', icon: CalendarDays },
  { id: 'team', label: 'Team', icon: Users },
  { id: 'documenti', label: 'Documenti', icon: FileText },
]

export const fmtDay = (d) => (d ? new Date(String(d).slice(0, 10) + 'T00:00:00').toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short' }) : '')
const fmtShort = (d) => new Date(String(d).slice(0, 10) + 'T00:00:00').toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })
const hhmm = (t) => (t ? String(t).slice(0, 5) : '')
const when = (iso) => {
  const d = new Date(iso)
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const diff = Math.round((today - new Date(d.getFullYear(), d.getMonth(), d.getDate())) / 86400000)
  const t = d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
  return diff === 0 ? `Oggi, ${t}` : diff === 1 ? `Ieri, ${t}` : `${d.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })}, ${t}`
}
const timeRange = (a, b) => (a ? `${hhmm(a)}${b ? `–${hhmm(b)}` : ''}` : '')

// Stato "operativo" visto dal fornitore
export function stageOf(i) {
  if (i.status === 'done') return 'done'
  if (i.status === 'cancelled') return 'cancelled'
  if (i.status === 'scheduled') return 'scheduled'
  if (i.proposed_date) return 'waiting'
  return 'todo'
}
const STAGE = {
  todo: { label: 'Da programmare', bg: 'var(--teal-lt)', fg: 'var(--teal-dk)' },
  waiting: { label: 'In attesa di conferma', bg: '#FDF0D5', fg: '#9A5B00' },
  scheduled: { label: 'Programmato', bg: '#E6F4EA', fg: '#15803D' },
  done: { label: 'Completato', bg: '#F1F3F4', fg: '#475467' },
  cancelled: { label: 'Annullato', bg: '#F1F3F4', fg: '#6B7280' },
}
const requesterLabel = (i) => (i.requester_is_admin ? `Amministrazione${i.requester ? ` (${i.requester})` : ''}` : i.requester || 'Residente')
const nextAction = (i) => {
  const s = stageOf(i)
  if (s === 'todo') return { text: 'Prossima azione: proponi un appuntamento', tone: 'teal' }
  if (s === 'waiting') return { text: `Proposto ${fmtDay(i.proposed_date)}${i.proposed_time_start ? ` alle ${hhmm(i.proposed_time_start)}` : ''}: in attesa di conferma`, tone: 'amber' }
  if (s === 'scheduled' && !i.tech_id) return { text: 'Prossima azione: assegna un tecnico', tone: 'teal' }
  return null
}

export default function RecofixerWorkspace({ supplier, items, demo = false, team, onEdit, onChat, onChanged }) {
  const isMobile = useIsMobile()
  const [tab, setTab] = useState('interventi')
  const [openId, setOpenId] = useState(null)
  const list = items || []
  const open = list.find((x) => x.id === openId) || null

  // desktop: il primo intervento attivo è già aperto a destra
  const firstId = list.find((x) => x.status === 'requested' || x.status === 'scheduled')?.id || list[0]?.id || null
  useEffect(() => {
    if (!openId && firstId && window.matchMedia('(min-width: 900px)').matches) setOpenId(firstId)
  }, [openId, firstId])

  const goIntervention = (id) => { setTab('interventi'); setOpenId(id) }
  // dopo aver gestito il team, aggiorna l'elenco dei tecnici assegnabili
  const reloadTeam = team?.reload
  useEffect(() => { if (tab !== 'team') reloadTeam?.() }, [tab]) // eslint-disable-line react-hooks/exhaustive-deps
  const teamBuildings = useMemo(() => {
    const seen = new Map()
    list.forEach((i) => { if (i.building_id && !seen.has(i.building_id)) seen.set(i.building_id, { id: i.building_id, label: (i.building_address || '').split(' · ')[0] }) })
    return [...seen.values()]
  }, [list])

  return (
    <div className="rfx">
      {demo && (
        <div className="rfx-demo"><strong>Anteprima con dati di esempio.</strong> Non hai un profilo Recofixer, quindi vedi interventi finti: le azioni non salvano nulla.</div>
      )}

      <header className="rfx-head">
        <span className="rfx-head-ico"><Wrench size={26} strokeWidth={1.9} aria-hidden="true" /></span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="rfx-head-name">
            <span>{supplier.company_name}</span>
            {supplier.verified && <BadgeCheck size={20} strokeWidth={2} aria-label="Verificato" style={{ color: 'var(--teal)', flexShrink: 0 }} />}
          </div>
          <div className="rfx-head-sub">{[...(supplier.categories || []).map(maintenanceCategoryLabel), ...(supplier.zones || []).slice(0, 2)].join(' · ') || 'Recofixer'}</div>
        </div>
        <button type="button" className="rfx-btn" onClick={onEdit} aria-label="Modifica profilo">
          <Pencil size={17} strokeWidth={2} aria-hidden="true" /><span className="rfx-hide-sm">Modifica profilo</span>
        </button>
      </header>

      <nav className="rfx-tabs" aria-label="Sezioni area Recofixer">
        {TABS.map((t) => (
          <button key={t.id} type="button" className={tab === t.id ? 'is-on' : ''} aria-current={tab === t.id ? 'page' : undefined} onClick={() => setTab(t.id)}>
            <t.icon size={19} strokeWidth={1.9} aria-hidden="true" />{t.label}
          </button>
        ))}
      </nav>

      {tab === 'interventi' && (
        <InterventionsTab list={list} loading={items === null} open={open} setOpenId={setOpenId} isMobile={isMobile}
          team={team} onChat={onChat} onChanged={onChanged} demo={demo} />
      )}
      {tab === 'calendario' && <CalendarTab list={list} onOpen={goIntervention} />}
      {tab === 'team' && <TeamTab team={team} demo={demo} buildings={teamBuildings} />}
      {tab === 'documenti' && <DocumentsTab list={list} onOpen={goIntervention} demo={demo} />}
    </div>
  )
}

/* ───────────── Interventi ───────────── */

function InterventionsTab({ list, loading, open, setOpenId, isMobile, team, onChat, onChanged, demo }) {
  const [seg, setSeg] = useState('active')
  const [q, setQ] = useState('')
  const [filters, setFilters] = useState({ stage: '', category: '', urgent: false })
  const [showFilters, setShowFilters] = useState(false)

  const active = list.filter((i) => i.status === 'requested' || i.status === 'scheduled')
  const archive = list.filter((i) => i.status === 'done' || i.status === 'cancelled')
  const counts = {
    todo: active.filter((i) => stageOf(i) !== 'waiting').length,
    waiting: active.filter((i) => stageOf(i) === 'waiting').length,
    done: list.filter((i) => i.status === 'done').length,
  }
  const base = seg === 'active' ? active : archive
  const needle = q.trim().toLowerCase().replace(/^#?it-?/, '')
  const shown = base.filter((i) => {
    if (filters.stage && stageOf(i) !== filters.stage) return false
    if (filters.category && i.category !== filters.category) return false
    if (filters.urgent && !i.urgent) return false
    if (!needle) return true
    return [i.title, i.building_address, i.location, i.requester, String(i.ref_number || '')].some((x) => (x || '').toLowerCase().includes(needle))
  })
  const nFilters = [filters.stage, filters.category, filters.urgent].filter(Boolean).length

  const listCol = (
    <section className="rfx-card rfx-listcol">
      <h1 className="rfx-h1">I miei interventi</h1>
      <p className="rfx-sub">Organizza il lavoro e tieni tutti aggiornati</p>

      <div className="rfx-kpis">
        <button type="button" className={`rfx-kpi is-teal${filters.stage === '' && seg === 'active' ? '' : ''}`} onClick={() => { setSeg('active'); setFilters({ ...filters, stage: '' }) }}>
          <b>{counts.todo}</b><span>Da fare</span><Wrench size={20} aria-hidden="true" />
        </button>
        <button type="button" className="rfx-kpi" onClick={() => { setSeg('active'); setFilters({ ...filters, stage: filters.stage === 'waiting' ? '' : 'waiting' }) }} aria-pressed={filters.stage === 'waiting'}>
          <b>{counts.waiting}</b><span>In attesa</span><Clock3 size={20} aria-hidden="true" />
        </button>
        <button type="button" className="rfx-kpi" onClick={() => { setSeg('archive'); setFilters({ ...filters, stage: '' }) }}>
          <b>{counts.done}</b><span>Completati</span><CheckCircle2 size={20} aria-hidden="true" />
        </button>
      </div>

      <div className="rfx-seg" role="tablist">
        <button type="button" role="tab" aria-selected={seg === 'active'} className={seg === 'active' ? 'is-on' : ''} onClick={() => setSeg('active')}>Attivi ({active.length})</button>
        <button type="button" role="tab" aria-selected={seg === 'archive'} className={seg === 'archive' ? 'is-on' : ''} onClick={() => setSeg('archive')}>Archivio ({archive.length})</button>
      </div>

      <div className="rfx-searchrow">
        <label className="rfx-search">
          <Search size={18} aria-hidden="true" />
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cerca indirizzo o #IT-…" aria-label="Cerca intervento" />
        </label>
        <button type="button" className={`rfx-btn${nFilters ? ' is-on' : ''}`} onClick={() => setShowFilters(true)}>
          <Filter size={17} aria-hidden="true" />Filtra{nFilters ? ` (${nFilters})` : ''}
        </button>
      </div>

      {loading ? <p className="rfx-muted">Caricamento…</p> : shown.length === 0 ? (
        <div className="rfx-empty">
          <Wrench size={26} aria-hidden="true" />
          <strong>{base.length ? 'Nessun intervento con questi filtri' : seg === 'active' ? 'Nessun intervento attivo' : 'Archivio vuoto'}</strong>
          <span>{base.length ? 'Prova a togliere i filtri o a cambiare ricerca.' : seg === 'active' ? 'Quando un condominio ti sceglie per un lavoro, lo trovi qui.' : 'Qui finiscono gli interventi completati o annullati.'}</span>
        </div>
      ) : (
        <ul className="rfx-list">
          {shown.map((i) => <InterventionCard key={i.id} i={i} selected={!isMobile && open?.id === i.id} onOpen={() => setOpenId(i.id)} />)}
        </ul>
      )}

      {showFilters && <FiltersSheet value={filters} onClose={() => setShowFilters(false)} onApply={(v) => { setFilters(v); setShowFilters(false) }} />}
    </section>
  )

  if (isMobile) {
    return (
      <>
        {listCol}
        {open && (
          <div className="rfx-mobile-detail" role="dialog" aria-modal="true" aria-label={open.title}>
            <InterventionDetail i={open} team={team} onBack={() => setOpenId(null)} onChat={() => onChat(open)} onChanged={onChanged} demo={demo} mobile />
          </div>
        )}
      </>
    )
  }

  return (
    <div className="rfx-split">
      {listCol}
      <div className="rfx-detailcol">
        {open ? <InterventionDetail i={open} team={team} onChat={() => onChat(open)} onChanged={onChanged} demo={demo} />
          : <section className="rfx-card rfx-empty" style={{ minHeight: 320 }}><MessageCircle size={26} aria-hidden="true" /><strong>Scegli un intervento</strong><span>Il dettaglio compare qui.</span></section>}
      </div>
    </div>
  )
}

function InterventionCard({ i, selected, onOpen }) {
  const st = STAGE[stageOf(i)]
  const na = nextAction(i)
  return (
    <li>
      <button type="button" className={`rfx-item${selected ? ' is-selected' : ''}${i.urgent ? ' is-urgent' : ''}`} onClick={onOpen}>
        {i.urgent && <span className="rfx-urgent"><AlertTriangle size={12} aria-hidden="true" />Urgente</span>}
        <span className="rfx-item-top">
          <strong>{i.title}</strong>
          <span className="rfx-pill" style={{ background: st.bg, color: st.fg }}>{st.label}</span>
        </span>
        <span className="rfx-line"><MapPin size={15} aria-hidden="true" />{i.building_address}</span>
        {(i.location || i.ref_number) && <span className="rfx-line"><Stairs size={15} aria-hidden="true" />{[i.location, i.ref_number ? `#IT-${i.ref_number}` : null].filter(Boolean).join(' · ')}</span>}
        {i.status === 'scheduled' && i.scheduled_date && (
          <span className="rfx-line is-strong"><CalendarClock size={15} aria-hidden="true" />{fmtDay(i.scheduled_date)}{i.time_start ? ` · ${timeRange(i.time_start, i.time_end)}` : ''}</span>
        )}
        {i.quote_cents != null && i.status !== 'done' && <span className="rfx-line"><FileText size={15} aria-hidden="true" />Preventivo inviato · {euro(i.quote_cents)}</span>}
        {i.status === 'done' && i.completed_at && <span className="rfx-line"><CircleCheck size={15} aria-hidden="true" />Completato il {fmtShort(i.completed_at)}{i.invoice_cents != null ? ` · fattura ${euro(i.invoice_cents)}` : ''}</span>}
        {na && <span className={`rfx-next is-${na.tone}`}><CalendarClock size={16} aria-hidden="true" />{na.text}</span>}
        <span className="rfx-item-foot">
          <span className="rfx-line"><UserRound size={15} aria-hidden="true" />{requesterLabel(i)}{i.tech_name ? ` · Tecnico: ${i.tech_name}` : ''}</span>
          {i.message_count > 0 && <span className="rfx-line"><MessageCircle size={15} aria-hidden="true" />{i.message_count}</span>}
          <span className="rfx-open">Apri<ArrowRight size={16} aria-hidden="true" /></span>
        </span>
      </button>
    </li>
  )
}

function FiltersSheet({ value, onClose, onApply }) {
  const [v, setV] = useState(value)
  return (
    <div className="dir-sheet-wrap" role="dialog" aria-modal="true" aria-label="Filtra interventi">
      <div className="dir-sheet-backdrop" onClick={onClose} />
      <div className="dir-sheet">
        <div className="dir-sheet-head">
          <div className="dir-sheet-title">Filtra</div>
          <button type="button" className="dir-sheet-close" onClick={onClose} aria-label="Chiudi"><X size={22} /></button>
        </div>
        <div className="rfx-flabel">Stato</div>
        <div className="p2-chips" style={{ marginBottom: 14 }}>
          {[['', 'Tutti'], ['todo', 'Da programmare'], ['waiting', 'In attesa'], ['scheduled', 'Programmati']].map(([k, l]) => (
            <button key={k} type="button" className={`p2-chip${v.stage === k ? ' is-on' : ''}`} onClick={() => setV({ ...v, stage: k })}>{l}</button>
          ))}
        </div>
        <div className="rfx-flabel">Categoria</div>
        <div className="p2-chips" style={{ marginBottom: 14 }}>
          <button type="button" className={`p2-chip${!v.category ? ' is-on' : ''}`} onClick={() => setV({ ...v, category: '' })}>Tutte</button>
          {MAINTENANCE_CATEGORIES.map((c) => <button key={c.value} type="button" className={`p2-chip${v.category === c.value ? ' is-on' : ''}`} onClick={() => setV({ ...v, category: c.value })}>{c.label}</button>)}
        </div>
        <label className="rfx-check"><input type="checkbox" checked={v.urgent} onChange={(e) => setV({ ...v, urgent: e.target.checked })} />Solo urgenti</label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: 8, marginTop: 16 }}>
          <button type="button" className="rfx-btn" onClick={() => onApply({ stage: '', category: '', urgent: false })}>Azzera</button>
          <button type="button" className="rfx-btn is-primary" onClick={() => onApply(v)}>Applica</button>
        </div>
      </div>
    </div>
  )
}

/* ───────────── Dettaglio ───────────── */

function InterventionDetail({ i, team, onBack, onChat, onChanged, demo, mobile = false }) {
  const [sub, setSub] = useState('riepilogo')
  const [sheet, setSheet] = useState(null) // 'propose' | 'complete'
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)
  const [msg, setMsg] = useState(null)
  const files = useInterventionFiles(demo ? null : i.id)
  const st = STAGE[stageOf(i)]
  const active = i.status === 'requested' || i.status === 'scheduled'
  useEffect(() => { setSub('riepilogo'); setErr(null); setMsg(null) }, [i.id])

  async function rpc(fn, args, ok) {
    if (demo) { setMsg('Anteprima: nessuna modifica salvata.'); return true }
    setBusy(true); setErr(null); setMsg(null)
    const { error } = await createClient().rpc(fn, args)
    setBusy(false)
    if (error) { setErr(/past/.test(error.message) ? 'La data non può essere nel passato.' : 'Operazione non riuscita. Riprova.'); return false }
    setMsg(ok)
    onChanged?.()
    return true
  }

  const activity = useMemo(() => {
    const a = [{ at: i.created_at, text: `Richiesta ricevuta da ${requesterLabel(i)}` }]
    ;(files.files || []).forEach((f) => a.push({ at: f.created_at, text: `${FILE_KINDS[f.kind] || 'File'} caricato${f.amount_cents != null ? ` · ${euro(f.amount_cents)}` : ''}` }))
    if (i.proposed_date) a.push({ at: i.updated_at, text: `Appuntamento proposto per ${fmtDay(i.proposed_date)}${i.proposed_time_start ? ` alle ${hhmm(i.proposed_time_start)}` : ''}` })
    if (i.status === 'scheduled' && i.scheduled_date && !i.proposed_date) a.push({ at: i.updated_at, text: `Appuntamento confermato: ${fmtDay(i.scheduled_date)}${i.time_start ? ` alle ${hhmm(i.time_start)}` : ''}` })
    if (i.last_message_at) a.push({ at: i.last_message_at, text: `Ultimo messaggio in chat` })
    if (i.completed_at) a.push({ at: i.completed_at, text: 'Intervento completato' })
    return a.filter((x) => x.at).sort((x, y) => new Date(y.at) - new Date(x.at)).slice(0, 6)
  }, [i, files.files])

  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(i.lat && i.lng ? `${i.lat},${i.lng}` : i.building_address)}`

  return (
    <section className={`rfx-card rfx-detail${mobile ? ' is-mobile' : ''}`}>
      <div className="rfx-detail-head">
        {mobile && <button type="button" className="rfx-back" onClick={onBack} aria-label="Torna agli interventi"><ArrowLeft size={22} aria-hidden="true" /></button>}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="rfx-detail-kicker">Dettaglio intervento</div>
          <div className="rfx-detail-ref">{i.ref_number ? `#IT-${i.ref_number}` : ''}{i.ref_number ? ' · ' : ''}{maintenanceCategoryLabel(i.category)}</div>
        </div>
        <span className="rfx-pill" style={{ background: st.bg, color: st.fg }}>{st.label}</span>
      </div>

      <div className="rfx-seg rfx-seg-3" role="tablist">
        <button type="button" role="tab" aria-selected={sub === 'riepilogo'} className={sub === 'riepilogo' ? 'is-on' : ''} onClick={() => setSub('riepilogo')}>Riepilogo</button>
        <button type="button" role="tab" disabled={!i.thread_id && !demo} onClick={onChat}>Chat{i.message_count ? ` (${i.message_count})` : ''}</button>
        <button type="button" role="tab" aria-selected={sub === 'documenti'} className={sub === 'documenti' ? 'is-on' : ''} onClick={() => setSub('documenti')}>Documenti{i.file_count ? ` (${i.file_count})` : ''}</button>
      </div>

      <div className="rfx-detail-body">
        {sub === 'riepilogo' ? (
          <>
            {i.urgent && <span className="rfx-urgent" style={{ marginBottom: 6 }}><AlertTriangle size={12} aria-hidden="true" />Urgente</span>}
            <h2 className="rfx-h2">{i.title}</h2>
            {i.description && <p className="rfx-desc">{i.description}</p>}
            <Photos files={files} />

            <div className="rfx-grid2">
              <div>
                <h3 className="rfx-h3">Accesso e contatti</h3>
                <ul className="rfx-facts">
                  <li><MapPin size={16} aria-hidden="true" /><a href={mapsUrl} target="_blank" rel="noopener noreferrer">{i.building_address}<Navigation size={13} aria-hidden="true" style={{ marginLeft: 4 }} /></a></li>
                  {i.location && <li><Stairs size={16} aria-hidden="true" />{i.location}</li>}
                  <li><UserRound size={16} aria-hidden="true" />Referente: {i.requester || 'Residente'}</li>
                  <li>
                    {i.status === 'scheduled' && i.scheduled_date
                      ? <span className="rfx-tag is-ok"><CalendarClock size={15} aria-hidden="true" />Accesso il {fmtDay(i.scheduled_date)}{i.time_start ? `, ${timeRange(i.time_start, i.time_end)}` : ''}</span>
                      : i.status === 'done' ? <span className="rfx-tag"><CircleCheck size={15} aria-hidden="true" />Lavoro concluso</span>
                      : <span className="rfx-tag is-warn"><Clock3 size={15} aria-hidden="true" />Accesso da confermare</span>}
                  </li>
                </ul>
              </div>
              <div>
                <h3 className="rfx-h3">Incarico</h3>
                <ul className="rfx-facts">
                  <li><FileText size={16} aria-hidden="true" />Richiesto da {requesterLabel(i)}</li>
                  <li>
                    <UserRound size={16} aria-hidden="true" />
                    {active ? (
                      <select className="rfx-select" value={i.tech_id || ''} aria-label="Tecnico assegnato"
                        onChange={(e) => rpc('supplier_assign_tech', { p_intervention: i.id, p_member: e.target.value || null }, 'Tecnico aggiornato.')}>
                        <option value="">{team.members.length ? 'Tecnico da assegnare' : 'Aggiungi i tecnici nel Team'}</option>
                        {team.members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                      </select>
                    ) : <span>{i.tech_name ? `Tecnico: ${i.tech_name}` : 'Nessun tecnico assegnato'}</span>}
                  </li>
                  <li><FileText size={16} aria-hidden="true" />
                    {i.quote_cents != null ? `Preventivo inviato · ${euro(i.quote_cents)}` : active ? <button type="button" className="rfx-link" onClick={() => setSub('documenti')}>Preventivo da inviare</button> : 'Nessun preventivo'}
                  </li>
                  {i.invoice_cents != null && <li><FileText size={16} aria-hidden="true" />Fattura · {euro(i.invoice_cents)}</li>}
                </ul>
              </div>
            </div>

            {i.completion_notes && (
              <div className="rfx-notes"><h3 className="rfx-h3">Note di chiusura</h3><p>{i.completion_notes}</p></div>
            )}

            <h3 className="rfx-h3" style={{ marginTop: 18 }}>Attività recenti</h3>
            <ol className="rfx-timeline">
              {activity.map((a, k) => <li key={k}><span>{a.text}</span><small>{when(a.at)}</small></li>)}
            </ol>
          </>
        ) : (
          demo ? <p className="rfx-muted">Anteprima: qui carichi preventivo, fattura e foto del lavoro.</p> : <InterventionFiles interventionId={i.id} />
        )}

        {msg && <p className="rfx-msg">{msg}</p>}
        {err && <p className="auth-err">{err}</p>}
      </div>

      {active && (
        <div className="rfx-actions">
          {i.status === 'scheduled' && !i.proposed_date ? (
            <button type="button" className="rfx-btn is-primary is-big" disabled={busy} onClick={() => setSheet('complete')}><CircleCheck size={19} aria-hidden="true" />Segna completato</button>
          ) : (
            <button type="button" className="rfx-btn is-primary is-big" disabled={busy} onClick={() => setSheet('propose')}><CalendarClock size={19} aria-hidden="true" />{i.proposed_date ? 'Cambia proposta' : 'Proponi appuntamento'}</button>
          )}
          <button type="button" className="rfx-btn is-big" disabled={!i.thread_id && !demo} onClick={onChat}><MessageCircle size={19} aria-hidden="true" />Apri chat</button>
          {i.status === 'scheduled' && !i.proposed_date && (
            <button type="button" className="rfx-btn rfx-btn-link" onClick={() => setSheet('propose')}>Proponi un&apos;altra data</button>
          )}
        </div>
      )}

      {sheet === 'propose' && <ProposeSheet i={i} onClose={() => setSheet(null)}
        onSave={async (v) => { const ok = await rpc('supplier_propose_date', { p_intervention: i.id, p_date: v.date, p_start: v.start || null, p_end: v.end || null }, 'Proposta inviata: chi ha chiesto l’intervento la conferma dalla sua scheda.'); if (ok) setSheet(null) }} />}
      {sheet === 'complete' && <CompleteSheet onClose={() => setSheet(null)}
        onSave={async (notes) => { const ok = await rpc('supplier_complete', { p_intervention: i.id, p_notes: notes }, 'Intervento completato.'); if (ok) setSheet(null) }} />}
    </section>
  )
}

function Photos({ files }) {
  const photos = (files.files || []).filter((f) => f.kind === 'photo')
  const [urls, setUrls] = useState({})
  useEffect(() => {
    let alive = true
    Promise.all(photos.slice(0, 6).map(async (f) => [f.id, await files.open(f)])).then((pairs) => { if (alive) setUrls(Object.fromEntries(pairs)) })
    return () => { alive = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photos.map((p) => p.id).join(',')])
  if (!photos.length) return null
  return (
    <div className="rfx-photos">
      {photos.slice(0, 6).map((f) => (
        <a key={f.id} href={urls[f.id] || '#'} target="_blank" rel="noopener noreferrer" className="rfx-photo" aria-label={f.file_name}>
          {urls[f.id] ? <img src={urls[f.id]} alt="" /> : <ImageIcon size={22} aria-hidden="true" />}
        </a>
      ))}
    </div>
  )
}

function ProposeSheet({ i, onClose, onSave }) {
  const [v, setV] = useState({ date: i.proposed_date || '', start: hhmm(i.proposed_time_start), end: hhmm(i.proposed_time_end) })
  const [busy, setBusy] = useState(false)
  const today = new Date().toISOString().slice(0, 10)
  return (
    <div className="dir-sheet-wrap" role="dialog" aria-modal="true" aria-label="Proponi appuntamento">
      <div className="dir-sheet-backdrop" onClick={onClose} />
      <div className="dir-sheet">
        <div className="dir-sheet-head">
          <div><div className="dir-sheet-kicker">{i.title}</div><div className="dir-sheet-title">Proponi appuntamento</div></div>
          <button type="button" className="dir-sheet-close" onClick={onClose} aria-label="Chiudi"><X size={22} /></button>
        </div>
        {i.status === 'scheduled' && i.scheduled_date && <p className="rfx-muted" style={{ marginBottom: 10 }}>Già fissato: {fmtDay(i.scheduled_date)}{i.time_start ? ` alle ${hhmm(i.time_start)}` : ''}. La nuova data va confermata.</p>}
        <label className="rfx-field"><span>Giorno</span><input type="date" min={today} value={v.date} onChange={(e) => setV({ ...v, date: e.target.value })} /></label>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: 8 }}>
          <label className="rfx-field"><span>Dalle</span><input type="time" value={v.start} onChange={(e) => setV({ ...v, start: e.target.value })} /></label>
          <label className="rfx-field"><span>Alle (facoltativo)</span><input type="time" value={v.end} onChange={(e) => setV({ ...v, end: e.target.value })} /></label>
        </div>
        <p className="rfx-muted" style={{ margin: '4px 0 14px' }}>Chi ha chiesto l&apos;intervento riceve la proposta e la conferma dalla sua scheda. Te lo scriviamo anche in chat.</p>
        <button type="button" className="ep-save" disabled={!v.date || busy} onClick={async () => { setBusy(true); await onSave(v); setBusy(false) }}>{busy ? 'Invio…' : 'Invia proposta'}</button>
      </div>
    </div>
  )
}

function CompleteSheet({ onClose, onSave }) {
  const [notes, setNotes] = useState('')
  const [busy, setBusy] = useState(false)
  return (
    <div className="dir-sheet-wrap" role="dialog" aria-modal="true" aria-label="Segna completato">
      <div className="dir-sheet-backdrop" onClick={onClose} />
      <div className="dir-sheet">
        <div className="dir-sheet-head">
          <div className="dir-sheet-title">Lavoro finito</div>
          <button type="button" className="dir-sheet-close" onClick={onClose} aria-label="Chiudi"><X size={22} /></button>
        </div>
        <label className="rfx-field"><span>Note per chi ha chiesto l&apos;intervento</span>
          <textarea rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={1000} placeholder="Cosa hai fatto, ricambi usati, garanzia…" />
        </label>
        <p className="rfx-muted" style={{ margin: '4px 0 14px' }}>Ricordati di caricare la fattura e qualche foto del lavoro nei Documenti.</p>
        <button type="button" className="ep-save" disabled={busy} onClick={async () => { setBusy(true); await onSave(notes); setBusy(false) }}>{busy ? 'Salvataggio…' : 'Segna completato'}</button>
      </div>
    </div>
  )
}

/* ───────────── Calendario ───────────── */

function CalendarTab({ list, onOpen }) {
  const today = new Date().toISOString().slice(0, 10)
  const events = []
  list.forEach((i) => {
    if (i.status === 'scheduled' && i.scheduled_date) events.push({ i, date: i.scheduled_date, start: i.time_start, end: i.time_end, kind: 'ok' })
    if (i.proposed_date && (i.status === 'requested' || i.status === 'scheduled')) events.push({ i, date: i.proposed_date, start: i.proposed_time_start, end: i.proposed_time_end, kind: 'wait' })
  })
  const upcoming = events.filter((e) => e.date >= today).sort((a, b) => (a.date + (a.start || '')).localeCompare(b.date + (b.start || '')))
  const toPlan = list.filter((i) => stageOf(i) === 'todo')
  const days = [...new Set(upcoming.map((e) => e.date))]

  return (
    <div className="rfx-cal">
      <section className="rfx-card">
        <h1 className="rfx-h1">Calendario</h1>
        <p className="rfx-sub">Appuntamenti confermati e proposte in attesa</p>
        {days.length === 0 ? (
          <div className="rfx-empty"><CalendarDays size={26} aria-hidden="true" /><strong>Nessun appuntamento in programma</strong><span>Proponi una data dagli interventi da programmare.</span></div>
        ) : days.map((d) => (
          <div key={d} className="rfx-day">
            <div className={`rfx-day-head${d === today ? ' is-today' : ''}`}>{d === today ? 'Oggi · ' : ''}{new Date(d + 'T00:00:00').toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })}</div>
            {upcoming.filter((e) => e.date === d).map((e) => (
              <button key={`${e.i.id}-${e.kind}`} type="button" className={`rfx-slot is-${e.kind}`} onClick={() => onOpen(e.i.id)}>
                <span className="rfx-slot-time">{e.start ? hhmm(e.start) : 'Giorno'}{e.end ? <small>{hhmm(e.end)}</small> : null}</span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <strong>{e.i.title}</strong>
                  <small>{e.i.building_address}{e.i.tech_name ? ` · ${e.i.tech_name}` : ''}</small>
                  {e.kind === 'wait' && <em>Proposta in attesa di conferma</em>}
                </span>
                <ChevronRight size={18} aria-hidden="true" />
              </button>
            ))}
          </div>
        ))}
      </section>
      {toPlan.length > 0 && (
        <section className="rfx-card">
          <h2 className="rfx-h3">Da programmare ({toPlan.length})</h2>
          {toPlan.map((i) => (
            <button key={i.id} type="button" className="rfx-slot is-todo" onClick={() => onOpen(i.id)}>
              <span className="rfx-slot-time"><CalendarClock size={18} aria-hidden="true" /></span>
              <span style={{ flex: 1, minWidth: 0 }}><strong>{i.title}</strong><small>{i.building_address}</small></span>
              {i.urgent && <span className="rfx-urgent">Urgente</span>}
              <ChevronRight size={18} aria-hidden="true" />
            </button>
          ))}
        </section>
      )}
    </div>
  )
}

/* ───────────── Team ───────────── */

const DEMO_TEAM = [{ id: 't1', name: 'Marco Bianchi', role: 'Idraulico', phone: '333 123 4567' }, { id: 't2', name: 'Luca Neri', role: 'Apprendista', phone: null }]

export function useTeam(demo) {
  const [real, setMembers] = useState([])
  const [teamRow, setTeamRow] = useState(null)
  const [loadingReal, setLoading] = useState(true)
  const members = demo ? DEMO_TEAM : real
  const loading = demo ? false : loadingReal
  const load = async () => {
    if (demo) return
    const s = createClient()
    const { data: id, error } = await s.rpc('ensure_my_team', { p_kind: 'supplier' })
    if (error || !id) { setLoading(false); return }
    const [{ data: teams }, { data: list }] = await Promise.all([
      s.rpc('my_teams'),
      s.from('team_members').select('id, name, job, phone, role').eq('team_id', id).order('name'),
    ])
    setTeamRow((teams || []).find((t) => t.id === id) || null)
    setMembers((list || []).map((m) => ({ ...m, role: m.job })))
    setLoading(false)
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load() }, [demo])
  return { members, loading, team: teamRow, reload: load }
}

function TeamTab({ team, demo, buildings }) {
  if (demo || !team.team) {
    return (
      <section className="rfx-card">
        <h1 className="rfx-h1">Team</h1>
        <p className="rfx-sub">{demo ? 'Nell\'anteprima vedi un team di esempio.' : 'Caricamento…'}</p>
        {demo && (
          <ul className="rfx-team">
            {DEMO_TEAM.map((m) => (
              <li key={m.id}>
                <span className="rfx-avatar">{m.name.split(/\s+/).map((x) => x[0]).slice(0, 2).join('').toUpperCase()}</span>
                <span style={{ flex: 1, minWidth: 0 }}><strong>{m.name}</strong><small>{m.role}</small></span>
              </li>
            ))}
          </ul>
        )}
      </section>
    )
  }
  return <TeamWorkspace team={team.team} buildings={buildings} />
}

/* ───────────── Documenti ───────────── */

function DocumentsTab({ list, onOpen, demo }) {
  const [docs, setDocs] = useState(null)
  const [kind, setKind] = useState('')
  const ids = list.map((i) => i.id).join(',')
  useEffect(() => {
    if (demo || !ids) { setDocs([]); return }
    createClient().from('condo_intervention_files').select('id, intervention_id, kind, amount_cents, file_path, file_name, created_at')
      .in('intervention_id', ids.split(',')).order('created_at', { ascending: false })
      .then(({ data }) => setDocs(data || []))
  }, [ids, demo])
  const byId = Object.fromEntries(list.map((i) => [i.id, i]))
  const shown = (docs || []).filter((d) => !kind || d.kind === kind)
  const sum = (k) => (docs || []).filter((d) => d.kind === k && d.amount_cents != null).reduce((n, d) => n + d.amount_cents, 0)

  async function openDoc(d) {
    const w = window.open('', '_blank')
    const { data } = await createClient().storage.from('intervention-files').createSignedUrl(d.file_path, 300)
    if (data?.signedUrl && w) w.location.replace(data.signedUrl); else w?.close()
  }

  return (
    <section className="rfx-card">
      <h1 className="rfx-h1">Documenti</h1>
      <p className="rfx-sub">Preventivi, fatture e foto di tutti i tuoi interventi</p>
      <div className="rfx-kpis">
        <div className="rfx-kpi is-static"><b>{euro(sum('quote')) || '€ 0'}</b><span>Preventivi</span></div>
        <div className="rfx-kpi is-static"><b>{euro(sum('invoice')) || '€ 0'}</b><span>Fatturato</span></div>
        <div className="rfx-kpi is-static"><b>{(docs || []).filter((d) => d.kind === 'photo').length}</b><span>Foto</span></div>
      </div>
      <div className="p2-chips" style={{ marginBottom: 12 }}>
        {[['', 'Tutti'], ['quote', 'Preventivi'], ['invoice', 'Fatture'], ['photo', 'Foto']].map(([k, l]) => (
          <button key={k} type="button" className={`p2-chip${kind === k ? ' is-on' : ''}`} onClick={() => setKind(k)}>{l}</button>
        ))}
      </div>
      {docs === null ? <p className="rfx-muted">Caricamento…</p> : shown.length === 0 ? (
        <div className="rfx-empty"><FileText size={26} aria-hidden="true" /><strong>Nessun documento</strong><span>Carichi preventivi, fatture e foto dalla scheda di ogni intervento.</span></div>
      ) : (
        <ul className="rfx-docs">
          {shown.map((d) => {
            const i = byId[d.intervention_id]
            return (
              <li key={d.id}>
                <span className={`rfx-docico is-${d.kind}`}>{d.kind === 'photo' ? <ImageIcon size={18} aria-hidden="true" /> : <FileText size={18} aria-hidden="true" />}</span>
                <button type="button" className="rfx-doc-main" onClick={() => openDoc(d)}>
                  <strong>{FILE_KINDS[d.kind]}{d.amount_cents != null ? ` · ${euro(d.amount_cents)}` : ''}</strong>
                  <small>{d.file_name} · {fmtShort(d.created_at)}</small>
                </button>
                {i && <button type="button" className="rfx-link" onClick={() => onOpen(i.id)}>{i.ref_number ? `#IT-${i.ref_number}` : 'Intervento'}</button>}
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
