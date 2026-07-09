'use client'

import { useState, useRef } from 'react'
import { photoUrl } from '@/lib/photos'
import PhotoLightbox from './PhotoLightbox'

export default function BuildingGallery({ photos, address }) {
  const [current, setCurrent] = useState(0)
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const touchStartX = useRef(null)

  if (!photos || photos.length === 0) return null

  const total = photos.length

  function prev(e) { e?.stopPropagation(); setCurrent((c) => (c - 1 + total) % total) }
  function next(e) { e?.stopPropagation(); setCurrent((c) => (c + 1) % total) }

  function onTouchStart(e) { touchStartX.current = e.touches[0].clientX }
  function onTouchEnd(e) {
    if (touchStartX.current === null) return
    const dx = e.changedTouches[0].clientX - touchStartX.current
    if (Math.abs(dx) > 40) dx < 0 ? next() : prev()
    touchStartX.current = null
  }

  return (
    <>
      <div
        style={{ position: 'relative', width: '100%', overflow: 'hidden', background: '#111', cursor: 'zoom-in' }}
        onClick={() => setLightboxOpen(true)}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {/* Foto principale con lazy-load delle successive */}
        {photos.map((p, i) => (
          <img
            key={p.id}
            className="building-gallery-img"
            src={photoUrl(p.storage_path)}
            alt={`${address} — foto ${i + 1}`}
            loading={i === 0 ? 'eager' : 'lazy'}
            style={{
              width: '100%', objectFit: 'cover',
              display: i === current ? 'block' : 'none',
              userSelect: 'none',
            }}
          />
        ))}

        {/* Contatore stile Airbnb */}
        <div style={{
          position: 'absolute', bottom: 12, right: 12,
          background: 'rgba(0,0,0,0.55)', color: '#fff',
          fontSize: 12, fontWeight: 700,
          padding: '4px 11px', borderRadius: 20,
          backdropFilter: 'blur(4px)',
        }}>
          {current + 1} / {total}
        </div>

        {/* Frecce (visibili su desktop, nascoste via CSS su mobile) */}
        {total > 1 && (
          <>
            <button className="building-gallery-arrow" onClick={prev} style={arrowBtn('left')} aria-label="Foto precedente">‹</button>
            <button className="building-gallery-arrow" onClick={next} style={arrowBtn('right')} aria-label="Foto successiva">›</button>
          </>
        )}
      </div>

      {/* Dot indicator (fino a 10 foto) */}
      {total > 1 && total <= 10 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 6, padding: '8px 0' }}>
          {photos.map((_, i) => (
            <div
              key={i}
              onClick={() => setCurrent(i)}
              style={{
                width: 6, height: 6, borderRadius: '50%', cursor: 'pointer',
                background: i === current ? 'var(--teal)' : 'var(--border)',
                transition: 'background 0.2s',
              }}
            />
          ))}
        </div>
      )}

      {lightboxOpen && (
        <PhotoLightbox photos={photos} startIndex={current} onClose={() => setLightboxOpen(false)} />
      )}
    </>
  )
}

function arrowBtn(side) {
  // display/alignItems/justifyContent restano fuori da qui, in
  // .building-gallery-arrow (globals.css): uno style inline avrebbe
  // priorità sulla media query e la nasconderebbe solo su mobile.
  return {
    position: 'absolute', top: '50%', [side]: 12,
    transform: 'translateY(-50%)',
    background: 'rgba(255,255,255,0.88)', border: 'none', borderRadius: '50%',
    width: 36, height: 36, fontSize: 22, fontWeight: 700,
    cursor: 'pointer', color: '#222', zIndex: 2,
    boxShadow: '0 2px 8px rgba(0,0,0,0.18)',
  }
}
