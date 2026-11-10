'use client'

import { useState } from 'react'
import Link from 'next/link'

// Card di una singola decisione (poll), usata in dashboard, elenco e
// dettaglio: icona, titolo, scadenza, barra Favorevole/Contrario e i due
// pulsanti di voto. Con `href` mostra la freccia che porta al dettaglio.

export function deadlineLabel(poll) {
  if (poll.status === 'approved') return 'Approvata'
  if (poll.status === 'rejected') {
    if (poll.rejection_reason === 'quorum') return 'Bocciata: quorum non raggiunto'
    if (poll.rejection_reason === 'majority') return 'Bocciata: maggioranza contraria'
    return 'Bocciata'
  }
  const ms = new Date(poll.closes_at) - new Date()
  if (ms <= 0) return 'In chiusura'
  const hours = Math.floor(ms / 3600000)
  if (hours < 1) return 'Scade tra meno di un\'ora'
  if (hours < 24) return `Scade tra ${hours} ${hours === 1 ? 'ora' : 'ore'}`
  const days = Math.round(hours / 24)
  return days === 1 ? 'Scade domani' : `Scade tra ${days} giorni`
}

export default function PollCard({ poll, onVote, href, showLabel = true }) {
  const [voting, setVoting] = useState(false)
  const [error, setError] = useState(null)

  async function vote(value) {
    if (!poll.isOpen || poll.hasVoted || voting) return
    setVoting(true)
    const { error } = await onVote(poll.id, value)
    setError(error)
    setVoting(false)
  }

  const closed = !poll.isOpen
  const statusTone = poll.status === 'approved'
    ? { bg: 'var(--teal-lt)', tx: 'var(--teal-dk)' }
    : poll.status === 'rejected'
      ? { bg: '#FDECEC', tx: '#B42318' }
      : { bg: 'var(--teal-lt)', tx: 'var(--teal-dk)' }

  const header = (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
      <div style={{
        width: 52, height: 52, borderRadius: 14, background: '#FDEBDD', color: '#1F2937',
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        <BulbIcon />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        {showLabel && <div style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: 2 }}>Decisioni del condominio</div>}
        <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)', lineHeight: 1.25, letterSpacing: '-0.2px', overflowWrap: 'anywhere' }}>
          {poll.question}
        </div>
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 8,
          padding: '5px 12px', borderRadius: 999, fontSize: 13, fontWeight: 500,
          background: statusTone.bg, color: statusTone.tx,
        }}>
          {closed ? null : <ClockIcon />}
          {deadlineLabel(poll)}
        </span>
      </div>
      {href && (
        <span aria-hidden="true" style={{
          width: 40, height: 40, borderRadius: '50%', background: 'var(--white)', border: '1px solid var(--border)',
          boxShadow: '0 1px 4px rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--text)', flexShrink: 0, alignSelf: 'center',
        }}>
          <ChevronIcon />
        </span>
      )}
    </div>
  )

  return (
    <div style={{ background: 'var(--white)', border: '1px solid var(--border)', borderRadius: 18, padding: 20 }}>
      {href ? (
        <Link href={href} aria-label={`Apri la decisione: ${poll.question}`} style={{ display: 'block', color: 'inherit' }}>
          {header}
        </Link>
      ) : header}

      {/* risultati */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 18, marginBottom: 8, fontSize: 15 }}>
        <span style={{ fontWeight: 700, color: 'var(--teal-dk)' }}>Favorevole {poll.yesPct}%</span>
        <span style={{ fontWeight: 600, color: 'var(--text-3)' }}>
          Contrario <span style={{ fontWeight: 800, color: 'var(--text)' }}>{poll.noPct}%</span>
        </span>
      </div>
      <div style={{ height: 12, borderRadius: 999, background: '#E5E7EB', overflow: 'hidden' }}>
        <div style={{ width: `${poll.yesPct}%`, height: '100%', borderRadius: 999, background: 'var(--teal)', transition: 'width 300ms ease' }} />
      </div>
      <div style={{ fontSize: 12, color: 'var(--text-4)', marginTop: 6 }}>
        {poll.totalVotes} {poll.totalVotes === 1 ? 'voto' : 'voti'}
        {poll.min_votes ? ` · quorum ${poll.min_votes}` : ''}
      </div>

      {/* voto */}
      {(poll.isOpen || poll.hasVoted) && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 16 }}>
          <VoteButton
            kind="yes"
            unvoted={!poll.hasVoted}
            selected={poll.myVote === true}
            muted={poll.hasVoted && poll.myVote !== true}
            disabled={!poll.isOpen || poll.hasVoted || voting}
            onClick={() => vote(true)}
          />
          <VoteButton
            kind="no"
            unvoted={!poll.hasVoted}
            selected={poll.myVote === false}
            muted={poll.hasVoted && poll.myVote !== false}
            disabled={!poll.isOpen || poll.hasVoted || voting}
            onClick={() => vote(false)}
          />
        </div>
      )}
      {poll.hasVoted && (
        <p style={{ fontSize: 12, color: 'var(--text-4)', margin: '10px 0 0', textAlign: 'center' }}>
          Hai votato {poll.myVote ? 'favorevole' : 'contrario'}
        </p>
      )}
      {error && <p style={{ fontSize: 13, color: '#B42318', margin: '10px 0 0' }}>{error}</p>}
    </div>
  )
}

