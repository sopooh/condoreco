'use client'

import { useCallback, useEffect, useState } from 'react'
import { FileCheck2, FileText, TriangleAlert } from 'lucide-react'
import { documentTypeLabel, fetchPendingMillesimi, millesimiDocUrl, reviewMillesimi } from '@/lib/millesimiVerification'

const fmtMill = (n) => Number(n).toLocaleString('it-IT', { maximumFractionDigits: 3 })
const fmtDate = (d) => new Date(d).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })

// Richieste di verifica millesimi in attesa. buildingId = condominio
// (amministratore); null = staff Condoreco, condomini senza un altro amministratore.
export default function MillesimiReviewList({ buildingId }) {
  const staff = buildingId == null
  const [rows, setRows] = useState(null)
  const [tick, setTick] = useState(0)
  const load = useCallback(() => setTick((t) => t + 1), [])

  useEffect(() => {
    let cancelled = false
    fetchPendingMillesimi(buildingId).then(({ rows }) => { if (!cancelled) setRows(rows) })
    return () => { cancelled = true }
  }, [buildingId, tick])

  if (rows === null) return staff ? <p className="rc-muted">Caricamento…</p> : null
  if (rows.length === 0) return staff ? <div className="acc-card"><p className="rc-muted" style={{ margin: 0 }}>Nessuna richiesta in attesa.</p></div> : null

  return (
    <section className="acc-card" style={{ borderColor: '#F5D0B5' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <FileCheck2 size={18} aria-hidden="true" style={{ color: '#C2410C' }} />
        <strong style={{ fontSize: 15.5 }}>Millesimi da verificare ({rows.length})</strong>
      </div>
      <p className="rc-muted" style={{ margin: '0 0 12px', fontSize: 13 }}>
        Apri il documento e controlla che i millesimi corrispondano. Dopo la decisione il file viene cancellato.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {rows.map((r) => <Request key={r.id} r={r} staff={staff} onDone={load} />)}
      </div>
    </section>
  )
}

function Request({ r, staff, onDone }) {
  const [busy, setBusy] = useState(false)
  const [rejecting, setRejecting] = useState(false)
  const [reason, setReason] = useState('')
  const [err, setErr] = useState(null)

  async function open() {
    const url = await millesimiDocUrl(r.file_path)
    if (url) window.open(url, '_blank', 'noopener')
    else setErr('Non riesco ad aprire il documento.')
  }

  async function decide(approve) {
    setBusy(true); setErr(null)
    const { error } = await reviewMillesimi({ id: r.id, approve, reason })
    setBusy(false)
    if (error) setErr(error)
    else onDone()
  }

  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 14, padding: 12, background: 'var(--white)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
        <div style={{ minWidth: 0 }}>
          <strong style={{ fontSize: 15 }}>{r.display_name || 'Condomino'}</strong>
          <div className="rc-muted" style={{ fontSize: 13, marginTop: 2 }}>
            {[staff ? r.building_label : null, r.floor ? `Piano ${r.floor}` : null, `Inviata il ${fmtDate(r.created_at)}`].filter(Boolean).join(' · ')}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 18, fontWeight: 800 }}>{fmtMill(r.millesimi)}‰</div>
          {r.current_millesimi != null && <div className="rc-muted" style={{ fontSize: 12 }}>ora {fmtMill(r.current_millesimi)}‰</div>}
        </div>
      </div>

      <div style={{ fontSize: 13.5, marginTop: 8, color: 'var(--text-2)' }}>
        {documentTypeLabel(r.document_type)}
        {r.name_on_document === 'previous_owner'
          ? <div style={{ display: 'flex', gap: 6, marginTop: 6, color: '#B54708' }}><TriangleAlert size={15} aria-hidden="true" style={{ flexShrink: 0, marginTop: 2 }} /><span>Subentro: sul documento è indicato il proprietario precedente, <b>{r.previous_owner_name}</b>.</span></div>
          : <span className="rc-muted"> · intestato al condomino</span>}
      </div>

      {rejecting && (
        <textarea value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} rows={2}
          placeholder="Motivo (es. i millesimi non corrispondono, documento illeggibile)"
          style={{ width: '100%', marginTop: 10, border: '1px solid var(--border)', borderRadius: 10, padding: 10, fontSize: 14, fontFamily: 'inherit', boxSizing: 'border-box' }} />
      )}
      {err && <p style={{ color: '#B42318', fontSize: 13, margin: '8px 0 0' }}>{err}</p>}

      <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
        <button type="button" className="acc-btn" onClick={open} disabled={!r.file_path}><FileText size={15} aria-hidden="true" />Apri documento</button>
        <span style={{ flex: 1 }} />
        {rejecting ? (
          <>
            <button type="button" className="acc-btn" onClick={() => { setRejecting(false); setReason('') }} disabled={busy}>Annulla</button>
            <button type="button" className="acc-btn is-danger" onClick={() => decide(false)} disabled={busy || !reason.trim()}>Conferma rifiuto</button>
          </>
        ) : (
          <>
            <button type="button" className="acc-btn is-danger" onClick={() => setRejecting(true)} disabled={busy}>Rifiuta</button>
            <button type="button" className="acc-btn is-primary" onClick={() => decide(true)} disabled={busy}>Approva</button>
          </>
        )}
      </div>
    </div>
  )
}
