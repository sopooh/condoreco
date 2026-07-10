'use client'

import { useState, useMemo } from 'react'
import ReviewSummary from './ReviewSummary'
import ReviewList from './ReviewList'
import BuildingReviewForm from './BuildingReviewForm'
import ResidentPhotos from '@/components/photos/ResidentPhotos'
import { useSession } from '@/components/providers/SessionProvider'
import { useMyReview } from '@/hooks/useMyReview'

// Riceve reviews/photos/building già fetchati server-side come props (solo
// pubblicate). Filtro per punteggio e ricerca testuale avvengono client-side
// sui dati passati, nessun rifetch al mount. La recensione dell'utente
// corrente viene invece fetchata client-side qualunque sia lo stato di
// pubblicazione, cosi resta visibile (con badge "In verifica") anche quando
// una modifica la rimette in moderazione.
export default function BuildingReviewsSection({ reviews, photos, building, children }) {
  const session = useSession()
  const [myReview, refetchMyReview] = useMyReview('reviews', 'building_id', building.id)
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
      <ReviewSummary reviews={reviews} photos={photos} building={building} onFilter={setFilterScore} onSearch={setSearchQuery} />
      {children}
      <ReviewList reviews={filteredReviews} photos={photos} onEdit={() => setEditOpen(true)} />

      {/* Foto caricate dai residenti (review_id null) */}
      <ResidentPhotos photos={photos} />

      <BuildingReviewForm
        open={editOpen}
        onClose={() => { setEditOpen(false); refetchMyReview() }}
        building={building}
      />
    </>
  )
}
