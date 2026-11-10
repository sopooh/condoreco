'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { scoreHex } from '@/lib/score'
import { addBaseTileLayer } from '@/lib/mapTiles'

const DEFAULT_CENTER = [45.4642, 9.19] // Milano
const DEFAULT_ZOOM = 12
const CLUSTER_RADIUS_PX = 56

// Raggruppa i risultati i cui pin, allo zoom corrente, cadrebbero a meno di
// CLUSTER_RADIUS_PX l'uno dall'altro (greedy, sufficiente per decine di pin).
function clusterByPixel(map, pts) {
  const groups = []
  pts.forEach((r) => {
    const p = map.latLngToLayerPoint([r.lat, r.lng])
    const near = groups.find((g) => g.anchor.distanceTo(p) < CLUSTER_RADIUS_PX)
    if (near) near.items.push(r)
    else groups.push({ anchor: p, items: [r] })
  })
  return groups.map((g) => g.items)
}

// Pin singolo: pallino colorato col voto (stessi colori della legenda) e,
// se nota, la quota mensile in chiaro accanto. Mai due etichette sovrapposte.
function pinIcon(r) {
  const score = r.score == null ? null : Number(r.score)
  const color = scoreHex(score)
  const scoreText = score == null ? 'N/D' : score.toFixed(1)
  const fee = Number(r.monthly_fee)
  const feeText = Number.isFinite(fee) && fee > 0 ? `€${Math.round(fee)}/mese` : ''
  const pending = r.status === 'pending'
  const html = `
    <div style="position:absolute;left:0;top:0;transform:translate(-50%,-100%);display:inline-flex;align-items:center;gap:6px;background:#fff;border:2px solid ${color};${pending ? 'border-style:dashed;' : ''}border-radius:999px;padding:2px ${feeText ? 10 : 2}px 2px 2px;box-shadow:0 2px 8px rgba(0,0,0,.22);white-space:nowrap;font-family:inherit;cursor:pointer">
      <span style="display:inline-flex;align-items:center;justify-content:center;min-width:30px;height:22px;padding:0 6px;border-radius:999px;background:${color};color:#fff;font-size:12px;font-weight:800">${scoreText}</span>
      ${feeText ? `<span style="font-size:12px;font-weight:700;color:#1F2937">${feeText}</span>` : ''}
    </div>`
  return L.divIcon({ className: '', html, iconSize: [0, 0] })
}

// Gruppo di pin vicini: cerchio teal con il numero di edifici; al click zooma.
function clusterIcon(count) {
  const size = count < 10 ? 36 : 42
  const html = `
    <div style="position:absolute;left:0;top:0;transform:translate(-50%,-50%);width:${size}px;height:${size}px;border-radius:50%;background:#0D676F;color:#fff;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:800;border:3px solid #fff;box-shadow:0 0 0 4px rgba(13,103,111,.25),0 2px 8px rgba(0,0,0,.25);cursor:pointer">${count}</div>`
  return L.divIcon({ className: '', html, iconSize: [0, 0] })
}

