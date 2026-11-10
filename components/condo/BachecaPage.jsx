'use client'

import Link from 'next/link'
import { useCondoRole } from '@/hooks/useCondoRole'
import { useTickets } from '@/hooks/useTickets'
import { usePublicInterventions } from '@/hooks/usePublicInterventions'
import { reportCategoryLabel } from '@/lib/reviewOptions'
import { toLocalISODate } from '@/lib/localDate'
import TicketBoardCard from '@/components/condo/TicketBoardCard'

// Bacheca urgente: interventi programmati dai residenti (visibili a tutti,
// solo i dati pubblici) dal giorno corrente in avanti + ticket aperti/chiusi.
const DAYS_AHEAD = 30

function dayLabel(iso, todayIso, tomorrowIso) {
  if (iso === todayIso) return 'Oggi'
  if (iso === tomorrowIso) return 'Domani'
  const s = new Date(iso + 'T00:00:00').toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export default function BachecaPage({ building }) {
  const buildingId = building.id
  const base = `/edificio/${buildingId}/condominio`
  const { isCondoAdmin } = useCondoRole(buildingId)
  const { tickets, loading: ticketsLoading, userId, openTicket, setTicketOpen } = useTickets(buildingId)

  const now = new Date()
  const today = toLocalISODate(now)
  const tomorrow = toLocalISODate(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1))
  const until = toLocalISODate(new Date(now.getFullYear(), now.getMonth(), now.getDate() + DAYS_AHEAD))
  const { items, loading: intLoading } = usePublicInterventions(buildingId, today, until)
  const upcoming = items.filter((i) => i.status === 'scheduled')

  const groups = upcoming.reduce((acc, i) => { (acc[i.scheduled_date] ??= []).push(i); return acc }, {})

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '20px 16px 64px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Link href={base} style={{ fontSize: 14, fontWeight: 600, color: 'var(--teal)', alignSelf: 'flex-start' }}>‹ Torna al condominio</Link>
      <div>
        <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.5px', margin: 0 }}>Bacheca urgente</h1>
        <p style={{ fontSize: 14, color: 'var(--text-3)', margin: '4px 0 0' }}>{building.address}{building.street_number ? `, ${building.street_number}` : ''}</p>
      </div>

      {/* interventi programmati */}
      <section style={{ background: 'var(--white)', border: '1px solid var(--border)', borderRadius: 18, padding: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 12 }}>
          <div style={{ fontSize: 18, fontWeight: 800 }}>Interventi programmati</div>
          <Link href={`${base}/interventi`} style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--teal)' }}>I tuoi interventi ›</Link>
        </div>
        {intLoading ? (
          <p style={{ fontSize: 14, color: 'var(--text-3)', margin: 0 }}>Caricamento...</p>
        ) : upcoming.length === 0 ? (
          <p style={{ fontSize: 14, color: 'var(--text-3)', margin: 0 }}>Nessun intervento programmato nei prossimi {DAYS_AHEAD} giorni.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {Object.entries(groups).map(([day, list]) => {
              const isToday = day === today
              return (
                <div key={day}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 800, letterSpacing: 0.3, color: isToday ? '#C2410C' : 'var(--text-3)', marginBottom: 8 }}>
                    {isToday && <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#E8651A' }} />}
                    {dayLabel(day, today, tomorrow)}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {list.map((i) => (
                      <div key={i.id} style={{
                        display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 14,
                        border: `1px solid ${isToday ? 'rgba(232,101,26,0.35)' : 'var(--border)'}`,
                        background: isToday ? '#FFF6EF' : 'var(--white)',
                      }}>
                        <span style={{ width: 40, height: 40, borderRadius: 12, background: isToday ? '#FDE3D0' : '#EEF3F3', color: isToday ? '#C2410C' : 'var(--teal)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <WrenchIcon />
                        </span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 15, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{i.title}</div>
                          <div style={{ fontSize: 12.5, color: 'var(--text-3)', marginTop: 2 }}>
                            {reportCategoryLabel(i.category)}{i.location ? ` · ${i.location}` : ''}
                          </div>
                        </div>
                        <span style={{ fontSize: 13, fontWeight: 700, color: isToday ? '#C2410C' : 'var(--teal-dk)', whiteSpace: 'nowrap' }}>
                          {i.time_start ? i.time_start.slice(0, 5) + (i.time_end ? `-${i.time_end.slice(0, 5)}` : '') : 'In giornata'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {ticketsLoading ? (
        <p style={{ fontSize: 14, color: 'var(--text-3)' }}>Caricamento ticket...</p>
      ) : (
        <TicketBoardCard
          tickets={tickets}
          userId={userId}
          isCondoAdmin={isCondoAdmin}
          onOpenTicket={openTicket}
          onSetOpen={setTicketOpen}
          calendarHref={`${base}/calendario`}
        />
      )}
    </div>
  )
}

function WrenchIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M14.7 6.3a4 4 0 00-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 005.4-5.4l-2.1 2.1-2-2z" />
    </svg>
  )
}
