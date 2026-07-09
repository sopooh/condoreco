import { scoreColor } from '@/lib/score'
import { defaultAvatarFor, avatarById, ROLES } from '@/lib/avatars'
import { ADMIN_RESIDENT_TYPES } from '@/lib/reviewOptions'

function ReviewerAvatar({ profile, userId, size = 36 }) {
  const avatarUrl = profile?.avatar_url
  const role = profile?.role || 'condoranker'
  const roleConf = ROLES[role] || ROLES.condoranker
  const ring = roleConf.color

  let imgSrc
  if (avatarUrl && (avatarUrl.startsWith('data:') || (avatarUrl.startsWith('http') && !avatarUrl.includes('/avatars/')))) {
    imgSrc = avatarUrl
  } else {
    const animalId = avatarUrl?.replace('/avatars/', '').replace('.png', '')
    const animal = avatarById(animalId) || defaultAvatarFor(userId || '')
    imgSrc = animal.src
  }

  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      border: `2px solid ${ring}`, overflow: 'hidden', background: 'var(--bg)',
    }}>
      <img src={imgSrc} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
    </div>
  )
}

function Cat({ label, val }) {
  if (val == null) return null
  return (
    <span style={{ fontSize: 11, color: 'var(--text-4)', fontWeight: 500 }}>
      {label} <strong style={{ color: 'var(--text-2)' }}>{val.toFixed(1)}</strong>
    </span>
  )
}

export default function AdminReviewItem({ review: r }) {
  const profile = r.profiles || null
  const displayName = profile?.display_name || 'Anonimo'
  const residentLabel = ADMIN_RESIDENT_TYPES.find((t) => t.value === r.resident_type)?.label || r.resident_type
  const isPending = r.moderation_status === 'pending'

  return (
    <div id={`admin-review-${r.id}`} style={{ borderBottom: '1px solid var(--border)', padding: '20px 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <ReviewerAvatar profile={profile} userId={r.user_id} />

          <div>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>{displayName}</div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap', marginBottom: 4 }}>
              <span style={{
                fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 4, display: 'inline-block',
                background: '#F8FAFC', color: '#334155', border: '1px solid #E2E8F0',
              }}>{residentLabel}</span>
              {r.is_verified && <span style={{ fontSize: 11, color: 'var(--teal)', fontWeight: 700 }}>✓ Verificato</span>}
              {isPending && (
                <span style={{
                  fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 4, display: 'inline-block',
                  background: 'var(--amber-bg)', color: 'var(--amber-tx)',
                }}>Da verificare</span>
              )}
            </div>

            <div style={{ fontSize: 12, color: 'var(--text-4)', fontWeight: 500 }}>
              {new Date(r.created_at).toLocaleDateString('it-IT')}
            </div>
          </div>
        </div>

        <div style={{ fontSize: 22, fontWeight: 800, color: scoreColor(r.score) }}>
          {r.score?.toFixed(1)}
        </div>
      </div>

      {r.body && (
        <p style={{ fontSize: 14, color: 'var(--text-2)', lineHeight: 1.75, marginBottom: 12 }}>
          {r.body}
        </p>
      )}

      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
        <Cat label="Reperibilità" val={r.score_availability} />
        <Cat label="Trasparenza" val={r.score_transparency} />
        <Cat label="Velocità" val={r.score_speed} />
        <Cat label="Assemblee" val={r.score_assemblies} />
        <Cat label="Qualità/prezzo" val={r.score_value} />
      </div>
    </div>
  )
}
