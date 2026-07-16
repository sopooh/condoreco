'use client'

import { useState } from 'react'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'

// Prima implementazione: il voto è stato locale (mock), non persistito.
// Il pulsante "Vota" registra un voto per la prima opzione (Sì/Favorevole) —
// quando collegato al DB andrà sostituito con la reale scelta dell'utente.
export default function PollsCard({ polls }) {
  const [votes, setVotes] = useState(() =>
    Object.fromEntries(polls.map(p => [p.id, p.user_vote]))
  )

  function vote(pollId, optionId) {
    setVotes(v => ({ ...v, [pollId]: optionId }))
  }

  return (
    <Card hover={false} style={{ padding: 20 }}>
      <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)', marginBottom: 14 }}>
        Decisioni del condominio
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {polls.map(poll => {
          const userVote = votes[poll.id]
          const hasVoted = !!userVote
          const [a, b] = poll.options
          const totalVotes = poll.total_votes + (hasVoted ? 1 : 0)
          const aVotes = a.votes + (userVote === a.id ? 1 : 0)
          const pctA = totalVotes > 0 ? Math.round((aVotes / totalVotes) * 100) : 0

          return (
            <div key={poll.id} style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 4 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', minWidth: 0 }}>
                  {poll.question}
                </div>
                <Button
                  variant={hasVoted ? 'ghost' : 'primary'}
                  disabled={hasVoted}
                  onClick={() => vote(poll.id, a.id)}
                  style={{ flexShrink: 0 }}
                >
                  {hasVoted ? 'Votato' : 'Vota'}
                </Button>
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-4)', marginBottom: 8 }}>
                {totalVotes} voti
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--teal-dk)', flexShrink: 0 }}>
                  {a.label} {pctA}%
                </span>
                <div className="score-bar-track">
                  <div className="score-bar-fill" style={{ width: `${pctA}%`, background: 'var(--teal)' }} />
                </div>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-3)', flexShrink: 0 }}>
                  {b.label} {100 - pctA}%
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </Card>
  )
}
