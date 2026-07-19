'use client'

import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { addBaseTileLayer } from '@/lib/mapTiles'

const CITY_CENTER = {
  Milano: [45.4642, 9.19],
  Roma: [41.9028, 12.4964],
  Torino: [45.0703, 7.6869],
  Bologna: [44.4949, 11.3426],
  Firenze: [43.7696, 11.2558],
  Napoli: [40.8518, 14.2681],
  Venezia: [45.4408, 12.3155],
  Verona: [45.4384, 10.9916],
}

// Icona a goccia teal, stessa idea grafica del pin di BuildingMapInner: gli
// URL di default di Leaflet (marker-icon.png/marker-shadow.png) puntano a
// leaflet/dist/images, che Turbopack non riscrive come asset pubblico —
// senza icona esplicita il marker risulterebbe invisibile (404 silenzioso).
const dropIcon = L.divIcon({
  className: '',
  html: '<div style="width:26px;height:26px;border-radius:50% 50% 50% 0;background:#0D6D6A;transform:rotate(-45deg);border:3px solid #fff;box-shadow:0 3px 10px rgba(0,0,0,.35)"></div>',
  iconSize: [26, 26],
  iconAnchor: [13, 26],
})

// Mappa di verifica posizione in stile ride-hailing: click o drag del pin.
export default function PinDropMapInner({ lat, lng, city, onChange, height = 300 }) {
  const containerRef = useRef(null)
  const mapRef = useRef(null)
  const markerRef = useRef(null)

  useEffect(() => {
    if (mapRef.current || !containerRef.current) return
    const start = lat && lng ? [lat, lng] : (CITY_CENTER[city] || CITY_CENTER.Milano)

    const map = L.map(containerRef.current, { scrollWheelZoom: true, attributionControl: false }).setView(start, lat && lng ? 16 : 13)
    addBaseTileLayer(map)

    if (lat && lng) {
      markerRef.current = L.marker([lat, lng], { icon: dropIcon, draggable: true }).addTo(map)
      markerRef.current.on('dragend', () => {
        const p = markerRef.current.getLatLng()
        onChange?.({ lat: Number(p.lat.toFixed(6)), lng: Number(p.lng.toFixed(6)) })
      })
    }

    map.on('click', (e) => {
      const p = { lat: Number(e.latlng.lat.toFixed(6)), lng: Number(e.latlng.lng.toFixed(6)) }
      if (!markerRef.current) {
        markerRef.current = L.marker([p.lat, p.lng], { icon: dropIcon, draggable: true }).addTo(map)
        markerRef.current.on('dragend', () => {
          const q = markerRef.current.getLatLng()
          onChange?.({ lat: Number(q.lat.toFixed(6)), lng: Number(q.lng.toFixed(6)) })
        })
      } else {
        markerRef.current.setLatLng([p.lat, p.lng])
      }
      onChange?.(p)
    })

    mapRef.current = map
    setTimeout(() => map.invalidateSize(), 0)

    return () => {
      map.remove()
      mapRef.current = null
      markerRef.current = null
    }
  }, [lat, lng, city, onChange])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    if (lat && lng) {
      if (!markerRef.current) {
        markerRef.current = L.marker([lat, lng], { icon: dropIcon, draggable: true }).addTo(map)
        markerRef.current.on('dragend', () => {
          const p = markerRef.current.getLatLng()
          onChange?.({ lat: Number(p.lat.toFixed(6)), lng: Number(p.lng.toFixed(6)) })
        })
      } else {
        markerRef.current.setLatLng([lat, lng])
      }
      map.panTo([lat, lng], { animate: true })
    }
  }, [lat, lng, onChange])

  return <div ref={containerRef} style={{ height, borderRadius: 12, border: '1px solid var(--border)', overflow: 'hidden' }} />
}
