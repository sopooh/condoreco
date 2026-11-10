'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { usePolls } from '@/hooks/usePolls'
import { useCondoRole } from '@/hooks/useCondoRole'
import PollCard from '@/components/condo/PollCard'
import { LegalNote, backLink } from '@/components/condo/PollsPage'

// Dettaglio di una decisione: card con voto + riepilogo (chi l'ha proposta,
// quando, quorum, conteggio voti, esito).
export default function PollDetail({ building, pollId }) {
  const buildingId = building.id
  const router = useRouter()
  const { polls, loading, error, castVote, updatePoll, deletePoll } = usePolls(buildingId)
  const { isCondoAdmin } = useCondoRole(buildingId)
  const poll = polls.find((p) => p.id === pollId)
  const listHref = `/edificio/${buildingId}/condominio/decisioni`
  const [editing, setEditing] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState(null)

  const canEdit = poll?.isMine && poll?.isOpen
  const canDelete = poll && (poll.isMine || isCondoAdmin)

  async function handleDelete() {
    setBusy(true)
    const { error } = await deletePoll(poll.id)
    setBusy(false)
    if (error) { setActionError(error); setConfirmDelete(false); return }
    router.push(listHref)
  }

  return (
    <div className="wrap condo-private-wrap" style={{ maxWidth: 760, margin: '0 auto' }}>
      <Link href={listHref} style={backLink}>‹ Tutte le decisioni</Link>

      {loading ? (
        <p style={{ fontSize: 14, color: 'var(--text-3)' }}>Caricamento...</p>
      ) : error ? (
        <p style={{ fontSize: 14, color: '#B42318' }}>Non riesco a caricare la decisione. Riprova tra poco.</p>
      ) : !poll ? (
        <p style={{ fontSize: 14, color: 'var(--text-3)' }}>Questa decisione non esiste o non e&apos; piu&apos; disponibile.</p>
      ) : (
        <>
          <PollCard poll={poll} onVote={castVote} />

          {(canEdit || canDelete) && !editing && (
            <div style={{ display: 'grid', gridTemplateColumns: canEdit && canDelete ? '1fr 1fr' : '1fr', gap: 10 }}>
              {canEdit && (
                <button onClick={() => { setEditing(true); setActionError(null) }} style={outlineBtn}>
                  <PencilIcon /> Modifica
                </button>
              )}
              {canDelete && (
                <button onClick={() => setConfirmDelete(true)} style={{ ...outlineBtn, color: '#B42318', borderColor: '#F5C2C0' }}>
                  <TrashIcon /> Elimina
                </button>
              )}
            </div>
          )}
          {actionError && <p style={{ fontSize: 13, color: '#B42318', margin: 0 }}>{actionError}</p>}

          {editing && (
            <EditPollForm
              poll={poll}
              onCancel={() => setEditing(false)}
              onSave={async (values) => {
                const { error } = await updatePoll(poll.id, values)
                if (!error) setEditing(false)
                return error
              }}
            />
          )}

          {confirmDelete && (
            <div onClick={() => !busy && setConfirmDelete(false)} style={{ position: 'fixed', inset: 0, zIndex: 600, background: 'rgba(15,41,38,0.45)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
              <div onClick={(e) => e.stopPropagation()} style={{ background: 'var(--white)', width: '100%', maxWidth: 520, borderRadius: '20px 20px 0 0', padding: '20px 20px calc(20px + env(safe-area-inset-bottom))' }}>
                <div style={{ fontSize: 19, fontWeight: 800, marginBottom: 6 }}>Eliminare la decisione?</div>
                <p style={{ fontSize: 14, color: 'var(--text-3)', lineHeight: 1.5, margin: '0 0 18px' }}>
                  {`"${poll.question}" e ${poll.totalVotes === 1 ? 'il voto ricevuto' : `i ${poll.totalVotes} voti ricevuti`} verranno cancellati. Non si può annullare.`}
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <button onClick={() => setConfirmDelete(false)} disabled={busy} style={outlineBtn}>Annulla</button>
                  <button onClick={handleDelete} disabled={busy} style={{ ...outlineBtn, background: '#B42318', borderColor: '#B42318', color: '#fff' }}>
                    {busy ? 'Eliminazione...' : 'Elimina'}
                  </button>
                </div>
              </div>
            </div>
          )}

          <div style={{ background: 'var(--white)', border: '1px solid var(--border)', borderRadius: 18, padding: '4px 20px' }}>
            <Row label="Proposta da" value={poll.profiles?.display_name ?? 'Un residente'} />
            <Row label="Pubblicata il" value={fmt(poll.created_at)} />
            <Row label={poll.isOpen ? 'Chiude il' : 'Chiusa il'} value={fmt(poll.closes_at, true)} />
            <Row label="Voti favorevoli" value={poll.yesVotes} />
            <Row label="Voti contrari" value={poll.noVotes} />
            <Row
              label="Quorum"
              value={`${poll.totalVotes} su ${poll.min_votes} ${poll.totalVotes >= poll.min_votes ? '(raggiunto)' : '(non ancora raggiunto)'}`}
            />
            <Row label="Esito" value={outcome(poll)} last />
          </div>

          <LegalNote />
        </>
      )}
    </div>
  )
}

function outcome(poll) {
  if (poll.status === 'approved') return 'Approvata'
  if (poll.status === 'rejected') {
    return poll.rejection_reason === 'quorum' ? 'Bocciata, quorum non raggiunto'
      : poll.rejection_reason === 'majority' ? 'Bocciata, maggioranza contraria' : 'Bocciata'
  }
  return 'Votazione in corso'
}

const fmt = (iso, withTime = false) => new Date(iso).toLocaleDateString('it-IT', {
  day: 'numeric', month: 'long', year: 'numeric', ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
})

function Row({ label, value, last = false }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', gap: 12, padding: '13px 0', fontSize: 14,
      borderBottom: last ? 'none' : '1px solid var(--border)',
    }}>
      <span style={{ color: 'var(--text-3)' }}>{label}</span>
      <span style={{ color: 'var(--text)', fontWeight: 600, textAlign: 'right' }}>{value}</span>
    </div>
  )
}

