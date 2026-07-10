'use client'

import { useState, useMemo } from 'react'
import AdminReviewItem from './AdminReviewItem'
import AdminReviewForm from './AdminReviewForm'
import { useSession } from '@/components/providers/SessionProvider'
import { useMyReview } from '@/hooks/useMyReview'

// reviews arriva già fetchato server-side (solo pubblicate). La recensione
// dell'utente corrente viene invece fetchata client-side qualunque sia lo
// stato di pubblicazione, cosi resta visibile (con badge "Da verificare")
// anche quando una modifica la rimette in moderazione.
export default function AdminReviewList({ reviews, admin }) {
  const session = useSession()
  const [myReview, refetchMyReview] = useMyReview('admin_reviews', 'administrator_id', admin.id)
  const [editOpen, setEditOpen] = useState(false)

  const mergedReviews = useMemo(() => {
    const currentUserId = session?.user?.id
    const others = currentUserId ? reviews.filter((r) => r.user_id !== currentUserId) : reviews
    return myReview ? [myReview, ...others] : others
  }, [reviews, myReview, session?.user?.id])

  return (
    <div>
      {mergedReviews.length === 0 ? (
        <div className="empty" style={{ padding: '40px 0' }}>
          <div className="empty-title">Ancora nessuna recensione</div>
          <p>Sii il primo a raccontare la tua esperienza con questo amministratore.</p>
        </div>
      ) : (
        <>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-4)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 14 }}>
            {mergedReviews.length} recensioni
          </div>
          {mergedReviews.map((r) => (
            <AdminReviewItem key={r.id} review={r} onEdit={() => setEditOpen(true)} />
          ))}
        </>
      )}

      <AdminReviewForm
        open={editOpen}
        onClose={() => { setEditOpen(false); refetchMyReview() }}
        admin={admin}
      />
    </div>
  )
}
