'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import AdminRow from '@/components/admins/AdminRow'
import AdminCityTabs from '@/components/admins/AdminCityTabs'
import AdminSearchForm from '@/components/admins/AdminSearchForm'
import AdminFilterSidebar from '@/components/admins/AdminFilterSidebar'
import ResultsMap from '@/components/map/ResultsMap'
import MapLegend from '@/components/map/MapLegend'
import { DesktopMapPreview, MobileMapPreview } from '@/components/map/BuildingMapPreview'
import { useIsMobile } from '@/hooks/useIsMobile'

// Riceve admins/buildingsByAdmin/cities/feeCounts già filtrati/calcolati
// server-side (città + testo + range fee via searchParams). Qui restano solo
// stati di UI — mostra/nascondi mappa, drawer filtri mobile, riga espansa,
// pin selezionato — nessun rifetch dei dati. Il pannello mappa (dimensioni,
// popup, legenda, comportamento mobile fullscreen) rispecchia esattamente
// quello di Esplora (components/search/SearchResultsView.jsx) tramite lo
// stesso componente condiviso ResultsMap.
export default function AdminsResultsView({ admins, buildingsByAdmin, cities, feeCounts, city }) {
  const isMobile = useIsMobile()
  const [expandedId, setExpandedId] = useState(null)
  const [showMap, setShowMap] = useState(!isMobile)
  const [showFilters, setShowFilters] = useState(false)
  const [selectedBuilding, setSelectedBuilding] = useState(null)

  useEffect(() => {
    setShowMap(!isMobile)
  }, [isMobile])

  // blocca scroll body quando la mappa è full-screen su mobile
  useEffect(() => {
    if (isMobile && showMap) {
      document.body.style.overflow = 'hidden'
      return () => { document.body.style.overflow = '' }
    }
  }, [isMobile, showMap])

  const handleCloseMap = () => {
    setShowMap(false)
    setSelectedBuilding(null)
  }

  const expandedBuildings = expandedId
    ? (buildingsByAdmin[expandedId] || [])
    : Object.values(buildingsByAdmin).flat()

  // ResultsMap non conosce le rotte: ogni pagina passa il proprio href di dettaglio.
  const results = expandedBuildings.map((b) => ({ ...b, href: `/edificio/${b.id}` }))

  return (
    <>
      {/* Toolbar */}
      <div className="admins-toolbar" style={{ background: 'var(--white)', borderBottom: '1px solid var(--border)' }}>
        <div className="admins-toolbar-inner" style={{ maxWidth: 1360, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
          <AdminSearchForm />
          {isMobile ? (
            <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
              <button onClick={() => setShowFilters(v => !v)} style={{
                padding: '0 12px', height: 44, borderRadius: 8, border: '1px solid var(--border)',
                background: showFilters ? 'var(--teal-lt)' : 'var(--white)',
                color: 'var(--teal-dk)', fontWeight: 600, fontSize: 13, cursor: 'pointer',
              }}>Filtri</button>
              <button onClick={() => setShowMap(v => !v)} style={{
                padding: '0 12px', height: 44, borderRadius: 8, border: '1px solid var(--border)',
                background: showMap ? 'var(--teal-lt)' : 'var(--white)',
                color: 'var(--teal-dk)', fontWeight: 600, fontSize: 13, cursor: 'pointer',
              }}>{showMap ? '📋' : '🗺️'}</button>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 10, flexShrink: 0 }}>
              <Link href="/aggiungi-condominio" style={{
                padding: '9px 16px', borderRadius: 8, border: '1.5px solid var(--teal)',
                background: 'var(--teal-lt)', fontWeight: 600, fontSize: 13,
                color: 'var(--teal-dk)', whiteSpace: 'nowrap', display: 'inline-block',
              }}>+ Aggiungi condominio</Link>
              <button
                onClick={() => setShowMap(v => !v)}
                style={{
                  padding: '9px 18px', borderRadius: 8, border: '1px solid var(--border)',
                  background: 'var(--white)', fontWeight: 600, fontSize: 13, cursor: 'pointer',
                  color: 'var(--teal-dk)', whiteSpace: 'nowrap',
                }}
              >{showMap ? 'Chiudi mappa' : 'Mostra mappa'}</button>
            </div>
          )}
        </div>
      </div>

      <AdminCityTabs cities={cities} />

      {/* Drawer filtri mobile */}
      {isMobile && showFilters && (
        <>
          <div onClick={() => setShowFilters(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', zIndex: 200 }} />
          <div style={{
            position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 201,
            background: 'var(--white)', borderRadius: '16px 16px 0 0',
            padding: '20px 20px 40px', maxHeight: '80vh', overflowY: 'auto',
            boxShadow: '0 -8px 32px rgba(0,0,0,0.15)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <span style={{ fontSize: 16, fontWeight: 700 }}>Filtri</span>
              <button onClick={() => setShowFilters(false)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--text-3)' }}>✕</button>
            </div>
            <AdminFilterSidebar feeCounts={feeCounts} />
            <button onClick={() => setShowFilters(false)} style={{
              width: '100%', marginTop: 20, padding: '14px', borderRadius: 8, border: 'none',
              background: 'var(--teal)', color: '#fff', fontWeight: 700, fontSize: 15, cursor: 'pointer',
            }}>Applica filtri</button>
          </div>
        </>
      )}

      {/* Mappa full-screen su mobile */}
      {isMobile && showMap && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 300, display: 'flex', flexDirection: 'column', background: '#fff' }}>
          <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>
            <ResultsMap
              results={results}
              height="100%"
              onResultSelect={setSelectedBuilding}
              containerStyle={{ borderRadius: 0, border: 'none' }}
            />
            <button
              onClick={handleCloseMap}
              style={{
                position: 'absolute', top: 12, left: 12, zIndex: 1000,
                background: 'var(--white)', border: '1px solid var(--border)',
                borderRadius: 20, padding: '8px 14px',
                fontWeight: 600, fontSize: 13, cursor: 'pointer',
                color: 'var(--teal-dk)', boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                display: 'flex', alignItems: 'center', gap: 6,
              }}
            >← Lista</button>
            {selectedBuilding && (
              <MobileMapPreview
                building={selectedBuilding}
                onClose={() => setSelectedBuilding(null)}
              />
            )}
          </div>
          <div style={{ padding: '8px 16px', background: 'var(--white)', borderTop: '1px solid var(--border)' }}>
            <MapLegend />
          </div>
        </div>
      )}

      {/* Layout: 3 colonne desktop (filtri, lista, mappa), 1 colonna mobile */}
      <div className={`admins-results-grid${!isMobile ? ' has-filters' : ''}${(!isMobile && showMap) ? ' has-map' : ''}`} style={{
        maxWidth: 1360, margin: '0 auto',
        display: 'grid',
        gap: 28, alignItems: 'start',
      }}>
        {!isMobile && <AdminFilterSidebar feeCounts={feeCounts} />}

        {/* Admin list */}
        <div>
          <div style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: 16 }}>
            {`${admins.length} amministrator${admins.length !== 1 ? 'i' : 'e'}${city ? ` a ${city}` : ''}`}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {admins.map(a => (
              <AdminRow
                key={a.id}
                admin={a}
                buildings={buildingsByAdmin[a.id] || []}
                expanded={expandedId === a.id}
                onToggle={() => { setExpandedId(expandedId === a.id ? null : a.id); setSelectedBuilding(null) }}
              />
            ))}
            {admins.length === 0 && (
              <div className="empty">
                <div className="empty-title">Nessun amministratore trovato</div>
                <p>Prova a cambiare città.</p>
              </div>
            )}
          </div>
        </div>

        {/* Mappa desktop — sticky a destra */}
        {!isMobile && showMap && (
          <div style={{ position: 'sticky', top: 80 }}>
            <div style={{ position: 'relative' }}>
              <ResultsMap
                results={results}
                height={520}
                onResultSelect={setSelectedBuilding}
              />
              {selectedBuilding && (
                <DesktopMapPreview
                  building={selectedBuilding}
                  onClose={() => setSelectedBuilding(null)}
                />
              )}
            </div>
            <div style={{ marginTop: 8, paddingLeft: 2 }}>
              <MapLegend />
            </div>
          </div>
        )}
      </div>
    </>
  )
}
