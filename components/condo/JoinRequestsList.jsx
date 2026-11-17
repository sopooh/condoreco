'use client'

import { useCallback, useEffect, useState } from 'react'
import { Check, FileText, Sparkles, X } from 'lucide-react'
import { DOCUMENT_LABELS, checkDocumentWithCondor, getDocumentUrl, listDecidedJoinRequests, listPendingJoinRequests, reviewJoinRequest } from '@/lib/residenceVerification'

const VERDICTS = {
  coerente: { label: 'Coerente', color: '#067647', bg: '#ECFDF3' },
  da_verificare: { label: 'Da verificare', color: '#B54708', bg: '#FFF4EC' },
  non_coerente: { label: 'Non coerente', color: '#B42318', bg: '#FEF3F2' },
}
const DETECTED = { ...DOCUMENT_LABELS, documento_identita: 'Documento d\'identità', altro: 'Altro documento', illeggibile: 'Illeggibile' }
const YESNO = { si: 'sì', no: 'no', incerto: 'non chiaro' }
const ADDRESS_MATCH = { si: 'corrisponde', no: 'non corrisponde', incerto: 'non chiaro' }

function CondorReport({ check }) {
  if (check.loading) return <p className="rc-muted" style={{ margin: '10px 0 0', fontSize: 14 }}>Condor sta leggendo il documento…</p>
  if (check.error) return <p role="alert" style={{ margin: '10px 0 0', color: '#B42318', fontSize: 14 }}>{check.error}</p>
  const r = check.report
  const v = VERDICTS[r.verdict] || VERDICTS.da_verificare
  const rows = [
    ['Caricato', r.what_is_it],
    ['Tipo rilevato', `${DETECTED[r.detected_type] || r.detected_type}${r.matches_declared_type ? '' : ' (diverso da quello dichiarato)'}`],
    ['Intestatario', r.holder_name],
    ['Indirizzo', r.address_on_document ? `${r.address_on_document} (${ADDRESS_MATCH[r.address_matches] || 'non chiaro'})` : null],
    ['Data', r.document_date ? new Date(r.document_date).toLocaleDateString('it-IT') : null],
    ['Millesimi', r.millesimi_on_document != null ? `${Number(r.millesimi_on_document).toLocaleString('it-IT')}‰` : null],
    ['Firma', r.signed == null ? null : r.signed ? 'presente' : 'manca'],
    ['Doc. identità', r.id_document_present == null ? null : r.id_document_present ? `presente${r.id_name_matches ? `, nome corrisponde: ${YESNO[r.id_name_matches] || r.id_name_matches}` : ''}` : 'manca'],
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
        Controlla che il documento corrisponda a questo edificio. Il documento viene cancellato appena approvi o respingi; resta solo l&apos;esito del controllo di Condor nello storico.
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
                      <Sparkles size={16} aria-hidden="true" />{r.ai_check ? 'Ricontrolla con Condor' : 'Controlla con Condor'}
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
              {checks[r.id]
                ? <CondorReport check={checks[r.id]} />
                : r.ai_check && <CondorReport check={{ report: r.ai_check, disclaimer: 'Controllo fatto da Condor quando il documento è stato caricato. La decisione finale spetta a te.' }} />}
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
      {!hideWhenEmpty && <JoinHistory buildingId={buildingId} showBuilding={showBuilding} tick={tick} />}
    </section>
  )
}

const STATUS = { approved: { label: 'Approvata', color: '#067647' }, rejected: { label: 'Respinta', color: '#B42318' } }

// Archivio delle verifiche decise: niente file (cancellati), solo dati ed esito di Condor
function JoinHistory({ buildingId, showBuilding, tick }) {
  const [open, setOpen] = useState(false)
  const [rows, setRows] = useState(null)
  const [openId, setOpenId] = useState(null)

  useEffect(() => {
    if (!open) return
    let off = false
    listDecidedJoinRequests(buildingId).then((res) => { if (!off) setRows(res.rows) })
    return () => { off = true }
  }, [open, buildingId, tick])

  return (
    <div style={{ marginTop: 16, borderTop: '1px solid var(--border)', paddingTop: 12 }}>
      <button type="button" onClick={() => setOpen(!open)} aria-expanded={open}
        style={{ minHeight: 0, padding: 0, border: 'none', background: 'none', font: 'inherit', fontWeight: 800, fontSize: 15, color: 'var(--teal-dk)', cursor: 'pointer' }}>
        {open ? '▾' : '▸'} Storico verifiche
      </button>
      {open && (
        rows === null ? <p className="rc-muted" style={{ fontSize: 14 }}>Caricamento…</p>
          : rows.length === 0 ? <p className="rc-muted" style={{ fontSize: 14 }}>Ancora nessuna verifica decisa.</p>
            : (
              <ul style={{ listStyle: 'none', padding: 0, margin: '10px 0 0', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {rows.map((h) => {
                  const st = STATUS[h.status] || { label: h.status, color: 'var(--text-3)' }
                  const v = h.ai_check ? (VERDICTS[h.ai_check.verdict] || VERDICTS.da_verificare) : null
                  return (
                    <li key={h.id} style={{ border: '1px solid var(--border)', borderRadius: 10, padding: '10px 12px' }}>
                      <button type="button" onClick={() => setOpenId(openId === h.id ? null : h.id)}
                        style={{ minHeight: 0, width: '100%', padding: 0, border: 'none', background: 'none', font: 'inherit', textAlign: 'left', cursor: h.ai_check ? 'pointer' : 'default', color: 'inherit' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                          <strong>{h.display_name || 'Utente'}</strong>
                          <span style={{ fontSize: 13, fontWeight: 700, color: st.color }}>{st.label}</span>
                        </div>
                        <div className="rc-muted" style={{ fontSize: 12.5 }}>
                          {[showBuilding ? h.building_address : null, DOCUMENT_LABELS[h.document_type] || h.document_type,
                            h.ai_check?.holder_name ? `intestato a ${h.ai_check.holder_name}` : null,
                            v ? `Condor: ${v.label.toLowerCase()}` : 'senza controllo AI',
                            h.reviewed_at ? `${new Date(h.reviewed_at).toLocaleDateString('it-IT')}${h.reviewer_name ? ` da ${h.reviewer_name}` : ''}` : null,
                          ].filter(Boolean).join(' · ')}
                        </div>
                        {h.reason && <div style={{ fontSize: 13, marginTop: 2 }}>Motivo: {h.reason}</div>}
                      </button>
                      {openId === h.id && h.ai_check && <CondorReport check={{ report: h.ai_check, disclaimer: 'Esito salvato del controllo di Condor. Il documento è stato cancellato dopo la decisione.' }} />}
                    </li>
                  )
                })}
              </ul>
            )
      )}
    </div>
  )
}