function VoteButton({ kind, selected, muted, unvoted, disabled, onClick }) {
  const yes = kind === 'yes'
  // Favorevole pieno di default (come nel mockup), Contrario chiaro; dopo il
  // voto si riempie solo l'opzione scelta.
  const filled = selected || (yes && unvoted)
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-pressed={selected}
      style={{
        height: 56, borderRadius: 16, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 10,
        fontSize: 16, fontWeight: 700, cursor: disabled ? 'default' : 'pointer',
        border: filled ? '1.5px solid var(--teal)' : '1.5px solid var(--border)',
        background: filled ? 'var(--teal)' : '#F5F6F7',
        color: filled ? '#fff' : 'var(--text)',
        opacity: muted ? 0.45 : 1,
      }}
    >
      <span style={{ color: filled ? '#fff' : 'var(--teal)', display: 'inline-flex' }}>
        {yes ? <CheckCircleIcon /> : <XCircleIcon />}
      </span>
      {yes ? 'Favorevole' : 'Contrario'}
    </button>
  )
}

const svg = { fill: 'none', stroke: 'currentColor', strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true }
function BulbIcon() {
  return (
    <svg {...svg} width="28" height="28" viewBox="0 0 24 24" strokeWidth="1.7">
      <path d="M9 18h6M10 21h4" />
      <path d="M12 6a5 5 0 00-3 9c.6.5 1 1.2 1 2h4c0-.8.4-1.5 1-2a5 5 0 00-3-9z" />
      <path d="M12 2v1.5M4.5 5l1 1M19.5 5l-1 1M3 11h1.5M19.5 11H21" />
    </svg>
  )
}
function ClockIcon() { return <svg {...svg} width="16" height="16" viewBox="0 0 24 24" strokeWidth="2"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg> }
function ChevronIcon() { return <svg {...svg} width="20" height="20" viewBox="0 0 24 24" strokeWidth="2.2"><path d="M9 6l6 6-6 6" /></svg> }
function CheckCircleIcon() { return <svg {...svg} width="24" height="24" viewBox="0 0 24 24" strokeWidth="2"><circle cx="12" cy="12" r="9.5" /><path d="M8 12.5l2.7 2.7L16 9.8" /></svg> }
function XCircleIcon() { return <svg {...svg} width="24" height="24" viewBox="0 0 24 24" strokeWidth="2"><circle cx="12" cy="12" r="9.5" /><path d="M9 9l6 6M15 9l-6 6" /></svg> }
