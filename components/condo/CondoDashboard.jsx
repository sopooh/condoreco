'use client'

import { ChevronRight, MapPin, UserRound, Users } from 'lucide-react'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useSession } from '@/components/providers/SessionProvider'
import { getProfile } from '@/lib/profile'
import { usePolls } from '@/hooks/usePolls'
import { useCondoRole } from '@/hooks/useCondoRole'
import { useMyAccount } from '@/hooks/useAccounting'
import { euro, fmtDay, isOverdue } from '@/lib/accounting'
import { useTickets, isTicketOpen } from '@/hooks/useTickets'
import { useInterventions, isActiveIntervention } from '@/hooks/useInterventions'
import { usePublicInterventions } from '@/hooks/usePublicInterventions'
import { useCalendarEvents } from '@/hooks/useCalendarEvents'
import { toLocalISODate } from '@/lib/localDate'
import MyUnitBanner from '@/components/condo/MyUnitBanner'
import { useDocuments } from '@/hooks/useDocuments'
import { ToolboxArt } from '@/components/condo/CondoArt'
import { useAdminOverview } from '@/hooks/useAdminArea'
import { AdminInbox } from '@/components/profile/AdminProfile'
import AdminCondoOverview from '@/components/condo/admin/AdminCondoOverview'

// Home dell'area condominio: saluto + sezioni.
//  - Rendicontazione e I tuoi interventi (area personale, privata)
//  - Bacheca urgente, Decisioni, Chat (area condominiale, condivise)
// Ogni card porta alla propria pagina e mostra una riga di stato.

function greeting(d = new Date()) {
  const h = d.getHours()
  if (h < 13) return 'Buongiorno'
  if (h < 18) return 'Buon pomeriggio'
  return 'Buonasera'
}

