'use client'

import { useState } from 'react'
import { useCondoChat } from '@/hooks/useCondoChat'
import { usePolls } from '@/hooks/usePolls'
import { useEvents } from '@/hooks/useEvents'
import { useCondoRole } from '@/hooks/useCondoRole'

// Esempio di cablaggio dei tre hook sulla struttura della tua pagina.
// La grafica qui e' volutamente minimale: sostituisci il markup con
// le tue card esistenti (Bacheca urgente, Decisioni, Chat).

const EVENT_LABELS = {
  water: 'Acqua',
  maintenance: 'Manutenzione',
  meeting: 'Riunione',
  general: 'Generale',
}

export default function CondoDashboard({ buildingId }) {
  return (
    <div>
      <EventsBoard buildingId={buildingId} />
      <PollsSection buildingId={buildingId} />
      <ChatSection buildingId={buildingId} />
    </div>
  )
}

/* ---------- Bacheca urgente del mese ---------- */

function EventsBoard({ buildingId }) {
  const { events, isCondoAdmin, loading, createEvent, approveEvent } = useEvents(buildingId)
  const [showForm, setShowForm] = useState(false)

  if (loading) return <p>Caricamento bacheca...</p>

  return (
    <section>
      <h2>Bacheca urgente del mese</h2>

      {events.map((ev) => (
        <div key={ev.id}>
          <span>{formatDate(ev.event_date)} · {ev.title}</span>
          {ev.time_start && (
            <span>{ev.time_start.slice(0, 5)}{ev.time_end ? `–${ev.time_end.slice(0, 5)}` : ''}</span>
          )}
          <small>proposto da {ev.profiles?.display_name ?? 'Utente'}</small>

          {!ev.approved && <em> · In attesa di approvazione</em>}
          {!ev.approved && isCondoAdmin && (
            <button onClick={() => approveEvent(ev.id)}>Approva</button>
          )}
        </div>
      ))}

      <button onClick={() => setShowForm((s) => !s)}>Proponi evento</button>
      {showForm && (
        <EventForm
          onSubmit={async (values) => {
            const { error } = await createEvent(values)
            if (!error) setShowForm(false)
            return error
          }}
        />
      )}
    </section>
  )
}

function EventForm({ onSubmit }) {
  const [title, setTitle] = useState('')
  const [eventDate, setEventDate] = useState('')
  const [timeStart, setTimeStart] = useState('')
  const [timeEnd, setTimeEnd] = useState('')
  const [eventType, setEventType] = useState('general')
  const [error, setError] = useState(null)

  return (
    <div>
      <input placeholder="Titolo" value={title} onChange={(e) => setTitle(e.target.value)} />
      <input type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} />
      <input type="time" value={timeStart} onChange={(e) => setTimeStart(e.target.value)} />
      <input type="time" value={timeEnd} onChange={(e) => setTimeEnd(e.target.value)} />
      <select value={eventType} onChange={(e) => setEventType(e.target.value)}>
        {Object.entries(EVENT_LABELS).map(([value, label]) => (
          <option key={value} value={value}>{label}</option>
        ))}
      </select>
      <button
        onClick={async () => {
          const err = await onSubmit({ title, eventDate, timeStart, timeEnd, eventType })
          setError(err)
        }}
      >
        Invia proposta
      </button>
      {error && <p>{error}</p>}
    </div>
  )
}

/* ---------- Decisioni del condominio (poll) ---------- */

function PollsSection({ buildingId }) {
  const { polls, loading, createPoll, castVote } = usePolls(buildingId)
  const [question, setQuestion] = useState('')
  const [feedback, setFeedback] = useState(null)

  if (loading) return <p>Caricamento decisioni...</p>

  return (
    <section>
      <h2>Decisioni del condominio</h2>

      {polls.map((poll) => (
        <div key={poll.id}>
          <h3>{poll.question}</h3>
          <small>creato da {poll.profiles?.display_name ?? 'Utente'}</small>

          <p>{poll.totalVotes} voti · Favorevole {poll.yesPct}% · Contrario {poll.noPct}%</p>

          {poll.status === 'rejected' && (
            <p>
              Bocciato
              {poll.rejection_reason === 'quorum' && ' (quorum non raggiunto)'}
              {poll.rejection_reason === 'majority' && ' (maggioranza non raggiunta)'}
            </p>
          )}
          {poll.status === 'approved' && <p>Approvato</p>}

          {poll.isOpen && !poll.hasVoted && (
            <div>
              <button onClick={async () => setFeedback((await castVote(poll.id, true)).error)}>
                Favorevole
              </button>
              <button onClick={async () => setFeedback((await castVote(poll.id, false)).error)}>
                Contrario
              </button>
            </div>
          )}
          {poll.hasVoted && <small>Hai votato: {poll.myVote ? 'Favorevole' : 'Contrario'}</small>}
        </div>
      ))}

      <div>
        <input
          placeholder="Proponi una decisione..."
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
        />
        <button
          onClick={async () => {
            const { error } = await createPoll({ question, minVotes: 10, durationDays: 7 })
            setFeedback(error)
            if (!error) setQuestion('')
          }}
        >
          Crea sondaggio
        </button>
      </div>
      {feedback && <p>{feedback}</p>}
    </section>
  )
}

/* ---------- Chat del condominio ---------- */

function ChatSection({ buildingId }) {
  const { messages, loading, sendMessage, hideMessage } = useCondoChat(buildingId)
  const { isCondoAdmin } = useCondoRole(buildingId)
  const [draft, setDraft] = useState('')

  if (loading) return <p>Caricamento chat...</p>

  return (
    <section>
      <h2>Chat del condominio</h2>

      {messages.map((msg) => (
        <div key={msg.id}>
          <strong>{msg.profiles?.display_name ?? 'Utente'}</strong>
          <span>{formatTime(msg.created_at)}</span>
          <p>{msg.content}</p>
          {isCondoAdmin && (
            <button onClick={() => hideMessage(msg.id)}>Nascondi</button>
          )}
        </div>
      ))}

      <input
        placeholder="Scrivi un messaggio..."
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={async (e) => {
          if (e.key === 'Enter') {
            const { error } = await sendMessage(draft)
            if (!error) setDraft('')
          }
        }}
      />
    </section>
  )
}

/* ---------- Utility ---------- */

function formatDate(isoDate) {
  return new Date(isoDate + 'T00:00:00').toLocaleDateString('it-IT', {
    day: 'numeric',
    month: 'long',
  })
}

function formatTime(isoTimestamp) {
  return new Date(isoTimestamp).toLocaleTimeString('it-IT', {
    hour: '2-digit',
    minute: '2-digit',
  })
}
