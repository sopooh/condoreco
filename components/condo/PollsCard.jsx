'use client'

import { useState } from 'react'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'

export default function PollsCard({ polls, onVote, onCreate }) {
  const [question, setQuestion] = useState('')
  const [feedback, setFeedback] = useState(null)
  const [voting, setVoting] = useState(null)

  async function handleVote(pollId, vote) {
    setVoting(pollId)
    const { error } = await onVote(pollId, vote)
    setFeedback(error)
    setVoting(null)
  }

  async function handleCreate() {
    const { error } = await onCreate({ question, minVotes: 10, durationDays: 7 })
    setFeedback(error)
    if (!error) setQuestion('')
  }

  return (
    <Card hover={false} style={{ padding: 20 }}>
      <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)', marginBottom: 14 }}>
        Decisioni del condominio
      </div>

      {polls.length === 0 && (
        <p style={{ fontSize: 13, color: 'var(--text-4)', marginBottom: 16 }}>Nessuna decisione in corso.</p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 20 }}>
        {polls.map(poll => (
          <div key={poll.id} style={{ minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 2 }}>
              {poll.question}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-4)', marginBottom: 8 }}>
              {poll.totalVotes} voti
              {poll.status === 'rejected' && (
                <> · Bocciato{poll.rejection_reason === 'quorum' && ' (quorum non raggiunto)'}{poll.rejection_reason === 'majority' && ' (maggioranza non raggiunta)'}</>
              )}
              {poll.status === 'approved' && <> · Approvato</>}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: poll.isOpen ? 10 : 0 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--teal-dk)', flexShrink: 0 }}>
                Favorevole {poll.yesPct}%
              </span>
              <div className="score-bar-track">
                <div className="score-bar-fill" style={{ width: `${poll.yesPct}%`, background: 'var(--teal)' }} />
              </div>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-3)', flexShrink: 0 }}>
                Contrario {poll.noPct}%
              </span>
            </div>

            {poll.isOpen && !poll.hasVoted && (
              <div style={{ display: 'flex', gap: 8 }}>
                <Button variant="primary" disabled={voting === poll.id} onClick={() => handleVote(poll.id, true)}>
                  Favorevole
                </Button>
                <Button variant="outline-teal" disabled={voting === poll.id} onClick={() => handleVote(poll.id, false)}>
                  Contrario
                </Button>
              </div>
            )}
            {poll.hasVoted && (
              <div style={{ fontSize: 12, color: 'var(--text-4)' }}>
                Hai votato: {poll.myVote ? 'Favorevole' : 'Contrario'}
              </div>
            )}
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Proponi una decisione…"
          style={{
            flex: 1, minWidth: 0, border: '1.5px solid var(--border)', borderRadius: 100,
            padding: '10px 16px', fontSize: 14, outline: 'none', fontFamily: 'inherit',
          }}
        />
        <Button variant="primary" onClick={handleCreate} disabled={!question.trim()}>
          Crea
        </Button>
      </div>
      {feedback && <p style={{ fontSize: 13, color: 'var(--red-tx)', marginTop: 8 }}>{feedback}</p>}
    </Card>
  )
}
