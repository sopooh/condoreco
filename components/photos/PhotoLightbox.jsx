'use client'

import { useState, useEffect, useRef } from 'react'
import { photoUrl } from '@/lib/photos'

export default function PhotoLightbox({ photos, startIndex = 0, onClose }) {
  const [current, setCurrent] = useState(startIndex)
  const touchStartX = useRef(null)

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'ArrowLeft')  setCurrent((c) => (c - 1 + photos.length) % photos.length)
      if (e.key === 'ArrowRight') setCurrent((c) => (c + 1) % photos.length)
      if (e.key === 'Escape')     onClose()
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [photos.length, onClose])

  function onTouchStart(e) { touchStartX.current = e.touches[0].clientX }
  function onTouchEnd(e) {
    if (touchStartX.current === null) return
    const dx = e.changedTouches[0].clientX - touchStartX.current
    if (Math.abs(dx) > 40) {
      setCurrent((c) => dx < 0
        ? (c + 1) % photos.length
        : (c - 1 + photos.length) % photos.length)
    }
    touchStartX.current = null
  }

  const photo = photos[current]

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 900,
        background: 'rgba(0,0,0,0.93)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
      onClick={onClose}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* Chiudi */}
      <button
        onClick={onClose}
        style={{
          position: 'absolute', top: 16, right: 16, zIndex: 2,
          background: 'rgba(255,255,255,0.12)', border: 'none', borderRadius: '50%',
          width: 44, height: 44, color: '#fff', fontSize: 20, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >✕</button>

      {/* Contatore */}
      <div style={{
        position: 'absolute', top: 20, left: '50%', transform: 'translateX(-50%)',
        color: '#fff', fontSize: 13, fontWeight: 600, opacity: 0.8,
      }}>
        {current + 1} / {photos.length}
      </div>

      {/* Immagine — stopPropagation per non chiudere il lightbox cliccando sull'immagine */}
      <img
        key={current}
        src={photoUrl(photo.storage_path)}
        alt={`Foto ${current + 1}`}
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '90vw', maxHeight: '85vh',
          objectFit: 'contain', borderRadius: 8, userSelect: 'none',
        }}
        loading="lazy"
      />

      {/* Frecce */}
      {photos.length > 1 && (
        <>
          <button onClick={(e) => { e.stopPropagation(); setCurrent((c) => (c - 1 + photos.length) % photos.length) }}
            style={arrowStyle('left')}>‹</button>
          <button onClick={(e) => { e.stopPropagation(); setCurrent((c) => (c + 1) % photos.length) }}
            style={arrowStyle('right')}>›</button>
        </>
      )}

      {/* Badge "Vedi recensione" se la foto è legata a una review */}
      {photo.review_id && (
        <a
          href={`#review-${photo.review_id}`}
          onClick={(e) => { e.stopPropagation(); onClose() }}
          style={{
            position: 'absolute', bottom: 28, left: '50%', transform: 'translateX(-50%)',
            background: 'rgba(255,255,255,0.15)', color: '#fff', borderRadius: 20,
            padding: '8px 18px', fontSize: 13, fontWeight: 600,
            backdropFilter: 'blur(6px)', textDecoration: 'none', whiteSpace: 'nowrap',
          }}
        >Vedi recensione →</a>
      )}
    </div>
  )
}

function arrowStyle(side) {
  return {
    position: 'absolute', top: '50%', [side]: 16,
    transform: 'translateY(-50%)',
    background: 'rgba(255,255,255,0.12)', border: 'none', borderRadius: '50%',
    width: 50, height: 50, color: '#fff', fontSize: 28, fontWeight: 700,
    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
  }
}
