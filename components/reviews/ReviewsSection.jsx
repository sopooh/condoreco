'use client'

import { useState, useMemo } from 'react'
import ReviewSummary from './ReviewSummary'
import ReviewList from './ReviewList'
import ReviewForm from './ReviewForm'
import ResidentPhotos from '@/components/photos/ResidentPhotos'
import { useSession } from '@/components/providers/SessionProvider'
import { useMyReview } from '@/hooks/useMyReview'

// Sezione recensioni condivisa da pagina edificio e pagina amministratore.
// Riceve reviews/photos già fetchati server-side come props (solo
// pubblicate). Filtro per punteggio e ricerca testuale avvengono client-side
// sui dati passati, nessun rifetch al mount. La recensione dell'utente
// corrente viene invece fetchata client-side qualunque sia lo stato di
// pubblicazione, cosi resta visibile (con badge "In verifica") anche quando
// una modifica la rimette in moderazione.
export default function ReviewsSection({
  reviews, photos = [], children,
  table, column, entityId,
  subtitle, residentTypes, categories, extras,
  subScores, emptyTitle, emptyText,
}) {
  const session = useSession()
  const [myReview, refetchMyReview] = useMyReview(table, column, entityId)
  const [filterScore, setFilterScore] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [editOpen, setEditOpen] = useState(false)

  const mergedReviews = useMemo(() => {
    const currentUserId = session?.user?.id
    const others = currentUserId ? reviews.filter((r) => r.user_id !== currentUserId) : reviews
    return myReview ? [myReview, ...others] : others
  }, [reviews, myReview, session?.user?.id])

  const filteredReviews = mergedReviews.filter((r) => {
    const matchesScore = !filterScore || Math.round(r.score) === filterScore
    const matchesSearch = !searchQuery || (r.body || '').toLowerCase().includes(searchQuery.toLowerCase())
    return matchesScore && matchesSearch
  })

  return (
    <>
      <ReviewSummary reviews={reviews} photos={photos} subScores={subScores} onFilter={setFilterScore} onSearch={setSearchQuery} />
      {children}
      <ReviewList
        reviews={filteredReviews}
        categories={categories}
        table={table}
        photos={photos}
        onEdit={() => setEditOpen(true)}
        emptyTitle={emptyTitle}
        emptyText={emptyText}
      />

      {/* Foto caricate dai residenti (review_id null, solo edifici) */}
      <ResidentPhotos photos={photos} />

      <ReviewForm
        open={editOpen}
        onClose={() => { setEditOpen(false); refetchMyReview() }}
        table={table}
        column={column}
        entityId={entityId}
        subtitle={subtitle}
        residentTypes={residentTypes}
        categories={categories}
        extras={extras}
      />
    </>
  )
}
