'use client'

import { useState } from 'react'
import { getBuildingPreviewImage, previewTiles } from '@/lib/mapPreview'

export default function BuildingPreviewImage({ building, height = 160, radius = 10 }) {
  const [failed, setFailed] = useState(false)
  const preview = getBuildingPreviewImage(building)
  const showImage = preview.url && !failed
  const alt = `${building?.address || 'Edificio'} ${building?.street_number || ''}`.trim()

  return (
    <div style={{
      width: '100%', height, borderRadius: radius,
      background: preview.isMap ? '#F4F4F2' : 'linear-gradient(135deg, #DCE9E7 0%, #C4DBD7 100%)',
      overflow: 'hidden', position: 'relative',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      {showImage && preview.isMap ? (
        <div role="img" aria-label={`Mappa di ${alt}`} style={{ position: 'absolute', inset: 0 }}>
          {previewTiles(preview.lat, preview.lng).map((t) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={t.key}
              src={t.src}
              srcSet={`${t.src} 1x, ${t.src2x} 2x`}
              alt=""
              loading="lazy"
              decoding="async"
              draggable={false}
              onError={() => setFailed(true)}
              style={{
                position: 'absolute', width: 512, height: 512, maxWidth: 'none',
                left: `calc(50% + ${t.dx}px)`, top: `calc(50% + ${t.dy}px)`,
                pointerEvents: 'none', userSelect: 'none',
              }}
            />
          ))}
        </div>
      ) : showImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={preview.url}
          alt={alt}
          onError={() => setFailed(true)}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
      ) : (
        <span style={{ color: 'var(--teal-dk)', fontSize: 13, fontWeight: 700 }}>
          {building?.city || 'Anteprima mappa'}
        </span>
      )}

      {/* Pallino arancione sul punto esatto dell'edificio (centro del mosaico) */}
      {showImage && preview.isMap && (
        <div style={{
          position: 'absolute', left: '50%', top: '50%', width: 14, height: 14,
          transform: 'translate(-50%, -50%)',
          borderRadius: '50%', border: '2.5px solid #fff',
          background: '#E8651A', boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
          pointerEvents: 'none',
        }} />
      )}
    </div>
  )
}
