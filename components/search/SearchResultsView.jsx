'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import SearchBar from '@/components/search/SearchBar'
import SearchFilters from '@/components/search/SearchFilters'
import FilterSidebar from '@/components/search/FilterSidebar'
import BuildingRow from '@/components/buildings/BuildingRow'
import ResultsMap from '@/components/map/ResultsMap'
import MapLegend from '@/components/map/MapLegend'
import { DesktopMapPreview, MobileMapPreview } from '@/components/map/BuildingMapPreview'
import { useIsMobile } from '@/hooks/useIsMobile'

const NAVBAR_HEIGHT = 58 // components/nav/Navbar.jsx
const COMPACT_MAP_HEIGHT = 280
const TRANSITION = '280ms ease'

// Esplora: preview mappa in alto (sticky sotto navbar+search) + schede sotto,
// stile Booking. Un'unica istanza Leaflet resta sempre montata — mapState
// ('compact' | 'fullscreen' | 'hidden') ridimensiona solo il container, non
// la ricrea mai: centro/zoom/marker restano intatti a ogni cambio stato
// (vedi ResizeObserver in ResultsMapInner). Il cambio di stato avviene solo
// via bottoni ("Apri mappa" / "Riduci mappa" / "Nascondi mappa" / "Mostra
// mappa"), niente gesti di scroll/touch sopra la mappa.
export default function SearchResultsView({ buildings, cities, feeCounts, query, city, focusLat, focusLng }) {
  const isMobile = useIsMobile()
  const [mapState, setMapState] = useState('compact')
  const [showFilters, setShowFilters] = useState(false)
  const [selectedBuilding, setSelectedBuilding] = useState(null)
  const [highlightedId, setHighlightedId] = useState(null)
  const stickyRef = useRef(null)

  const results = buildings.map((b) => ({ ...b, href: `/edificio/${b.id}` }))

  // blocca lo scroll di pagina solo in fullscreen: la mappa occupa tutta
  // l'area sotto la navbar, non c'è altro da scrollare finché non si riduce.
  // Se si clicca "Apri mappa" dopo aver scrollato la lista, lo scroll
  // residuo lascia il blocco sticky "impigliato" fuori dal viewport: si
  // azzera lo scroll PRIMA di bloccarlo, cosi la mappa fullscreen parte
  // sempre allineata.
  useEffect(() => {
    if (mapState === 'fullscreen') {
      window.scrollTo(0, 0)
      document.body.style.overflow = 'hidden'
      return () => { document.body.style.overflow = '' }
    }
  }, [mapState])

  useEffect(() => {
    if (!highlightedId || mapState !== 'compact') return
    const el = document.getElementById(`building-row-${highlightedId}`)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [highlightedId, mapState])

  function handleMarkerClick(building) {
    setSelectedBuilding(building)
    setHighlightedId(building.id)
  }

  const showFiltriButton = isMobile || mapState === 'fullscreen'

  return (
    <>
      <div
        ref={stickyRef}
        style={{
          position: 'sticky', top: NAVBAR_HEIGHT, zIndex: 50, background: 'var(--white)',
          ...(mapState === 'fullscreen'
            ? { height: `calc(100vh - ${NAVBAR_HEIGHT}px)`, display: 'flex', flexDirection: 'column' }
            : {}),
        }}
      >
        {/* Search bar */}
        <div style={{ flexShrink: 0, borderBottom: '1px solid var(--border)', padding: isMobile ? '12px 16px' : '16px 40px' }}>
          <div style={{ maxWidth: 1280, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
            <SearchBar initial={query} size="sm" />
            <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
              {showFiltriButton && (
                <button onClick={() => setShowFilters(true)} style={pillBtn(showFilters)}>Filtri</button>
              )}
              {!isMobile && (
                <Link href="/aggiungi-condominio" style={{
                  padding: '9px 16px', borderRadius: 8, border: '1.5px solid var(--teal)',
                  background: 'var(--teal-lt)', fontWeight: 600, fontSize: 13,
                  color: 'var(--teal-dk)', whiteSpace: 'nowrap', display: 'inline-block',
                }}>+ Aggiungi condominio</Link>
              )}
            </div>
          </div>
        </div>

        {mapState !== 'fullscreen' && <SearchFilters cities={cities} />}

        {/* Regione mappa: altezza animata, mai smontata */}
        <div style={{
          flex: mapState === 'fullscreen' ? 1 : 'unset',
          minHeight: 0,
          position: 'relative',
          height: mapState === 'compact' ? COMPACT_MAP_HEIGHT : mapState === 'hidden' ? 0 : undefined,
          overflow: 'hidden',
          transition: `height ${TRANSITION}`,
        }}>
          <ResultsMap
            results={results}
            height="100%"
            focusLat={focusLat}
            focusLng={focusLng}
            onResultSelect={handleMarkerClick}
            interactive={mapState === 'fullscreen'}
            containerStyle={{ borderRadius: 0, border: 'none' }}
          />

          {mapState !== 'hidden' && (
            <>
              <div style={{ position: 'absolute', top: 12, right: 12, zIndex: 500, display: 'flex', gap: 8 }}>
                {mapState === 'compact' && (
                  <button onClick={() => setMapState('hidden')} style={floatingBtn}>
                    <EyeOffIcon /> Nascondi mappa
                  </button>
                )}
                <button
                  onClick={() => setMapState(mapState === 'fullscreen' ? 'compact' : 'fullscreen')}
                  style={floatingBtn}
                >
                  {mapState === 'fullscreen' ? <><CollapseIcon /> Riduci mappa</> : <><ExpandIcon /> Apri mappa</>}
                </button>
              </div>

              {/* Su mobile non c'è spazio per legenda + entrambi i bottoni senza sovrapposizioni: la legenda è "eventuale" (vedi spec), i controlli no. */}
              {!isMobile && (
                <div style={{ position: 'absolute', top: 12, left: 12, zIndex: 500, maxWidth: 210, background: 'var(--white)', borderRadius: 10, padding: '8px 12px', boxShadow: '0 2px 10px rgba(0,0,0,0.15)' }}>
                  <MapLegend />
                </div>
              )}

              {mapState === 'fullscreen' && (
                <div style={{
                  position: 'absolute', bottom: 16, left: 16, zIndex: 500,
                  background: 'var(--white)', borderRadius: 10, padding: '9px 16px',
                  fontWeight: 700, fontSize: 13, color: 'var(--teal-dk)',
                  boxShadow: '0 2px 10px rgba(0,0,0,0.15)',
                }}>
                  {buildings.length} edifici trovati{city ? ` a ${city}` : ''}
                </div>
              )}

              {selectedBuilding && (
                isMobile
                  ? <MobileMapPreview building={selectedBuilding} onClose={() => setSelectedBuilding(null)} />
                  : <DesktopMapPreview building={selectedBuilding} onClose={() => setSelectedBuilding(null)} />
              )}
            </>
          )}
        </div>

        {mapState === 'hidden' && (
          <div style={{ flexShrink: 0, borderBottom: '1px solid var(--border)', padding: '10px 16px', display: 'flex', justifyContent: 'center' }}>
            <button onClick={() => setMapState('compact')} style={{ ...floatingBtn, boxShadow: 'none', border: '1px solid var(--border)' }}>
              <MapIcon /> Mostra mappa
            </button>
          </div>
        )}
      </div>

      {showFilters && (
        <FiltersDrawer feeCounts={feeCounts} onClose={() => setShowFilters(false)} />
      )}

      {/* Risultati: dissolvenza in/out quando la mappa passa a fullscreen */}
      <div style={{
        opacity: mapState === 'fullscreen' ? 0 : 1,
        pointerEvents: mapState === 'fullscreen' ? 'none' : 'auto',
        transition: `opacity ${TRANSITION}`,
      }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: isMobile ? '16px' : '24px 40px', display: 'flex', gap: 24, alignItems: 'flex-start' }}>
          {!isMobile && <FilterSidebar feeCounts={feeCounts} />}

          <div style={{ flex: 1, minWidth: isMobile ? 'unset' : 420, width: isMobile ? '100%' : 'auto' }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-2)', marginBottom: 16 }}>
              {`${buildings.length} edifici trovati${city ? ` a ${city}` : ''}`}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {buildings.map((b) => (
                <div key={b.id} id={`building-row-${b.id}`}>
                  <BuildingRow building={b} highlighted={highlightedId === b.id} />
                </div>
              ))}
              {buildings.length === 0 && (
                <div style={{ textAlign: 'center', padding: '48px 24px' }}>
                  <div style={{ fontSize: 40, marginBottom: 16 }}>📍</div>
                  <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 8 }}>
                    {query
                      ? `Nessun condominio registrato per "${query.split(',')[0]}"`
                      : 'Nessun edificio trovato'}
                  </div>
                  <p style={{ fontSize: 14, color: 'var(--text-3)', marginBottom: 24, maxWidth: 380, margin: '0 auto 24px' }}>
                    {query
                      ? 'Sii il primo a registrare questo condominio e condividere la tua esperienza.'
                      : "Prova a cercare in un'altra zona o aggiungi tu il condominio."}
                  </p>
                  <Link
                    href="/aggiungi-condominio"
                    style={{
                      display: 'inline-block',
                      padding: '12px 28px', borderRadius: 8, border: 'none',
                      background: 'var(--teal)', color: '#fff', fontWeight: 700,
                      fontSize: 15,
                    }}
                  >+ Aggiungi condominio</Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

function FiltersDrawer({ feeCounts, onClose }) {
  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', zIndex: 600 }} />
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 601,
        background: 'var(--white)', borderRadius: '16px 16px 0 0',
        padding: '20px 20px 40px', maxHeight: '80vh', overflowY: 'auto',
        boxShadow: '0 -8px 32px rgba(0,0,0,0.15)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <span style={{ fontSize: 16, fontWeight: 700 }}>Filtri</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--text-3)' }}>✕</button>
        </div>
        <FilterSidebar feeCounts={feeCounts} />
        <button onClick={onClose} style={{
          width: '100%', marginTop: 20, padding: '14px', borderRadius: 8, border: 'none',
          background: 'var(--teal)', color: '#fff', fontWeight: 700, fontSize: 15, cursor: 'pointer',
        }}>Applica filtri</button>
      </div>
    </>
  )
}

function pillBtn(active) {
  return {
    padding: '0 12px', height: 44, borderRadius: 8, border: '1px solid var(--border)',
    background: active ? 'var(--teal-lt)' : 'var(--white)',
    color: 'var(--teal-dk)', fontWeight: 600, fontSize: 13, cursor: 'pointer',
  }
}

const floatingBtn = {
  background: 'var(--white)', border: '1px solid var(--border)',
  borderRadius: 10, padding: '9px 14px', fontWeight: 700, fontSize: 12.5,
  cursor: 'pointer', color: 'var(--teal-dk)', boxShadow: '0 2px 10px rgba(0,0,0,0.15)',
  display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap',
}

function ExpandIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M8 3H3v5M16 3h5v5M8 21H3v-5M16 21h5v-5" />
    </svg>
  )
}

function CollapseIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 9h5V4M20 9h-5V4M4 15h5v5M20 15h-5v5" />
    </svg>
  )
}

function EyeOffIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M17.94 17.94A10.94 10.94 0 0112 20c-6 0-10-6-10-6a19.6 19.6 0 015.06-5.94M9.9 4.24A10.4 10.4 0 0112 4c6 0 10 6 10 6a19.6 19.6 0 01-2.22 2.9M14.12 14.12a3 3 0 11-4.24-4.24M1 1l22 22" />
    </svg>
  )
}

function MapIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 3L3 6v15l6-3 6 3 6-3V3l-6 3-6-3z" />
      <path d="M9 3v15M15 6v15" />
    </svg>
  )
}
