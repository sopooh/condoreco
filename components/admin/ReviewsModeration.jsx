'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  getAllReviews, moderateReview, deleteReview,
  getAllAdminReviews, moderateAdminReview, deleteAdminReview,
} from '@/lib/adminQueries'
import { useIsMobile } from '@/hooks/useIsMobile'

const PROBLEMATIC = ['spam', 'falso', 'fake', 'insulto', 'minaccia', 'illegale', 'volgare', 'offensivo', 'odio', 'razzis', 'scam']

// Le due code (recensioni condomini / recensioni amministratori) condividono
// forma e workflow di moderazione — solo la tabella sorgente e la label
// dell'entità recensita cambiano. SOURCES mappa un tab UI alle query giuste.
const SOURCES = {
  building: {
    label: 'Recensioni condomini',
    entityLabel: 'Edificio',
    entityKey: 'building_id',
    getAll: getAllReviews,
    moderate: moderateReview,
    del: deleteReview,
  },
  admin: {
    label: 'Recensioni amministratori',
    entityLabel: 'Amministratore',
    entityKey: 'admin_id',
    getAll: getAllAdminReviews,
    moderate: moderateAdminReview,
    del: deleteAdminReview,
  },
}

function highlight(text) {
  if (!text) return <span style={{ color: 'var(--text-4)' }}>—</span>
  const parts = []
  let lower = text.toLowerCase()
  let lastIdx = 0
  const matches = []
  for (const word of PROBLEMATIC) {
    let idx = lower.indexOf(word)
    while (idx !== -1) {
      matches.push({ start: idx, end: idx + word.length })
      idx = lower.indexOf(word, idx + 1)
    }
  }
  matches.sort((a, b) => a.start - b.start)

  for (const m of matches) {
    if (m.start > lastIdx) parts.push(<span key={lastIdx}>{text.slice(lastIdx, m.start)}</span>)
    parts.push(<mark key={m.start} style={{ background: '#FEF08A', borderRadius: 2, padding: '0 1px' }}>{text.slice(m.start, m.end)}</mark>)
    lastIdx = m.end
  }
  if (lastIdx < text.length) parts.push(<span key={lastIdx}>{text.slice(lastIdx)}</span>)
  return parts.length > 0 ? parts : text
}

function StatusBadge({ status }) {
  const map = {
    pending: { label: 'In attesa', bg: 'var(--amber-bg)', color: 'var(--amber-tx)' },
    approved: { label: 'Approvata', bg: 'var(--green-bg)', color: 'var(--green-tx)' },
    rejected: { label: 'Rifiutata', bg: 'var(--red-bg)', color: 'var(--red-tx)' },
    hidden: { label: 'Nascosta', bg: 'var(--border-2)', color: 'var(--text-3)' },
  }
  const s = map[status] || map.pending
  return <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 4, background: s.bg, color: s.color }}>{s.label}</span>
}

function fmtDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('it-IT', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })
}

function Stars({ score }) {
  return (
    <span>
      {[1, 2, 3, 4, 5].map(i => (
        <span key={i} style={{ color: i <= score ? '#F59E0B' : 'var(--border)', fontSize: 14 }}>★</span>
      ))}
    </span>
  )
}

