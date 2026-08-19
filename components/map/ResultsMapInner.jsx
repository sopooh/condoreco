'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { scoreColor } from '@/lib/score'
import { addBaseTileLayer } from '@/lib/mapTiles'

const DEFAULT_CENTER = [45.4642, 9.19] // Milano
const DEFAULT_ZOOM = 12

const GESTURE_PAUSE_MS = 400
const WHEEL_EXPAND_THRESHOLD = 90
const WHEEL_COLLAPSE_THRESHOLD = 120
const TOUCH_THRESHOLD = 70

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
  // mapState + callback sono opzionali: solo chi li passa (Esplora) attiva i
  // gesti di scroll/touch per espandere/richiudere. AdminsResultsView non li
  // passa e resta quindi invariato.
  mapState = null,
  onRequestExpand,
  onRequestCollapse,
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

    // Con più edifici (tipicamente una ricerca città: "Milano", "Roma"...) la
    // mappa si adatta a tutti i risultati — è quello che rende una ricerca
    // città un vero fitBounds sull'area, non uno zoom fisso su un punto.
    // Il punto OSM cercato (focusLat/focusLng) resta solo un fallback per i
    // casi con 0-1 risultato, dove non c'è un gruppo di pin su cui adattarsi.
    if (pts.length > 1) {
      const group = L.featureGroup(pts.map((r) => L.marker([r.lat, r.lng])))
      map.fitBounds(group.getBounds().pad(0.25))
    } else if (pts.length === 1) {
      map.setView([pts[0].lat, pts[0].lng], 15)
    } else if (focusLat && focusLng) {
      map.setView([focusLat, focusLng], 13)
    }
  }, [results, router, focusLat, focusLng])

  // ── Gesti scroll/touch per espandere (compact) o richiudere (fullscreen) ──
  // Scope volutamente ristretto al solo container della mappa: scrollare la
  // lista risultati sotto non attraversa mai questi handler, quindi non può
  // mai innescare un'espansione automatica. Soglia + reset su pausa (400ms)
  // evitano trigger accidentali durante una lettura normale delle card.
  const wheelAccum = useRef(0)
  const wheelLastTime = useRef(0)
  const touchStartY = useRef(null)
  const touchFiredRef = useRef(false)
  const gestureStateRef = useRef({ mapState, onRequestExpand, onRequestCollapse })
  useEffect(() => { gestureStateRef.current = { mapState, onRequestExpand, onRequestCollapse } })

  // Handler nativi in fase di capture: quando la mappa e' interattiva
  // (fullscreen) lo scrollWheelZoom di Leaflet chiama stop() sull'evento
  // (preventDefault + stopPropagation) per zoomare invece di scrollare la
  // pagina — un onWheel React (delegato, fase bubble) non lo vedrebbe mai.
  // Attaccandoci in capture sullo stesso nodo leggiamo l'evento PRIMA che
  // Leaflet lo fermi, senza toccarne il comportamento di zoom.
  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    function handleWheel(e) {
      const { mapState: state, onRequestExpand: expand, onRequestCollapse: collapse } = gestureStateRef.current
      if (!state) return
      const now = Date.now()
      if (now - wheelLastTime.current > GESTURE_PAUSE_MS) wheelAccum.current = 0
      wheelLastTime.current = now

      if (state === 'compact' && expand) {
        wheelAccum.current = e.deltaY > 0 ? wheelAccum.current + e.deltaY : 0
        if (wheelAccum.current > WHEEL_EXPAND_THRESHOLD) {
          wheelAccum.current = 0
          expand()
        }
      } else if (state === 'fullscreen' && collapse) {
        wheelAccum.current = e.deltaY < 0 ? wheelAccum.current + e.deltaY : 0
        if (wheelAccum.current < -WHEEL_COLLAPSE_THRESHOLD) {
          wheelAccum.current = 0
          collapse()
        }
      }
    }

    function handleTouchStart(e) {
      touchStartY.current = e.touches.length === 1 ? e.touches[0].clientY : null
      touchFiredRef.current = false
    }

    function handleTouchMove(e) {
      const { mapState: state, onRequestExpand: expand, onRequestCollapse: collapse } = gestureStateRef.current
      if (!state || touchStartY.current == null || touchFiredRef.current || e.touches.length !== 1) return
      const dy = e.touches[0].clientY - touchStartY.current // >0 = trascina verso il basso

      if (state === 'compact' && expand && -dy > TOUCH_THRESHOLD) {
        touchFiredRef.current = true
        expand()
      } else if (state === 'fullscreen' && collapse && dy > TOUCH_THRESHOLD) {
        touchFiredRef.current = true
        collapse()
      }
    }

    el.addEventListener('wheel', handleWheel, { capture: true, passive: true })
    el.addEventListener('touchstart', handleTouchStart, { capture: true, passive: true })
    el.addEventListener('touchmove', handleTouchMove, { capture: true, passive: true })
    return () => {
      el.removeEventListener('wheel', handleWheel, { capture: true })
      el.removeEventListener('touchstart', handleTouchStart, { capture: true })
      el.removeEventListener('touchmove', handleTouchMove, { capture: true })
    }
  }, [])

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
