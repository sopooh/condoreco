// Preview mappa statica per edifici.
// Usa un tile OSM gratuito calcolato dalle coordinate (nessuna API key necessaria).
// MapTiler Static Maps richiede piano a pagamento → non usato.

function latLngToTile(lat, lng, zoom) {
  const n = 2 ** zoom
  const x = Math.floor(((lng + 180) / 360) * n)
  const latRad = (lat * Math.PI) / 180
  const y = Math.floor(
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n
  )
  return { x, y, z: zoom }
}

export function getBuildingPreviewImage(building) {
  // Foto caricata dall'utente — massima priorità
  if (building?.photo_url) return { url: building.photo_url, isMap: false }

  if (!building?.lat || !building?.lng) return { url: null, isMap: false }

  // Tile OSM gratuito a zoom 16 (dettaglio edificio)
  const { x, y, z } = latLngToTile(building.lat, building.lng, 16)
  const url = `https://tile.openstreetmap.org/${z}/${x}/${y}.png`
  return { url, isMap: true }
}
