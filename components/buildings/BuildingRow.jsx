'use client'

import { useRouter } from 'next/navigation'
import { scoreColor, feeBand, costPerSqm } from '@/lib/score'
import BuildingPreviewImage from '@/components/buildings/BuildingPreviewImage'
import IconRow from '@/components/buildings/IconRow'

export default function BuildingRow({ building: b, showEnterCondo = false }) {
  const router = useRouter()
  const band = feeBand(b.monthly_fee)
  const perSqm = costPerSqm(b.monthly_fee, b.avg_sqm)
  const reviewWord = b.review_count === 1 ? 'recensione' : 'recensioni'

  return (
    <div
      className="building-row"
      onClick={() => router.push(`/edificio/${b.id}`)}
      style={{
        display: 'flex', background: 'var(--white)',
        border: '1px solid var(--border)', borderRadius: 16, cursor: 'pointer',
        transition: 'box-shadow 0.15s',
      }}
      onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.08)'}
      onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
    >
      {/* Foto / Mappa statica */}
      <div className="building-row-preview" style={{ flexShrink: 0, borderRadius: 10, overflow: 'hidden' }}>
        <BuildingPreviewImage building={b} height="100%" radius={10} />
      </div>

      {/* Corpo centrale + destra in colonna */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        {/* Riga superiore: info + badge/score */}
        <div className="building-row-top">
          {/* Info */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--teal-dk)', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {b.address}{b.street_number ? `, ${b.street_number}` : ''}
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: 10, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {b.neighborhood ? `${b.neighborhood} · ` : ''}{b.city}{b.year_built ? ` · Anno ${b.year_built}` : ''}
            </div>

            {/* Chip Rating / Spese / Al mq */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: showEnterCondo ? 8 : 0, minWidth: 0 }}>
              <Chip label="Rating" value={b.score?.toFixed(1) ?? 'N/D'} valueColor={scoreColor(b.score)} />
              {band && <Chip label="Spese" value={band.range} />}
              {perSqm && <Chip label="Al mq" value={`${perSqm}€/mq`} />}
              {!showEnterCondo && (
                <button
                  onClick={e => { e.stopPropagation(); router.push(`/edificio/${b.id}`) }}
                  style={{
                    background: 'var(--teal)', color: '#fff', border: 'none', borderRadius: 6,
                    padding: '8px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                    whiteSpace: 'nowrap', alignSelf: 'flex-end',
                  }}
                >
                  Vedi dettagli
                </button>
              )}
            </div>

            {/* Pulsanti Vedi dettagli / Entra condo: sempre su una riga dedicata,
                mai in competizione di spazio con le chip. */}
            {showEnterCondo && (
              <div className="building-row-actions">
                <button
                  onClick={e => { e.stopPropagation(); router.push(`/edificio/${b.id}`) }}
                  className="btn btn-outline-teal building-row-action-btn"
                >
                  Vedi dettagli
                </button>
                <button
                  onClick={e => { e.stopPropagation(); router.push(`/condominio/${b.id}`) }}
                  className="btn btn-primary building-row-action-btn"
                  aria-label={`Entra nell'area condominio di ${b.address}`}
                >
                  <LockIcon /> Entra condo
                </button>
              </div>
            )}
          </div>

          {/* Badge + score */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
            <span style={b.status === 'verified' ? badgeVerified : badgePending}>
              {b.status === 'verified' && <ShieldCheckIcon />}
              {b.status === 'verified' ? 'Verificata' : 'Da verificare'}
            </span>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap' }}>{scoreLabel(b.score)}</div>
              <div style={{ fontSize: 11, color: 'var(--text-3)', whiteSpace: 'nowrap' }}>
                {b.review_count || 0} {reviewWord}
              </div>
            </div>
          </div>
        </div>

        {/* Riga inferiore: solo icone */}
        <div style={{ paddingTop: 8, borderTop: '1px solid var(--border)', marginTop: 'auto' }}>
          <IconRow b={b} />
        </div>
      </div>
    </div>
  )
}

function Chip({ label, value, valueColor }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', gap: 1, fontSize: 12,
      background: 'var(--bg)', borderRadius: 6, padding: '5px 10px',
    }}>
      <span style={{ color: 'var(--text-4)' }}>{label}</span>
      <strong style={{ color: valueColor || 'var(--teal-dk)' }}>{value}</strong>
    </div>
  )
}

const badgePending  = { display: 'flex', alignItems: 'center', gap: 4, background: '#FEF3E8', color: '#E8651A', fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 100, whiteSpace: 'nowrap' }
const badgeVerified = { display: 'flex', alignItems: 'center', gap: 4, background: 'var(--teal-lt)', color: 'var(--teal-dk)', fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 100, whiteSpace: 'nowrap' }

function LockIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 018 0v4" />
    </svg>
  )
}

function ShieldCheckIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M12 2l8 4v6c0 5-3.5 8-8 10-4.5-2-8-5-8-10V6l8-4z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  )
}

function scoreLabel(score) {
  if (score == null) return 'Nuovo'
  if (score >= 4.5) return 'Eccellente'
  if (score >= 4)   return 'Ottimo'
  if (score >= 3.5) return 'Buono'
  if (score >= 3)   return 'Discreto'
  return 'Da migliorare'
}