// Mappa condivisa per le liste di risultati (Esplora, Amministratori): stesso
// container/altezza, tile layer, logica di fit-bounds e stile dei pin per
// entrambe le pagine. Ogni risultato porta i propri dati (lat/lng, score,
// monthly_fee/status per lo stile del pin, href per la navigazione di
// default); il contenuto del popup al click resta a carico della pagina
// chiamante tramite onResultSelect, non e' questo componente a renderizzarlo.
//
// L'istanza Leaflet viene creata una volta sola e mai ricreata: Esplora la
// tiene sempre montata e ne ridimensiona solo il container (compact/
// fullscreen/hidden), cosi centro/zoom/marker non si perdono mai a un
// cambio di stato — vedi ResizeObserver sotto per il resize dei tile.
export default function ResultsMapInner({
  results = [], height = 480, focusLat, focusLng, onResultSelect, containerStyle = {},
  interactive = false,
}) {
  const router = useRouter()
  const mapRef = useRef(null)
  const containerRef = useRef(null)
  const layerRef = useRef(null)
  const onResultSelectRef = useRef(onResultSelect)
  const interactiveInitRef = useRef(interactive)

  useEffect(() => { onResultSelectRef.current = onResultSelect }, [onResultSelect])

  // init mappa una sola volta
  useEffect(() => {
    if (mapRef.current || !containerRef.current) return
    const map = L.map(containerRef.current, {
      scrollWheelZoom: interactiveInitRef.current,
      zoomControl: false,
      zoomSnap: 0.25,
    }).setView(DEFAULT_CENTER, DEFAULT_ZOOM)
    L.control.zoom({ position: 'bottomright' }).addTo(map)
    addBaseTileLayer(map)
    mapRef.current = map
    layerRef.current = L.layerGroup().addTo(map)
    return () => { map.remove(); mapRef.current = null }
  }, [])

  // riadatta i tile quando il container cambia dimensione (transizione
  // compact/fullscreen/hidden), senza toccare centro/zoom/marker.
  useEffect(() => {
    const map = mapRef.current
    const el = containerRef.current
    if (!map || !el || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(() => map.invalidateSize())
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // zoom da rotellina/pinch solo quando la mappa e' "interattiva" (fullscreen):
  // in compact lo scroll sopra la mappa deve poter scorrere la pagina, non zoomare.
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    if (interactive) map.scrollWheelZoom.enable()
    else map.scrollWheelZoom.disable()
  }, [interactive])

  // aggiorna i pin quando cambiano i risultati, e li ri-raggruppa a ogni zoom
  useEffect(() => {
    const map = mapRef.current
    const layer = layerRef.current
    if (!map || !layer) return

    const pts = results.filter((r) => Number.isFinite(Number(r.lat)) && Number.isFinite(Number(r.lng)) && r.lat && r.lng)

    const select = (r) => {
      if (onResultSelectRef.current) onResultSelectRef.current(r)
      else if (r.href) router.push(r.href)
    }

    const render = () => {
      layer.clearLayers()
      clusterByPixel(map, pts).forEach((group) => {
        if (group.length === 1) {
          const r = group[0]
          L.marker([r.lat, r.lng], { icon: pinIcon(r), riseOnHover: true })
            .on('click', () => select(r))
            .addTo(layer)
          return
        }
        const bounds = L.latLngBounds(group.map((r) => [r.lat, r.lng]))
        L.marker(bounds.getCenter(), { icon: clusterIcon(group.length), riseOnHover: true })
          .on('click', () => {
            // stesso indirizzo (o gia' al massimo zoom): niente da separare,
            // si apre il primo edificio del gruppo
            const sameSpot = bounds.getNorthEast().equals(bounds.getSouthWest())
            if (sameSpot || map.getZoom() >= map.getMaxZoom() - 1) select(group[0])
            else map.fitBounds(bounds, { padding: [60, 60], maxZoom: 17 })
          })
          .addTo(layer)
      })
    }

    // Con più edifici la mappa si adatta a tutti i risultati. Padding in pixel
    // + zoomSnap frazionario: niente salti a uno zoom intero troppo largo.
    // Il punto cercato (focusLat/focusLng) resta un fallback per 0 risultati.
    if (pts.length > 1) {
      map.fitBounds(L.latLngBounds(pts.map((r) => [r.lat, r.lng])), { padding: [48, 48], maxZoom: 16 })
    } else if (pts.length === 1) {
      map.setView([pts[0].lat, pts[0].lng], 15)
    } else if (focusLat && focusLng) {
      map.setView([focusLat, focusLng], 13)
    }

    render()
    map.on('zoomend', render)
    return () => { map.off('zoomend', render) }
  }, [results, router, focusLat, focusLng])

  return (
    <div
      ref={containerRef}
      style={{
        height, borderRadius: 10, overflow: 'hidden', border: '1px solid var(--border)',
        ...containerStyle,
      }}
    />
  )
}
