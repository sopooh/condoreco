'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import {
  ArrowRight, Building2, CalendarDays, Coins, Home, Check, ChevronDown, ChevronRight, FolderOpen, House, Lock, Megaphone,
  MessageCircle, Phone, Plus, Upload, UserRound, Vote, Wrench,
} from 'lucide-react'
import { useMyAccount } from '@/hooks/useAccounting'
import { euro, isOverdue } from '@/lib/accounting'
import { useInterventions } from '@/hooks/useInterventions'
import { usePublicInterventions } from '@/hooks/usePublicInterventions'
import { useCalendarEvents } from '@/hooks/useCalendarEvents'
import { useTickets, isTicketOpen } from '@/hooks/useTickets'
import { usePolls } from '@/hooks/usePolls'
import { useDocuments } from '@/hooks/useDocuments'
import { useCondoThreads } from '@/hooks/useCondoThreads'
import { useNeighbourNotices, floorLabel } from '@/hooks/useNeighbourNotices'
import { toLocalISODate } from '@/lib/localDate'
import { telLink } from '@/lib/contact'
import { maintenanceCategoryLabel } from '@/lib/maintenanceCategories'
import { NewActivity } from '@/components/condo/admin/AdminCondoOverview'
import ConversationsCard from '@/components/condo/ConversationsCard'
import UnitForm from '@/components/condo/UnitForm'
import { Sheet } from '@/components/condo/InterventionsPage'

// Pagina "Il mio condominio" del condomino: la sua situazione, cosa non perdere,
// conversazioni, segnalazioni, appuntamenti e accesso rapido alle sezioni.

const MEETING = new Set(['meeting', 'assembly'])
const hhmm = (t) => (t ? String(t).slice(0, 5) : '')
const timeRange = (a, b) => (a ? `${hhmm(a)}${b ? `–${hhmm(b)}` : ''}` : '')
const shortDay = (iso) => new Date(`${iso}T00:00:00`).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' }).replace('.', '')
const longDay = (iso) => new Date(`${iso}T00:00:00`).toLocaleDateString('it-IT', { day: 'numeric', month: 'long' })
const euro0 = (n) => euro(n, { maximumFractionDigits: 0, minimumFractionDigits: 0 })
function when(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  const now = new Date()
  if (d.toDateString() === now.toDateString()) return d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
  const y = new Date(now); y.setDate(now.getDate() - 1)
  if (d.toDateString() === y.toDateString()) return 'Ieri'
  return d.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' }).replace('.', '')
}