export default function CondoDashboard({ building }) {
  const buildingId = building.id
  const base = `/edificio/${buildingId}/condominio`
  const session = useSession()
  const userId = session?.user?.id
  const [name, setName] = useState(null)

  useEffect(() => {
    if (!userId) return
    getProfile(userId).then(({ data, error }) => {
      if (error) console.error('[CondoDashboard] getProfile failed', error)
      setName(data?.display_name || null)
    })
  }, [userId])

  const today = toLocalISODate(new Date())
  const { interventions } = useInterventions(buildingId)
  const { tickets } = useTickets(buildingId)
  const { polls } = usePolls(buildingId)
  const { items: todayInterventions } = usePublicInterventions(buildingId, today, today)

  const activeMine = interventions.filter(isActiveIntervention).length
  const openTickets = tickets.filter(isTicketOpen).length
  const openPolls = polls.filter((p) => p.isOpen)
  const toVote = openPolls.filter((p) => !p.hasVoted).length
  const scheduledToday = todayInterventions.filter((i) => i.status === 'scheduled').length
  const { isCondoAdmin } = useCondoRole(buildingId)
  const myAcc = useMyAccount(buildingId)
  const myOverdue = myAcc.charges.filter((c) => isOverdue(c, today))
  const myOverdueSum = myOverdue.reduce((n, c) => n + Number(c.amount), 0)
  const myPending = myAcc.charges.some((c) => c.status === 'pending')
  const myNext = myAcc.charges.find((c) => c.status === 'open' && c.due_date >= today)
  const accState = myAcc.loading ? 'loading' : myOverdueSum > 0 ? 'late' : (myAcc.charges.length || myAcc.budget) ? 'ok' : 'none'

  // appuntamenti del calendario da oggi in poi (griglia del mese corrente)
  const now = new Date()
  const { events: monthEvents } = useCalendarEvents(buildingId, now.getFullYear(), now.getMonth())
  // interventi programmati: fanno parte del calendario come le manutenzioni
  const monthEnd = toLocalISODate(new Date(now.getFullYear(), now.getMonth() + 1, 0))
  const { items: monthInterventions } = usePublicInterventions(buildingId, today, monthEnd)
  const upcomingEvents = [
    ...monthEvents.filter((e) => e.approved && e.event_date >= today),
    ...monthInterventions.filter((i) => i.status === 'scheduled').map((i) => ({ event_date: i.scheduled_date })),
  ]
  const eventsToday = upcomingEvents.filter((e) => e.event_date === today).length

  const { docs } = useDocuments(buildingId)
  const docCount = docs.length
  const [weekAgo] = useState(() => Date.now() - 7 * 86400000)
  const newDocs = docs.filter((d) => new Date(d.created_at).getTime() > weekAgo).length

  // vista amministratore: cose da validare e stato dei pagamenti di questo condominio
  const admin = useAdminOverview()
  const adm = isCondoAdmin ? admin.buildings.find((b) => b.id === buildingId) : null
  const admInbox = { ...admin, inbox: admin.inbox.filter((i) => i.buildingId === buildingId) }
  const admDue = adm ? Number(adm.due_total) : 0
  const admPct = admDue > 0 ? Math.round((Number(adm.paid_total) / admDue) * 100) : null
  const admLate = adm ? Number(adm.overdue_total) : 0
  const admAccState = !adm ? 'loading' : admLate > 0 ? 'late' : admDue > 0 ? 'ok' : 'none'

  const address = `${building.address}${building.street_number ? `, ${building.street_number}` : ''}`

  // l'amministratore vede la pagina di riepilogo del condominio
  if (isCondoAdmin) return <AdminCondoOverview building={building} />

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100%' }}>
      {/* ---- hero ---- */}
      <div style={{
        position: 'relative', overflow: 'hidden', color: '#fff',
        background: 'linear-gradient(160deg, #0D676F 0%, #0A5258 70%, #08464B 100%)',
        padding: '28px 20px 64px', borderRadius: '0 0 32px 32px',
      }}>
        <div style={{ maxWidth: 720, margin: '0 auto', position: 'relative', zIndex: 1 }}>
          <div style={{ fontSize: 30, lineHeight: 1.15, fontWeight: 400, letterSpacing: '-0.5px', maxWidth: '62%' }}>
            {greeting()}{name ? <>, <strong style={{ fontWeight: 800 }}>{name}</strong></> : ''}
          </div>
          <div style={{ fontSize: 16, opacity: 0.9, marginTop: 6 }}>{isCondoAdmin ? 'Area amministratore' : 'La tua area condominiale'}</div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 12, padding: '5px 12px', borderRadius: 999, background: 'rgba(255,255,255,0.14)', fontSize: 13, fontWeight: 600 }}>
            <PinIcon /> {address}
          </div>
        </div>
        <div style={{ position: 'absolute', right: -6, bottom: 0, width: 170, height: 150, opacity: 0.95 }}>
          <HeroBuilding />
        </div>
      </div>

      {/* ---- sezioni ---- */}
      <div style={{ maxWidth: 720, margin: '-36px auto 0', padding: '0 16px 48px', position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'column', gap: 14 }}>
        {!isCondoAdmin && <MyUnitBanner building={building} />}
        {isCondoAdmin ? (
          <>
            <section className="cadm-hub-inbox" aria-label="Da validare">
              <div className="cadm-hub-head"><strong>Da validare</strong>{admInbox.inbox.length > 0 && <span>{admInbox.inbox.length}</span>}</div>
              {admin.loading ? <div className="cadm-card" style={{ padding: 16, color: 'var(--text-3)', fontSize: 14 }}>Caricamento…</div> : <AdminInbox admin={admInbox} hideAddress />}
            </section>
            <HubCard
              href={`${base}/rendicontazione`}
              personal
              tag="Amministratore"
              title="Rendicontazione"
              text="Chi ha pagato e chi no, arretrati, spese ordinarie e straordinarie di ogni condomino."
              status={admAccState === 'loading' ? 'Caricamento…'
                : admAccState === 'late' ? `Arretrati ${euro(admLate)} · ${adm.overdue_people} ${adm.overdue_people === 1 ? 'condomino' : 'condomini'}`
                : admAccState === 'ok' ? `Tutti in regola · incassato ${admPct}%`
                : 'Ancora nessuna quota emessa'}
              tone={admAccState === 'late' ? 'danger' : admAccState === 'ok' ? 'ok' : undefined}
              art={<AccountArt state={admAccState} amount={admLate} />}
            />
            <HubCard
              href={`${base}/pratiche`}
              personal
              tag="Amministratore"
              title="Pratiche e preventivi"
              text="Prendi in carico le decisioni approvate, chiedi i preventivi ai fornitori e confrontali."
              status={adm ? ([
                adm.polls_to_take ? `${adm.polls_to_take} da prendere in carico` : null,
                adm.quotes_received ? `${adm.quotes_received} ${adm.quotes_received === 1 ? 'preventivo' : 'preventivi'} da confrontare` : null,
                adm.practices_open ? `${adm.practices_open} in corso` : null,
              ].filter(Boolean).join(' · ') || 'Nessuna pratica aperta') : 'Caricamento…'}
              highlight={!!adm && adm.polls_to_take > 0}
              art={<BallotArt />}
            />
            <HubCard
              href={`${base}/bilancio`}
              personal
              tag="Amministratore"
              title="Bilancio"
              text="Spese sostenute, confronto con il preventivo e con gli incassi, PDF del bilancio provvisorio."
              status={admPct != null ? `Incassato ${admPct}% delle quote` : 'Registra le spese del condominio'}
              art={<FolderArt />}
            />
          </>
        ) : (
          <>
        <HubCard
          href={`${base}/rendicontazione`}
          personal
          tag="Area personale"
          title="Rendicontazione"
          text="Le tue quote condominiali, le spese del condominio e i pagamenti fatti."
          status={accState === 'loading' ? 'Caricamento…'
            : accState === 'late' ? `Arretrati da pagare: ${euro(myOverdueSum)}`
            : accState === 'ok' ? (myPending ? 'Saldato · bonifico in verifica' : myNext ? `Saldato · prossima rata il ${fmtDay(myNext.due_date)}` : 'Saldato, sei in regola')
            : 'Ancora nessuna quota caricata'}
          tone={accState === 'late' ? 'danger' : accState === 'ok' ? 'ok' : undefined}
          art={<AccountArt state={accState} amount={myOverdueSum} />}
        />
        <HubCard
          href={`${base}/interventi`}
          personal
          tag="Area personale"
          title="I tuoi interventi"
          text="Segnala un problema, contatta direttamente il manutentore e segui i tuoi interventi."
          status={activeMine ? `${activeMine} in corso` : 'Nessun intervento in corso'}
          art={<ToolboxArt />}
        />
          </>
        )}
        <HubCard
          href={`${base}/bacheca`}
          tag="Area condominiale"
          title="Bacheca urgente"
          text="Avvisi, interventi programmati e segnalazioni importanti."
          status={[
            scheduledToday ? `${scheduledToday} ${scheduledToday === 1 ? 'intervento' : 'interventi'} oggi` : null,
            openTickets ? `${openTickets} ${openTickets === 1 ? 'ticket aperto' : 'ticket aperti'}` : null,
          ].filter(Boolean).join(' · ') || 'Nessun avviso aperto'}
          highlight={scheduledToday > 0}
          art={<MegaphoneArt />}
        />
        {isCondoAdmin && (
          <HubCard
            href={`${base}/contabilita`}
            tag="Amministratore"
            title="Contabilità"
            text="Preventivo, rate dei condomini, contabili e bonifici da confermare, estratto conto."
            status={adm && (adm.receipts_pending + adm.transfers_pending) > 0 ? `${adm.receipts_pending + adm.transfers_pending} pagamenti da confermare` : 'Gestisci quote e pagamenti'}
            highlight={!!adm && (adm.receipts_pending + adm.transfers_pending) > 0}
            art={<CoinsArt />}
          />
        )}
        <HubCard
          href={`${base}/calendario`}
          tag="Area condominiale"
          title="Calendario del condominio"
          text="Assemblee, manutenzioni e appuntamenti del condominio."
          status={adm?.events_pending
            ? `${adm.events_pending} ${adm.events_pending === 1 ? 'appuntamento' : 'appuntamenti'} da approvare`
            : eventsToday
            ? `${eventsToday} ${eventsToday === 1 ? 'appuntamento' : 'appuntamenti'} oggi`
            : upcomingEvents.length
              ? `${upcomingEvents.length} in arrivo questo mese`
              : 'Nessun appuntamento in arrivo'}
          highlight={eventsToday > 0 || !!adm?.events_pending}
          art={<CalendarArt />}
        />
        {isCondoAdmin && (
          <HubCard
            href={`${base}/interventi`}
            tag="Amministratore"
            title="Interventi"
            text="I lavori affidati ai fornitori: date proposte, chat con il fornitore, preventivi e fatture."
            status={activeMine ? `${activeMine} in corso` : 'Nessun intervento in corso'}
            art={<ToolboxArt />}
          />
        )}
        <HubCard
          href={`${base}/archivio`}
          tag="Area condominiale"
          title="Documenti del condominio"
          text="Verbali, avvisi, documenti catastali, bilanci, regolamento e certificazioni."
          status={docCount
            ? `${docCount} ${docCount === 1 ? 'documento' : 'documenti'}${newDocs ? ` · ${newDocs} ${newDocs === 1 ? 'nuovo' : 'nuovi'} questa settimana` : ''}`
            : 'Archivio vuoto'}
          art={<FolderArt />}
        />
        <HubCard
          href={`${base}/decisioni`}
          tag="Area condominiale"
          title="Decisioni del condominio"
          text="Partecipa alle votazioni e consulta le decisioni in corso."
          status={openPolls.length ? `${openPolls.length} in corso${toVote ? ` · ${toVote} da votare` : ''}` : 'Nessuna votazione in corso'}
          highlight={toVote > 0}
          art={<BallotArt />}
        />
        <HubCard
          href={`${base}/chat`}
          tag="Area condominiale"
          title="Chat del condominio"
          text="Confrontati con gli altri residenti in modo semplice e sicuro."
          art={<ChatArt />}
        />
      </div>
    </div>
  )
}

