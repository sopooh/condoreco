'use client'

import { EyeOff, Map as LMap, Maximize2, Minimize2, X } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import SearchBar from '@/components/search/SearchBar'
import SearchFilters from '@/components/search/SearchFilters'
import FilterSidebar from '@/components/search/FilterSidebar'
import BuildingRow from '@/components/buildings/BuildingRow'
import ResultsMap from '@/components/map/ResultsMap'
import MapLegend from '@/components/map/MapLegend'
import { DesktopMapPreview } from '@/components/map/BuildingMapPreview'
import { useIsMobile } from '@/hooks/useIsMobile'

const NAVBAR_HEIGHT = 58 // components/nav/Navbar.jsx
const COMPACT_MAP_HEIGHT = 280
const TRANSITION = '280ms ease'
const AUTO_HIDE_AFTER_PX = 24   // scroll verso il basso oltre cui la mappa compatta si chiude

// Esplora: preview mappa in alto (sticky sotto navbar+search) + schede sotto,
// stile Booking. Un'unica istanza Leaflet resta sempre montata — mapState
// ('compact' | 'fullscreen' | 'hidden') ridimensiona solo il container, non
// la ricrea mai: centro/zoom/marker restano intatti a ogni cambio stato
// (vedi ResizeObserver in ResultsMapInner). Si cambia stato con i bottoni
// ("Apri mappa" / "Riduci mappa" / "Nascondi mappa" / "Mostra mappa"); in
// più, ogni volta che la mappa è compatta e si scorre la lista verso il
// basso, si chiude da sola. Riaprirla è sempre e solo col bottone.
export default function SearchResultsView({ buildings, cities, feeCounts, query, city, focusLat, focusLng }) {
  const isMobile = useIsMobile()
  const [mapState, setMapState] = useState('compact')
  const [showFilters, setShowFilters] = useState(false)
  const closeFilters = useCallback(() => setShowFilters(false), [])
  const [selectedBuilding, setSelectedBuilding] = useState(null)
  const [highlightedId, setHighlightedId] = useState(null)
  const stickyRef = useRef(null)
  const ignoreScrollUntilRef = useRef(0)

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

  // Pin toccato: si porta in vista la scheda di quella casa nella lista sotto,
  // tenendo conto del blocco sticky (navbar + ricerca + mappa) che la coprirebbe.
  const [focusTick, setFocusTick] = useState(0)
  useEffect(() => {
    if (!highlightedId || mapState !== 'compact') return
    const el = document.getElementById(`building-row-${highlightedId}`)
    if (!el) return
    // scroll programmatico: non deve chiudere la mappa
    ignoreScrollUntilRef.current = Date.now() + 1200
    // in fullscreen -> compact il blocco sticky si sta ancora ridimensionando
    const t = setTimeout(() => {
      const stickyH = stickyRef.current?.getBoundingClientRect().height || 0
      const top = el.getBoundingClientRect().top + window.scrollY - NAVBAR_HEIGHT - stickyH - 12
      ignoreScrollUntilRef.current = Date.now() + 1200
      window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' })
    }, 320)
    return () => clearTimeout(t)
  }, [highlightedId, mapState, focusTick])

  // Chiusura automatica: ogni volta che la mappa è compatta e si scorre
  // verso il basso di almeno AUTO_HIDE_AFTER_PX rispetto al punto in cui
  // è stata aperta. Nessun gesto la riapre: solo "Mostra mappa".
  useEffect(() => {
    if (mapState !== 'compact') return
    let startY = window.scrollY
    let lastY = startY
    // appena riaperta (anche a pagina già scrollata) si lascia un attimo di tregua
    ignoreScrollUntilRef.current = Math.max(ignoreScrollUntilRef.current, Date.now() + 400)
    const onScroll = () => {
      const y = window.scrollY
      const goingDown = y > lastY
      lastY = y
      if (Date.now() < ignoreScrollUntilRef.current) { startY = y; return }
      if (!goingDown) { startY = Math.min(startY, y); return }
      if (y - startY > AUTO_HIDE_AFTER_PX) {
        setSelectedBuilding(null)
        setMapState('hidden')
      }
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [mapState])

  function handleMarkerClick(building) {
    setHighlightedId(building.id)
    setFocusTick(t => t + 1)
    if (isMobile) {
      // su mobile niente popup sopra la mappa: si mostra la scheda nella lista
      setSelectedBuilding(null)
      if (mapState === 'fullscreen') setMapState('compact')
    } else {
      setSelectedBuilding(building)
    }
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
          transition: `height ${TRANSITION}, margin ${TRANSITION}, border-radius ${TRANSITION}`,
          // compatta: card arrotondata con bordo teal, staccata dai bordi
          ...(mapState === 'compact'
            ? { margin: isMobile ? '12px 16px 4px' : '16px 40px 4px', borderRadius: 16, border: '1.5px solid rgba(13,103,111,0.45)' }
            : { margin: 0, borderRadius: 0, border: 'none' }),
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

              {selectedBuilding && !isMobile && (
                <DesktopMapPreview building={selectedBuilding} onClose={() => setSelectedBuilding(null)} />
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
        <FiltersDrawer feeCounts={feeCounts} onClose={closeFilters} />
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
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev }
  }, [onClose])

  return (
    <>
      <div onClick={onClose} className="fsheet-backdrop" />
      <div role="dialog" aria-modal="true" aria-label="Filtri" className="fsheet">
        <svg className="fsheet-wave" viewBox="0 0 390 70" preserveAspectRatio="none" aria-hidden="true">
          <defs>
            <linearGradient id="fsheetWave" x1="0" x2="1" y1="0" y2="0">
              <stop offset="0" stopColor="#0D676F" stopOpacity="0.03" />
              <stop offset="1" stopColor="#0D676F" stopOpacity="0.22" />
            </linearGradient>
          </defs>
          <path d="M0 0h390v8c-60 18-110 46-190 44C120 50 60 30 0 34z" fill="url(#fsheetWave)" />
        </svg>
        <div className="fsheet-handle" />
        <div className="fsheet-head">
          <h2>Filtri</h2>
          <button type="button" onClick={onClose} aria-label="Chiudi filtri" className="fsheet-close">
            <X size={26} strokeWidth={1.8} aria-hidden="true" />
          </button>
        </div>
        <FilterSidebar feeCounts={feeCounts} instant={false} onApplied={onClose} />
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

function ExpandIcon({ size = 14 } = {}) { return <Maximize2 size={size} strokeWidth={2} aria-hidden="true" /> }

function CollapseIcon({ size = 14 } = {}) { return <Minimize2 size={size} strokeWidth={2} aria-hidden="true" /> }

function EyeOffIcon({ size = 14 } = {}) { return <EyeOff size={size} strokeWidth={2} aria-hidden="true" /> }

function MapIcon({ size = 14 } = {}) { return <LMap size={size} strokeWidth={2} aria-hidden="true" /> }
