'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import SearchBar from '@/components/search/SearchBar'
import SearchFilters from '@/components/search/SearchFilters'
import FilterSidebar from '@/components/search/FilterSidebar'
import BuildingRow from '@/components/buildings/BuildingRow'
import MapView from '@/components/map/MapView'
import { useIsMobile } from '@/hooks/useIsMobile'
import { scoreColor } from '@/lib/score'

// Riceve buildings già filtrati server-side (query testo + città + servizi via
// searchParams). Qui restano solo stati puramente di UI — mostra/nascondi
// mappa, drawer filtri mobile, pin selezionato — nessun rifetch dei dati.
export default function SearchResultsView({ buildings, cities, feeCounts, query, city, focusLat, focusLng }) {
  const isMobile = useIsMobile()
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

  return (
    <>
      {/* Search bar sticky */}
      <div style={{ background: 'var(--white)', borderBottom: '1px solid var(--border)', padding: isMobile ? '12px 16px' : '16px 40px' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
          <SearchBar initial={query} size="sm" />
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
              <button onClick={() => setShowMap(v => !v)} style={{
                padding: '9px 18px', borderRadius: 8, border: '1px solid var(--border)',
                background: 'var(--white)', fontWeight: 600, fontSize: 13, cursor: 'pointer',
                color: 'var(--teal-dk)', whiteSpace: 'nowrap',
              }}>{showMap ? 'Chiudi mappa' : 'Mostra mappa'}</button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile filter drawer */}
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
            <FilterSidebar feeCounts={feeCounts} />
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
            <MapView
              buildings={buildings}
              height="100%"
              focusLat={focusLat}
              focusLng={focusLng}
              onBuildingSelect={setSelectedBuilding}
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
          <div style={{ padding: '8px 16px', background: 'var(--white)', display: 'flex', gap: 10, flexWrap: 'wrap', borderTop: '1px solid var(--border)' }}>
            <MapLegendDot color="#0D676F" label="Ottima (4.3+)" />
            <MapLegendDot color="#F59E0B" label="Media (3.5–4.2)" />
            <MapLegendDot color="#EF4444" label="Da migliorare" />
            <MapLegendDot color="#9CA3AF" label="Nessun rating" />
          </div>
        </div>
      )}

      <SearchFilters cities={cities} />

      {/* Layout desktop: 3 colonne */}
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: isMobile ? '16px' : '24px 40px', display: 'flex', gap: 24, alignItems: 'flex-start' }}>
        {!isMobile && <FilterSidebar feeCounts={feeCounts} />}

        {/* Lista edifici */}
        <div style={{ flex: 1, minWidth: isMobile ? 'unset' : 420, width: isMobile ? '100%' : 'auto' }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-2)', marginBottom: 16 }}>
            {`${buildings.length} edifici trovati${city ? ` a ${city}` : ''}`}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {buildings.map((b) => <BuildingRow key={b.id} building={b} />)}
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

        {/* Mappa desktop — sticky a destra */}
        {!isMobile && showMap && (
          <div style={{ width: 380, flexShrink: 0 }}>
            <div style={{ position: 'sticky', top: 80 }}>
              <div style={{ position: 'relative' }}>
                <MapView
                  buildings={buildings}
                  height={520}
                  focusLat={focusLat}
                  focusLng={focusLng}
                  onBuildingSelect={setSelectedBuilding}
                />
                {selectedBuilding && (
                  <DesktopMapPreview
                    building={selectedBuilding}
                    onClose={() => setSelectedBuilding(null)}
                  />
                )}
              </div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 8, paddingLeft: 2 }}>
                <MapLegendDot color="#0D676F" label="Ottima (4.3+)" />
                <MapLegendDot color="#F59E0B" label="Media (3.5–4.2)" />
                <MapLegendDot color="#EF4444" label="Da migliorare" />
                <MapLegendDot color="#9CA3AF" label="Nessun rating" />
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}

function MobileMapPreview({ building: b, onClose }) {
  return (
    <div style={{
      position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 1000,
      background: 'var(--white)', borderRadius: '16px 16px 0 0',
      padding: '12px 16px 28px',
      boxShadow: '0 -4px 24px rgba(0,0,0,0.18)',
    }}>
      <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--border)', margin: '0 auto 14px' }} />
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 14 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--teal-dk)', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {b.address}{b.street_number ? `, ${b.street_number}` : ''}
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: 8 }}>
            {b.neighborhood ? `${b.neighborhood} · ` : ''}{b.city}
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            {b.score != null && (
              <span style={{ fontSize: 15, fontWeight: 800, color: scoreColor(b.score) }}>{b.score.toFixed(1)}</span>
            )}
            <span style={{ fontSize: 12, color: 'var(--text-3)' }}>
              {b.review_count || 0} {b.review_count === 1 ? 'recensione' : 'recensioni'}
            </span>
            {b.status === 'verified' && (
              <span style={{ background: 'var(--teal-lt)', color: 'var(--teal-dk)', fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 100 }}>
                Verificato
              </span>
            )}
          </div>
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'none', border: '1px solid var(--border)', borderRadius: '50%',
            width: 30, height: 30, cursor: 'pointer', fontSize: 14, color: 'var(--text-3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}
        >✕</button>
      </div>
      <Link
        href={`/edificio/${b.id}`}
        style={{
          display: 'block', textAlign: 'center', boxSizing: 'border-box',
          width: '100%', padding: '13px', borderRadius: 10, border: 'none',
          background: 'var(--teal)', color: '#fff', fontWeight: 700, fontSize: 15,
        }}
      >Vedi dettagli</Link>
    </div>
  )
}

function DesktopMapPreview({ building: b, onClose }) {
  return (
    <div style={{
      position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 500,
      background: 'var(--white)', borderTop: '1px solid var(--border)',
      padding: '12px 14px 14px', borderRadius: '0 0 10px 10px',
    }}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--teal-dk)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 2 }}>
            {b.address}{b.street_number ? `, ${b.street_number}` : ''}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-3)' }}>
            {b.neighborhood ? `${b.neighborhood} · ` : ''}{b.city}
          </div>
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 16, color: 'var(--text-3)', padding: '0 4px', flexShrink: 0,
          }}
        >✕</button>
      </div>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 10 }}>
        {b.score != null && (
          <span style={{ fontSize: 14, fontWeight: 800, color: scoreColor(b.score) }}>{b.score.toFixed(1)}</span>
        )}
        <span style={{ fontSize: 12, color: 'var(--text-3)' }}>
          {b.review_count || 0} {b.review_count === 1 ? 'recensione' : 'recensioni'}
        </span>
        {b.status === 'verified' && (
          <span style={{ background: 'var(--teal-lt)', color: 'var(--teal-dk)', fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 100 }}>
            Verificato
          </span>
        )}
      </div>
      <Link
        href={`/edificio/${b.id}`}
        style={{
          display: 'block', textAlign: 'center', boxSizing: 'border-box',
          width: '100%', padding: '9px', borderRadius: 8, border: 'none',
          background: 'var(--teal)', color: '#fff', fontWeight: 700, fontSize: 13,
        }}
      >Vedi dettagli</Link>
    </div>
  )
}

function MapLegendDot({ color, label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, color: 'var(--text-3)' }}>
      <div style={{ width: 9, height: 9, borderRadius: '50%', background: color, flexShrink: 0 }} />
      {label}
    </div>
  )
}