// Modifica: testo (bloccato se altri hanno gia' votato), quorum, scadenza.
function EditPollForm({ poll, onCancel, onSave }) {
  const closes = new Date(poll.closes_at)
  const pad = (n) => String(n).padStart(2, '0')
  const [question, setQuestion] = useState(poll.question)
  const [minVotes, setMinVotes] = useState(poll.min_votes)
  const [date, setDate] = useState(`${closes.getFullYear()}-${pad(closes.getMonth() + 1)}-${pad(closes.getDate())}`)
  const [time, setTime] = useState(`${pad(closes.getHours())}:${pad(closes.getMinutes())}`)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const newClose = new Date(`${date}T${time || '23:59'}`)
  const closeOk = !Number.isNaN(newClose.getTime()) && newClose > new Date()
  const canSave = question.trim().length > 3 && minVotes >= 1 && closeOk && !saving

  return (
    <div style={{ background: 'var(--white)', border: '1px solid var(--border)', borderRadius: 18, padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ fontSize: 17, fontWeight: 800 }}>Modifica decisione</div>
      <div>
        <div style={label}>Testo</div>
        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          disabled={poll.othersVoted}
          style={{ ...input, minHeight: 80, resize: 'vertical', background: poll.othersVoted ? '#F5F6F7' : 'var(--white)' }}
        />
        {poll.othersVoted && (
          <p style={{ fontSize: 12, color: 'var(--text-4)', margin: '6px 0 0' }}>
            Altri residenti hanno già votato: il testo non si può più cambiare. Puoi modificare quorum e scadenza, oppure eliminare la decisione.
          </p>
        )}
      </div>
      <div>
        <div style={label}>Quorum (voti minimi)</div>
        <input type="number" min={1} value={minVotes} onChange={(e) => setMinVotes(Number(e.target.value))} style={{ ...input, maxWidth: 120 }} />
      </div>
      <div>
        <div style={label}>Scadenza</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 8 }}>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={input} />
          <input type="time" value={time} onChange={(e) => setTime(e.target.value)} style={input} />
        </div>
        {!closeOk && <p style={{ fontSize: 12, color: '#B42318', margin: '6px 0 0' }}>La scadenza deve essere nel futuro.</p>}
      </div>
      {error && <p style={{ fontSize: 13, color: '#B42318', margin: 0 }}>{error}</p>}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <button onClick={onCancel} style={outlineBtn}>Annulla</button>
        <button
          disabled={!canSave}
          onClick={async () => {
            setSaving(true)
            const values = {}
            if (minVotes !== poll.min_votes) values.minVotes = minVotes
            // la scadenza si invia solo se cambiata (l'input orario arrotonda ai minuti)
            if (Math.abs(newClose - new Date(poll.closes_at)) >= 60000) values.closesAt = newClose.toISOString()
            if (!poll.othersVoted && question.trim() !== poll.question) values.question = question
            const err = Object.keys(values).length ? await onSave(values) : (onCancel(), null)
            setSaving(false)
            setError(err)
          }}
          style={{ ...outlineBtn, background: 'var(--teal)', borderColor: 'var(--teal)', color: '#fff', opacity: canSave ? 1 : 0.5 }}
        >
          {saving ? 'Salvataggio...' : 'Salva modifiche'}
        </button>
      </div>
    </div>
  )
}

const outlineBtn = {
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, height: 48,
  borderRadius: 14, border: '1.5px solid var(--border)', background: 'var(--white)',
  color: 'var(--text)', fontWeight: 700, fontSize: 15, cursor: 'pointer',
}
const label = { fontSize: 13, fontWeight: 700, color: 'var(--text-2)', marginBottom: 6 }
const input = { width: '100%', border: '1px solid var(--border)', borderRadius: 10, padding: '11px 12px', fontSize: 15, fontFamily: 'inherit', boxSizing: 'border-box' }

const ico = { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true }
function PencilIcon() { return <svg {...ico}><path d="M4 20h4L19 9l-4-4L4 16v4z" /><path d="M14 6l4 4" /></svg> }
function TrashIcon() { return <svg {...ico}><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" /></svg> }
