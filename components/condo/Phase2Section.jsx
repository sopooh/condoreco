'use client'

import { useEffect, useMemo, useState } from 'react'
import { Check, Clock, ImagePlus, Layers, Pencil, Plus, Trash2, Trophy, X } from 'lucide-react'
import { pollImageUrl } from '@/lib/pollImages'

const fmtDate = (iso) => new Date(iso).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })

// Fase 2 di una decisione: scelta tra più proposte (con immagini) dopo un Sì approvato.
// none → (creatore) "Aggiungi una fase 2"; draft → proposte in preparazione;
// open → si vota; closed → proposta scelta.
export default function Phase2Section({ poll, canManage, setPhase2, openPhase2, saveOption, deleteOption, voteOption }) {
  const [editingOpt, setEditingOpt] = useState(null) // {} nuova | option esistente
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)
  const status = poll.phase2_status
  const locked = poll.phase2Total > 0
  const canEdit = canManage && !locked && poll.status !== 'rejected' && status !== 'closed'

  async function run(fn) {
    setBusy(true); setErr(null)
    const r = await fn()
    setBusy(false)
    if (r?.error) setErr(r.error)
    return r
  }

  if (status === 'none') {
    if (!canManage || poll.status === 'rejected') return null
    return (
      <section className="p2 p2-empty">
        <span className="p2-ico"><Layers size={22} aria-hidden="true" /></span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="p2-title">Serve scegliere tra più proposte?</div>
          <p className="p2-sub">Aggiungi una fase 2: se la decisione viene approvata, i condomini votano tra le tue proposte (per esempio i colori della facciata), anche con immagini.</p>
          <button type="button" className="p2-btn" disabled={busy}
            onClick={() => run(() => setPhase2(poll.id, { enabled: true, question: null, days: 7 }))}>
            <Plus size={18} aria-hidden="true" />Aggiungi una fase 2
          </button>
          {err && <p className="auth-err" style={{ marginTop: 10 }}>{err}</p>}
        </div>
      </section>
    )
  }

  const winner = poll.options.find((o) => o.id === poll.phase2_winner)
  const header = {
    draft: poll.status === 'approved'
      ? ['Fase 2 · pronta da aprire', poll.options.length >= 2 ? 'La decisione è approvata: apri il voto sulle proposte.' : 'La decisione è approvata: aggiungi almeno 2 proposte per aprire il voto.']
      : poll.status === 'rejected'
        ? ['Fase 2 · non si apre', 'La decisione è stata bocciata, quindi non si vota sulle proposte.']
        : ['Fase 2 · in preparazione', 'Si apre da sola quando la decisione viene approvata, se ci sono almeno 2 proposte.'],
    open: ['Fase 2 · si vota', `Scegli una proposta. Chiude il ${fmtDate(poll.phase2_closes_at)}.`],
    closed: ['Fase 2 · conclusa', winner ? 'I condomini hanno scelto:' : 'Nessuno ha votato nella fase 2.'],
  }[status]

  return (
    <section className="p2">
      <div className="p2-head">
        <span className={`p2-badge is-${status}`}>{status === 'open' ? <Clock size={14} aria-hidden="true" /> : status === 'closed' ? <Trophy size={14} aria-hidden="true" /> : <Layers size={14} aria-hidden="true" />}{header[0]}</span>
        <h2 className="p2-q">{poll.phase2_question || 'Quale proposta preferisci?'}</h2>
        <p className="p2-sub">{header[1]}</p>
      </div>

      {canManage && status !== 'closed' && poll.status !== 'rejected' && (
        <Phase2Settings poll={poll} locked={locked} busy={busy} onSave={(v) => run(() => setPhase2(poll.id, v))}
          onRemove={status === 'draft' ? () => run(() => setPhase2(poll.id, { enabled: false, question: poll.phase2_question, days: poll.phase2_days })) : null} />
      )}

      <div className="p2-grid">
        {poll.options.map((o) => (
          <OptionCard key={o.id} o={o} poll={poll} status={status} winner={o.id === poll.phase2_winner}
            canEdit={canEdit} busy={busy}
            onEdit={() => setEditingOpt(o)}
            onDelete={() => run(() => deleteOption(o.id))}
            onVote={() => run(() => voteOption(poll, o.id))} />
        ))}
        {canEdit && (
          <button type="button" className="p2-add" onClick={() => setEditingOpt({})}>
            <Plus size={26} aria-hidden="true" />Aggiungi proposta
          </button>
        )}
      </div>

      {poll.options.length === 0 && !canEdit && <p className="p2-sub" style={{ marginTop: 8 }}>Ancora nessuna proposta.</p>}

      {status === 'open' && (
        <p className="p2-foot">
          {poll.phase2Total} vot{poll.phase2Total === 1 ? 'o' : 'i'}
          {poll.myOption ? (poll.canChangeOption ? ' · puoi cambiare il voto una volta' : ' · voto già cambiato una volta') : ' · tocca una proposta per votarla'}
          {locked && canManage ? ' · le proposte non si modificano più dopo il primo voto' : ''}
        </p>
      )}

      {canManage && status === 'draft' && poll.status === 'approved' && (
        <button type="button" className="ep-save" style={{ marginTop: 14 }} disabled={busy || poll.options.length < 2}
          onClick={() => run(() => openPhase2(poll.id))}>
          {poll.options.length < 2 ? 'Servono almeno 2 proposte' : 'Apri il voto della fase 2'}
        </button>
      )}
      {err && <p className="auth-err" style={{ marginTop: 10 }}>{err}</p>}

      {editingOpt && (
        <OptionSheet option={editingOpt} onClose={() => setEditingOpt(null)}
          onSave={async (v) => { const r = await saveOption(poll, { ...v, id: editingOpt.id }); if (!r.error) setEditingOpt(null); return r.error }} />
      )}
    </section>
  )
}

