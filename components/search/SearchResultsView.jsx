'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Compass, List, Map as MapIcon, Plus, SlidersHorizontal, X } from 'lucide-react'
import SearchBar from '@/components/search/SearchBar'
import FilterSidebar from '@/components/search/FilterSidebar'
import BuildingRow from '@/components/buildings/BuildingRow'
import ResultsMap from '@/components/map/ResultsMap'
import MapLegend from '@/components/map/MapLegend'
import { DesktopMapPreview, MobileMapPreview } from '@/components/map/BuildingMapPreview'
import PageHero from '@/components/directory/PageHero'
import CitySelect from '@/components/directory/CitySelect'
import { useParamNav } from '@/components/directory/useParamNav'
import { useIsMobile } from '@/hooks/useIsMobile'

// Esplora: stessa testata di Amministratori e Fornitori (ricerca, città,
// filtri, mappa). La mappa si apre col tasto Mappa: a schermo intero su
// mobile, in colonna accanto alla lista su desktop.
export default function SearchResultsView({ buildings, cities, feeCounts, query, city, focusLat, focusLng }) {
  const isMobile = useIsMobile()
  const { searchParams } = useParamNav()
  const [showMap, setShowMap] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [selectedBuilding, setSelectedBuilding] = useState(null)

  const results = buildings.map((b) => ({ ...b, href: `/edificio/${b.id}` }))
  const filtersActive = ['feeMin', 'feeMax', 'amenities', 'sort'].some((k) => searchParams.get(k))
  const closeMap = () => { setShowMap(false); setSelectedBuilding(null) }

  useEffect(() => {
    if (isMobile && (showMap || showFilters)) {
      document.body.style.overflow = 'hidden'
      return () => { document.body.style.overflow = '' }
    }
  }, [isMobile, showMap, showFilters])

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <PageHero icon={<Compass size={isMobile ? 26 : 30} strokeWidth={1.8} aria-hidden="true" />} title="Esplora"
        subtitle="Cerca il condominio per via, quartiere o città: valutazioni, spese e recensioni di chi ci vive.">
        <SearchBar initial={query} variant="dir" />
        <div className="dir-ctrls">
          <CitySelect cities={cities} allLabel="Tutte" />
          {isMobile && (
            <button type="button" className={`dir-ctrl${filtersActive ? ' is-on' : ''}`} onClick={() => setShowFilters(true)}>
              <SlidersHorizontal size={20} strokeWidth={2} aria-hidden="true" />Filtri
            </button>
          )}
          <button type="button" className={`dir-ctrl${showMap ? ' is-on' : ''}`} onClick={() => (showMap ? closeMap() : setShowMap(true))} aria-pressed={showMap}>
            {showMap && !isMobile ? <List size={20} strokeWidth={2} aria-hidden="true" /> : <MapIcon size={20} strokeWidth={2} aria-hidden="true" />}
            {showMap && !isMobile ? 'Lista' : 'Mappa'}
          </button>
          {!isMobile && (
            <Link href="/aggiungi-condominio" className="dir-ctrl">
              <Plus size={18} strokeWidth={2.2} aria-hidden="true" />Aggiungi condominio
            </Link>
          )}
        </div>
      </PageHero>

      {isMobile && showFilters && (
        <div className="dir-sheet-wrap" role="dialog" aria-modal="true" aria-label="Filtri">
          <div className="dir-sheet-backdrop" onClick={() => setShowFilters(false)} />
          <div className="dir-sheet" style={{ maxHeight: '85vh', overflowY: 'auto' }}>
            <div className="dir-sheet-head">
              <div className="dir-sheet-title">Filtri</div>
              <button type="button" onClick={() => setShowFilters(false)} aria-label="Chiudi" className="dir-sheet-close"><X size={22} /></button>
            </div>
            <FilterSidebar feeCounts={feeCounts} instant={false} onApplied={() => setShowFilters(false)} />
          </div>
        </div>
      )}

      {isMobile && showMap && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 300, display: 'flex', flexDirection: 'column', background: '#fff' }}>
          <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>
            <ResultsMap results={results} height="100%" focusLat={focusLat} focusLng={focusLng} onResultSelect={setSelectedBuilding} containerStyle={{ borderRadius: 0, border: 'none' }} />
            <button onClick={closeMap} style={{
              position: 'absolute', top: 12, left: 12, zIndex: 1000, minHeight: 0, background: 'var(--white)', border: '1px solid var(--border)',
              borderRadius: 20, padding: '8px 14px', fontWeight: 600, fontSize: 13, cursor: 'pointer', color: 'var(--teal-dk)',
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)', display: 'flex', alignItems: 'center', gap: 6,
            }}><List size={16} aria-hidden="true" />Lista</button>
            {selectedBuilding && <MobileMapPreview building={selectedBuilding} onClose={() => setSelectedBuilding(null)} />}
          </div>
          <div style={{ padding: '8px 16px', background: 'var(--white)', borderTop: '1px solid var(--border)' }}><MapLegend /></div>
        </div>
      )}

      <div className={`dir-results${!isMobile && showMap ? ' has-map' : ''}`}>
        {!isMobile && <FilterSidebar feeCounts={feeCounts} />}

        <div style={{ minWidth: 0 }}>
          <div className="dir-listhead">
            <span>{`${buildings.length} ${buildings.length === 1 ? 'edificio trovato' : 'edifici trovati'}${city ? ` a ${city}` : ''}`}</span>
          </div>
          <div className="dir-list">
            {buildings.map((b) => (
              <div key={b.id} id={`building-row-${b.id}`}>
                <BuildingRow building={b} highlighted={selectedBuilding?.id === b.id} />
              </div>
            ))}
            {buildings.length === 0 && (
              <div className="empty">
                <div className="empty-title">
                  {query ? `Nessun condominio registrato per "${query.split(',')[0]}"` : 'Nessun edificio trovato'}
                </div>
                <p>
                  {query
                    ? 'Sii il primo a registrare questo condominio e condividere la tua esperienza.'
                    : "Prova a cercare in un'altra zona o aggiungi tu il condominio."}
                </p>
                <Link href="/aggiungi-condominio" className="dir-search-btn" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 8, textDecoration: 'none' }}>
                  <Plus size={18} aria-hidden="true" />Aggiungi condominio
                </Link>
              </div>
            )}
          </div>
        </div>

        {!isMobile && showMap && (
          <div style={{ position: 'sticky', top: 80 }}>
            <div style={{ position: 'relative' }}>
              <ResultsMap results={results} height={520} focusLat={focusLat} focusLng={focusLng} onResultSelect={setSelectedBuilding} />
              {selectedBuilding && <DesktopMapPreview building={selectedBuilding} onClose={() => setSelectedBuilding(null)} />}
            </div>
            <div style={{ marginTop: 8, paddingLeft: 2 }}><MapLegend /></div>
          </div>
        )}
      </div>
    </div>
  )
}
