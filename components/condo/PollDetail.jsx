'use client'

import Link from 'next/link'
import { usePolls } from '@/hooks/usePolls'
import PollCard from '@/components/condo/PollCard'
import { LegalNote, backLink } from '@/components/condo/PollsPage'

// Dettaglio di una decisione: card con voto + riepilogo (chi l'ha proposta,
// quando, quorum, conteggio voti, esito).
export default function PollDetail({ building, pollId }) {
  const buildingId = building.id
  const { polls, loading, error, castVote } = usePolls(buildingId)
  const poll = polls.find((p) => p.id === pollId)
  const listHref = `/edificio/${buildingId}/condominio/decisioni`

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
