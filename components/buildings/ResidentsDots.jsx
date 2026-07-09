'use client'

import { defaultAvatarFor, avatarById, ROLES } from '@/lib/avatars'
import { useSession } from '@/components/providers/SessionProvider'

// Overlapping avatar dots showing who lives in this building.
// Ring colors: teal = condoranker, orange = condoranked.
// Shows up to MAX_VISIBLE dots, then a "+N" counter.
const MAX_VISIBLE = 5
const DOT_SIZE = 34
const OVERLAP = 10

function residentColor(role) {
  return role === 'condoranked' ? ROLES.condoranked.color : ROLES.condoranker.color
}

function ResidentDot({ resident, index, isYou }) {
  const profile = resident.profiles || {}
  const avatarUrl = profile.avatar_url
  const role = profile.role || 'condoranker'

  let imgSrc
  if (avatarUrl && (avatarUrl.startsWith('data:') || avatarUrl.startsWith('http') || avatarUrl.startsWith('/'))) {
    imgSrc = avatarUrl.startsWith('/avatars/') || avatarUrl.startsWith('data:') || avatarUrl.startsWith('http')
      ? avatarUrl
      : null
  }
  if (!imgSrc || avatarUrl?.startsWith('/avatars/')) {
    const animalId = avatarUrl?.replace('/avatars/', '').replace('.png', '')
    const animal = avatarById(animalId) || defaultAvatarFor(resident.user_id || '')
    imgSrc = animal.src
  }

  const ring = isYou ? '#22C55E' : residentColor(role)
  const label = isYou ? 'Tu' : (profile.display_name || 'Residente')

  return (
    <div title={label} style={{
      position: 'absolute',
      left: index * (DOT_SIZE - OVERLAP),
      width: DOT_SIZE, height: DOT_SIZE,
      borderRadius: '50%', border: `2.5px solid ${ring}`,
      overflow: 'hidden', background: 'var(--bg)',
      boxShadow: '0 1px 4px rgba(0,0,0,0.12)',
      zIndex: MAX_VISIBLE - index,
    }}>
      <img src={imgSrc} alt={label} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
    </div>
  )
}

export default function ResidentsDots({ residents = [] }) {
  const session = useSession()
  const currentUserId = session?.user?.id
  const visible = residents.slice(0, MAX_VISIBLE)
  const extra = residents.length - MAX_VISIBLE
  const totalWidth = visible.length * (DOT_SIZE - OVERLAP) + OVERLAP + (extra > 0 ? DOT_SIZE : 0)

  if (!residents.length) return null

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{ position: 'relative', height: DOT_SIZE, width: totalWidth }}>
        {visible.map((r, i) => (
          <ResidentDot key={r.user_id} resident={r} index={i} isYou={r.user_id === currentUserId} />
        ))}
        {extra > 0 && (
          <div style={{
            position: 'absolute',
            left: visible.length * (DOT_SIZE - OVERLAP),
            width: DOT_SIZE, height: DOT_SIZE,
            borderRadius: '50%', border: '2px solid var(--border)',
            background: 'var(--bg)', display: 'flex', alignItems: 'center',
            justifyContent: 'center', fontSize: 11, fontWeight: 700, color: 'var(--text-3)',
            zIndex: 0,
          }}>+{extra}</div>
        )}
      </div>
      <div style={{ fontSize: 12, color: 'var(--text-3)' }}>
        {residents.length === 1 ? '1 residente' : `${residents.length} residenti`}
      </div>
    </div>
  )
}
