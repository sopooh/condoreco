'use client'

import { useState } from 'react'
import { useAdminPhotos } from '@/lib/adminPhotos'
import { photoUrl } from '@/lib/photos'

const STATUS_LABELS = { pending: 'In attesa', approved: 'Approvate', rejected: 'Rifiutate', all: 'Tutte' }

export default function PhotoModeration() {
  const { photos, loading, approve, reject, setCover, statusFilter, changeFilter } = useAdminPhotos()
  const [selected, setSelected] = useState(new Set())

  function toggleSelect(id) {
    setSelected((s) => {
      const n = new Set(s)
      n.has(id) ? n.delete(id) : n.add(id)
      return n
    })
  }

  function selectAll() {
    setSelected(new Set(photos.map((p) => p.id)))
  }

  function clearSelection() { setSelected(new Set()) }

  async function batchApprove() {
    await Promise.all([...selected].map((id) => approve(id)))
    setSelected(new Set())
  }

  async function batchReject() {
    await Promise.all([...selected].map((id) => reject(id)))
    setSelected(new Set())
  }

  return (
    <div>
      {/* Filtri status */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        {Object.entries(STATUS_LABELS).map(([s, l]) => (
          <button
            key={s}
            onClick={() => { changeFilter(s); setSelected(new Set()) }}
            style={{
              padding: '6px 14px', borderRadius: 6, fontWeight: 600, fontSize: 13, cursor: 'pointer',
              border: `1px solid ${statusFilter === s ? 'var(--teal)' : 'var(--border)'}`,
              background: statusFilter === s ? 'var(--teal-lt)' : 'var(--white)',
              color: statusFilter === s ? 'var(--teal-dk)' : 'var(--text-2)',
            }}
          >{l}</button>
        ))}

        {selected.size > 0 && (
          <div style={{ display: 'flex', gap: 8, marginLeft: 'auto' }}>
            <button onClick={batchApprove} style={btnGreen}>Approva {selected.size}</button>
            <button onClick={batchReject} style={btnRed}>Rifiuta {selected.size}</button>
            <button onClick={clearSelection} style={btnGhost}>Deseleziona</button>
          </div>
        )}

        {selected.size === 0 && photos.length > 0 && (
          <button onClick={selectAll} style={{ ...btnGhost, marginLeft: 'auto' }}>
            Seleziona tutte
          </button>
        )}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-3)', fontSize: 14 }}>
          Caricamento foto...
        </div>
      ) : photos.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-3)', fontSize: 14 }}>
          Nessuna foto in questa categoria
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
          {photos.map((p) => {
            const isSelected = selected.has(p.id)
            const building = p.buildings
            return (
              <div
                key={p.id}
                onClick={() => toggleSelect(p.id)}
                style={{
                  border: `2px solid ${isSelected ? 'var(--teal)' : 'var(--border)'}`,
                  borderRadius: 10, overflow: 'hidden', background: 'var(--white)',
                  cursor: 'pointer', transition: 'border-color 0.15s',
                }}
              >
                <div style={{ position: 'relative' }}>
                  <img
                    src={photoUrl(p.storage_path)}
                    alt=""
                    loading="lazy"
                    style={{ width: '100%', height: 140, objectFit: 'cover', display: 'block' }}
                  />
                  {isSelected && (
                    <div style={{
                      position: 'absolute', top: 8, right: 8,
                      width: 24, height: 24, borderRadius: '50%',
                      background: 'var(--teal)', color: '#fff',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 13, fontWeight: 700,
                    }}>✓</div>
                  )}
                  {p.is_cover && (
                    <div style={{
                      position: 'absolute', top: 8, left: 8,
                      background: '#F59E0B', color: '#fff',
                      fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 100,
                    }}>COVER</div>
                  )}
                  {p.review_id && (
                    <div style={{
                      position: 'absolute', bottom: 8, left: 8,
                      background: 'rgba(0,0,0,0.55)', color: '#fff',
                      fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 100,
                    }}>Da recensione</div>
                  )}
                </div>

                <div style={{ padding: '10px 12px' }}>
                  <div style={{
                    fontSize: 12, fontWeight: 700, color: 'var(--teal-dk)', marginBottom: 3,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {building?.address}{building?.street_number ? `, ${building.street_number}` : ''} — {building?.city}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-4)', marginBottom: 8 }}>
                    Score: {p.quality_score ?? '—'} · {new Date(p.created_at).toLocaleDateString('it-IT')}
                  </div>

                  <div style={{ display: 'flex', gap: 5 }} onClick={(e) => e.stopPropagation()}>
                    {p.status !== 'approved' && (
                      <button onClick={() => approve(p.id)} style={btnSmallGreen}>Approva</button>
                    )}
                    {p.status !== 'rejected' && (
                      <button onClick={() => reject(p.id)} style={btnSmallRed}>Rifiuta</button>
                    )}
                    {p.status === 'approved' && !p.admin_cover_override && (
                      <button onClick={() => setCover(p.id)} style={btnSmallAmber}>Cover</button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

const btnGreen  = { padding: '7px 14px', borderRadius: 6, border: 'none', background: '#D1FAE5', color: '#065F46', fontWeight: 700, fontSize: 13, cursor: 'pointer' }
const btnRed    = { padding: '7px 14px', borderRadius: 6, border: 'none', background: '#FEE2E2', color: '#991B1B', fontWeight: 700, fontSize: 13, cursor: 'pointer' }
const btnGhost  = { padding: '7px 14px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--white)', color: 'var(--text-2)', fontWeight: 600, fontSize: 13, cursor: 'pointer' }

const btnSmallGreen = { flex: 1, padding: '5px 8px', borderRadius: 5, border: 'none', background: '#D1FAE5', color: '#065F46', fontWeight: 700, fontSize: 11, cursor: 'pointer' }
const btnSmallRed   = { flex: 1, padding: '5px 8px', borderRadius: 5, border: 'none', background: '#FEE2E2', color: '#991B1B', fontWeight: 700, fontSize: 11, cursor: 'pointer' }
const btnSmallAmber = { flex: 1, padding: '5px 8px', borderRadius: 5, border: 'none', background: '#FEF3C7', color: '#92400E', fontWeight: 700, fontSize: 11, cursor: 'pointer' }
