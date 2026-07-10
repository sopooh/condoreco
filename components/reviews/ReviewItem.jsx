'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { scoreColor, TRUST_BADGE } from '@/lib/score'
import { defaultAvatarFor, avatarById, ROLES } from '@/lib/avatars'
import ReviewPhotos from '@/components/photos/ReviewPhotos'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import { createClient } from '@/lib/supabase/client'
import { useSession } from '@/components/providers/SessionProvider'

// Barre di fiducia (1-3)
function TrustBars({ bars, tone }) {
  const colors = { teal: 'var(--teal)', blue: '#3B82F6', amber: '#F59E0B', slate: '#94A3B8' }
  const color = colors[tone] || 'var(--text-4)'
  return (
    <div style={{ display: 'inline-flex', alignItems: 'flex-end', gap: 2 }} title={`Affidabilità: ${bars}/3`}>
      {[1, 2, 3].map(i => (
        <div key={i} style={{ width: 4, borderRadius: 2, height: 5 + i * 3, background: i <= bars ? color : '#E5E7EB' }} />
      ))}
    </div>
  )
}

// Mini avatar dell'autore
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

function Tag({ label, tone }) {
  const styles = {
    teal:  { background: 'var(--teal-lt)',  color: 'var(--teal-dk)' },
    blue:  { background: '#EFF6FF',         color: '#1E40AF' },
    amber: { background: '#FFFBEB',         color: '#92400E' },
    slate: { background: '#F8FAFC',         color: '#334155', border: '1px solid #E2E8F0' },
  }
  const s = styles[tone] || styles.slate
  return (
    <span style={{ ...s, fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 4, display: 'inline-block' }}>
      {label}
    </span>
  )
}

export default function ReviewItem({ review: r, photos, onEdit }) {
  const session = useSession()
  const router = useRouter()
  const isOwn = !!(session?.user?.id && r.user_id === session.user.id)
  const isPending = r.moderation_status === 'pending'
  const updatedAt = r.updated_at && r.updated_at !== r.created_at ? r.updated_at : null

  const [confirmOpen, setConfirmOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [deleteErr, setDeleteErr] = useState('')

  async function handleDelete() {
    setBusy(true); setDeleteErr('')
    const supabase = createClient()
    const { data, error } = await supabase.from('reviews').delete().eq('id', r.id).eq('user_id', session.user.id).select()
    setBusy(false)
    if (error || !data || data.length === 0) {
      setDeleteErr('Non è stato possibile eliminare la recensione. Riprova più tardi.')
      return
    }
    setConfirmOpen(false)
    router.refresh()
  }

  const badge = TRUST_BADGE[r.resident_type] || { label: 'Non verificato', tone: 'slate', bars: 0 }
  const verified = r.is_verified

  const displayLabel = verified && r.resident_type === 'resident'
    ? 'Residente verificato'
    : badge.label

  // Dati profilo reali (dalla join con profiles)
  const profile = r.profiles || null
  const displayName = profile?.display_name || 'Anonimo'

  // resident_since: per residenti = "Dal 2019", per altri = etichetta rapporto
  const sinceText = r.resident_since || null

  const reviewPhotos = (photos || []).filter((p) => p.review_id === r.id)

  return (
    <div id={`review-${r.id}`} style={{ borderBottom: '1px solid var(--border)', padding: '20px 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>

        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          {/* Avatar autore */}
          <ReviewerAvatar profile={profile} userId={r.user_id} />

          <div>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>{displayName}</div>

            {/* Badge + barre */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap', marginBottom: 4 }}>
              <Tag label={displayLabel} tone={verified ? 'teal' : badge.tone} />
              <TrustBars bars={verified ? 3 : badge.bars} tone={verified ? 'teal' : badge.tone} />
              {verified && <span style={{ fontSize: 11, color: 'var(--teal)', fontWeight: 700 }}>✓ Verificato</span>}
              {isOwn && isPending && (
                <span style={{
                  fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 4, display: 'inline-block',
                  background: '#FEF3E8', color: '#E8651A',
                }}>In verifica</span>
              )}
            </div>

            {/* Periodo / rapporto · data */}
            <div style={{ fontSize: 12, color: 'var(--text-4)', fontWeight: 500 }}>
              {sinceText && <span>{sinceText} · </span>}
              {new Date(r.created_at).toLocaleDateString('it-IT')}
              {updatedAt && <span> · Aggiornata il {new Date(updatedAt).toLocaleDateString('it-IT')}</span>}
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
        <Cat label="Ammin." val={r.score_admin} />
        <Cat label="Manutenzione" val={r.score_maintenance} />
        <Cat label="Spese" val={r.score_costs} />
        <Cat label="Qualità vita" val={r.score_quality} />
        <Cat label="Silenziosità" val={r.score_noise} />
        <Cat label="Sicurezza" val={r.score_safety} />
      </div>

      {/* Thumbnail foto associate a questa recensione */}
      <ReviewPhotos photos={reviewPhotos} />

      {isOwn && (
        <div style={{ display: 'flex', gap: 16, marginTop: 14 }}>
          <button onClick={onEdit} style={{ background: 'none', border: 'none', color: 'var(--teal)', fontWeight: 700, fontSize: 12, cursor: 'pointer', padding: 0 }}>
            Modifica
          </button>
          <button onClick={() => setConfirmOpen(true)} style={{ background: 'none', border: 'none', color: 'var(--text-3)', fontWeight: 700, fontSize: 12, cursor: 'pointer', padding: 0 }}>
            Elimina
          </button>
        </div>
      )}

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => { setConfirmOpen(false); setDeleteErr('') }}
        title="Eliminare la recensione?"
        message="Vuoi eliminare la recensione? L'azione non è reversibile."
        busy={busy}
        error={deleteErr}
        onConfirm={handleDelete}
      />
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
