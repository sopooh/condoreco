'use client'

import { useState } from 'react'
import { photoUrl } from '@/lib/photos'
import PhotoLightbox from './PhotoLightbox'

export default function ResidentPhotos({ photos }) {
  const [lightboxIndex, setLightboxIndex] = useState(null)

  // Foto dei residenti = caricate via "Vivo qui" (review_id null)
  const residentPhotos = photos.filter((p) => !p.review_id)

  if (!residentPhotos.length) return null

  return (
    <div style={{ marginTop: 40 }}>
      <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>Foto dei residenti</div>
      <p style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: 14 }}>
        Foto caricate dai residenti di questo condominio
      </p>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))',
        gap: 8,
      }}>
        {residentPhotos.map((p, i) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setLightboxIndex(i)}
            style={{
              border: 'none', padding: 0, cursor: 'pointer',
              borderRadius: 8, overflow: 'hidden',
              aspectRatio: '1', background: 'var(--bg)',
            }}
          >
            <img
              src={photoUrl(p.storage_path)}
              alt={`Foto residente ${i + 1}`}
              loading="lazy"
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
          </button>
        ))}
      </div>

      {lightboxIndex !== null && (
        <PhotoLightbox
          photos={residentPhotos}
          startIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}
    </div>
  )
}
