'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { usePolls } from '@/hooks/usePolls'
import AnonymityToggle from '@/components/condo/AnonymityToggle'
import PollCard from '@/components/condo/PollCard'

// Elenco di tutte le decisioni del condominio (in corso e concluse) e
// modulo per proporne una nuova. Ogni card porta al proprio dettaglio.
const DURATIONS = [3, 7, 14]

export default function PollsPage({ building }) {
  const buildingId = building.id
  const base = `/edificio/${buildingId}/condominio`
  const searchParams = useSearchParams()
  const { polls, loading, error, createPoll, castVote, changeVote } = usePolls(buildingId)
  const [formOpen, setFormOpen] = useState(searchParams.get('nuova') === '1')

  const open = polls.filter((p) => p.isOpen)
  const closed = polls.filter((p) => !p.isOpen)

  return (
    <div className="wrap condo-private-wrap" style={{ maxWidth: 760, margin: '0 auto' }}>
      <Link href={base} style={backLink}>‹ Torna al condominio</Link>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0, letterSpacing: '-0.4px' }}>Decisioni del condominio</h1>
          <p style={{ fontSize: 13, color: 'var(--text-3)', margin: '4px 0 0' }}>{building.address}</p>
        </div>
        {!formOpen && (
          <button onClick={() => setFormOpen(true)} style={primaryBtn}>+ Proponi una decisione</button>
        )}
      </div>

      {formOpen && <NewPollForm onCancel={() => setFormOpen(false)} onCreate={createPoll} onDone={() => setFormOpen(false)} />}

      {error && <p style={{ fontSize: 13, color: '#B42318', margin: 0 }}>Non riesco a caricare le decisioni. Riprova tra poco.</p>}

      {loading ? (
        <p style={{ fontSize: 14, color: 'var(--text-3)' }}>Caricamento decisioni...</p>
      ) : (
        <>
          <SectionTitle>In corso</SectionTitle>
          {open.length === 0
            ? <p style={{ fontSize: 14, color: 'var(--text-3)', margin: 0 }}>Nessuna decisione in corso.</p>
            : open.map((p) => <PollCard key={p.id} poll={p} onVote={castVote} onChangeVote={changeVote} href={`${base}/decisioni/${p.id}`} showLabel={false} />)}

          {closed.length > 0 && (
            <>
              <SectionTitle>Concluse</SectionTitle>
              {closed.map((p) => <PollCard key={p.id} poll={p} onVote={castVote} onChangeVote={changeVote} href={`${base}/decisioni/${p.id}`} showLabel={false} />)}
            </>
          )}
        </>
      )}

      <LegalNote />
    </div>
  )
}

function NewPollForm({ onCancel, onCreate, onDone }) {
  const [question, setQuestion] = useState('')
  const [days, setDays] = useState(7)
  const [minVotes, setMinVotes] = useState(10)
  const [anonymous, setAnonymous] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const canSave = question.trim().length > 3 && minVotes > 0 && !saving

  return (
    <div style={{ background: 'var(--white)', border: '1px solid var(--border)', borderRadius: 18, padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ fontSize: 17, fontWeight: 800 }}>Nuova decisione</div>
      <textarea
        autoFocus
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        placeholder="Es. Sostituire l'illuminazione delle scale con LED a basso consumo"
        style={{ ...field, minHeight: 80, resize: 'vertical' }}
      />
      <div>
        <div style={fieldLabel}>Durata della votazione</div>
        <div style={{ display: 'flex', gap: 8 }}>
          {DURATIONS.map((d) => (
            <button key={d} type="button" onClick={() => setDays(d)} style={{
              ...chip, background: days === d ? 'var(--teal)' : 'var(--white)', color: days === d ? '#fff' : 'var(--text)',
              borderColor: days === d ? 'var(--teal)' : 'var(--border)',
            }}>
              {d} giorni
            </button>
          ))}
        </div>
      </div>
      <div>
        <div style={fieldLabel}>Quorum (voti minimi perche&apos; la decisione sia valida)</div>
        <input type="number" min={1} value={minVotes} onChange={(e) => setMinVotes(Number(e.target.value))} style={{ ...field, maxWidth: 120 }} />
      </div>
      <div>
        <div style={fieldLabel}>Come si vota</div>
        <AnonymityToggle value={anonymous} onChange={setAnonymous} />
      </div>
      {error && <p style={{ fontSize: 13, color: '#B42318', margin: 0 }}>{error}</p>}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <button onClick={onCancel} style={secondaryBtn}>Annulla</button>
        <button
          disabled={!canSave}
          onClick={async () => {
            setSaving(true)
            const { error } = await onCreate({ question, minVotes, durationDays: days, isAnonymous: anonymous })
            setSaving(false)
            if (error) setError(error)
            else onDone()
          }}
          style={{ ...primaryBtn, opacity: canSave ? 1 : 0.5 }}
        >
          {saving ? 'Pubblicazione...' : 'Pubblica'}
        </button>
      </div>
    </div>
  )
}

export function LegalNote() {
  return (
    <p style={{ fontSize: 12, color: 'var(--text-4)', lineHeight: 1.5, margin: '8px 0 0' }}>
      Le decisioni su CondoReco sono sondaggi informali tra residenti: aiutano a preparare
      l&apos;assemblea condominiale ma non sostituiscono le delibere formali previste dalla legge.
    </p>
  )
}

function SectionTitle({ children }) {
  return <h2 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: 1, margin: '8px 0 0' }}>{children}</h2>
}

export const backLink = { fontSize: 14, fontWeight: 600, color: 'var(--teal)', alignSelf: 'flex-start' }
const primaryBtn = {
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', height: 44, padding: '0 18px',
  borderRadius: 12, border: 'none', background: 'var(--teal)', color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer',
}
const secondaryBtn = { ...primaryBtn, background: 'var(--white)', color: 'var(--text)', border: '1px solid var(--border)' }
const chip = { minHeight: 0, padding: '8px 14px', borderRadius: 999, border: '1.5px solid var(--border)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }
const field = { width: '100%', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 12px', fontSize: 15, fontFamily: 'inherit', boxSizing: 'border-box' }
const fieldLabel = { fontSize: 12, fontWeight: 600, color: 'var(--text-3)', marginBottom: 6 }
