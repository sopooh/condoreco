import { scoreLevel } from '@/lib/score'

// Icone riassuntive tipo Booking. SVG inline, niente emoji.
// Si colorano in verde/ambra/rosso/grigio in base al sotto-score.

const ICONS = {
  admin: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  ),
  maintenance: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M14.7 6.3a4 4 0 00-5.4 5.4L3 18v3h3l6.3-6.3a4 4 0 005.4-5.4l-2.7 2.7-2-2 2.7-2.7z" />
    </svg>
  ),
  costs: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
    </svg>
  ),
  noise: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M11 5L6 9H2v6h4l5 4V5zM19 9a3 3 0 010 6" />
    </svg>
  ),
  safety: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 2l8 4v6c0 5-3.5 8-8 10-4.5-2-8-5-8-10V6l8-4z" />
    </svg>
  ),
  quality: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 2l3 7h7l-5.5 4 2 7L12 16l-6.5 4 2-7L2 9h7z" />
    </svg>
  ),
}

const LEVEL_COLOR = {
  high: 'var(--teal)',
  mid: '#D97706',
  low: '#DC2626',
  none: 'var(--text-4)',
}

export default function IconBadge({ type, value, title, showLabel = false }) {
  const color = LEVEL_COLOR[scoreLevel(value)]
  return (
    <div
      title={`${title}: ${value != null ? value.toFixed(1) : 'N/D'}`}
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
        minWidth: 0, maxWidth: 60, flex: showLabel ? '1 1 50px' : '0 0 auto',
      }}
    >
      <div style={{ width: 18, height: 18, color }}>{ICONS[type]}</div>
      {showLabel && (
        <span style={{ fontSize: 10, color: 'var(--text-4)', textAlign: 'center', overflowWrap: 'break-word' }}>{title}</span>
      )}
      <span style={{ fontSize: 11, fontWeight: 700, color }}>
        {value != null ? value.toFixed(1) : '—'}
      </span>
    </div>
  )
}
