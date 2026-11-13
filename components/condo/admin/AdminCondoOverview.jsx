'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  AlertTriangle, ArrowRight, Building2, CalendarDays, ChevronRight, ClipboardCheck, Clock3, Coins, FileText, FolderOpen,
  Gavel, Home, Layers, ListChecks, Megaphone, Plus, RefreshCw, MessageCircle, Users, Vote, Wrench,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useAdminOverview } from '@/hooks/useAdminArea'
import { useCondoThreads } from '@/hooks/useCondoThreads'
import ConversationsCard from '@/components/condo/ConversationsCard'
import { useInterventions } from '@/hooks/useInterventions'
import { useCalendarEvents } from '@/hooks/useCalendarEvents'
import { usePublicInterventions } from '@/hooks/usePublicInterventions'
import { usePolls } from '@/hooks/usePolls'
import { useDocuments } from '@/hooks/useDocuments'
import { useTickets, isTicketOpen } from '@/hooks/useTickets'
import { toLocalISODate } from '@/lib/localDate'
import { euro } from '@/lib/accounting'

// Pagina di riepilogo del condominio per l'amministratore: numeri chiave,
// cose da gestire, prossimi appuntamenti e accesso a tutte le sezioni.

const hhmm = (t) => (t ? String(t).slice(0, 5) : '')
const ago = (iso) => {
  if (!iso) return ''
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)
  return d <= 0 ? 'oggi' : d === 1 ? 'ieri' : `da ${d} giorni`
}
const ITEM = {
  quote: { label: 'Preventivo da confrontare', dot: '#F79009', action: 'Apri' },
  transfer: { label: 'Bonifico da verificare', dot: '#0D676F', action: 'Verifica' },
  receipt: { label: 'Contabile da validare', dot: '#0D676F', action: 'Verifica' },
  event: { label: 'Appuntamento da approvare', dot: '#7C3AED', action: 'Approva' },
  poll: { label: 'Decisione da prendere in carico', dot: '#E8651A', action: 'Prendi in carico' },
  assign: { label: 'Intervento da assegnare', dot: '#98A2B3', action: 'Assegna' },
}