function HubCard({ href, personal = false, tag, title, text, status, highlight = false, tone, art }) {
  return (
    <Link href={href} style={{
      position: 'relative', display: 'flex', alignItems: 'center', gap: 12, color: 'inherit',
      padding: personal ? '18px 14px 18px 22px' : '18px 14px 18px 18px', borderRadius: 22,
      background: personal ? 'linear-gradient(135deg, #EAF4F4 0%, #FFFFFF 70%)' : 'var(--white)',
      border: `1px solid ${personal ? 'rgba(13,103,111,0.25)' : 'var(--border)'}`,
      boxShadow: '0 6px 20px rgba(13,103,111,0.07)',
    }}>
      {personal && <span style={{ position: 'absolute', left: 9, top: 22, bottom: 22, width: 4, borderRadius: 4, background: 'var(--teal)' }} />}
      <div style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 999, background: personal ? 'var(--teal-lt)' : '#EEF3F3', color: 'var(--teal-dk)', fontSize: 12.5, fontWeight: 600 }}>
          {personal ? <PersonIcon /> : <GroupIcon />} {tag}
        </span>
        <div style={{ fontSize: 21, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.4px', lineHeight: 1.2, margin: '10px 0 6px' }}>{title}</div>
        <div style={{ fontSize: 14.5, color: 'var(--text-3)', lineHeight: 1.45 }}>{text}</div>
        {status && (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 10, fontSize: 13, fontWeight: 700, color: tone === 'danger' ? '#C4320A' : tone === 'ok' ? '#067647' : highlight ? '#C2410C' : 'var(--teal)' }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', flexShrink: 0, background: tone === 'danger' ? '#D92D20' : tone === 'ok' ? '#12B76A' : highlight ? '#E8651A' : 'var(--teal)' }} />
            {status}
          </div>
        )}
      </div>
      <div style={{ width: 84, height: 84, flexShrink: 0 }}>{art}</div>
      <span aria-hidden="true" style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--teal)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <ChevronIcon />
      </span>
    </Link>
  )
}

