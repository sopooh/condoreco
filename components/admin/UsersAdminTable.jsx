'use client'

import { useState, useEffect, useCallback } from 'react'
import AdminTable from './AdminTable.jsx'
import { getAllUsers, updateUserStatus } from '@/lib/adminQueries'
import { useIsMobile } from '@/hooks/useIsMobile'

function StatusBadge({ status }) {
  const map = {
    active: { label: 'Attivo', bg: 'var(--green-bg)', color: 'var(--green-tx)' },
    suspended: { label: 'Sospeso', bg: 'var(--red-bg)', color: 'var(--red-tx)' },
    reported: { label: 'Segnalato', bg: 'var(--amber-bg)', color: 'var(--amber-tx)' },
  }
  const s = map[status] || map.active
  return (
    <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 4, background: s.bg, color: s.color }}>
      {s.label}
    </span>
  )
}

function fmtDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

export default function UsersAdminTable({ adminId }) {
  const [rows, setRows] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [loading, setLoading] = useState(true)
  const [draftSearch, setDraftSearch] = useState('')
  const [actionBusy, setActionBusy] = useState(null)
  const [confirm, setConfirm] = useState(null)
  const isMobile = useIsMobile()
  const pad = isMobile ? '16px' : '32px 36px'

  const load = useCallback(async () => {
    setLoading(true)
    const { data, count, error } = await getAllUsers({ search, status: filterStatus, page, limit: 50 })
    if (!error) { setRows(data || []); setTotal(count ?? 0) }
    setLoading(false)
  }, [search, filterStatus, page])

  useEffect(() => { load() }, [load])

  function handleSearch(e) {
    e.preventDefault()
    setSearch(draftSearch)
    setPage(0)
  }

  async function doAction(userId, newStatus) {
    setActionBusy(userId)
    await updateUserStatus(userId, newStatus, adminId)
    setActionBusy(null)
    setConfirm(null)
    load()
  }

  const columns = [
    { key: 'email', label: 'Email', sortable: true, render: v => v || <span style={{ color: 'var(--text-4)' }}>—</span> },
    { key: 'display_name', label: 'Nome', sortable: true, render: v => v || <span style={{ color: 'var(--text-4)' }}>—</span> },
    { key: 'role', label: 'Ruolo', render: v => <span style={{ fontSize: 11, color: 'var(--text-3)', background: 'var(--border-2)', padding: '2px 7px', borderRadius: 4 }}>{v || '—'}</span> },
    { key: 'admin_status', label: 'Stato', render: v => <StatusBadge status={v || 'active'} /> },
    { key: 'created_at', label: 'Iscrizione', sortable: true, render: v => fmtDate(v) },
  ]

  return (
    <div style={{ padding: pad, maxWidth: 1200 }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', marginBottom: 4 }}>Utenti</h1>
        <p style={{ fontSize: 13, color: 'var(--text-3)' }}>{total} utenti registrati</p>
      </div>

      {/* Filtri */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: 6 }}>
          <input
            value={draftSearch}
            onChange={e => setDraftSearch(e.target.value)}
            placeholder="Cerca per email o nome..."
            style={{ padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 6, fontSize: 13, width: 240, outline: 'none' }}
          />
          <button type="submit" style={{ padding: '8px 14px', background: 'var(--teal)', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>
            Cerca
          </button>
          {(search || draftSearch) && (
            <button type="button" onClick={() => { setDraftSearch(''); setSearch(''); setPage(0) }}
              style={{ padding: '8px 14px', background: 'none', color: 'var(--text-3)', border: '1px solid var(--border)', borderRadius: 6, fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>
              ✕
            </button>
          )}
        </form>

        <select
          value={filterStatus}
          onChange={e => { setFilterStatus(e.target.value); setPage(0) }}
          style={{ padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 6, fontSize: 13, outline: 'none', background: 'var(--white)' }}
        >
          <option value="">Tutti gli stati</option>
          <option value="active">Attivo</option>
          <option value="suspended">Sospeso</option>
          <option value="reported">Segnalato</option>
        </select>
      </div>

      {/* Conferma azione */}
      {confirm && (
        <div style={{ background: 'var(--amber-bg)', border: '1px solid #FDE68A', borderRadius: 8, padding: '14px 18px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ flex: 1, fontSize: 13, color: 'var(--amber-tx)' }}>
            Confermi di voler <strong>{confirm.action === 'suspended' ? 'sospendere' : 'riattivare'}</strong> questo utente?
          </span>
          <button onClick={() => doAction(confirm.id, confirm.action)} disabled={!!actionBusy}
            style={{ padding: '6px 14px', background: confirm.action === 'suspended' ? '#DC2626' : 'var(--teal)', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>
            Conferma
          </button>
          <button onClick={() => setConfirm(null)}
            style={{ padding: '6px 12px', background: 'none', color: 'var(--text-3)', border: '1px solid var(--border)', borderRadius: 6, fontSize: 12, cursor: 'pointer' }}>
            Annulla
          </button>
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
        emptyText="Nessun utente trovato"
        rowActions={row => (
          <div style={{ display: 'flex', gap: 6 }}>
            {(row.admin_status === 'active' || !row.admin_status) ? (
              <button
                onClick={() => setConfirm({ id: row.id, action: 'suspended' })}
                disabled={actionBusy === row.id}
                style={{ padding: '5px 10px', fontSize: 11, fontWeight: 700, background: 'var(--red-bg)', color: 'var(--red-tx)', border: 'none', borderRadius: 5, cursor: 'pointer' }}
              >
                Sospendi
              </button>
            ) : (
              <button
                onClick={() => setConfirm({ id: row.id, action: 'active' })}
                disabled={actionBusy === row.id}
                style={{ padding: '5px 10px', fontSize: 11, fontWeight: 700, background: 'var(--green-bg)', color: 'var(--green-tx)', border: 'none', borderRadius: 5, cursor: 'pointer' }}
              >
                Riattiva
              </button>
            )}
            {row.admin_status !== 'reported' && (
              <button
                onClick={() => doAction(row.id, 'reported')}
                disabled={actionBusy === row.id}
                style={{ padding: '5px 10px', fontSize: 11, fontWeight: 700, background: 'var(--amber-bg)', color: 'var(--amber-tx)', border: 'none', borderRadius: 5, cursor: 'pointer' }}
              >
                Segnala
              </button>
            )}
          </div>
        )}
      />
    </div>
  )
}
