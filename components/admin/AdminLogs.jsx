'use client'

import { useState, useEffect, useCallback } from 'react'
import { getAdminLogs } from '@/lib/adminQueries'
import { useIsMobile } from '@/hooks/useIsMobile'

const ACTION_LABELS = {
  review_approve: { label: 'Recensione approvata', color: 'var(--green-tx)', bg: 'var(--green-bg)' },
  review_reject: { label: 'Recensione rifiutata', color: 'var(--red-tx)', bg: 'var(--red-bg)' },
  review_hide: { label: 'Recensione nascosta', color: 'var(--text-3)', bg: 'var(--border-2)' },
  review_pending: { label: 'Recensione rimandata', color: 'var(--blue-tx)', bg: 'var(--blue-bg)' },
  review_deleted: { label: 'Recensione eliminata', color: 'var(--red-tx)', bg: 'var(--red-bg)' },
  admin_review_approve: { label: 'Recensione admin approvata', color: 'var(--green-tx)', bg: 'var(--green-bg)' },
  admin_review_reject: { label: 'Recensione admin rifiutata', color: 'var(--red-tx)', bg: 'var(--red-bg)' },
  admin_review_hide: { label: 'Recensione admin nascosta', color: 'var(--text-3)', bg: 'var(--border-2)' },
  admin_review_pending: { label: 'Recensione admin rimandata', color: 'var(--blue-tx)', bg: 'var(--blue-bg)' },
  admin_review_deleted: { label: 'Recensione admin eliminata', color: 'var(--red-tx)', bg: 'var(--red-bg)' },
  building_approved: { label: 'Condominio approvato', color: 'var(--green-tx)', bg: 'var(--green-bg)' },
  building_hidden: { label: 'Condominio nascosto', color: 'var(--text-3)', bg: 'var(--border-2)' },
  building_verified: { label: 'Condominio verificato', color: 'var(--teal-dk)', bg: 'var(--teal-lt)' },
  building_pending: { label: 'Condominio in attesa', color: 'var(--amber-tx)', bg: 'var(--amber-bg)' },
  user_suspended: { label: 'Utente sospeso', color: 'var(--red-tx)', bg: 'var(--red-bg)' },
  user_active: { label: 'Utente riattivato', color: 'var(--green-tx)', bg: 'var(--green-bg)' },
  user_reported: { label: 'Utente segnalato', color: 'var(--amber-tx)', bg: 'var(--amber-bg)' },
  report_resolved: { label: 'Segnalazione risolta', color: 'var(--green-tx)', bg: 'var(--green-bg)' },
  report_archived: { label: 'Segnalazione archiviata', color: 'var(--text-3)', bg: 'var(--border-2)' },
  report_reviewing: { label: 'Segnalazione in revisione', color: 'var(--amber-tx)', bg: 'var(--amber-bg)' },
}

function ActionBadge({ action }) {
  const s = ACTION_LABELS[action] || { label: action, color: 'var(--text-3)', bg: 'var(--border-2)' }
  return (
    <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 4, background: s.bg, color: s.color }}>
      {s.label}
    </span>
  )
}

function fmtDateTime(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('it-IT', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

function ContentTypeIcon({ type }) {
  const map = { review: '⭐', admin_review: '⭐', building: '🏢', user: '👤', report: '🚩' }
  return <span>{map[type] || '·'}</span>
}

export default function AdminLogs() {
  const [rows, setRows] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(true)
  const isMobile = useIsMobile()
  const pad = isMobile ? '16px' : '32px 36px'

  const load = useCallback(async () => {
    setLoading(true)
    const { data, count, error } = await getAdminLogs({ page, limit: 50 })
    if (!error) { setRows(data || []); setTotal(count ?? 0) }
    setLoading(false)
  }, [page])

  useEffect(() => { load() }, [load])

  return (
    <div style={{ padding: pad, maxWidth: 1000 }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', marginBottom: 4 }}>Log Attività Admin</h1>
        <p style={{ fontSize: 13, color: 'var(--text-3)' }}>{total} azioni registrate</p>
      </div>

      {loading ? (
        <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-4)' }}>Caricamento log...</div>
      ) : rows.length === 0 ? (
        <div style={{ padding: 60, textAlign: 'center' }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>📋</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>Nessuna azione registrata</div>
          <p style={{ fontSize: 13, color: 'var(--text-3)' }}>
            Le azioni di moderazione (approva, rifiuta, sospendi, ecc.) vengono registrate qui automaticamente.
          </p>
        </div>
      ) : (
        <>
          <div style={{ background: 'var(--white)', borderRadius: 12, border: '1px solid var(--border)', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: 'var(--bg)', borderBottom: '1px solid var(--border)' }}>
                  {['Data e ora', 'Azione', 'Tipo', 'ID contenuto', 'Note'].map(h => (
                    <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, color: 'var(--text-3)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((log, i) => (
                  <tr key={log.id} style={{ borderBottom: '1px solid var(--border-2)', background: i % 2 === 0 ? 'var(--white)' : 'var(--bg)' }}>
                    <td style={{ padding: '10px 16px', color: 'var(--text-3)', whiteSpace: 'nowrap', fontSize: 12 }}>
                      {fmtDateTime(log.created_at)}
                    </td>
                    <td style={{ padding: '10px 16px' }}>
                      <ActionBadge action={log.action} />
                    </td>
                    <td style={{ padding: '10px 16px', color: 'var(--text-2)', fontSize: 12 }}>
                      {log.content_type && (
                        <span><ContentTypeIcon type={log.content_type} /> {log.content_type}</span>
                      )}
                    </td>
                    <td style={{ padding: '10px 16px' }}>
                      {log.content_id ? (
                        <code style={{ fontSize: 11, background: 'var(--bg)', padding: '2px 6px', borderRadius: 4, color: 'var(--text-3)' }}>
                          {log.content_id.slice(0, 12)}…
                        </code>
                      ) : '—'}
                    </td>
                    <td style={{ padding: '10px 16px', color: 'var(--text-3)', fontSize: 12, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {log.note || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {total > 50 && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 14, fontSize: 13 }}>
              <span style={{ color: 'var(--text-3)' }}>{total} totali · pagina {page + 1} di {Math.ceil(total / 50)}</span>
              <div style={{ display: 'flex', gap: 6 }}>
                <button disabled={page === 0} onClick={() => setPage(p => p - 1)}
                  style={{ padding: '6px 14px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--white)', cursor: page === 0 ? 'not-allowed' : 'pointer', fontSize: 12, fontWeight: 600 }}>
                  ← Prev
                </button>
                <button disabled={page + 1 >= Math.ceil(total / 50)} onClick={() => setPage(p => p + 1)}
                  style={{ padding: '6px 14px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--white)', cursor: page + 1 >= Math.ceil(total / 50) ? 'not-allowed' : 'pointer', fontSize: 12, fontWeight: 600 }}>
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
