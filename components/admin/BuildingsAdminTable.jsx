'use client'

import { useState, useEffect, useCallback } from 'react'
import AdminTable from './AdminTable.jsx'
import { getAllBuildings, updateBuildingStatus } from '@/lib/adminQueries'
import { useIsMobile } from '@/hooks/useIsMobile'

function StatusBadge({ status }) {
  const map = {
    pending: { label: 'Da verificare', bg: 'var(--amber-bg)', color: 'var(--amber-tx)' },
    approved: { label: 'Approvato', bg: 'var(--green-bg)', color: 'var(--green-tx)' },
    hidden: { label: 'Nascosto', bg: 'var(--border-2)', color: 'var(--text-3)' },
    verified: { label: 'Verificato', bg: 'var(--teal-lt)', color: 'var(--teal-dk)' },
  }
  const s = map[status] || map.pending
  return <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 4, background: s.bg, color: s.color }}>{s.label}</span>
}

function fmtDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

export default function BuildingsAdminTable({ adminId }) {
  const [rows, setRows] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [filterCity, setFilterCity] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [draftCity, setDraftCity] = useState('')
  const [loading, setLoading] = useState(true)
  const [actionBusy, setActionBusy] = useState(null)
  const [feedback, setFeedback] = useState('')
  const isMobile = useIsMobile()
  const pad = isMobile ? '16px' : '32px 36px'

  const load = useCallback(async () => {
    setLoading(true)
    const { data, count, error } = await getAllBuildings({ city: filterCity, status: filterStatus, page, limit: 50 })
    if (!error) { setRows(data || []); setTotal(count ?? 0) }
    setLoading(false)
  }, [filterCity, filterStatus, page])

  useEffect(() => { load() }, [load])

  async function doStatus(buildingId, status) {
    setActionBusy(buildingId)
    const { error } = await updateBuildingStatus(buildingId, status, adminId)
    if (!error) {
      setFeedback('Stato aggiornato')
      setTimeout(() => setFeedback(''), 2000)
      load()
    }
    setActionBusy(null)
  }

  const columns = [
    { key: 'address', label: 'Indirizzo', sortable: true, render: (v, row) => (
      <div>
        <div style={{ fontWeight: 600, color: 'var(--text)' }}>{v} {row.street_number || ''}</div>
        <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{row.city}{row.neighborhood ? ` · ${row.neighborhood}` : ''}</div>
      </div>
    )},
    { key: 'city', label: 'Città', sortable: true },
    { key: 'status', label: 'Stato', render: v => <StatusBadge status={v} /> },
    { key: 'view_count', label: 'Visite', sortable: true, render: v => v ?? 0 },
    { key: 'created_at', label: 'Aggiunto', sortable: true, render: v => fmtDate(v) },
  ]

  return (
    <div style={{ padding: pad, maxWidth: 1200 }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', marginBottom: 4 }}>Condomini</h1>
        <p style={{ fontSize: 13, color: 'var(--text-3)' }}>{total} edifici nel database</p>
      </div>

      {/* Filtri */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        <form onSubmit={e => { e.preventDefault(); setFilterCity(draftCity); setPage(0) }} style={{ display: 'flex', gap: 6 }}>
          <input
            value={draftCity}
            onChange={e => setDraftCity(e.target.value)}
            placeholder="Filtra per città..."
            style={{ padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 6, fontSize: 13, width: 200, outline: 'none' }}
          />
          <button type="submit" style={{ padding: '8px 14px', background: 'var(--teal)', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>
            Filtra
          </button>
          {(filterCity || draftCity) && (
            <button type="button" onClick={() => { setDraftCity(''); setFilterCity(''); setPage(0) }}
              style={{ padding: '8px 12px', background: 'none', color: 'var(--text-3)', border: '1px solid var(--border)', borderRadius: 6, fontSize: 12, cursor: 'pointer' }}>✕</button>
          )}
        </form>
        <select
          value={filterStatus}
          onChange={e => { setFilterStatus(e.target.value); setPage(0) }}
          style={{ padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 6, fontSize: 13, outline: 'none', background: 'var(--white)' }}
        >
          <option value="">Tutti gli stati</option>
          <option value="pending">Da verificare</option>
          <option value="approved">Approvato</option>
          <option value="verified">Verificato</option>
          <option value="hidden">Nascosto</option>
        </select>
      </div>

      {feedback && (
        <div style={{ background: 'var(--green-bg)', color: 'var(--green-tx)', borderRadius: 8, padding: '10px 16px', marginBottom: 14, fontSize: 13, fontWeight: 600 }}>
          ✓ {feedback}
        </div>
      )}

      <AdminTable
        columns={columns}
        rows={rows}
        loading={loading}
        total={total}
        page={page}
        limit={50}
        onPageChange={setPage}
        emptyText="Nessun condominio trovato"
        rowActions={row => (
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
            {row.status !== 'approved' && (
              <button onClick={() => doStatus(row.id, 'approved')} disabled={actionBusy === row.id}
                style={{ padding: '4px 9px', fontSize: 11, fontWeight: 700, background: 'var(--green-bg)', color: 'var(--green-tx)', border: 'none', borderRadius: 4, cursor: 'pointer' }}>
                Approva
              </button>
            )}
            {row.status !== 'verified' && (
              <button onClick={() => doStatus(row.id, 'verified')} disabled={actionBusy === row.id}
                style={{ padding: '4px 9px', fontSize: 11, fontWeight: 700, background: 'var(--teal-lt)', color: 'var(--teal-dk)', border: 'none', borderRadius: 4, cursor: 'pointer' }}>
                Verifica
              </button>
            )}
            {row.status !== 'hidden' && (
              <button onClick={() => doStatus(row.id, 'hidden')} disabled={actionBusy === row.id}
                style={{ padding: '4px 9px', fontSize: 11, fontWeight: 700, background: 'var(--border-2)', color: 'var(--text-3)', border: 'none', borderRadius: 4, cursor: 'pointer' }}>
                Nascondi
              </button>
            )}
            {row.status === 'hidden' && (
              <button onClick={() => doStatus(row.id, 'pending')} disabled={actionBusy === row.id}
                style={{ padding: '4px 9px', fontSize: 11, fontWeight: 700, background: 'var(--amber-bg)', color: 'var(--amber-tx)', border: 'none', borderRadius: 4, cursor: 'pointer' }}>
                Riattiva
              </button>
            )}
          </div>
        )}
      />
    </div>
  )
}