function Phase2Settings({ poll, locked, busy, onSave, onRemove }) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState(poll.phase2_question || '')
  const [days, setDays] = useState(poll.phase2_days || 7)
  if (!open) {
    return (
      <div className="p2-tools">
        <button type="button" className="p2-link" onClick={() => setOpen(true)}><Pencil size={15} aria-hidden="true" />{locked ? 'Prolunga la fase 2' : 'Modifica domanda e durata'}</button>
        {onRemove && <button type="button" className="p2-link is-danger" disabled={busy} onClick={onRemove}><X size={15} aria-hidden="true" />Togli la fase 2</button>}
      </div>
    )
  }
  if (locked) {
    return (
      <div className="p2-settings">
        <span className="ep-label">Prolunga il voto</span>
        <div className="p2-chips">
          {[1, 3, 7].map((d) => (
            <button key={d} type="button" className="p2-chip" disabled={busy}
              onClick={async () => { const r = await onSave({ enabled: true, question: poll.phase2_question, days: poll.phase2_days, closesAt: new Date(new Date(poll.phase2_closes_at).getTime() + d * 86400000).toISOString() }); if (!r?.error) setOpen(false) }}>
              +{d} {d === 1 ? 'giorno' : 'giorni'}
            </button>
          ))}
        </div>
        <button type="button" className="p2-link" onClick={() => setOpen(false)}>Annulla</button>
      </div>
    )
  }
  return (
    <form className="p2-settings" onSubmit={async (e) => {
      e.preventDefault()
      const r = await onSave({ enabled: true, question: q.trim() || null, days, closesAt: poll.phase2_status === 'open' ? new Date(new Date(poll.phase2_opens_at).getTime() + days * 86400000).toISOString() : null })
      if (!r?.error) setOpen(false)
    }}>
      <label className="ep-field"><span className="ep-label">Domanda della fase 2</span>
        <span className="ep-input"><input value={q} onChange={(e) => setQ(e.target.value)} maxLength={200} placeholder="Es. Quale colore per la facciata?" /></span>
      </label>
      <span className="ep-label">Durata del voto</span>
      <div className="p2-chips">
        {[3, 7, 14].map((d) => <button key={d} type="button" className={`p2-chip${days === d ? ' is-on' : ''}`} aria-pressed={days === d} onClick={() => setDays(d)}>{d} giorni</button>)}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 12 }}>
        <button type="button" className="auth-secondary" onClick={() => setOpen(false)}>Annulla</button>
        <button type="submit" className="ep-save" disabled={busy}>Salva</button>
      </div>
    </form>
  )
}

function useImage(path) {
  const [url, setUrl] = useState(null)
  useEffect(() => {
    let off = false
    if (path) pollImageUrl(path).then((u) => { if (!off) setUrl(u) })
    return () => { off = true }
  }, [path])
  return path ? url : null
}

