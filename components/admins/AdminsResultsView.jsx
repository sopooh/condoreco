'use client'

import { useState } from 'react'
import Link from 'next/link'
import AdminRow from '@/components/admins/AdminRow'
import AdminCityTabs from '@/components/admins/AdminCityTabs'
import AdminSearchForm from '@/components/admins/AdminSearchForm'
import AdminFilterSidebar from '@/components/admins/AdminFilterSidebar'
import MapView from '@/components/map/MapView'
import { useIsMobile } from '@/hooks/useIsMobile'

// Riceve admins/buildingsByAdmin/cities/feeCounts già filtrati/calcolati
// server-side (città + testo + range fee via searchParams). Qui restano solo
// stati di UI — mostra/nascondi mappa, drawer filtri mobile, riga espansa —
// nessun rifetch dei dati. Il breakpoint mobile/desktop della mappa resta
// deciso da CSS (niente useIsMobile): la mappa stessa non è mai condizionata
// dal viewport, solo showMap (stato reale, non a rischio di hydration
// mismatch) ne decide il mount — l'arrangiamento a griglia lo gestisce la
// classe .has-map in globals.css. La sidebar filtri invece usa useIsMobile
// (hook già hydration-safe, valore iniziale fisso false) solo per decidere
// se mostrarla inline o dietro al bottone "Filtri": nessun componente
// imperativo tipo Leaflet è coinvolto, quindi il mismatch iniziale non crea
// gli stessi problemi della mappa.
export default function AdminsResultsView({ admins, buildingsByAdmin, cities, feeCounts, city }) {
  const isMobile = useIsMobile()
  const [expandedId, setExpandedId] = useState(null)
  const [showMap, setShowMap] = useState(true)
  const [showFilters, setShowFilters] = useState(false)

  const expandedBuildings = expandedId
    ? (buildingsByAdmin[expandedId] || [])
    : Object.values(buildingsByAdmin).flat()

  const expandedAdmin = admins.find(a => a.id === expandedId)

  return (
    <>
      {/* Toolbar */}
      <div className="admins-toolbar" style={{ background: 'var(--white)', borderBottom: '1px solid var(--border)' }}>
        <div className="admins-toolbar-inner" style={{ maxWidth: 1360, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
          <AdminSearchForm />
          <div style={{ display: 'flex', gap: 10, flexShrink: 0 }}>
            {isMobile && (
              <button onClick={() => setShowFilters(v => !v)} style={{
                padding: '9px 18px', borderRadius: 8, border: '1px solid var(--border)',
                background: showFilters ? 'var(--teal-lt)' : 'var(--white)',
                color: 'var(--teal-dk)', fontWeight: 600, fontSize: 13, cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}>Filtri</button>
            )}
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

      {/* Layout: 3 colonne desktop (filtri, lista, mappa), 1 colonna mobile */}
      <div className={`admins-results-grid${!isMobile ? ' has-filters' : ''}${showMap ? ' has-map' : ''}`} style={{
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
                onToggle={() => setExpandedId(expandedId === a.id ? null : a.id)}
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

        {/* Sticky map panel */}
        {showMap && (
          <div style={{ position: 'sticky', top: 20 }}>
            <div style={{ background: 'var(--white)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
              <div style={{
                padding: '14px 18px', borderBottom: '1px solid var(--border)',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <span style={{ fontSize: 15, fontWeight: 700 }}>Stabili gestiti</span>
                <span style={{ fontSize: 11, color: 'var(--text-3)' }}>
                  {expandedAdmin
                    ? `${expandedAdmin.building_count} edifici gestiti · rating medio ${expandedAdmin.score != null ? expandedAdmin.score.toFixed(1) : '—'}`
                    : `${expandedBuildings.length} edifici`}
                  {' '}
                  <span title="Il rating medio è calcolato sulle recensioni pubblicate" style={{ cursor: 'help', color: 'var(--text-4)' }}>ⓘ</span>
                </span>
              </div>
              <MapView buildings={expandedBuildings} height={440} />
              <div style={{ padding: '10px 18px', display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                <LegendDot color="var(--teal)" label="Edifici gestiti" />
                <LegendDot color="#0D676F" label="Ottima reputazione (4.3+)" />
                <LegendDot color="#F59E0B" label="Reputazione media (3.5–4.2)" />
                <LegendDot color="#EF4444" label="Da migliorare (<3.5)" />
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}

function LegendDot({ color, label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, color: 'var(--text-3)' }}>
      <div style={{ width: 9, height: 9, borderRadius: '50%', background: color, flexShrink: 0 }} />
      {label}
    </div>
  )
}
