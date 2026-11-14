'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Archive, Bell, BellOff, CheckCheck, Flag, HousePlus, PenLine, PlusCircle, RefreshCw, Send, Sparkles } from 'lucide-react'
import { useResidentNeighbourQuestions, QUESTION_STATUS } from '@/hooks/useNeighbourQuestions'
import { Bubble } from '@/components/neighbours/AskResidentsSection'

// Chat "Possibili nuovi vicini": le domande di chi cerca casa, una conversazione
// per domanda. La vedono e rispondono solo i residenti verificati (non l'amministratore).
export default function NeighbourQuestionsPanel({ building, onBack, focusId }) {
  const api = useResidentNeighbourQuestions(building.id)
  const [showArchived, setShowArchived] = useState(false)
  const list = api.questions || []
  const open = list.filter((q) => q.status !== 'archived')
  const archived = list.filter((q) => q.status === 'archived')
  const waiting = open.filter((q) => q.status === 'pending' || q.status === 'update_requested').length

  return (
    <div className="nq-panel">
      <button type="button" onClick={onBack} className="nq-back">‹ Tutte le chat</button>
      <div className="nq-panel-head">
        <span className="nq-head-ico"><HousePlus size={24} strokeWidth={1.9} aria-hidden="true" /></span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1>Possibili nuovi vicini</h1>
          <p>Domande di chi sta pensando di venire a vivere qui. Rispondi come &quot;Residente verificato&quot;: il tuo nome, piano e interno non vengono mai mostrati.</p>
        </div>
      </div>
      <div className="nq-panel-bar">
        <span className="nq-count">{waiting > 0 ? `${waiting} ${waiting === 1 ? 'domanda in attesa' : 'domande in attesa'}` : 'Nessuna domanda in attesa'}</span>
        <button type="button" className="nq-ghost" onClick={() => api.setNotify(!api.notify)} aria-pressed={api.notify}>
          {api.notify ? <Bell size={16} aria-hidden="true" /> : <BellOff size={16} aria-hidden="true" />}
          {api.notify ? 'Notifiche attive' : 'Notifiche spente'}
        </button>
      </div>

      {api.error && <p className="auth-err">{api.error}</p>}
      {api.questions === null ? <p className="nq-wait">Caricamento…</p> : open.length === 0 ? (
        <div className="nq-empty">
          <HousePlus size={28} aria-hidden="true" />
          <strong>Ancora nessuna domanda</strong>
          <span>Quando qualcuno chiede informazioni su questo condominio dalla pagina pubblica, la trovi qui.</span>
        </div>
      ) : open.map((q) => <ResidentQuestion key={q.id} q={q} api={api} focus={q.id === focusId} />)}

      {archived.length > 0 && (
        <>
          <button type="button" className="nq-ghost" style={{ alignSelf: 'flex-start' }} onClick={() => setShowArchived((v) => !v)}>
            <Archive size={16} aria-hidden="true" />{showArchived ? 'Nascondi archiviate' : `Archiviate (${archived.length})`}
          </button>
          {showArchived && archived.map((q) => <ResidentQuestion key={q.id} q={q} api={api} />)}
        </>
      )}

      <p className="nq-foot">
        Le risposte utili entrano nella memoria del condominio: Condor le usa, senza nomi, per rispondere a domande simili.
        Le conversazioni restano private. <Link href="/privacy-policy">Privacy</Link>
      </p>
    </div>
  )
}