function OptionCard({ o, poll, status, winner, canEdit, busy, onEdit, onDelete, onVote }) {
  const url = useImage(o.image_path)
  const mine = poll.myOption === o.id
  const canVote = status === 'open' && poll.phase2Open && (!poll.myOption || (poll.canChangeOption && !mine))
  const showResults = status === 'closed' || (status === 'open' && (poll.myOption || poll.phase2Total > 0))
  const [confirmDel, setConfirmDel] = useState(false)
  return (
    <article className={`p2-opt${mine ? ' is-mine' : ''}${winner ? ' is-winner' : ''}`}>
      <button type="button" className="p2-opt-main" disabled={!canVote || busy} onClick={onVote} aria-pressed={mine}
        aria-label={canVote ? `Vota ${o.title}` : o.title}>
        <span className="p2-opt-img">
          {o.image_path ? (url ? <img src={url} alt="" /> : <span className="chat-media-ph" style={{ width: '100%', height: '100%' }} />)
            : <span className="p2-opt-noimg">{o.title.slice(0, 1).toUpperCase()}</span>}
          {mine && <span className="p2-opt-check"><Check size={16} strokeWidth={3} aria-hidden="true" /></span>}
          {winner && <span className="p2-opt-win"><Trophy size={14} aria-hidden="true" />Scelta</span>}
        </span>
        <span className="p2-opt-body">
          <strong>{o.title}</strong>
          {o.description && <span className="p2-opt-desc">{o.description}</span>}
          {showResults && (
            <span className="p2-opt-res">
              <span className="p2-opt-bar"><span style={{ width: `${o.pct}%` }} /></span>
              <span>{o.pct}% · {o.votes} vot{o.votes === 1 ? 'o' : 'i'}</span>
            </span>
          )}
          {canVote && <span className="p2-opt-cta">{poll.myOption ? 'Cambia in questa' : 'Vota questa'}</span>}
        </span>
      </button>
      {canEdit && (
        <div className="p2-opt-tools">
          {confirmDel ? (
            <>
              <span style={{ fontSize: 13, color: 'var(--text-3)' }}>Togliere?</span>
              <button type="button" onClick={() => setConfirmDel(false)}>No</button>
              <button type="button" className="is-danger" onClick={onDelete} disabled={busy}>Sì, togli</button>
            </>
          ) : (
            <>
              <button type="button" onClick={onEdit}><Pencil size={15} aria-hidden="true" />Modifica</button>
              <button type="button" className="is-danger" onClick={() => setConfirmDel(true)}><Trash2 size={15} aria-hidden="true" />Togli</button>
            </>
          )}
        </div>
      )}
    </article>
  )
}

function OptionSheet({ option, onClose, onSave }) {
  const [title, setTitle] = useState(option.title || '')
  const [description, setDescription] = useState(option.description || '')
  const [file, setFile] = useState(null)
  const [removeImage, setRemoveImage] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)
  const existing = useImage(removeImage ? null : option.image_path)
  const preview = useMemo(() => (file ? URL.createObjectURL(file) : null), [file])
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview) }, [preview])
  const shown = preview || existing

  async function submit(e) {
    e.preventDefault()
    if (!title.trim()) { setErr('Dai un nome alla proposta.'); return }
    setBusy(true); setErr(null)
    const e2 = await onSave({ title, description, file, removeImage: removeImage && !file })
    setBusy(false)
    if (e2) setErr(e2)
  }

  return (
    <div className="dir-sheet-wrap" role="dialog" aria-modal="true" aria-label="Proposta">
      <div className="dir-sheet-backdrop" onClick={busy ? undefined : onClose} />
      <form className="dir-sheet" onSubmit={submit} style={{ maxHeight: '90vh', overflowY: 'auto' }}>
        <div className="dir-sheet-head">
          <div className="dir-sheet-title">{option.id ? 'Modifica proposta' : 'Nuova proposta'}</div>
          <button type="button" className="dir-sheet-close" onClick={onClose} disabled={busy} aria-label="Chiudi"><X size={22} /></button>
        </div>

        <label className="p2-upload">
          {shown ? <img src={shown} alt="" /> : (
            <span className="p2-upload-empty"><ImagePlus size={30} aria-hidden="true" /><strong>Aggiungi un&apos;immagine</strong><small>Foto, render o campione di colore</small></span>
          )}
          <input type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) { setFile(f); setRemoveImage(false) } }} />
        </label>
        {shown && (
          <button type="button" className="p2-link is-danger" style={{ marginBottom: 12 }} onClick={() => { setFile(null); setRemoveImage(true) }}>
            <Trash2 size={15} aria-hidden="true" />Togli l&apos;immagine
          </button>
        )}

        <label className="ep-field"><span className="ep-label">Nome della proposta</span>
          <span className="ep-input"><input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} placeholder="Es. Giallo ocra" /></span>
        </label>
        <label className="ep-field"><span className="ep-label">Descrizione (facoltativa)</span>
          <span className="ep-input" style={{ height: 'auto' }}>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} maxLength={600} placeholder="Costo, tempi, dettagli utili"
              style={{ flex: 1, border: 'none', outline: 'none', resize: 'none', font: 'inherit', fontSize: 16, padding: '12px 14px', background: 'transparent' }} />
          </span>
        </label>
        {err && <p className="auth-err">{err}</p>}
        <button type="submit" className="ep-save" disabled={busy}>{busy ? 'Salvataggio…' : option.id ? 'Salva modifiche' : 'Aggiungi proposta'}</button>
      </form>
    </div>
  )
}
