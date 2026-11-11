'use client'

import { useEffect, useState } from 'react'
import { Building2, Map as MapIcon, List, SlidersHorizontal, X } from 'lucide-react'
import AdminRow from '@/components/admins/AdminRow'
import AdminFilterSidebar from '@/components/admins/AdminFilterSidebar'
import ResultsMap from '@/components/map/ResultsMap'
import MapLegend from '@/components/map/MapLegend'
import { DesktopMapPreview, MobileMapPreview } from '@/components/map/BuildingMapPreview'
import PageHero from '@/components/directory/PageHero'
import DirectorySearch from '@/components/directory/DirectorySearch'
import CitySelect from '@/components/directory/CitySelect'
import QuickTabs from '@/components/directory/QuickTabs'
import SortSelect from '@/components/directory/SortSelect'
import { useParamNav } from '@/components/directory/useParamNav'
import { useIsMobile } from '@/hooks/useIsMobile'
import { useSaved } from '@/components/directory/useSaved'

export const ADMIN_TABS = [
  { id: '', label: 'Tutte' },
  { id: 'recensiti', label: 'Più recensiti' },
  { id: 'attivi', label: 'Più attivi' },
  { id: 'certificati', label: 'Certificati' },
]
const ADMIN_SORT_OPTIONS = [
  { id: 'rilevanti', label: 'Più rilevanti' },
  { id: 'valutazione', label: 'Valutazione migliore' },
  { id: 'recensioni', label: 'Più recensioni' },
  { id: 'condomini', label: 'Più condomini gestiti' },
  { id: 'anzianita', label: 'Attivi da più tempo' },
  { id: 'nome', label: 'Nome (A-Z)' },
]

export default function AdminsResultsView({ admins, buildingsByAdmin, cities, feeCounts, city }) {
  const isMobile = useIsMobile()
  const { searchParams, setParams } = useParamNav()
  const [showMap, setShowMap] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [selectedBuilding, setSelectedBuilding] = useState(null)
  const { saved, toggle } = useSaved('saved_admins', 'administrator_id', '/amministratori')
  const onlySaved = searchParams.get('salvati') === '1'
  const list = onlySaved ? admins.filter((a) => saved.has(a.id)) : admins

  // mappa a schermo intero su mobile: blocca lo scroll sotto
  useEffect(() => {
    if (isMobile && showMap) {
      document.body.style.overflow = 'hidden'
      return () => { document.body.style.overflow = '' }
    }
  }, [isMobile, showMap])

  const results = list.flatMap((a) => buildingsByAdmin[a.id] || []).map((b) => ({ ...b, href: `/edificio/${b.id}` }))
  const filtersActive = ['feeMin', 'feeMax', 'rec'].some((k) => searchParams.get(k))
  const closeMap = () => { setShowMap(false); setSelectedBuilding(null) }

  return (
    <>
      <PageHero icon={<Building2 size={isMobile ? 26 : 30} strokeWidth={1.8} aria-hidden="true" />} title="Amministratori"
        subtitle="Scopri reputazione, stabili gestiti e recensioni degli amministratori di condominio prima di averci a che fare.">
        <DirectorySearch placeholder="Cerca un amministratore..." />
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
        </div>
      </PageHero>

      <QuickTabs tabs={ADMIN_TABS} />

      {isMobile && showFilters && (
        <div className="dir-sheet-wrap" role="dialog" aria-modal="true" aria-label="Filtri">
          <div className="dir-sheet-backdrop" onClick={() => setShowFilters(false)} />
          <div className="dir-sheet" style={{ maxHeight: '85vh', overflowY: 'auto' }}>
            <div className="dir-sheet-head">
              <div className="dir-sheet-title">Filtri</div>
              <button type="button" onClick={() => setShowFilters(false)} aria-label="Chiudi" className="dir-sheet-close"><X size={22} /></button>
            </div>
            <AdminFilterSidebar feeCounts={feeCounts} instant={false} onApplied={() => setShowFilters(false)} />
          </div>
        </div>
      )}

      {isMobile && showMap && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 300, display: 'flex', flexDirection: 'column', background: '#fff' }}>
          <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>
            <ResultsMap results={results} height="100%" onResultSelect={setSelectedBuilding} containerStyle={{ borderRadius: 0, border: 'none' }} />
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
        {!isMobile && <AdminFilterSidebar feeCounts={feeCounts} />}

        <div style={{ minWidth: 0 }}>
          <div className="dir-listhead">
            <span>{`${list.length} amministrator${list.length !== 1 ? 'i' : 'e'} trovat${list.length !== 1 ? 'i' : 'o'}${city ? ` a ${city}` : ''}`}</span>
            <SortSelect sorts={ADMIN_SORT_OPTIONS} defaultId="rilevanti" tabsThatSort={['recensiti', 'attivi']} />
          </div>
          {onlySaved && (
            <button type="button" onClick={() => setParams({ salvati: null })} style={{
              display: 'inline-flex', alignItems: 'center', gap: 6, minHeight: 0, marginBottom: 12, padding: '6px 12px', borderRadius: 999,
              border: '1px solid var(--teal)', background: 'var(--teal-lt)', color: 'var(--teal-dk)', fontWeight: 700, fontSize: 13, cursor: 'pointer',
            }}>Solo salvati <X size={14} aria-hidden="true" /></button>
          )}
          <div className="dir-list">
            {list.map((a) => (
              <AdminRow key={a.id} admin={a} saved={saved.has(a.id)} onToggleSave={() => toggle(a.id)} />
            ))}
            {list.length === 0 && (
              <div className="empty">
                <div className="empty-title">{onlySaved ? 'Nessun amministratore salvato' : 'Nessun amministratore trovato'}</div>
                <p>{onlySaved ? 'Tocca il segnalibro su una card per ritrovarla qui.' : 'Prova a cambiare città o filtri.'}</p>
              </div>
            )}
          </div>
        </div>

        {!isMobile && showMap && (
          <div style={{ position: 'sticky', top: 80 }}>
            <div style={{ position: 'relative' }}>
              <ResultsMap results={results} height={520} onResultSelect={setSelectedBuilding} />
              {selectedBuilding && <DesktopMapPreview building={selectedBuilding} onClose={() => setSelectedBuilding(null)} />}
            </div>
            <div style={{ marginTop: 8, paddingLeft: 2 }}><MapLegend /></div>
          </div>
        )}
      </div>
    </>
  )
}
