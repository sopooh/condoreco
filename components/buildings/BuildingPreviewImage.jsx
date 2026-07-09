'use client'

import { useState } from 'react'
import { getBuildingPreviewImage } from '@/lib/mapPreview'

export default function BuildingPreviewImage({ building, height = 160, radius = 10 }) {
  const [failed, setFailed] = useState(false)
  const preview = getBuildingPreviewImage(building)
  const showImage = preview.url && !failed

  return (
    <div style={{
      width: '100%', height, borderRadius: radius,
      background: 'linear-gradient(135deg, #DCE9E7 0%, #C4DBD7 100%)',
      overflow: 'hidden', position: 'relative',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      {showImage ? (
        <img
          src={preview.url}
          alt={`${building?.address || 'Edificio'} ${building?.street_number || ''}`.trim()}
          onError={() => setFailed(true)}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
      ) : (
        <span style={{ color: 'var(--teal-dk)', fontSize: 13, fontWeight: 700 }}>
          {building?.city || 'Anteprima mappa'}
        </span>
      )}

      {/* Pallino arancione centrato sulla mappa statica */}
      {showImage && preview.isMap && (
        <div style={{
          position: 'absolute', left: '50%', top: '50%', width: 12, height: 12,
          transform: 'translate(-50%, -50%)',
          borderRadius: '50%', border: '2px solid #fff',
          background: '#E8651A', boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
          pointerEvents: 'none',
        }} />
      )}
    </div>
  )
}
