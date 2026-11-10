import L from 'leaflet'

// Punto unico di verita per il tile layer Leaflet (MapTiler streets-v4).
// tileSize/zoomOffset sono richiesti dai tile @512px di MapTiler per allinearsi
// alla griglia di zoom standard a 256px di Leaflet. L'attribution MapTiler e
// obbligatoria: non va rimossa ne nascosta (solo stilizzata, vedi
// .leaflet-control-attribution in globals.css).
export const MAPTILER_KEY = process.env.NEXT_PUBLIC_MAPTILER_KEY || 'get_your_own_D6rA4zTHduk6KOKTXzGB'

// streets-v4: mappa completa (vie, POI) per scheda edificio e scelta del punto.
// dataviz-v4: base chiara e minimale (terra quasi bianca, acqua azzurra
// tenue, poche etichette) per le mappe dei risultati, dove contano i pin.
export const MAP_STYLES = { streets: 'streets-v4', minimal: 'dataviz-v4' }

export const mapTileUrl = (styleId) =>
  `https://api.maptiler.com/maps/${styleId}/{z}/{x}/{y}.png?key=${MAPTILER_KEY}`

export const MAP_TILE_URL = mapTileUrl(MAP_STYLES.streets)

export const MAP_TILE_ATTRIBUTION = '© <a href="https://www.maptiler.com/copyright/">MapTiler</a>'

export const MAP_TILE_OPTIONS = {
  tileSize: 512,
  zoomOffset: -1,
  maxZoom: 20,
  attribution: MAP_TILE_ATTRIBUTION,
}

export function addBaseTileLayer(map, style = 'streets') {
  const layer = L.tileLayer(mapTileUrl(MAP_STYLES[style] || MAP_STYLES.streets), MAP_TILE_OPTIONS).addTo(map)
  // Toglie solo il prefisso "Leaflet" (link + bandiera) dal controllo di
  // attribution: l'attribution MapTiler/OSM sopra resta obbligatoria e visibile.
  map.attributionControl?.setPrefix(false)
  return layer
}