function ResidentQuestion({ q, api, focus }) {
  const st = QUESTION_STATUS[q.status] || QUESTION_STATUS.pending
  const waiting = q.status === 'pending' || q.status === 'update_requested'
  const msgs = q.messages || []
  const sugg = (q.suggestions || [])[0] || null
  const [mode, setMode] = useState(null) // null | 'reply' | 'changed' | 'add'
  const [text, setText] = useState('')
  const [save, setSave] = useState(true)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)
  const run = async (fn) => { setBusy(true); setErr(null); const r = await fn(); setBusy(false); if (r.error) setErr(r.error); return r }

  const submit = async () => {
    const r = await run(() => api.answer(q.id, text.trim(), { save, mode: mode || 'reply', knowledgeId: mode === 'changed' || mode === 'add' ? sugg?.id : null }))
    if (!r.error) { setText(''); setMode(null) }
  }

  return (
    <article className={`nq-q${waiting ? ' is-waiting' : ''}${focus ? ' is-focus' : ''}`} id={`q-${q.id}`}>
      <div className="nq-q-top">
        <span className={`nq-status is-${st.tone}`}>{st.label}</span>
        <small className="nq-date">{new Date(q.created_at).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })}</small>
      </div>
      <div className="nq-thread">
        {msgs.map((m) => <Bubble key={m.id} m={m} mine={m.label === 'Tu'} />)}
      </div>

      {sugg && q.status !== 'archived' && (
        <div className="nq-sugg">
          <span className="nq-sugg-head"><Sparkles size={15} aria-hidden="true" />Domanda simile già presente nella memoria del condominio</span>
          <p>«{sugg.answer}»</p>
          <small>
            {sugg.confirmations > 1 ? `Confermata da ${sugg.confirmations} residenti` : 'Esperienza di un residente'}
            {' · ultimo aggiornamento '}{new Date(sugg.last_verified_at).toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })}
            {sugg.outdated && ' · da verificare'}
          </small>
          <div className="nq-quick">
            <button type="button" disabled={busy || sugg.confirmed_by_me && !waiting} onClick={() => run(() => api.confirm(q.id, sugg.id))}><CheckCheck size={16} aria-hidden="true" />Conferma risposta precedente</button>
            <button type="button" className={mode === 'changed' ? 'is-on' : ''} onClick={() => setMode(mode === 'changed' ? null : 'changed')}><RefreshCw size={16} aria-hidden="true" />La situazione è cambiata</button>
            <button type="button" className={mode === 'add' ? 'is-on' : ''} onClick={() => setMode(mode === 'add' ? null : 'add')}><PlusCircle size={16} aria-hidden="true" />Aggiungi informazioni</button>
            <button type="button" className={mode === 'reply' ? 'is-on' : ''} onClick={() => setMode(mode === 'reply' ? null : 'reply')}><PenLine size={16} aria-hidden="true" />Rispondi personalmente</button>
          </div>
        </div>
      )}

      {q.status !== 'archived' && (!sugg || mode) && (
        <div className="nq-answer">
          <textarea rows={3} maxLength={1500} value={text} onChange={(e) => setText(e.target.value)}
            placeholder={mode === 'changed' ? 'Com\'è la situazione adesso?' : mode === 'add' ? 'Cosa aggiungeresti?' : 'Racconta la tua esperienza'} />
          {(mode === null || mode === 'reply') && (
            <label className="nq-check">
              <input type="checkbox" checked={save} onChange={(e) => setSave(e.target.checked)} />
              Usa questa risposta anche per domande simili (senza il mio nome)
            </label>
          )}
          <div className="nq-answer-bar">
            <small>Evita nomi, numeri di telefono e il tuo interno: email, telefoni e interni vengono comunque tolti dalla memoria.</small>
            <button type="button" className="nq-send" disabled={busy || text.trim().length < 2} onClick={submit}><Send size={16} aria-hidden="true" />Rispondi</button>
          </div>
        </div>
      )}

      {err && <p className="auth-err">{err}</p>}
      <div className="nq-tools">
        {q.status !== 'archived' && <button type="button" disabled={busy} onClick={() => run(() => api.archive(q.id))}><Archive size={15} aria-hidden="true" />Archivia</button>}
        {!q.reported_by_me ? (
          <button type="button" disabled={busy} onClick={() => { const why = window.prompt('Perché segnali questa domanda? (facoltativo)'); if (why !== null) run(() => api.report(q.id, why)) }}>
            <Flag size={15} aria-hidden="true" />Segnala
          </button>
        ) : <span><Flag size={15} aria-hidden="true" />Segnalata</span>}
      </div>
    </article>
  )
}
