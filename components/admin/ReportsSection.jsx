'use client'

import { useState, useEffect, useCallback } from 'react'
import { getAllReports, updateReport, updateUserStatus, moderateReview, updateBuildingStatus } from '@/lib/adminQueries'
import { useIsMobile } from '@/hooks/useIsMobile'

function StatusBadge({ status }) {
  const map = {
    open: { label: 'Aperta', bg: 'var(--red-bg)', color: 'var(--red-tx)' },
    reviewing: { label: 'In revisione', bg: 'var(--amber-bg)', color: 'var(--amber-tx)' },
    resolved: { label: 'Risolta', bg: 'var(--green-bg)', color: 'var(--green-tx)' },
    archived: { label: 'Archiviata', bg: 'var(--border-2)', color: 'var(--text-3)' },
  }
  const s = map[status] || map.open
  return <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 4, background: s.bg, color: s.color }}>{s.label}</span>
}

function TypeBadge({ type }) {
  const map = {
    review: { label: 'Recensione', bg: 'var(--blue-bg)', color: 'var(--blue-tx)' },
    building: { label: 'Condominio', bg: 'var(--teal-lt)', color: 'var(--teal-dk)' },
    user: { label: 'Utente', bg: 'var(--amber-bg)', color: 'var(--amber-tx)' },
  }
  const s = map[type] || { label: type, bg: 'var(--border-2)', color: 'var(--text-3)' }
  return <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 4, background: s.bg, color: s.color }}>{s.label}</span>
}

function fmtDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

