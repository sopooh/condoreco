import { UserRound, Wrench, Euro, Volume2, ShieldCheck, Users } from 'lucide-react'
import { scoreLevel } from '@/lib/score'

// Icone riassuntive tipo Booking (lucide.dev), colorate in verde/ambra/rosso/grigio
// in base al sotto-score.
const ICONS = {
  admin: UserRound,
  maintenance: Wrench,
  costs: Euro,
  noise: Volume2,
  safety: ShieldCheck,
  quality: Users,
}

const LEVEL_COLOR = {
  high: 'var(--teal)',
  mid: '#D97706',
  low: '#DC2626',
  none: 'var(--text-4)',
}

export default function IconBadge({ type, value, title }) {
  const color = LEVEL_COLOR[scoreLevel(value)]
  const Icon = ICONS[type]
  return (
    <div
      title={`${title}: ${value != null ? value.toFixed(1) : 'N/D'}`}
      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}
    >
      <div style={{ width: 18, height: 18, color, display: 'flex' }}>{Icon && <Icon size={18} strokeWidth={2} aria-hidden="true" />}</div>
      <span style={{ fontSize: 11, fontWeight: 700, color }}>
        {value != null ? value.toFixed(1) : 'N/D'}
      </span>
    </div>
  )
}