function ReviewCard({ review, source, onAction, busy }) {
  const [note, setNote] = useState(review.moderation_note || '')
  const [noteOpen, setNoteOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const entityId = review[source.entityKey]

  return (
    <div style={{
      background: 'var(--white)', borderRadius: 12, border: '1px solid var(--border)',
      padding: '18px 20px', marginBottom: 12,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <Stars score={review.score} />
            <StatusBadge status={review.moderation_status} />
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-3)' }}>
            <span style={{ fontWeight: 600, color: 'var(--teal)' }}>
              {review.resident_type || 'utente'}
            </span>
            {' · '}{source.entityLabel}: <code style={{ fontSize: 11, background: 'var(--bg)', padding: '1px 5px', borderRadius: 3 }}>{entityId?.slice(0, 8)}…</code>
            {' · '}{fmtDate(review.created_at)}
          </div>
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-4)', flexShrink: 0 }}>#{review.id?.slice(0, 8)}</div>
      </div>

      {/* Body */}
      <div style={{
        fontSize: 13, color: 'var(--text)', lineHeight: 1.6,
        background: 'var(--bg)', borderRadius: 8, padding: '12px 14px', marginBottom: 12,
        fontStyle: !review.body ? 'italic' : 'normal',
      }}>
        {highlight(review.body)}
      </div>

      {/* Note admin */}
      <div style={{ marginBottom: 12 }}>
        <button onClick={() => setNoteOpen(v => !v)}
          style={{ fontSize: 11, color: 'var(--teal)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, padding: 0 }}>
          {noteOpen ? '▼' : '▶'} Note interne {note ? '(presenti)' : ''}
        </button>
        {noteOpen && (
          <div style={{ marginTop: 8 }}>
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="Note visibili solo all'admin..."
              rows={2}
              style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--border)', borderRadius: 6, fontSize: 12, resize: 'vertical', outline: 'none', fontFamily: 'inherit' }}
            />
          </div>
        )}
      </div>

      {/* Actions */}
      {confirmDelete ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', background: 'var(--red-bg)', borderRadius: 8 }}>
          <span style={{ flex: 1, fontSize: 12, color: 'var(--red-tx)', fontWeight: 600 }}>Eliminare definitivamente questa recensione?</span>
          <button onClick={() => onAction(review.id, 'delete', note)} disabled={busy}
            style={{ padding: '5px 12px', background: '#DC2626', color: '#fff', border: 'none', borderRadius: 5, fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>
            Elimina
          </button>
          <button onClick={() => setConfirmDelete(false)}
            style={{ padding: '5px 10px', background: 'none', border: '1px solid var(--border)', borderRadius: 5, fontSize: 12, cursor: 'pointer' }}>
            Annulla
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {review.moderation_status !== 'approved' && (
            <button onClick={() => onAction(review.id, 'approve', note)} disabled={busy}
              style={{ padding: '6px 12px', fontSize: 12, fontWeight: 700, background: 'var(--green-bg)', color: 'var(--green-tx)', border: 'none', borderRadius: 6, cursor: 'pointer' }}>
              ✓ Approva
            </button>
          )}
          {review.moderation_status !== 'hidden' && (
            <button onClick={() => onAction(review.id, 'hide', note)} disabled={busy}
              style={{ padding: '6px 12px', fontSize: 12, fontWeight: 700, background: 'var(--border-2)', color: 'var(--text-3)', border: 'none', borderRadius: 6, cursor: 'pointer' }}>
              Nascondi
            </button>
          )}
          {review.moderation_status !== 'rejected' && (
            <button onClick={() => onAction(review.id, 'reject', note)} disabled={busy}
              style={{ padding: '6px 12px', fontSize: 12, fontWeight: 700, background: 'var(--amber-bg)', color: 'var(--amber-tx)', border: 'none', borderRadius: 6, cursor: 'pointer' }}>
              Rifiuta
            </button>
          )}
          {review.moderation_status !== 'pending' && (
            <button onClick={() => onAction(review.id, 'pending', note)} disabled={busy}
              style={{ padding: '6px 12px', fontSize: 12, fontWeight: 700, background: 'var(--blue-bg)', color: 'var(--blue-tx)', border: 'none', borderRadius: 6, cursor: 'pointer' }}>
              ↩ Richiedi revisione
            </button>
          )}
          <button onClick={() => setConfirmDelete(true)} disabled={busy}
            style={{ padding: '6px 12px', fontSize: 12, fontWeight: 700, background: 'var(--red-bg)', color: 'var(--red-tx)', border: 'none', borderRadius: 6, cursor: 'pointer', marginLeft: 'auto' }}>
            Elimina
          </button>
        </div>
      )}
    </div>
  )
}

export default function ReviewsModeration({ adminId }) {
  const [sourceKey, setSourceKey] = useState('building')
  const [rows, setRows] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [filterStatus, setFilterStatus] = useState('pending')
  const [loading, setLoading] = useState(true)
  const [actionBusy, setActionBusy] = useState(null)
  const [feedback, setFeedback] = useState('')
  const isMobile = useIsMobile()
  const pad = isMobile ? '16px' : '32px 36px'
  const source = SOURCES[sourceKey]

  const load = useCallback(async () => {
    setLoading(true)
    const { data, count, error } = await source.getAll({ status: filterStatus, page, limit: 20 })
    if (!error) { setRows(data || []); setTotal(count ?? 0) }
    setLoading(false)
  }, [source, filterStatus, page])

  useEffect(() => { load() }, [load])

  function changeSource(key) {
    setSourceKey(key)
    setFilterStatus('pending')
    setPage(0)
  }

  async function handleAction(reviewId, action, note) {
    setActionBusy(reviewId)
    if (action === 'delete') {
      await source.del(reviewId, adminId)
    } else {
      await source.moderate(reviewId, action, note, adminId)
    }
    setFeedback('Azione completata')
    setTimeout(() => setFeedback(''), 2000)
    setActionBusy(null)
    load()
  }

  const STATUS_LABELS = { pending: 'In attesa', approved: 'Approvate', rejected: 'Rifiutate', hidden: 'Nascoste', all: 'Tutte' }

  return (
    <div style={{ padding: pad, maxWidth: 900 }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', marginBottom: 4 }}>Moderazione Recensioni</h1>
        <p style={{ fontSize: 13, color: 'var(--text-3)' }}>{total} recensioni · filtro: {STATUS_LABELS[filterStatus]}</p>
      </div>

      {/* Tab sorgente: condomini vs amministratori */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {Object.entries(SOURCES).map(([key, s]) => (
          <button key={key} onClick={() => changeSource(key)}
            style={{
              padding: '8px 16px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer',
              background: sourceKey === key ? 'var(--teal)' : 'var(--white)',
              color: sourceKey === key ? '#fff' : 'var(--text-2)',
            }}
          >{s.label}</button>
        ))}
      </div>

      {/* Tab filtro stato */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, padding: '4px', background: 'var(--bg)', borderRadius: 8, border: '1px solid var(--border)', overflowX: 'auto', scrollbarWidth: 'none' }}>
        {Object.entries(STATUS_LABELS).map(([k, v]) => (
          <button key={k} onClick={() => { setFilterStatus(k); setPage(0) }}
            style={{
              padding: '7px 14px', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer',
              background: filterStatus === k ? 'var(--white)' : 'transparent',
              color: filterStatus === k ? 'var(--teal)' : 'var(--text-3)',
              boxShadow: filterStatus === k ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
            }}
          >{v}</button>
        ))}
      </div>

      {feedback && (
        <div style={{ background: 'var(--green-bg)', color: 'var(--green-tx)', borderRadius: 8, padding: '10px 16px', marginBottom: 16, fontSize: 13, fontWeight: 600 }}>
          ✓ {feedback}
        </div>
      )}

      {loading ? (
        <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-4)' }}>Caricamento recensioni...</div>
      ) : rows.length === 0 ? (
        <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-4)', fontSize: 14 }}>
          Nessuna recensione in questa categoria.
        </div>
      ) : (
        <>
          {rows.map(r => (
            <ReviewCard key={r.id} review={r} source={source} onAction={handleAction} busy={actionBusy === r.id} />
          ))}

          {total > 20 && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 16, fontSize: 13 }}>
              <span style={{ color: 'var(--text-3)' }}>{total} totali · pag. {page + 1} di {Math.ceil(total / 20)}</span>
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
