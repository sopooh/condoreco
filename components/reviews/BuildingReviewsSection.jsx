'use client'

import { useState } from 'react'
import ReviewSummary from './ReviewSummary'
import ReviewList from './ReviewList'
import ResidentPhotos from '@/components/photos/ResidentPhotos'

// Riceve reviews/photos/building già fetchati server-side come props.
// Filtro per punteggio e ricerca testuale avvengono client-side sui dati passati,
// nessun rifetch al mount.
export default function BuildingReviewsSection({ reviews, photos, building, children }) {
  const [filterScore, setFilterScore] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')

  const filteredReviews = reviews.filter((r) => {
    const matchesScore = !filterScore || Math.round(r.score) === filterScore
    const matchesSearch = !searchQuery || (r.body || '').toLowerCase().includes(searchQuery.toLowerCase())
    return matchesScore && matchesSearch
  })

  return (
    <>
      <ReviewSummary reviews={reviews} photos={photos} building={building} onFilter={setFilterScore} onSearch={setSearchQuery} />
      {children}
      <ReviewList reviews={filteredReviews} photos={photos} />

      {/* Foto caricate dai residenti (review_id null) */}
      <ResidentPhotos photos={photos} />
    </>
  )
}
