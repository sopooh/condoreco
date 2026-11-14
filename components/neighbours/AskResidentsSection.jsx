'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { MessageCircleQuestion, Send, Sparkles, UserRound } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useSession, useSessionReady } from '@/components/providers/SessionProvider'
import { useMyNeighbourQuestions, QUESTION_STATUS, SUGGESTED_QUESTIONS } from '@/hooks/useNeighbourQuestions'

// "Chiedi ai residenti" nella pagina pubblica dell'edificio.
// Chi cerca casa vede solo le proprie domande; le risposte arrivano dai
// residenti verificati (anonimi) o da Condor, che usa la memoria del condominio.
export default function AskResidentsSection({ building }) {
  const session = useSession()
  const ready = useSessionReady()
  const userId = session?.user?.id
  const [member, setMember] = useState(null)
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState(null)
  const api = useMyNeighbourQuestions(building.id, !!userId && member === false)

  useEffect(() => {
    if (!userId) return
    createClient().from('condo_members').select('role').eq('building_id', building.id).eq('user_id', userId).maybeSingle()
      .then(({ data }) => setMember(data ? data.role : false))
  }, [userId, building.id])

  // da una notifica: segna come lette le risposte
  const unread = (api.questions || []).some((q) => q.asker_unread)
  useEffect(() => { if (unread) api.markRead() }, [unread]) // eslint-disable-line react-hooks/exhaustive-deps

  const send = async () => {
    const q = text.trim()
    if (q.length < 8) { setMsg({ err: true, text: 'Scrivi una domanda un po\' più lunga.' }); return }
    if (!userId) {
      window.dispatchEvent(new CustomEvent('condoreco:open-auth', { detail: { next: `/edificio/${building.id}#chiedi-ai-residenti` } }))
      return
    }
    setBusy(true); setMsg(null)
    const r = await api.ask(q)
    setBusy(false)
    if (r.error) { setMsg({ err: true, text: r.error }); return }
    setText('')
    setMsg({ err: false, text: r.data?.status === 'answered_condor' ? 'Condor ha trovato una risposta: la trovi qui sotto.' : 'Domanda inviata ai residenti. Ti avvisiamo quando qualcuno risponde.' })
  }

  const isResident = member === 'resident'
  const isAdmin = member === 'admin'

  return (
    <section id="chiedi-ai-residenti" className="nq-card">
      <div className="nq-head">
        <span className="nq-head-ico"><MessageCircleQuestion size={24} strokeWidth={1.9} aria-hidden="true" /></span>
        <div>
          <h2>Hai una domanda su questo condominio?</h2>
          <p>Chiedi direttamente a chi ci vive. I residenti possono raccontarti la loro esperienza e Condor può aiutarti con le informazioni già condivise dalla community.</p>
        </div>
      </div>

      {isResident || isAdmin ? (
        <div className="nq-note">
          {isResident
            ? <>Vivi qui: le domande di chi cerca casa le trovi nella chat <Link href={`/edificio/${building.id}/condominio/chat?c=vicini`}>Possibili nuovi vicini</Link>.</>
            : <>Le domande di chi cerca casa le vedono e le gestiscono solo i residenti: l&apos;amministratore non ha accesso a questa sezione.</>}
        </div>
      ) : (
        <>
          <label className="nq-field">
            <span className="sr-only">Cosa vorresti sapere su questo condominio?</span>
            <textarea rows={3} maxLength={500} value={text} onChange={(e) => setText(e.target.value)}
              placeholder="Cosa vorresti sapere su questo condominio?" />
          </label>
          <div className="nq-chips" aria-label="Domande suggerite">
            {SUGGESTED_QUESTIONS.map((s) => (
              <button key={s} type="button" onClick={() => setText(s)}>{s}</button>
            ))}
          </div>
          <div className="nq-send-row">
            <small>{userId ? 'Le tue domande sono private: le vedi solo tu.' : 'Serve un account con email verificata.'}</small>
            <button type="button" className="nq-send" disabled={busy || !ready} onClick={send}>
              <Send size={17} aria-hidden="true" />{busy ? 'Invio…' : 'Chiedi ai residenti'}
            </button>
          </div>
          {msg && <p className={msg.err ? 'auth-err' : 'nq-ok'}>{msg.text}</p>}

          {userId && (api.questions?.length ?? 0) > 0 && (
            <div className="nq-mine">
              <h3>Le tue domande</h3>
              {api.questions.map((q) => <MyQuestion key={q.id} q={q} api={api} />)}
            </div>
          )}
        </>
      )}
    </section>
  )
}

function MyQuestion({ q, api }) {
  const [reply, setReply] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)
  const st = QUESTION_STATUS[q.status] || QUESTION_STATUS.pending
  const msgs = (q.messages || []).slice(1) // il primo è la domanda
  const lastCondor = msgs.length > 0 && msgs[msgs.length - 1].author === 'condor'
  const run = async (fn) => { setBusy(true); setErr(null); const r = await fn(); setBusy(false); if (r.error) setErr(r.error); return r }

  return (
    <article className="nq-q">
      <div className="nq-q-top">
        <strong>{q.question_text}</strong>
        <span className={`nq-status is-${st.tone}`}>{st.label}</span>
      </div>
      <small className="nq-date">{new Date(q.created_at).toLocaleDateString('it-IT', { day: 'numeric', month: 'long' })}</small>
      <div className="nq-thread">
        {msgs.map((m) => <Bubble key={m.id} m={m} mine={m.author === 'asker'} />)}
        {msgs.length === 0 && <p className="nq-wait">I residenti hanno ricevuto la tua domanda. Ti avvisiamo quando qualcuno risponde.</p>}
      </div>
      {lastCondor && q.status === 'answered_condor' && (
        <div className="nq-actions">
          <button type="button" className="nq-send" disabled={busy} onClick={() => run(() => api.askResidents(q.id))}>Sì, chiedi ai residenti</button>
          <button type="button" className="nq-ghost" disabled={busy} onClick={() => run(() => api.close(q.id))}>No, grazie</button>
        </div>
      )}
      {q.status !== 'archived' && (
        <div className="nq-reply">
          <input value={reply} maxLength={500} onChange={(e) => setReply(e.target.value)} placeholder="Fai una domanda di approfondimento" />
          <button type="button" aria-label="Invia" disabled={busy || reply.trim().length < 8}
            onClick={async () => { const r = await run(() => api.followup(q.id, reply.trim())); if (!r.error) setReply('') }}>
            <Send size={17} aria-hidden="true" />
          </button>
        </div>
      )}
      {err && <p className="auth-err">{err}</p>}
    </article>
  )
}

export function Bubble({ m, mine }) {
  const icon = m.author === 'condor' ? <Sparkles size={14} aria-hidden="true" /> : m.author === 'resident' ? <UserRound size={14} aria-hidden="true" /> : null
  return (
    <div className={`nq-b${mine ? ' is-mine' : ''}${m.author === 'condor' ? ' is-condor' : ''}`}>
      {!mine && <span className="nq-b-who">{icon}{m.label}{m.author === 'condor' && <em>assistente</em>}</span>}
      <p>{m.body}</p>
      <small>{new Date(m.created_at).toLocaleString('it-IT', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</small>
    </div>
  )
}

