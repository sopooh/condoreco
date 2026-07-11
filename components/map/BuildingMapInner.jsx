'use client'

import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { addBaseTileLayer } from '@/lib/mapTiles'

// Mini mappa con un singolo pin arancione e preview costo medio in stile booking.
// Resta separata da components/map/ResultsMap: qui pan/zoom/tastiera sono
// disabilitati, zoom fisso senza fit-bounds, icona a goccia invece che pillola.
// Condivide comunque lo stesso tile layer via lib/mapTiles.
export default function BuildingMapInner({ lat, lng, monthlyFee, height = 220 }) {
  const containerRef = useRef(null)
  const mapRef = useRef(null)

  useEffect(() => {
    if (!lat || !lng || mapRef.current || !containerRef.current) return
    const map = L.map(containerRef.current, {
      scrollWheelZoom: false, dragging: false, zoomControl: false,
      doubleClickZoom: false, boxZoom: false, keyboard: false,
    }).setView([lat, lng], 16)
    addBaseTileLayer(map)

    const monthly = Number(monthlyFee)
    const feeLabel = Number.isFinite(monthly) && monthly > 0 ? `€${Math.round(monthly)}/mese` : 'Costo n/d'
    const icon = L.divIcon({
      className: '',
      html: `<div style="display:flex;flex-direction:column;align-items:center;gap:4px;transform:translateY(-6px)"><div style="background:#E8651A;color:#fff;border-radius:13px;padding:4px 10px;font-size:12px;font-weight:800;white-space:nowrap;box-shadow:0 3px 10px rgba(0,0,0,.28);border:2px solid #fff">${feeLabel}</div><div style="width:18px;height:18px;border-radius:50% 50% 50% 0;background:#E8651A;transform:rotate(-45deg);border:2px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.35)"></div></div>`,
      iconSize: [120, 54], iconAnchor: [60, 50],
    })
    L.marker([lat, lng], { icon }).addTo(map)
    mapRef.current = map
    return () => { map.remove(); mapRef.current = null }
  }, [lat, lng, monthlyFee])

  if (!lat || !lng) {
    return (
      <div style={{ height, borderRadius: 10, background: 'var(--bg)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-4)', fontSize: 13 }}>
        Posizione non disponibile
      </div>
    )
  }
  return <div ref={containerRef} style={{ height, borderRadius: 10, overflow: 'hidden', border: '1px solid var(--border)' }} />
}
