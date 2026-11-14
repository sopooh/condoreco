// Preview mappa statica per edifici: mosaico di tile MapTiler dataviz-v4
// (la base chiara delle mappe dei risultati), centrato sulle coordinate
// esatte dell'edificio. Tile da 512px, in @2x sugli schermi retina.
import { MAPTILER_KEY, MAP_STYLES } from '@/lib/mapConfig'

export const PREVIEW_ZOOM = 15 // tile 512px a z15 = dettaglio di uno z16 classico
const TILE = 512

const tileUrl = (z, x, y, retina) =>
  `https://api.maptiler.com/maps/${MAP_STYLES.minimal}/${z}/${x}/${y}${retina ? '@2x' : ''}.png?key=${MAPTILER_KEY}`

// Posizione in pixel globali (griglia 512) del punto lat/lng allo zoom z
function project(lat, lng, z) {
  const scale = TILE * 2 ** z
  const s = Math.sin((lat * Math.PI) / 180)
  return {
    x: ((lng + 180) / 360) * scale,
    y: (0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * scale,
  }
}

// Tile che coprono un riquadro di halfW x halfH attorno al punto, con lo
// spostamento (px) di ciascuna rispetto al centro del riquadro.
export function previewTiles(lat, lng, { z = PREVIEW_ZOOM, halfW = 420, halfH = 260 } = {}) {
  const { x, y } = project(lat, lng, z)
  const n = 2 ** z
  const tiles = []
  for (let ty = Math.floor((y - halfH) / TILE); ty <= Math.floor((y + halfH) / TILE); ty++) {
    if (ty < 0 || ty >= n) continue
    for (let tx = Math.floor((x - halfW) / TILE); tx <= Math.floor((x + halfW) / TILE); tx++) {
      const wx = ((tx % n) + n) % n
      tiles.push({
        key: `${tx}-${ty}`,
        dx: Math.round(tx * TILE - x),
        dy: Math.round(ty * TILE - y),
        src: tileUrl(z, wx, ty, false),
        src2x: tileUrl(z, wx, ty, true),
      })
    }
  }
  return tiles
}

export function getBuildingPreviewImage(building) {
  // Foto caricata dall'utente: massima priorità
  if (building?.photo_url) return { url: building.photo_url, isMap: false }
  if (building?.lat == null || building?.lng == null) return { url: null, isMap: false }
  return { url: 'map', isMap: true, lat: Number(building.lat), lng: Number(building.lng) }
}
