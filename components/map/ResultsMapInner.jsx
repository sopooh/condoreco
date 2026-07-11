'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { scoreColor } from '@/lib/score'
import { addBaseTileLayer } from '@/lib/mapTiles'

const DEFAULT_CENTER = [45.4642, 9.19] // Milano
const DEFAULT_ZOOM = 12

// Mappa condivisa per le liste di risultati (Esplora, Amministratori): stesso
// container/altezza, tile layer, logica di fit-bounds e stile dei pin per
// entrambe le pagine. Ogni risultato porta i propri dati (lat/lng, score,
// monthly_fee/status per lo stile del pin, href per la navigazione di
// default); il contenuto del popup al click resta a carico della pagina
// chiamante tramite onResultSelect, non e' questo componente a renderizzarlo.
export default function ResultsMapInner({ results = [], height = 480, focusLat, focusLng, onResultSelect, containerStyle = {} }) {
  const router = useRouter()
  const mapRef = useRef(null)
  const containerRef = useRef(null)
  const layerRef = useRef(null)
  const onResultSelectRef = useRef(onResultSelect)

  useEffect(() => { onResultSelectRef.current = onResultSelect }, [onResultSelect])

  // init mappa una sola volta
  useEffect(() => {
    if (mapRef.current || !containerRef.current) return
    const map = L.map(containerRef.current, { scrollWheelZoom: false }).setView(DEFAULT_CENTER, DEFAULT_ZOOM)
    addBaseTileLayer(map)
    mapRef.current = map
    layerRef.current = L.layerGroup().addTo(map)
    return () => { map.remove(); mapRef.current = null }
  }, [])

  // aggiorna i pin quando cambiano i risultati
  useEffect(() => {
    const map = mapRef.current
    const layer = layerRef.current
    if (!map || !layer) return
    layer.clearLayers()

    const pts = results.filter((r) => r.lat && r.lng)
    pts.forEach((r) => {
      const pending = r.status === 'pending'
      const monthlyFee = Number(r.monthly_fee)
      const hasFee = Number.isFinite(monthlyFee) && monthlyFee > 0
      const label = hasFee ? `€${Math.round(monthlyFee)}` : (pending ? 'In verifica' : (r.score?.toFixed(1) ?? 'N'))
      const color = hasFee || pending ? '#E8651A' : scoreColor(r.score)
      const icon = L.divIcon({
        className: '',
        html: `<div style="display:inline-flex;align-items:center;gap:6px;background:${color};color:#fff;border-radius:14px;padding:4px 10px;font-size:12px;font-weight:800;white-space:nowrap;box-shadow:0 2px 10px rgba(0,0,0,.28);border:2px solid #fff">${label}${hasFee ? '<span style=\"opacity:.9;font-weight:700\">/mese</span>' : ''}</div>`,
        iconSize: [0, 0],
      })
      const m = L.marker([r.lat, r.lng], { icon }).addTo(layer)
      m.on('click', () => {
        if (onResultSelectRef.current) onResultSelectRef.current(r)
        else if (r.href) router.push(r.href)
      })
    })

    // Centra sul punto OSM cercato se presente (override del fitBounds)
    if (focusLat && focusLng) {
      map.setView([focusLat, focusLng], pts.length > 0 ? 14 : 15)
    } else if (pts.length === 1) {
      map.setView([pts[0].lat, pts[0].lng], 15)
    } else if (pts.length > 1) {
      const group = L.featureGroup(pts.map((r) => L.marker([r.lat, r.lng])))
      map.fitBounds(group.getBounds().pad(0.3))
    }
  }, [results, router, focusLat, focusLng])

  return (
    <div ref={containerRef} style={{
      height, borderRadius: 10, overflow: 'hidden', border: '1px solid var(--border)',
      ...containerStyle,
    }} />
  )
}