export default function ResidentCondoOverview({ building }) {
  const id = building.id
  const base = `/edificio/${id}/condominio`
  const today = toLocalISODate(new Date())
  const [in30] = useState(() => toLocalISODate(new Date(Date.now() + 30 * 86400000)))
  const [weekAgo] = useState(() => Date.now() - 7 * 86400000)
  const now = new Date()
  const next = new Date(now.getFullYear(), now.getMonth() + 1, 1)

  const acc = useMyAccount(id)
  const { interventions, maintainers } = useInterventions(id)
  const { items: sched } = usePublicInterventions(id, today, in30)
  const { events: evA } = useCalendarEvents(id, now.getFullYear(), now.getMonth())
  const { events: evB } = useCalendarEvents(id, next.getFullYear(), next.getMonth())
  const { tickets } = useTickets(id)
  const { polls } = usePolls(id)
  const { docs } = useDocuments(id)
  const { threads } = useCondoThreads(id)
  const { myUnit, saveUnit } = useNeighbourNotices(id)
  const [unitOpen, setUnitOpen] = useState(false)
  const [contactsOpen, setContactsOpen] = useState(false)

  const addr = `${building.address}${building.street_number ? `, ${building.street_number}` : ''}`

  // ---- la mia situazione
  const openCharges = acc.charges.filter((c) => c.status === 'open')
  const overdue = acc.charges.filter((c) => isOverdue(c, today))
  const overdueSum = overdue.reduce((n, c) => n + Number(c.amount), 0)
  const nextCharge = openCharges.filter((c) => c.due_date >= today).sort((a, b) => a.due_date.localeCompare(b.due_date))[0] || null
  const hasAccount = acc.charges.length > 0 || !!acc.budget

  // ---- appuntamenti (eventi approvati + interventi programmati)
  const appointments = useMemo(() => {
    const ev = [...evA, ...evB].filter((e) => e.approved && e.event_date >= today)
      .map((e) => ({ key: `e${e.id}`, date: e.event_date, title: e.title, type: e.event_type, sub: [e.time_start ? timeRange(e.time_start, e.time_end) : 'Tutto il giorno', e.location].filter(Boolean).join(' · ') }))
    const iv = sched.filter((i) => i.status === 'scheduled' && i.scheduled_date >= today)
      .map((i) => ({ key: `i${i.id}`, date: i.scheduled_date, title: i.title, type: 'maintenance', sub: [timeRange(i.time_start, i.time_end), i.location].filter(Boolean).join(' · ') }))
    const seen = new Set()
    return [...ev, ...iv].filter((a) => !seen.has(a.key) && seen.add(a.key))
      .sort((a, b) => (a.date + a.sub).localeCompare(b.date + b.sub))
  }, [evA, evB, sched, today])

  // ---- da non perdere: appuntamenti dei prossimi 7 giorni e segnalazioni aperte in bacheca
  const [in7] = useState(() => toLocalISODate(new Date(Date.now() + 7 * 86400000)))
  const openTickets = tickets.filter(isTicketOpen)
  const highlights = [
    ...appointments.filter((a) => a.date <= in7).map((a) => ({
      key: a.key, title: a.title, sub: `${shortDay(a.date)}${a.sub ? ` · ${a.sub}` : ''}`,
      dot: MEETING.has(a.type) ? 'var(--teal)' : '#E8651A', href: `${base}/calendario`, action: MEETING.has(a.type) ? 'Vedi dettagli' : 'Leggi avviso',
    })),
    ...openTickets.map((t) => ({ key: `t${t.id}`, title: t.title, sub: `Segnalazione in bacheca · ${when(t.created_at)}`, dot: '#7C3AED', href: `${base}/bacheca`, action: 'Apri' })),
  ].slice(0, 3)

  // ---- conversazioni
  const unreadTotal = threads.reduce((n, t) => n + (t.unread || 0), 0)
  // ---- segnalazioni mie
  const mine = interventions.filter((i) => i.status === 'requested' || i.status === 'scheduled')
  const recentDone = interventions.filter((i) => i.status === 'done').sort((a, b) => String(b.completed_at).localeCompare(String(a.completed_at)))
  const myReports = (mine.length ? mine : recentDone).slice(0, 2)

  const openPolls = polls.filter((p) => p.isOpen)
  const toVote = openPolls.filter((p) => !p.hasVoted).length
  const newDocs = docs.filter((d) => new Date(d.created_at).getTime() > weekAgo).length

  const unitMissing = myUnit && (!myUnit.tenure || (myUnit.tenure === 'owner' && myUnit.millesimi == null))
  const unitLabel = !myUnit ? null : unitMissing ? 'Completa i dati della tua casa'
    : [myUnit.floor ? floorLabel(myUnit.floor) : null, myUnit.tenure === 'owner' ? 'Proprietario' : myUnit.tenure === 'tenant' ? 'In affitto' : null].filter(Boolean).join(' · ') || 'La tua casa'

  const TABS = [
    { label: 'Panoramica', icon: Home, href: base, on: true },
    { label: 'Le mie quote', icon: Coins, href: `${base}/rendicontazione` },
    { label: 'Chat', icon: MessageCircle, href: `${base}/chat`, badge: unreadTotal },
    { label: 'Segnalazioni', icon: Wrench, href: `${base}/interventi` },
    { label: 'Documenti', icon: FolderOpen, href: `${base}/archivio` },
    { label: 'Calendario', icon: CalendarDays, href: `${base}/calendario` },
    { label: 'Decisioni', icon: Vote, href: `${base}/decisioni`, badge: toVote },
  ]

  return (
    <div className="aco rco">
      <nav className="aco-crumbs" aria-label="Percorso">
        <Link href="/profilo"><Home size={15} aria-hidden="true" />Le mie abitazioni</Link>
        <span aria-hidden="true">/</span>
        <strong>{addr}</strong>
      </nav>

      <header className="aco-head">
        <span className="aco-head-ico"><Building2 size={28} strokeWidth={1.8} aria-hidden="true" /></span>
        <div className="aco-head-txt">
          <h1>{addr}</h1>
          <div className="aco-head-meta">
            {building.city && <span>{building.city}</span>}
            {unitLabel && (
              <button type="button" className={`rco-unit${unitMissing ? ' is-warn' : ''}`} onClick={() => setUnitOpen(true)}>
                <House size={15} aria-hidden="true" />{unitLabel}<ChevronDown size={15} aria-hidden="true" />
              </button>
            )}
          </div>
        </div>
        <div className="aco-head-act">
          <Link href={`${base}/chat`} className="aco-btn rco-chat-btn" aria-label="Apri chat">
            <MessageCircle size={19} aria-hidden="true" /><span className="aco-hide-sm">Chat</span>{unreadTotal > 0 && <span className="rco-badge">{unreadTotal}</span>}
          </Link>
          <NewActivity base={base} options={[
            { href: `${base}/interventi?nuova=1`, icon: Wrench, label: 'Segnala un problema' },
            { href: `${base}/bacheca`, icon: Megaphone, label: 'Avviso in bacheca' },
            { href: `${base}/decisioni`, icon: Vote, label: 'Proposta da votare' },
            { href: `${base}/calendario`, icon: CalendarDays, label: 'Appuntamento' },
            { href: `${base}/rendicontazione`, icon: Upload, label: 'Ricevuta di pagamento' },
            { href: `${base}/chat?admin=1`, icon: MessageCircle, label: 'Messaggio all\'amministratore' },
          ]} />
        </div>
      </header>

      <nav className="aco-tabs" aria-label="Sezioni del condominio">
        {TABS.map((t) => (
          <Link key={t.label} href={t.href} className={t.on ? 'is-on' : ''} aria-current={t.on ? 'page' : undefined}>
            <t.icon size={18} strokeWidth={1.9} aria-hidden="true" />{t.label}{t.badge > 0 && <span className="rco-badge">{t.badge}</span>}
          </Link>
        ))}
      </nav>

      <div className="rco-top">
        {/* la mia situazione */}
        <section className="aco-card rco-me" style={{ gridArea: 'me' }}>
          <div className="rco-me-head">
            <span className="rco-pill"><Lock size={15} aria-hidden="true" />La mia situazione</span>
            <small>Visibile solo a te e all&apos;amministratore</small>
          </div>
          {acc.loading ? <p className="aco-muted">Caricamento…</p> : !hasAccount ? (
            <p className="aco-muted">L&apos;amministratore non ha ancora caricato le quote. Le vedrai qui appena disponibili.</p>
          ) : (
            <div className="rco-me-kpis">
              <div><b>{nextCharge ? euro0(nextCharge.amount) : '€ 0'}</b><small>Prossima quota</small></div>
              <div><b><span className="rco-hide-xs">{nextCharge ? longDay(nextCharge.due_date) : 'Nessuna'}</span><span className="rco-show-xs">{nextCharge ? shortDay(nextCharge.due_date) : 'Nessuna'}</span></b><small>Scadenza</small></div>
              <div><b className={overdueSum > 0 ? 'is-late' : ''}>{euro0(overdueSum)}</b><small>Arretrati</small></div>
            </div>
          )}
          <div className="rco-me-foot">
            <Link href={`${base}/rendicontazione`} className="aco-link">Vedi quote e pagamenti<ArrowRight size={16} aria-hidden="true" /></Link>
            {openCharges.length > 0 && (
              <Link href={`${base}/rendicontazione`} className="rco-btn-sm"><Upload size={16} aria-hidden="true" />Carica ricevuta</Link>
            )}
          </div>
        </section>

        {/* da non perdere */}
        <section className="aco-card" style={{ gridArea: 'hl' }}>
          <div className="aco-card-head"><Megaphone size={22} aria-hidden="true" /><h2>Da non perdere</h2></div>
          {highlights.length === 0 ? <p className="aco-muted">Niente di urgente nei prossimi giorni.</p> : (
            <ul className="rco-hl">
              {highlights.map((h) => (
                <li key={h.key}>
                  <i style={{ background: h.dot }} aria-hidden="true" />
                  <span className="aco-todo-txt"><strong>{h.title}</strong><small>{h.sub}</small></span>
                  <Link href={h.href} className="aco-link">{h.action}<ArrowRight size={16} aria-hidden="true" /></Link>
                </li>
              ))}
            </ul>
          )}
        </section>
        {/* conversazioni */}
        <ConversationsCard threads={threads} base={base} addr={addr} style={{ gridArea: 'conv' }} />
      </div>

      <div className="rco-row rco-row-b">
        {/* segnalazioni */}
        <section className="aco-card">
          <div className="aco-card-head">
            <Wrench size={22} aria-hidden="true" /><h2>Le mie segnalazioni</h2>
            <Link href={`${base}/interventi`} className="aco-link aco-push">Vedi tutte<ArrowRight size={16} aria-hidden="true" /></Link>
          </div>
          {myReports.length === 0 ? (
            <div className="rco-empty">
              <p className="aco-muted">Nessuna segnalazione in corso.</p>
              <Link href={`${base}/interventi?nuova=1`} className="rco-btn-sm"><Plus size={16} aria-hidden="true" />Segnala un problema</Link>
            </div>
          ) : (
            <ul className="rco-reports">
              {myReports.map((i) => <ReportRow key={i.id} i={i} maintainer={maintainers.find((m) => m.id === i.maintainer_id)} href={`${base}/interventi?i=${i.id}`} />)}
            </ul>
          )}
        </section>

        {/* appuntamenti */}
        <section className="aco-card">
          <div className="aco-card-head">
            <CalendarDays size={22} aria-hidden="true" /><h2>Prossimi appuntamenti</h2>
            <Link href={`${base}/calendario`} className="aco-link aco-push">Calendario<ArrowRight size={16} aria-hidden="true" /></Link>
          </div>
          {appointments.length === 0 ? <p className="aco-muted">Nessun appuntamento in arrivo.</p> : (
            <ul className="aco-appts">
              {appointments.slice(0, 3).map((a) => {
                const d = new Date(a.date + 'T00:00:00')
                return (
                  <li key={a.key}>
                    <span className="aco-date"><b>{d.getDate()}</b><small>{d.toLocaleDateString('it-IT', { month: 'short' }).replace('.', '')}</small></span>
                    <span className="aco-appt-txt"><strong>{a.title}</strong>{a.sub && <small>{a.sub}</small>}</span>
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      </div>

      <div className="rco-tiles">
        <Tile href={`${base}/bacheca`} icon={Megaphone} title="Bacheca" sub={openTickets.length ? `${openTickets.length} ${openTickets.length === 1 ? 'segnalazione aperta' : 'segnalazioni aperte'}` : 'Avvisi e segnalazioni'} />
        <Tile href={`${base}/archivio`} icon={FolderOpen} title="Documenti e bilanci" sub={newDocs ? `${newDocs} ${newDocs === 1 ? 'nuovo documento' : 'nuovi documenti'}` : 'Verbali, spese e documenti condivisi'} />
        <Tile href={`${base}/decisioni`} icon={Vote} title="Proposte e decisioni" sub={openPolls.length ? `${openPolls.length} ${openPolls.length === 1 ? 'sondaggio aperto' : 'sondaggi aperti'}${toVote ? ` · ${toVote} da votare` : ''}` : 'Nessuna votazione in corso'} />
        <Tile onClick={() => setContactsOpen(true)} icon={UserRound} title="Contatti utili" sub="Amministratore e manutentori" />
      </div>

      {unitOpen && myUnit && (
        <Sheet onClose={() => setUnitOpen(false)} title="La tua casa" subtitle={addr}>
          <UnitForm building={building} initial={myUnit} onCancel={() => setUnitOpen(false)} onSubmit={async (v) => {
            const { error } = await saveUnit(v)
            if (!error) setUnitOpen(false)
            return error
          }} />
        </Sheet>
      )}

      {contactsOpen && (
        <Sheet onClose={() => setContactsOpen(false)} title="Contatti utili" subtitle={addr}>
          <ul className="rco-contacts">
            <li>
              <span className="rco-c-ico"><Building2 size={20} aria-hidden="true" /></span>
              <span className="aco-todo-txt"><strong>Amministratore</strong><small>Scrivigli in chat privata</small></span>
              <Link href={`${base}/chat?admin=1`} className="rco-btn-sm"><MessageCircle size={16} aria-hidden="true" />Scrivi</Link>
            </li>
            {maintainers.map((m) => (
              <li key={m.id}>
                <span className="rco-c-ico"><Wrench size={20} aria-hidden="true" /></span>
                <span className="aco-todo-txt"><strong>{m.company || m.name}</strong><small>{[maintenanceCategoryLabel(m.category), m.company ? m.name : null].filter(Boolean).join(' · ')}</small></span>
                {m.phone && <a href={telLink(m.phone)} className="rco-btn-sm"><Phone size={16} aria-hidden="true" />Chiama</a>}
              </li>
            ))}
          </ul>
          {maintainers.length === 0 && <p className="aco-muted">Nessun manutentore registrato. Li aggiungi dalle segnalazioni.</p>}
        </Sheet>
      )}
    </div>
  )
}

function ReportRow({ i, maintainer, href }) {
  const taken = i.status === 'scheduled' || i.status === 'done' || !!i.maintainer_id
  const done = i.status === 'done'
  const status = done ? { label: 'Risolta', cls: 'is-ok' } : i.status === 'scheduled' ? { label: `Programmata ${i.scheduled_date ? shortDay(i.scheduled_date) : ''}`.trim(), cls: 'is-teal' } : taken ? { label: 'In lavorazione', cls: 'is-warn' } : { label: 'Inviata', cls: 'is-grey' }
  const sub = done ? `Risolta ${i.completed_at ? new Date(i.completed_at).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' }) : ''}`
    : [i.location, maintainer ? (maintainer.company || maintainer.name) : 'In attesa di un tecnico'].filter(Boolean).join(' · ')
  const steps = [['Inviata', true], ['Presa in carico', taken], ['Risolta', done]]
  return (
    <li>
      <Link href={href} className="rco-report">
        <span className="rco-report-txt">
          <span className="rco-report-top"><strong>{i.title}</strong><span className={`rco-status ${status.cls}`}>{status.label}</span></span>
          <small>{sub}</small>
        </span>
        <span className="rco-steps" aria-label={`Stato: ${status.label}`}>
          {steps.map(([l, on], k) => (
            <span key={l} className={`rco-step${on ? ' is-on' : ''}${k > 0 && on ? ' line-on' : ''}`}>
              <i>{on && <Check size={13} strokeWidth={3} aria-hidden="true" />}</i><small>{l}</small>
            </span>
          ))}
        </span>
      </Link>
    </li>
  )
}

function Tile({ href, onClick, icon: I, title, sub }) {
  const body = (
    <>
      <span className="aco-tile-ico"><I size={22} strokeWidth={1.9} aria-hidden="true" /></span>
      <span className="aco-tile-txt"><strong>{title}</strong><small>{sub}</small></span>
      <span className="rco-tile-go"><ChevronRight size={18} aria-hidden="true" /></span>
    </>
  )
  return href
    ? <Link href={href} className="aco-tile">{body}</Link>
    : <button type="button" onClick={onClick} className="aco-tile rco-tile-btn">{body}</button>
}
