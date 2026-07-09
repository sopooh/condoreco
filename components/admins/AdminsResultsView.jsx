'use client'

import { useState } from 'react'
import Link from 'next/link'
import AdminRow from '@/components/admins/AdminRow'
import AdminCityTabs from '@/components/admins/AdminCityTabs'
import AdminSearchForm from '@/components/admins/AdminSearchForm'
import MapView from '@/components/map/MapView'

// Riceve admins/buildingsByAdmin/cities già filtrati/calcolati server-side
// (città + testo via searchParams). Qui restano solo stati di UI — mostra/
// nascondi mappa, riga espansa — nessun rifetch dei dati. Il breakpoint
// mobile/desktop è deciso da CSS (niente useIsMobile): la mappa stessa non è
// mai condizionata dal viewport, solo showMap (stato reale, non a rischio di
// hydration mismatch) ne decide il mount — l'arrangiamento a griglia lo
// gestisce la classe .has-map in globals.css.
export default function AdminsResultsView({ admins, buildingsByAdmin, cities, city }) {
  const [expandedId, setExpandedId] = useState(null)
  const [showMap, setShowMap] = useState(true)

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

      {/* Layout: 2 colonne desktop, 1 colonna mobile */}
      <div className={`admins-results-grid${showMap ? ' has-map' : ''}`} style={{
        maxWidth: 1360, margin: '0 auto',
        display: 'grid',
        gap: 28, alignItems: 'start',
      }}>
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
