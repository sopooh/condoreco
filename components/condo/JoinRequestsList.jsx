'use client'

import { useCallback, useEffect, useState } from 'react'
import { Check, FileText, Sparkles, X } from 'lucide-react'
import { DOCUMENT_LABELS, checkDocumentWithCondor, getDocumentUrl, listPendingJoinRequests, reviewJoinRequest } from '@/lib/residenceVerification'

const VERDICTS = {
  coerente: { label: 'Coerente', color: '#067647', bg: '#ECFDF3' },
  da_verificare: { label: 'Da verificare', color: '#B54708', bg: '#FFF4EC' },
  non_coerente: { label: 'Non coerente', color: '#B42318', bg: '#FEF3F2' },
}
const DETECTED = { ...DOCUMENT_LABELS, altro: 'Altro documento', illeggibile: 'Illeggibile' }
const ADDRESS_MATCH = { si: 'corrisponde', no: 'non corrisponde', incerto: 'non chiaro' }

function CondorReport({ check }) {
  if (check.loading) return <p className="rc-muted" style={{ margin: '10px 0 0', fontSize: 14 }}>Condor sta leggendo il documento…</p>
  if (check.error) return <p role="alert" style={{ margin: '10px 0 0', color: '#B42318', fontSize: 14 }}>{check.error}</p>
  const r = check.report
  const v = VERDICTS[r.verdict] || VERDICTS.da_verificare
  const rows = [
    ['Tipo rilevato', `${DETECTED[r.detected_type] || r.detected_type}${r.matches_declared_type ? '' : ' (diverso da quello dichiarato)'}`],
    ['Intestatario', r.holder_name],
    ['Indirizzo', r.address_on_document ? `${r.address_on_document} (${ADDRESS_MATCH[r.address_matches] || 'non chiaro'})` : null],
    ['Data', r.document_date ? new Date(r.document_date).toLocaleDateString('it-IT') : null],
    ['Millesimi', r.millesimi_on_document != null ? `${Number(r.millesimi_on_document).toLocaleString('it-IT')}‰` : null],
  ].filter(([, val]) => val)
  return (
    <div style={{ marginTop: 10, padding: 12, borderRadius: 10, background: v.bg }} aria-live="polite">
      <p style={{ margin: '0 0 6px', fontWeight: 800, color: v.color }}>Parere di Condor: {v.label}</p>
      <dl style={{ margin: 0, display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '2px 10px', fontSize: 14 }}>
        {rows.map(([k, val]) => [<dt key={`${k}-k`} className="rc-muted">{k}</dt>, <dd key={`${k}-v`} style={{ margin: 0 }}>{val}</dd>])}
      </dl>
      {r.issues?.length > 0 && (
        <ul style={{ margin: '8px 0 0', paddingLeft: 18, fontSize: 14 }}>{r.issues.map((i, n) => <li key={n}>{i}</li>)}</ul>
      )}
      {r.note && <p style={{ margin: '8px 0 0', fontSize: 14 }}>{r.note}</p>}
      <p className="rc-muted" style={{ margin: '8px 0 0', fontSize: 12 }}>{check.disclaimer || 'Parere automatico: la decisione finale spetta a te.'}</p>
    </div>
  )
}