export default function AdminCondoOverview({ building }) {
  const id = building.id
  const base = `/edificio/${id}/condominio`
  const router = useRouter()
  const admin = useAdminOverview()
  const adm = admin.buildings.find((b) => b.id === id) || null
  const { interventions } = useInterventions(id)
  const { polls } = usePolls(id)
  const { docs } = useDocuments(id)
  const { tickets } = useTickets(id)

  const today = toLocalISODate(new Date())
  const now = new Date()
  const next = new Date(now.getFullYear(), now.getMonth() + 1, 1)
  const { events: evA } = useCalendarEvents(id, now.getFullYear(), now.getMonth())
  const { events: evB } = useCalendarEvents(id, next.getFullYear(), next.getMonth())
  const [in60] = useState(() => toLocalISODate(new Date(Date.now() + 60 * 86400000)))
  const { items: sched } = usePublicInterventions(id, today, in60)

  // incassato nel mese corrente
  const [month, setMonth] = useState(null)
  const [updatedAt, setUpdatedAt] = useState(null)
  useEffect(() => {
    const from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    createClient().from('condo_charges').select('amount').eq('building_id', id).eq('status', 'paid').gte('paid_at', from)
      .then(({ data }) => { setMonth((data || []).reduce((n, c) => n + Number(c.amount), 0)); setUpdatedAt(new Date()) })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const toAssign = interventions.filter((i) => i.status === 'requested' && !i.maintainer_id)
  const waitingSupplier = interventions.filter((i) => i.status === 'requested' && i.maintainer_id && !i.proposed_date)
  const openInterventions = interventions.filter((i) => i.status === 'requested' || i.status === 'scheduled').length

  const items = useMemo(() => {
    const list = admin.inbox.filter((x) => x.buildingId === id).map((x) => {
      if (x.type === 'quote') return { ...x, sub: [x.title.split(':')[0], x.amount ? euro(x.amount) : null, ago(x.date)].filter(Boolean).join(' · '), title: ITEM.quote.label, href: `${base}/pratiche?p=${x.practiceId}` }
      if (x.type === 'receipt') return { ...x, sub: `${x.title} · ${ago(x.date)}`, title: ITEM.receipt.label, href: `${base}/contabilita?tab=panoramica` }
      if (x.type === 'transfer') return { ...x, sub: x.title, title: ITEM.transfer.label, href: `${base}/contabilita?tab=panoramica` }
      if (x.type === 'event') return { ...x, sub: `${x.title} · ${new Date(x.date + 'T00:00:00').toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })}${x.time ? ` ${hhmm(x.time)}` : ''}`, title: ITEM.event.label }
      if (x.type === 'poll') return { ...x, sub: x.title, title: ITEM.poll.label }
      return x
    })
    toAssign.forEach((i) => list.push({ type: 'assign', id: i.id, title: ITEM.assign.label, sub: `${i.title}${i.location ? ` · ${i.location}` : ''} · ${ago(i.created_at)}`, href: `${base}/interventi` }))
    return list
  }, [admin.inbox, id, base, toAssign])

  const appointments = useMemo(() => {
    const ev = [...evA, ...evB].filter((e) => e.approved && e.event_date >= today)
      .map((e) => ({ key: `e${e.id}`, date: e.event_date, title: e.title, sub: [timeRange(e.time_start, e.time_end), e.location].filter(Boolean).join(' · ') }))
    const iv = sched.filter((i) => i.status === 'scheduled' && i.scheduled_date >= today)
      .map((i) => ({ key: `i${i.id}`, date: i.scheduled_date, title: i.title, sub: [timeRange(i.time_start, i.time_end), i.location].filter(Boolean).join(' · ') }))
    const seen = new Set()
    return [...ev, ...iv].filter((a) => !seen.has(a.key) && seen.add(a.key))
      .sort((a, b) => (a.date + a.sub).localeCompare(b.date + b.sub)).slice(0, 4)
  }, [evA, evB, sched, today])

  const openPolls = polls.filter((p) => p.isOpen).length
  const openTickets = tickets.filter(isTicketOpen).length
  const units = Number(building.units) || null
  const members = adm?.members ?? null
  const addr = `${building.address}${building.street_number ? `, ${building.street_number}` : ''}`
  const meta = [building.city, units ? `${units} unità` : null].filter(Boolean).join(' · ')

  const [busy, setBusy] = useState(null)
  async function act(x) {
    if (x.href) return router.push(x.href)
    setBusy(x.id)
    if (x.type === 'event') await admin.approveEvent(x.id)
    if (x.type === 'poll') { const r = await admin.takeCharge(x.id); if (r.id) router.push(`${base}/pratiche?p=${r.id}`) }
    setBusy(null)
  }

  const { threads } = useCondoThreads(building.id)
  const unreadTotal = threads.reduce((n, t) => n + (t.unread || 0), 0)

  const TABS = [
    { label: 'Panoramica', icon: Home, href: base, on: true },
    { label: 'Persone', icon: Users, href: `${base}/persone` },
    { label: 'Interventi', icon: Wrench, href: `${base}/pratiche` },
    { label: 'Contabilità', icon: Coins, href: `${base}/rendicontazione` },
    { label: 'Documenti', icon: FolderOpen, href: `${base}/archivio` },
    { label: 'Calendario', icon: CalendarDays, href: `${base}/calendario` },
    { label: 'Comunicazioni', icon: Megaphone, href: `${base}/bacheca` },
  ]

  return (
    <div className="aco">
      <nav className="aco-crumbs" aria-label="Percorso">
        <Link href="/profilo"><Home size={15} aria-hidden="true" />I miei condomini</Link>
        <span aria-hidden="true">/</span>
        <strong>{addr}</strong>
      </nav>

      <header className="aco-head">
        <span className="aco-head-ico"><Building2 size={28} strokeWidth={1.8} aria-hidden="true" /></span>
        <div className="aco-head-txt">
          <h1>{addr}</h1>
          <div className="aco-head-meta">
            {meta && <span>{meta}</span>}
            <span className="aco-live"><i />Gestione attiva</span>
          </div>
        </div>
        <div className="aco-head-act">
          <Link href={`${base}/chat`} className="aco-btn rco-chat-btn" aria-label="Apri chat">
            <MessageCircle size={19} aria-hidden="true" /><span className="aco-hide-sm">Chat</span>{unreadTotal > 0 && <span className="rco-badge">{unreadTotal}</span>}
          </Link>
          <NewActivity base={base} />
        </div>
      </header>

      <nav className="aco-tabs" aria-label="Sezioni del condominio">
        {TABS.map((t) => (
          <Link key={t.label} href={t.href} className={t.on ? 'is-on' : ''} aria-current={t.on ? 'page' : undefined}>
            <t.icon size={18} strokeWidth={1.9} aria-hidden="true" />{t.label}
          </Link>
        ))}
      </nav>

      <div className="aco-kpis">
        <Kpi icon={Building2} value={members == null ? '…' : units ? `${members} / ${units}` : members} label={units ? 'Unità collegate' : 'Condomini iscritti'} href={`${base}/persone`} />
        <Kpi icon={ListChecks} value={admin.loading ? '…' : items.length} label="Attività da gestire" />
        <Kpi icon={Coins} value={month == null ? '…' : euro(month, { maximumFractionDigits: 0, minimumFractionDigits: 0 })} label="Incassato questo mese" href={`${base}/contabilita`} />
        <Kpi icon={AlertTriangle} tone={adm && Number(adm.overdue_total) > 0 ? 'warn' : ''} value={adm ? euro(adm.overdue_total, { maximumFractionDigits: 0, minimumFractionDigits: 0 }) : '…'} label="Quote scadute" href={`${base}/rendicontazione`} />
      </div>

      <div className="aco-two">
        <section className="aco-card">
          <div className="aco-card-head">
            <ClipboardCheck size={22} aria-hidden="true" /><h2>Da gestire</h2>
            {items.length > 0 && <span className="aco-count">{items.length}</span>}
          </div>
          {admin.loading ? <p className="aco-muted">Caricamento…</p> : items.length === 0 ? (
            <p className="aco-muted">Tutto in ordine: niente da validare.</p>
          ) : (
            <ul className="aco-todo">
              {items.slice(0, 6).map((x) => (
                <li key={`${x.type}-${x.id}`}>
                  <i style={{ background: ITEM[x.type]?.dot }} aria-hidden="true" />
                  <span className="aco-todo-txt"><strong>{x.title}</strong><small>{x.sub}</small></span>
                  <button type="button" className="aco-link" disabled={busy === x.id} onClick={() => act(x)}>
                    {busy === x.id ? '…' : ITEM[x.type]?.action}<ArrowRight size={16} aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          )}
          {items.length > 6 && <Link href="/profilo" className="aco-more">Vedi tutte ({items.length})<ArrowRight size={15} aria-hidden="true" /></Link>}
        </section>

        <section className="aco-card">
          <div className="aco-card-head">
            <CalendarDays size={22} aria-hidden="true" /><h2>Prossimi appuntamenti</h2>
            <Link href={`${base}/calendario`} className="aco-link aco-push">Vedi calendario<ArrowRight size={16} aria-hidden="true" /></Link>
          </div>
          {appointments.length === 0 ? <p className="aco-muted">Nessun appuntamento nei prossimi due mesi.</p> : (
            <ul className="aco-appts">
              {appointments.map((a) => {
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
          {waitingSupplier.length > 0 && (
            <Link href={`${base}/interventi`} className="aco-note"><Clock3 size={17} aria-hidden="true" />{waitingSupplier.length} {waitingSupplier.length === 1 ? 'richiesta in attesa del fornitore' : 'richieste in attesa del fornitore'}</Link>
          )}
        </section>
      </div>

      <ConversationsCard threads={threads} base={base} addr={addr} asAdmin />

      <h2 className="aco-h2"><Layers size={22} aria-hidden="true" />Gestisci il condominio</h2>
      <div className="aco-grid">
        <Tile href={`${base}/persone`} icon={Users} title="Persone e unità" sub={members == null ? 'Anagrafiche e accessi' : `${members} condomini iscritti${units ? ` su ${units} unità` : ''}`} />
        <Tile href={`${base}/pratiche`} icon={Wrench} title="Interventi e preventivi"
          sub={[`${openInterventions} ${openInterventions === 1 ? 'intervento aperto' : 'interventi aperti'}`, adm?.quotes_received ? `${adm.quotes_received} ${adm.quotes_received === 1 ? 'preventivo ricevuto' : 'preventivi ricevuti'}` : null].filter(Boolean).join(' · ')} />
        <Tile href={`${base}/rendicontazione`} icon={Coins} title="Contabilità e bilancio"
          sub={adm ? (Number(adm.due_total) > 0 ? `Incassato ${Math.round((Number(adm.paid_total) / Number(adm.due_total)) * 100)}% · ${adm.overdue_people} in arretrato` : 'Quote, pagamenti e situazione economica') : 'Quote, pagamenti e situazione economica'} />
        <Tile href={`${base}/archivio`} icon={FileText} title="Documenti" sub={docs.length ? `${docs.length} ${docs.length === 1 ? 'documento' : 'documenti'} in archivio` : 'Verbali, contratti e certificazioni'} />
        <Tile href={`${base}/bacheca`} icon={Megaphone} title="Bacheca e comunicazioni" sub={openTickets ? `${openTickets} ${openTickets === 1 ? 'segnalazione aperta' : 'segnalazioni aperte'}` : 'Avvisi, segnalazioni e chat'} />
        <Tile href={`${base}/decisioni`} icon={Vote} title="Decisioni e assemblee" sub={[openPolls ? `${openPolls} in votazione` : null, adm?.polls_to_take ? `${adm.polls_to_take} da prendere in carico` : null].filter(Boolean).join(' · ') || 'Proposte, votazioni e pratiche'} />
      </div>

      <div className="aco-foot">
        <RefreshCw size={17} aria-hidden="true" />
        <span>Ultimo aggiornamento: {updatedAt ? `oggi, ${updatedAt.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}` : '…'}</span>
        <Link href="/notifiche" className="aco-link aco-push">Vedi storico<ArrowRight size={16} aria-hidden="true" /></Link>
      </div>
    </div>
  )
}

function timeRange(a, b) { return a ? `${hhmm(a)}${b ? `–${hhmm(b)}` : ''}` : '' }

function Kpi({ icon: I, value, label, href, tone }) {
  const body = (
    <>
      <span className={`aco-kpi-ico${tone ? ` is-${tone}` : ''}`}><I size={22} strokeWidth={1.9} aria-hidden="true" /></span>
      <span><b>{value}</b><small>{label}</small></span>
    </>
  )
  return href ? <Link href={href} className="aco-kpi">{body}</Link> : <div className="aco-kpi">{body}</div>
}

function Tile({ href, icon: I, title, sub }) {
  return (
    <Link href={href} className="aco-tile">
      <span className="aco-tile-ico"><I size={22} strokeWidth={1.9} aria-hidden="true" /></span>
      <span className="aco-tile-txt"><strong>{title}</strong><small>{sub}</small></span>
      <ChevronRight size={20} aria-hidden="true" />
    </Link>
  )
}

export function NewActivity({ base, options }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  useEffect(() => {
    if (!open) return
    const h = (e) => { if (!ref.current?.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [open])
  const opts = options || [
    { href: `${base}/bacheca`, icon: Megaphone, label: 'Avviso in bacheca' },
    { href: `${base}/decisioni`, icon: Vote, label: 'Proposta da votare' },
    { href: `${base}/calendario`, icon: CalendarDays, label: 'Appuntamento' },
    { href: `${base}/pratiche`, icon: Gavel, label: 'Pratica e preventivi' },
    { href: `${base}/interventi`, icon: Wrench, label: 'Intervento' },
    { href: `${base}/contabilita?tab=rate`, icon: Coins, label: 'Quota o spesa' },
    { href: `${base}/archivio`, icon: FolderOpen, label: 'Documento' },
  ]
  return (
    <div className="aco-new" ref={ref}>
      <button type="button" className="aco-btn is-primary" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <Plus size={19} aria-hidden="true" />Nuova attività
      </button>
      {open && (
        <div className="aco-menu" role="menu">
          {opts.map((o) => <Link key={o.label} href={o.href} role="menuitem" onClick={() => setOpen(false)}><o.icon size={18} aria-hidden="true" />{o.label}</Link>)}
        </div>
      )}
    </div>
  )
}