/* ---- illustrazioni (palette Condoreco: teal + accento arancio) ---- */
const T = '#0D676F', TL = '#CFE6E6', TM = '#7FB8BC', O = '#E8651A'

function HeroBuilding() {
  return (
    <svg viewBox="0 0 170 150" width="100%" height="100%" aria-hidden="true">
      <ellipse cx="95" cy="150" rx="95" ry="22" fill="rgba(255,255,255,0.12)" />
      <circle cx="38" cy="108" r="20" fill="rgba(207,230,230,0.55)" />
      <rect x="36" y="112" width="4" height="30" rx="2" fill="rgba(207,230,230,0.7)" />
      <rect x="70" y="30" width="62" height="120" rx="6" fill="#E9F4F4" />
      <rect x="132" y="48" width="26" height="102" rx="4" fill="#BFDCDD" />
      {[0, 1, 2, 3].map((r) => [0, 1, 2].map((c) => (
        <rect key={`${r}-${c}`} x={80 + c * 17} y={42 + r * 24} width="10" height="14" rx="2" fill={r === 1 && c === 2 ? O : TM} />
      )))}
      <rect x="93" y="130" width="16" height="20" rx="2" fill={T} opacity="0.7" />
    </svg>
  )
}
function MegaphoneArt() {
  return (
    <svg viewBox="0 0 84 84" width="100%" height="100%" aria-hidden="true">
      <ellipse cx="40" cy="76" rx="26" ry="4" fill="rgba(13,103,111,0.12)" />
      <path d="M14 38l34-18v40L14 46z" fill={TL} />
      <rect x="8" y="36" width="12" height="12" rx="3" fill={TM} />
      <ellipse cx="48" cy="40" rx="6" ry="20" fill={T} />
      <path d="M20 47l6 18a4 4 0 007-3l-4-14z" fill={T} />
      <path d="M62 26l7-6M65 40h9M62 54l7 6" stroke={O} strokeWidth="3.5" strokeLinecap="round" />
    </svg>
  )
}
function BallotArt() {
  return (
    <svg viewBox="0 0 84 84" width="100%" height="100%" aria-hidden="true">
      <ellipse cx="42" cy="76" rx="30" ry="4" fill="rgba(13,103,111,0.12)" />
      <path d="M28 10h28l4 30H24z" fill="#FFFFFF" stroke={TM} strokeWidth="2" />
      <path d="M33 26l6 6 12-12" stroke={O} strokeWidth="4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 38h60l-4 34H16z" fill={TL} />
      <rect x="8" y="34" width="68" height="10" rx="4" fill={T} />
      <rect x="28" y="37" width="28" height="4" rx="2" fill="#0A4F55" />
    </svg>
  )
}
function CalendarArt() {
  return (
    <svg viewBox="0 0 84 84" width="100%" height="100%" aria-hidden="true">
      <ellipse cx="42" cy="77" rx="30" ry="4" fill="rgba(13,103,111,0.12)" />
      <rect x="10" y="16" width="64" height="56" rx="10" fill={TL} />
      <path d="M10 26a10 10 0 0110-10h44a10 10 0 0110 10v8H10z" fill={T} />
      <rect x="24" y="8" width="6" height="16" rx="3" fill="#0A4F55" />
      <rect x="54" y="8" width="6" height="16" rx="3" fill="#0A4F55" />
      {[0, 1, 2].map((r) => [0, 1, 2, 3].map((c) => (
        <rect key={`${r}-${c}`} x={18 + c * 13} y={41 + r * 10} width="9" height="6" rx="2" fill={r === 1 && c === 2 ? O : '#FFFFFF'} />
      )))}
    </svg>
  )
}
// Monete con il bollino di stato: spunta verde se saldato, importo rosso se ci sono arretrati
function AccountArt({ state, amount }) {
  const late = state === 'late'
  const label = late ? `-${Math.round(amount).toLocaleString('it-IT')}€` : null
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <CoinsArt />
      {state === 'ok' && (
        <span aria-label="Saldato" style={{ position: 'absolute', top: 2, right: 0, width: 30, height: 30, borderRadius: '50%', background: '#12B76A', color: '#fff', border: '3px solid #fff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 6px rgba(0,0,0,.15)' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5" /></svg>
        </span>
      )}
      {late && (
        <span aria-label={`Arretrati ${label}`} style={{ position: 'absolute', top: 0, right: -6, maxWidth: 92, padding: '3px 8px', borderRadius: 999, background: '#D92D20', color: '#fff', border: '2.5px solid #fff', fontSize: label.length > 7 ? 11 : 12.5, fontWeight: 800, whiteSpace: 'nowrap', boxShadow: '0 2px 6px rgba(217,45,32,.35)' }}>
          {label}
        </span>
      )}
    </div>
  )
}
function CoinsArt() {
  const coin = (y, top, side) => (
    <g key={y}>
      <ellipse cx="30" cy={y + 7} rx="20" ry="6" fill={side} />
      <rect x="10" y={y} width="40" height="7" fill={side} />
      <ellipse cx="30" cy={y} rx="20" ry="6" fill={top} />
    </g>
  )
  return (
    <svg viewBox="0 0 84 84" width="100%" height="100%" aria-hidden="true">
      <ellipse cx="42" cy="76" rx="32" ry="4" fill="rgba(13,103,111,0.12)" />
      {coin(62, TL, T)}
      {coin(53, TL, T)}
      {coin(44, '#E3F0F0', TM)}
      <circle cx="58" cy="52" r="19" fill="#C2410C" />
      <circle cx="56" cy="50" r="19" fill={O} />
      <circle cx="56" cy="50" r="14" fill="#FFB27D" />
      <text x="56" y="56.5" textAnchor="middle" fontSize="17" fontWeight="800" fill="#fff" fontFamily="system-ui, sans-serif">€</text>
    </svg>
  )
}
function FolderArt() {
  return (
    <svg viewBox="0 0 84 84" width="100%" height="100%" aria-hidden="true">
      <ellipse cx="42" cy="77" rx="30" ry="4" fill="rgba(13,103,111,0.12)" />
      <path d="M8 22a8 8 0 018-8h16l7 7h29a8 8 0 018 8v6H8z" fill={T} />
      <rect x="18" y="18" width="40" height="42" rx="4" fill="#FFFFFF" />
      <rect x="24" y="26" width="26" height="4" rx="2" fill={TL} />
      <rect x="24" y="34" width="20" height="4" rx="2" fill={O} />
      <path d="M8 34a6 6 0 016-6h56a6 6 0 016 6v28a8 8 0 01-8 8H16a8 8 0 01-8-8z" fill={TL} />
    </svg>
  )
}
function ChatArt() {
  return (
    <svg viewBox="0 0 84 84" width="100%" height="100%" aria-hidden="true">
      <path d="M30 34h36a8 8 0 018 8v18a8 8 0 01-8 8h-4l2 9-11-9H30a8 8 0 01-8-8V42a8 8 0 018-8z" fill={TM} />
      <path d="M14 10h40a8 8 0 018 8v18a8 8 0 01-8 8H26l-12 9 3-9h-3a8 8 0 01-8-8V18a8 8 0 018-8z" fill={T} />
      <circle cx="22" cy="27" r="3.5" fill="#fff" />
      <circle cx="34" cy="27" r="3.5" fill="#fff" />
      <circle cx="46" cy="27" r="3.5" fill={O} />
    </svg>
  )
}

/* ---- icone ---- */
const ico = { fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', viewBox: '0 0 24 24', 'aria-hidden': true }
function ChevronIcon({ size = 18 } = {}) { return <ChevronRight size={size} strokeWidth={2.4} aria-hidden="true" /> }
function PersonIcon({ size = 15 } = {}) { return <UserRound size={size} strokeWidth={2} aria-hidden="true" /> }
function GroupIcon({ size = 16 } = {}) { return <Users size={size} strokeWidth={2} aria-hidden="true" /> }
function PinIcon({ size = 14 } = {}) { return <MapPin size={size} strokeWidth={2} aria-hidden="true" /> }
