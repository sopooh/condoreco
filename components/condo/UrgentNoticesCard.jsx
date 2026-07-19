import Card from '@/components/ui/Card'

// Colori per tipo di avviso: solo token semantici già definiti in
// app/globals.css (usati anche da .tag.red/.tag.blue/.tag.green), nessun
// colore nuovo.
const TYPE_STYLE = {
  urgent: { bg: 'var(--red-bg)', color: 'var(--red-tx)', icon: DropIcon },
  info:   { bg: 'var(--blue-bg)', color: 'var(--blue-tx)', icon: CalendarIcon },
  event:  { bg: 'var(--green-bg)', color: 'var(--green-tx)', icon: PeopleIcon },
}

export default function UrgentNoticesCard({ notices }) {
  const active = notices.filter(n => n.status === 'active').slice(0, 3)

  return (
    <Card hover={false} style={{ padding: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)' }}>Bacheca urgente del mese</div>
        <a href="#" style={{ display: 'inline-flex', alignItems: 'center', gap: 2, fontSize: 13, fontWeight: 700, color: 'var(--teal-dk)' }}>
          Vedi tutte <ChevronRightIcon />
        </a>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {active.map(notice => {
          const style = TYPE_STYLE[notice.type] || TYPE_STYLE.info
          const Icon = style.icon
          return (
            <div key={notice.id} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              background: 'var(--bg)', borderRadius: 10, padding: '10px 12px', minWidth: 0,
            }}>
              <div style={{
                width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                background: style.bg, color: style.color,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Icon />
              </div>
              <div style={{ flex: 1, minWidth: 0, fontSize: 13, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {notice.date} · {notice.title}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                <span style={{
                  fontSize: 12, fontWeight: 700, color: style.color, background: style.bg,
                  padding: '4px 10px', borderRadius: 100, whiteSpace: 'nowrap',
                }}>
                  {notice.time_range}
                </span>
                <span style={{ color: 'var(--text-4)' }}><ChevronRightIcon /></span>
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
