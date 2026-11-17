'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { List, Map as MapIcon, SlidersHorizontal, Wrench, X } from 'lucide-react'
import ResultsMap from '@/components/map/ResultsMap'
import PageHero from '@/components/directory/PageHero'
import DirectorySearch from '@/components/directory/DirectorySearch'
import CitySelect from '@/components/directory/CitySelect'
import QuickTabs from '@/components/directory/QuickTabs'
import SortSelect from '@/components/directory/SortSelect'
import { useParamNav } from '@/components/directory/useParamNav'
import { useSaved } from '@/components/directory/useSaved'
import SupplierFilterSidebar, { SUPPLIER_SORTS } from '@/components/suppliers/directory/SupplierFilterSidebar'
import SupplierRow from '@/components/suppliers/directory/SupplierRow'
import { useIsMobile } from '@/hooks/useIsMobile'

const TABS = [
  { id: '', label: 'Tutti' },
  { id: 'attivi', label: 'Più attivi' },
  { id: 'verificati', label: 'Verificati' },
  { id: 'nuovi', label: 'Nuovi' },
]

// Stessa impaginazione di Amministratori (testata, tab, colonna filtri, mappa).
// I fornitori lavorano per zona: sulla mappa c'è un pin per città servita
// con il numero di fornitori; toccandolo si filtra per quella città.
export default function SuppliersResultsView({ suppliers, cities, categoryCounts, city, total, cityPins = [] }) {
  const isMobile = useIsMobile()
  const { searchParams, setParams } = useParamNav()
  const { saved, toggle } = useSaved('saved_suppliers', 'supplier_id', '/fornitori')
  const onlySaved = searchParams.get('salvati') === '1'
  const list = onlySaved ? suppliers.filter((s) => saved.has(s.id)) : suppliers
  const [showFilters, setShowFilters] = useState(false)
  const filtersActive = Boolean(searchParams.get('cat'))
  const [showMap, setShowMap] = useState(false)
  const pickCity = (pin) => { setShowMap(false); setParams({ city: pin.city }) }

  useEffect(() => {
    if (isMobile && showMap) {
      document.body.style.overflow = 'hidden'
      return () => { document.body.style.overflow = '' }
    }
  }, [isMobile, showMap])

  return (
    <>
      <PageHero icon={<Wrench size={isMobile ? 26 : 30} strokeWidth={1.8} aria-hidden="true" />} title="Fornitori"
        subtitle="I Recofixer che lavorano con i condomini: idraulici, elettricisti, ascensoristi, imprese e non solo.">
        <DirectorySearch placeholder="Cerca fornitore o servizio" />
        <div className="dir-ctrls">
          <CitySelect cities={cities} allLabel="Tutte" />
          {isMobile && (
            <button type="button" className={`dir-ctrl${filtersActive ? ' is-on' : ''}`} onClick={() => setShowFilters(true)}>
              <SlidersHorizontal size={20} strokeWidth={2} aria-hidden="true" />Filtri
            </button>
          )}
          <button type="button" className={`dir-ctrl${showMap ? ' is-on' : ''}`} onClick={() => setShowMap((v) => !v)} aria-pressed={showMap}>
            {showMap && !isMobile ? <List size={20} strokeWidth={2} aria-hidden="true" /> : <MapIcon size={20} strokeWidth={2} aria-hidden="true" />}
            {showMap && !isMobile ? 'Lista' : 'Mappa'}
          </button>
          {!isMobile && (
            <Link href="/fornitore" className="dir-ctrl" style={{ color: '#6D28D9', borderColor: '#C4B5FD', background: '#F7F3FF' }}>
              <Wrench size={18} strokeWidth={2} aria-hidden="true" />Diventa Recofixer
            </Link>
          )}
        </div>
      </PageHero>

      <QuickTabs tabs={TABS} />

      {isMobile && showFilters && (
        <div className="dir-sheet-wrap" role="dialog" aria-modal="true" aria-label="Filtri">
          <div className="dir-sheet-backdrop" onClick={() => setShowFilters(false)} />
          <div className="dir-sheet" style={{ maxHeight: '85vh', overflowY: 'auto' }}>
            <div className="dir-sheet-head">
              <div className="dir-sheet-title">Filtri</div>
              <button type="button" onClick={() => setShowFilters(false)} aria-label="Chiudi" className="dir-sheet-close"><X size={22} /></button>
            </div>
            <SupplierFilterSidebar categoryCounts={categoryCounts} instant={false} onApplied={() => setShowFilters(false)} />
          </div>
        </div>
      )}

      {isMobile && showMap && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 300, display: 'flex', flexDirection: 'column', background: '#fff' }}>
          <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>
            <ResultsMap results={cityPins} height="100%" onResultSelect={pickCity} containerStyle={{ borderRadius: 0, border: 'none' }} />
            <button onClick={() => setShowMap(false)} style={{
              position: 'absolute', top: 12, left: 12, zIndex: 1000, minHeight: 0, background: 'var(--white)', border: '1px solid var(--border)',
              borderRadius: 20, padding: '8px 14px', fontWeight: 600, fontSize: 13, cursor: 'pointer', color: 'var(--teal-dk)',
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)', display: 'flex', alignItems: 'center', gap: 6,
            }}><List size={16} aria-hidden="true" />Lista</button>
          </div>
          <div style={{ padding: '10px 16px', background: 'var(--white)', borderTop: '1px solid var(--border)', fontSize: 13, color: 'var(--text-3)' }}>
            {cityPins.length ? 'Tocca una città per vedere i fornitori che ci lavorano.' : 'Nessuna città con fornitori da mostrare.'}
          </div>
        </div>
      )}

      <div className={`dir-results${!isMobile && showMap ? ' has-map' : ''}`}>
        {!isMobile && <SupplierFilterSidebar categoryCounts={categoryCounts} />}

        <div style={{ minWidth: 0 }}>
          <div className="dir-listhead">
            <span>{`${list.length} fornitor${list.length !== 1 ? 'i' : 'e'} trovat${list.length !== 1 ? 'i' : 'o'}${city ? ` a ${city}` : ''}`}</span>
            <SortSelect sorts={SUPPLIER_SORTS} defaultId="verified" tabsThatSort={['attivi', 'nuovi']} />
          </div>
          {onlySaved && (
            <button type="button" onClick={() => setParams({ salvati: null })} style={{
              display: 'inline-flex', alignItems: 'center', gap: 6, minHeight: 0, marginBottom: 12, padding: '6px 12px', borderRadius: 999,
              border: '1px solid var(--teal)', background: 'var(--teal-lt)', color: 'var(--teal-dk)', fontWeight: 700, fontSize: 13, cursor: 'pointer',
            }}>Solo salvati <X size={14} aria-hidden="true" /></button>
          )}
          <div className="dir-list">
            {list.map((s) => <SupplierRow key={s.id} supplier={s} saved={saved.has(s.id)} onToggleSave={() => toggle(s.id)} />)}
            {list.length === 0 && (
              <div className="empty">
                <div className="empty-title">{onlySaved ? 'Nessun fornitore salvato' : total === 0 ? 'Ancora nessun Recofixer' : 'Nessun fornitore trovato'}</div>
                <p>{onlySaved ? 'Tocca il segnalibro su una card per ritrovarla qui.' : total === 0 ? 'I primi fornitori stanno arrivando. Lavori con i condomini? Iscriviti gratis.' : 'Prova a cambiare categoria o città.'}</p>
              </div>
            )}
          </div>

          {isMobile && (
            <Link href="/fornitore" style={{
              marginTop: 18, display: 'flex', alignItems: 'center', gap: 12, padding: '16px 18px', borderRadius: 16,
              background: '#F3EEFF', border: '1px solid #DDD0FB', color: '#4C1D95',
            }}>
              <span style={{ width: 42, height: 42, borderRadius: 12, background: '#7C3AED', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Wrench size={20} aria-hidden="true" /></span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: 'block', fontWeight: 800, fontSize: 15 }}>Sei un fornitore?</span>
                <span style={{ display: 'block', fontSize: 13, color: '#6D28D9' }}>Diventa Recofixer e lavora con i condomini</span>
              </span>
            </Link>
          )}
        </div>

        {!isMobile && showMap && (
          <div style={{ position: 'sticky', top: 80 }}>
            <ResultsMap results={cityPins} height={520} onResultSelect={pickCity} />
            <p style={{ margin: '8px 0 0 2px', fontSize: 13, color: 'var(--text-3)' }}>
              {cityPins.length ? 'Ogni pin è una città servita, con il numero di fornitori. Toccala per filtrare.' : 'Nessuna città con fornitori da mostrare.'}
            </p>
          </div>
        )}
      </div>
    </>
  )
}
