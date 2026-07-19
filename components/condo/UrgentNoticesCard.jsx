import Link from 'next/link'
import Card from '@/components/ui/Card'

// Colori per tipo evento: stessi token semantici già usati in globals.css
// (e nello stesso mapping di BoardPage.jsx per il calendario completo),
// nessun colore nuovo. event_type viene da public.events.
const TYPE_STYLE = {
  water:       { bg: 'var(--red-bg)',   color: 'var(--red-tx)',   icon: DropIcon },
  maintenance: { bg: 'var(--amber-bg)', color: 'var(--amber-tx)', icon: WrenchIcon },
  meeting:     { bg: 'var(--green-bg)', color: 'var(--green-tx)', icon: PeopleIcon },
  general:     { bg: 'var(--blue-bg)',  color: 'var(--blue-tx)',  icon: CalendarIcon },
}

function formatEventDate(isoDate) {
  return new Date(isoDate + 'T00:00:00').toLocaleDateString('it-IT', { day: 'numeric', month: 'long' })
}

function formatTimeRange(ev) {
  if (!ev.time_start) return null
  return ev.time_start.slice(0, 5) + (ev.time_end ? `–${ev.time_end.slice(0, 5)}` : '')
}

export default function UrgentNoticesCard({ events, isCondoAdmin, onApprove, viewAllHref }) {
  const upcoming = events.slice(0, 3)

  return (
    <Card hover={false} style={{ padding: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)' }}>Bacheca urgente del mese</div>
        <Link href={viewAllHref} style={{ display: 'inline-flex', alignItems: 'center', gap: 2, fontSize: 13, fontWeight: 700, color: 'var(--teal-dk)' }}>
          Vedi tutte <ChevronRightIcon />
        </Link>
      </div>

      {upcoming.length === 0 && (
        <p style={{ fontSize: 13, color: 'var(--text-4)' }}>Nessun evento in programma.</p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {upcoming.map(ev => {
          const style = TYPE_STYLE[ev.event_type] || TYPE_STYLE.general
          const Icon = style.icon
          const timeRange = formatTimeRange(ev)
          return (
            <div key={ev.id} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              background: 'var(--bg)', borderRadius: 10, padding: '10px 12px', minWidth: 0,
              opacity: ev.approved ? 1 : 0.7,
            }}>
              <div style={{
                width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                background: style.bg, color: style.color,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Icon />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {formatEventDate(ev.event_date)} · {ev.title}
                </div>
                {!ev.approved && (
                  <div style={{ fontSize: 11, color: 'var(--amber-tx)', fontWeight: 600, marginTop: 2 }}>
                    In attesa di approvazione
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                {timeRange && (
                  <span style={{
                    fontSize: 12, fontWeight: 700, color: style.color, background: style.bg,
                    padding: '4px 10px', borderRadius: 100, whiteSpace: 'nowrap',
                  }}>
                    {timeRange}
                  </span>
                )}
                {!ev.approved && isCondoAdmin && (
                  <button
                    onClick={() => onApprove(ev.id)}
                    style={{
                      fontSize: 12, fontWeight: 700, color: 'var(--teal-dk)', background: 'none',
                      border: 'none', cursor: 'pointer', whiteSpace: 'nowrap',
                    }}
                  >
                    Approva
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </Card>
  )
}

function ChevronRightIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M9 6l6 6-6 6" />
    </svg>
  )
}

function DropIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M12 3s6 6.5 6 11a6 6 0 01-12 0c0-4.5 6-11 6-11z" />
    </svg>
  )
}

function CalendarIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </svg>
  )
}

function PeopleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <circle cx="9" cy="8" r="3" />
      <path d="M3 20a6 6 0 0112 0" />
      <circle cx="17" cy="9" r="2.5" />
      <path d="M15.5 20a5 5 0 016 0" />
    </svg>
  )
}

function WrenchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M14.7 6.3a4 4 0 00-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 005.4-5.4l-2.1 2.1-2-2z" />
    </svg>
  )
}