function ReportRow({ report, onUpdate, adminId }) {
  const [noteOpen, setNoteOpen] = useState(false)
  const [note, setNote] = useState(report.admin_note || '')
  const [busy, setBusy] = useState(false)

  async function doUpdate(status) {
    setBusy(true)
    await onUpdate(report.id, { status, admin_note: note }, adminId)
    setBusy(false)
  }

  async function doContent(action) {
    setBusy(true)
    if (action === 'hide_review' && report.content_type === 'review') {
      await moderateReview(report.content_id, 'hidden', note, adminId)
    } else if (action === 'hide_building' && report.content_type === 'building') {
      await updateBuildingStatus(report.content_id, 'hidden', adminId)
    } else if (action === 'suspend_user' && report.reporter_id) {
      await updateUserStatus(report.reporter_id, 'suspended', adminId)
    }
    await onUpdate(report.id, { status: 'resolved', admin_note: note }, adminId)
    setBusy(false)
  }

  return (
    <div style={{ background: 'var(--white)', borderRadius: 10, border: '1px solid var(--border)', padding: '16px 18px', marginBottom: 10 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 10 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
            <TypeBadge type={report.content_type} />
            <StatusBadge status={report.status} />
            <span style={{ fontSize: 11, color: 'var(--text-4)' }}>{fmtDate(report.created_at)}</span>
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 6 }}>
            Motivo: <strong style={{ color: 'var(--text-2)' }}>{report.reason}</strong>
            {' · '}Contenuto ID: <code style={{ fontSize: 11, background: 'var(--bg)', padding: '1px 5px', borderRadius: 3 }}>{report.content_id?.slice(0, 8)}…</code>
          </div>
          {report.body && (
            <div style={{ fontSize: 13, color: 'var(--text)', background: 'var(--bg)', borderRadius: 6, padding: '8px 10px', fontStyle: 'italic' }}>
              "{report.body}"
            </div>
          )}
        </div>
      </div>

      {/* Note admin */}
      <div style={{ marginBottom: 10 }}>
        <button onClick={() => setNoteOpen(v => !v)}
          style={{ fontSize: 11, color: 'var(--teal)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, padding: 0 }}>
          {noteOpen ? '▼' : '▶'} Note interne {note ? '(presenti)' : ''}
        </button>
        {noteOpen && (
          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="Note visibili solo all'admin..."
            rows={2}
            style={{ display: 'block', marginTop: 6, width: '100%', padding: '7px 10px', border: '1px solid var(--border)', borderRadius: 6, fontSize: 12, resize: 'vertical', outline: 'none', fontFamily: 'inherit' }}
          />
        )}
      </div>

      {/* Azioni */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {report.status !== 'reviewing' && (
          <button onClick={() => doUpdate('reviewing')} disabled={busy}
            style={{ padding: '5px 11px', fontSize: 11, fontWeight: 700, background: 'var(--amber-bg)', color: 'var(--amber-tx)', border: 'none', borderRadius: 5, cursor: 'pointer' }}>
            In revisione
          </button>
        )}
        {report.status !== 'resolved' && (
          <button onClick={() => doUpdate('resolved')} disabled={busy}
            style={{ padding: '5px 11px', fontSize: 11, fontWeight: 700, background: 'var(--green-bg)', color: 'var(--green-tx)', border: 'none', borderRadius: 5, cursor: 'pointer' }}>
            ✓ Risolvi
          </button>
        )}
        {report.status !== 'archived' && (
          <button onClick={() => doUpdate('archived')} disabled={busy}
            style={{ padding: '5px 11px', fontSize: 11, fontWeight: 700, background: 'var(--border-2)', color: 'var(--text-3)', border: 'none', borderRadius: 5, cursor: 'pointer' }}>
            Archivia
          </button>
        )}
        {report.content_type === 'review' && (
          <button onClick={() => doContent('hide_review')} disabled={busy}
            style={{ padding: '5px 11px', fontSize: 11, fontWeight: 700, background: 'var(--red-bg)', color: 'var(--red-tx)', border: 'none', borderRadius: 5, cursor: 'pointer' }}>
            Nascondi recensione
          </button>
        )}
        {report.content_type === 'building' && (
          <button onClick={() => doContent('hide_building')} disabled={busy}
            style={{ padding: '5px 11px', fontSize: 11, fontWeight: 700, background: 'var(--red-bg)', color: 'var(--red-tx)', border: 'none', borderRadius: 5, cursor: 'pointer' }}>
            Nascondi condominio
          </button>
        )}
      </div>
    </div>
  )
}

export default function ReportsSection({ adminId }) {
  const [rows, setRows] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [filterStatus, setFilterStatus] = useState('open')
  const [filterType, setFilterType] = useState('')
  const [loading, setLoading] = useState(true)
  const isMobile = useIsMobile()
  const pad = isMobile ? '16px' : '32px 36px'

  const load = useCallback(async () => {
    setLoading(true)
    const { data, count, error } = await getAllReports({ status: filterStatus, type: filterType, page, limit: 20 })
    if (!error) { setRows(data || []); setTotal(count ?? 0) }
    setLoading(false)
  }, [filterStatus, filterType, page])

  useEffect(() => { load() }, [load])

  async function handleUpdate(reportId, updates, aId) {
    await updateReport(reportId, updates, aId)
    load()
  }

  const STATUS_LABELS = { open: 'Aperte', reviewing: 'In revisione', resolved: 'Risolte', archived: 'Archiviate', '': 'Tutte' }

  return (
    <div style={{ padding: pad, maxWidth: 900 }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', marginBottom: 4 }}>Segnalazioni</h1>
        <p style={{ fontSize: 13, color: 'var(--text-3)' }}>{total} segnalazioni</p>
      </div>

      {/* Filtri */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 4, padding: '4px', background: 'var(--bg)', borderRadius: 8, border: '1px solid var(--border)', overflowX: 'auto', scrollbarWidth: 'none' }}>
          {Object.entries(STATUS_LABELS).map(([k, v]) => (
            <button key={k} onClick={() => { setFilterStatus(k); setPage(0) }}
              style={{
                padding: '6px 12px', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                background: filterStatus === k ? 'var(--white)' : 'transparent',
                color: filterStatus === k ? 'var(--teal)' : 'var(--text-3)',
                boxShadow: filterStatus === k ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
              }}
            >{v}</button>
          ))}
        </div>
        <select value={filterType} onChange={e => { setFilterType(e.target.value); setPage(0) }}
          style={{ padding: '7px 12px', border: '1px solid var(--border)', borderRadius: 6, fontSize: 12, outline: 'none', background: 'var(--white)' }}>
          <option value="">Tutti i tipi</option>
          <option value="review">Recensione</option>
          <option value="building">Condominio</option>
          <option value="user">Utente</option>
        </select>
      </div>

      {loading ? (
        <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-4)' }}>Caricamento segnalazioni...</div>
      ) : rows.length === 0 ? (
        <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-4)', fontSize: 14 }}>Nessuna segnalazione trovata.</div>
      ) : (
        <>
          {rows.map(r => (
            <ReportRow key={r.id} report={r} onUpdate={handleUpdate} adminId={adminId} />
          ))}
          {total > 20 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, fontSize: 13 }}>
              <span style={{ color: 'var(--text-3)' }}>{total} totali · pag. {page + 1}/{Math.ceil(total / 20)}</span>
              <div style={{ display: 'flex', gap: 6 }}>
                <button disabled={page === 0} onClick={() => setPage(p => p - 1)}
                  style={{ padding: '6px 14px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--white)', cursor: page === 0 ? 'not-allowed' : 'pointer', fontSize: 12, fontWeight: 600 }}>
                  ← Prev
                </button>
                <button disabled={page + 1 >= Math.ceil(total / 20)} onClick={() => setPage(p => p + 1)}
                  style={{ padding: '6px 14px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--white)', cursor: page + 1 >= Math.ceil(total / 20) ? 'not-allowed' : 'pointer', fontSize: 12, fontWeight: 600 }}>
                  Next →
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
