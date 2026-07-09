'use client'

import { useState } from 'react'
import { photoUrl } from '@/lib/photos'
import PhotoLightbox from './PhotoLightbox'

// Foto associate a una recensione — passate come prop dal server (già filtrate per review_id).
export default function ReviewPhotos({ photos }) {
  const [lightboxIndex, setLightboxIndex] = useState(null)

  if (!photos.length) return null

  return (
    <>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
        {photos.map((p, i) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setLightboxIndex(i)}
            style={{
              width: 72, height: 72, borderRadius: 8, overflow: 'hidden',
              border: 'none', padding: 0, cursor: 'pointer', flexShrink: 0,
            }}
          >
            <img
              src={photoUrl(p.storage_path)}
              alt={`Foto ${i + 1}`}
              loading="lazy"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          </button>
        ))}
      </div>

      {lightboxIndex !== null && (
        <PhotoLightbox
          photos={photos}
          startIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}
    </>
  )
}
