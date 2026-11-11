'use client'

import { useState } from 'react'
import Link from 'next/link'
import { SlidersHorizontal, Wrench, X } from 'lucide-react'
import AdminSearchForm from '@/components/admins/AdminSearchForm'
import AdminCityTabs from '@/components/admins/AdminCityTabs'
import SupplierFilterSidebar from '@/components/suppliers/directory/SupplierFilterSidebar'
import SupplierRow from '@/components/suppliers/directory/SupplierRow'
import { useIsMobile } from '@/hooks/useIsMobile'

// Stessa impaginazione di Amministratori (hero, toolbar, città, colonna
// filtri + lista) senza mappa: i fornitori lavorano per zona, non per indirizzo.
export default function SuppliersResultsView({ suppliers, cities, categoryCounts, city, total }) {
  const isMobile = useIsMobile()
  const [expandedId, setExpandedId] = useState(null)
  const [showFilters, setShowFilters] = useState(false)

  return (
    <>
      <div className="admins-toolbar" style={{ background: 'var(--white)', borderBottom: '1px solid var(--border)' }}>
        <div className="admins-toolbar-inner" style={{ maxWidth: 1360, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
          <AdminSearchForm placeholder="Cerca fornitore o servizio..." />
          {isMobile ? (
            <button onClick={() => setShowFilters(true)} aria-label="Filtri" style={{
              padding: '0 12px', height: 44, borderRadius: 8, border: '1px solid var(--border)', flexShrink: 0,
              background: showFilters ? 'var(--teal-lt)' : 'var(--white)', color: 'var(--teal-dk)', fontWeight: 600, fontSize: 13,
              cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6,
            }}><SlidersHorizontal size={16} strokeWidth={2} aria-hidden="true" />Filtri</button>
          ) : (
            <Link href="/fornitore" style={{
              padding: '9px 16px', borderRadius: 8, border: '1.5px solid #7C3AED', background: '#F3EEFF',
              fontWeight: 600, fontSize: 13, color: '#6D28D9', whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: 6,
            }}><Wrench size={15} strokeWidth={2} aria-hidden="true" />Diventa Recofixer</Link>
          )}
        </div>
      </div>

      {cities.length > 0 && <AdminCityTabs cities={cities} />}

      {isMobile && showFilters && (
        <>
          <div onClick={() => setShowFilters(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', zIndex: 200 }} />
          <div role="dialog" aria-label="Filtri" style={{
            position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 201, background: 'var(--white)', borderRadius: '20px 20px 0 0',
            padding: '20px 20px 32px', maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 -8px 32px rgba(0,0,0,0.15)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <span style={{ fontSize: 18, fontWeight: 800 }}>Filtri</span>
              <button onClick={() => setShowFilters(false)} aria-label="Chiudi" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', minHeight: 0, display: 'flex' }}><X size={22} strokeWidth={2} aria-hidden="true" /></button>
            </div>
            <SupplierFilterSidebar categoryCounts={categoryCounts} instant={false} onApplied={() => setShowFilters(false)} />
          </div>
        </>
      )}

      <div className={`admins-results-grid${!isMobile ? ' has-filters' : ''}`} style={{ maxWidth: 1360, margin: '0 auto', display: 'grid', gap: 28, alignItems: 'start', ...(!isMobile ? { gridTemplateColumns: '300px minmax(0, 1fr)' } : {}) }}>
        {!isMobile && <SupplierFilterSidebar categoryCounts={categoryCounts} />}

        <div>
          <div style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: 16 }}>
            {`${suppliers.length} fornitor${suppliers.length !== 1 ? 'i' : 'e'}${city ? ` a ${city}` : ''}`}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {suppliers.map((s) => (
              <SupplierRow key={s.id} supplier={s} expanded={expandedId === s.id} onToggle={() => setExpandedId(expandedId === s.id ? null : s.id)} />
            ))}
            {suppliers.length === 0 && (
              <div className="empty">
                <div className="empty-title">{total === 0 ? 'Ancora nessun Recofixer' : 'Nessun fornitore trovato'}</div>
                <p>{total === 0
                  ? 'I primi fornitori stanno arrivando. Lavori con i condomini? Iscriviti gratis.'
                  : 'Prova a cambiare categoria o città.'}</p>
              </div>
            )}
          </div>

          {isMobile && (
            <Link href="/fornitore" style={{
              marginTop: 18, display: 'flex', alignItems: 'center', gap: 12, padding: '16px 18px', borderRadius: 14,
              background: '#F3EEFF', border: '1px solid #DDD0FB', color: '#4C1D95',
            }}>
              <span style={{ width: 40, height: 40, borderRadius: 12, background: '#7C3AED', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Wrench size={20} aria-hidden="true" /></span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: 'block', fontWeight: 800, fontSize: 15 }}>Sei un fornitore?</span>
                <span style={{ display: 'block', fontSize: 13, color: '#6D28D9' }}>Diventa Recofixer e lavora con i condomini</span>
              </span>
            </Link>
          )}
        </div>
      </div>
    </>
  )
}
