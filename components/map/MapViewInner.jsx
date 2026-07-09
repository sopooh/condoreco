'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { scoreColor } from '@/lib/score'

const MAPTILER_KEY = process.env.NEXT_PUBLIC_MAPTILER_KEY || 'get_your_own_D6rA4zTHduk6KOKTXzGB'
const MAPTILER_STYLE = `https://api.maptiler.com/maps/streets-v2/{z}/{x}/{y}.png?key=${MAPTILER_KEY}`

export default function MapViewInner({ buildings = [], height = 480, focusLat, focusLng, onBuildingSelect, containerStyle = {} }) {
  const router = useRouter()
  const mapRef = useRef(null)
  const containerRef = useRef(null)
  const layerRef = useRef(null)
  const onBuildingSelectRef = useRef(onBuildingSelect)

  useEffect(() => { onBuildingSelectRef.current = onBuildingSelect }, [onBuildingSelect])

  // init mappa una sola volta
  useEffect(() => {
    if (mapRef.current || !containerRef.current) return
    const map = L.map(containerRef.current, { scrollWheelZoom: false, attributionControl: false }).setView([45.4642, 9.19], 12)
    L.tileLayer(MAPTILER_STYLE, { maxZoom: 20 }).addTo(map)
    mapRef.current = map
    layerRef.current = L.layerGroup().addTo(map)
    return () => { map.remove(); mapRef.current = null }
  }, [])

  // aggiorna i pin quando cambiano gli edifici
  useEffect(() => {
    const map = mapRef.current
    const layer = layerRef.current
    if (!map || !layer) return
    layer.clearLayers()

    const pts = buildings.filter((b) => b.lat && b.lng)
    pts.forEach((b) => {
      const pending = b.status === 'pending'
      const monthlyFee = Number(b.monthly_fee)
      const hasFee = Number.isFinite(monthlyFee) && monthlyFee > 0
      const label = hasFee ? `€${Math.round(monthlyFee)}` : (pending ? 'In verifica' : (b.score?.toFixed(1) ?? 'N'))
      const color = hasFee || pending ? '#E8651A' : scoreColor(b.score)
      const icon = L.divIcon({
        className: '',
        html: `<div style="display:inline-flex;align-items:center;gap:6px;background:${color};color:#fff;border-radius:14px;padding:4px 10px;font-size:12px;font-weight:800;white-space:nowrap;box-shadow:0 2px 10px rgba(0,0,0,.28);border:2px solid #fff">${label}${hasFee ? '<span style=\"opacity:.9;font-weight:700\">/mese</span>' : ''}</div>`,
        iconSize: [0, 0],
      })
      const m = L.marker([b.lat, b.lng], { icon }).addTo(layer)
      m.on('click', () => {
        if (onBuildingSelectRef.current) onBuildingSelectRef.current(b)
        else router.push(`/edificio/${b.id}`)
      })
    })

    // Centra sul punto OSM cercato se presente (override del fitBounds)
    if (focusLat && focusLng) {
      map.setView([focusLat, focusLng], pts.length > 0 ? 14 : 15)
    } else if (pts.length === 1) {
      map.setView([pts[0].lat, pts[0].lng], 15)
    } else if (pts.length > 1) {
      const group = L.featureGroup(pts.map((b) => L.marker([b.lat, b.lng])))
      map.fitBounds(group.getBounds().pad(0.3))
    }
  }, [buildings, router, focusLat, focusLng])

  return (
    <div ref={containerRef} style={{
      height, borderRadius: 10, overflow: 'hidden', border: '1px solid var(--border)',
      ...containerStyle,
    }} />
  )
}