// Richieste di accesso all'area condominio in attesa. Con buildingId: quelle
// di un condominio (vista admin condominio). Senza: tutte quelle che l'utente
// puo' decidere (vista staff: condomini senza amministratore).
// Il documento si apre con un URL firmato di 5 minuti e viene cancellato
// subito dopo la decisione.
export default function JoinRequestsList({ buildingId = null, showBuilding = false, hideWhenEmpty = false }) {
  const [rows, setRows] = useState(null)
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(null)
  const [rejecting, setRejecting] = useState(null)
  const [reason, setReason] = useState('')
  const [checks, setChecks] = useState({})

  const [tick, setTick] = useState(0)
  const load = useCallback(() => setTick(t => t + 1), [])

  useEffect(() => {
    let cancelled = false
    listPendingJoinRequests(buildingId).then(res => {
      if (cancelled) return
      setError(res.error ?? null)
      setRows(res.rows)
    })
    return () => { cancelled = true }
  }, [buildingId, tick])

  async function openDoc(path) {
    const url = await getDocumentUrl(path)
    if (url) window.open(url, '_blank', 'noopener,noreferrer')
    else setError('Documento non disponibile.')
  }

  async function checkDoc(id) {
    setChecks(c => ({ ...c, [id]: { loading: true } }))
    const res = await checkDocumentWithCondor(id)
    setChecks(c => ({ ...c, [id]: res }))
  }

  async function decide(id, approve) {
    setBusy(id); setError(null)
    const res = await reviewJoinRequest(id, approve, approve ? null : reason)
    setBusy(null)
    if (res.error) { setError(res.error); return }
    setRejecting(null); setReason('')
    load()
  }

  if (rows === null) return hideWhenEmpty ? null : <p className="rc-muted" style={{ padding: 16 }}>Caricamento…</p>
  if (hideWhenEmpty && rows.length === 0 && !error) return null

  return (
    <section className="acc-card" style={{ padding: 16, marginBottom: 16 }} aria-labelledby="join-req-title">
      <h2 id="join-req-title" style={{ fontSize: 17, fontWeight: 800, margin: '0 0 4px' }}>Richieste di accesso</h2>
      <p className="rc-muted" style={{ margin: '0 0 12px', fontSize: 13 }}>
        Controlla che il documento corrisponda a questo edificio. Il documento viene cancellato appena approvi o respingi.
      </p>
      {error && <p role="alert" style={{ color: '#B42318', fontSize: 14 }}>{error}</p>}
      {rows.length === 0 ? (
        <p className="rc-muted" style={{ margin: 0 }}>Nessuna richiesta in attesa.</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {rows.map((r) => (
            <li key={r.id} style={{ border: '1px solid var(--border)', borderRadius: 12, padding: 12 }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ minWidth: 0 }}>
                  <strong>{r.display_name || 'Utente'}</strong>
                  <div className="rc-muted" style={{ fontSize: 13 }}>
                    {[showBuilding ? r.building_address : null,
                      r.tenure === 'tenant' ? 'Inquilino' : r.tenure === 'owner' ? 'Proprietario' : null,
                      r.floor ? `Piano ${r.floor}` : null,
                      r.millesimi != null ? `${Number(r.millesimi).toLocaleString('it-IT')}‰` : null,
                      new Date(r.created_at).toLocaleDateString('it-IT')].filter(Boolean).join(' · ')}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {r.document_path && (
                    <button type="button" className="acc-btn" onClick={() => openDoc(r.document_path)}>
                      <FileText size={16} aria-hidden="true" />{DOCUMENT_LABELS[r.document_type] || 'Documento'}
                    </button>
                  )}
                  {r.document_path && (
                    <button type="button" className="acc-btn" disabled={checks[r.id]?.loading} onClick={() => checkDoc(r.id)}>
                      <Sparkles size={16} aria-hidden="true" />Controlla con Condor
                    </button>
                  )}
                  <button type="button" className="acc-btn is-primary" disabled={busy === r.id} onClick={() => decide(r.id, true)}>
                    <Check size={16} aria-hidden="true" />Approva
                  </button>
                  <button type="button" className="acc-btn" disabled={busy === r.id} onClick={() => { setRejecting(rejecting === r.id ? null : r.id); setReason('') }}>
                    <X size={16} aria-hidden="true" />Respingi
                  </button>
                </div>
              </div>
              {checks[r.id] && <CondorReport check={checks[r.id]} />}
              {rejecting === r.id && (
                <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <input id={`reason-${r.id}`} aria-label="Motivo del rifiuto" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300}
                    placeholder="Motivo (lo vede solo il richiedente)"
                    style={{ flex: 1, minWidth: 200, padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border)' }} />
                  <button type="button" className="acc-btn" disabled={busy === r.id} onClick={() => decide(r.id, false)}>Conferma rifiuto</button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
