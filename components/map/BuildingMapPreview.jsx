'use client'

import Link from 'next/link'
import { scoreColor } from '@/lib/score'

// Popup di anteprima mostrato al click su un pin, condiviso tra la mappa di
// Esplora e quella di Amministratori (via ResultsMap onResultSelect).
export function MobileMapPreview({ building: b, onClose }) {
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

export function DesktopMapPreview({ building: b, onClose }) {
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
