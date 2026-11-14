// Chiave e stili MapTiler, senza dipendere da Leaflet: si possono usare anche
// lato server (es. le preview statiche delle card).
export const MAPTILER_KEY = process.env.NEXT_PUBLIC_MAPTILER_KEY || 'get_your_own_D6rA4zTHduk6KOKTXzGB'

// streets-v4: mappa completa (vie, POI) per scheda edificio e scelta del punto.
// dataviz-v4: base chiara e minimale (terra quasi bianca, acqua azzurra
// tenue, poche etichette) per le mappe dei risultati e le preview delle card.
export const MAP_STYLES = { streets: 'streets-v4', minimal: 'dataviz-v4' }
