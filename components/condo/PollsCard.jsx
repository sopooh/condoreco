'use client'

import Link from 'next/link'
import PollCard from '@/components/condo/PollCard'

// Sezione "Decisioni" della dashboard: una card per ogni decisione aperta
// (al massimo 3), ognuna con la freccia verso il proprio dettaglio, piu' il
// link all'elenco completo dove si propone una nuova decisione.
const MAX_ON_DASHBOARD = 3

export default function PollsCard({ buildingId, polls, onVote }) {
  const base = `/edificio/${buildingId}/condominio/decisioni`
  const open = polls.filter((p) => p.isOpen)
  const shown = open.slice(0, MAX_ON_DASHBOARD)

  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {shown.length === 0 ? (
        <div style={{ background: 'var(--white)', border: '1px solid var(--border)', borderRadius: 18, padding: 20 }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)', marginBottom: 4 }}>Decisioni del condominio</div>
          <p style={{ fontSize: 14, color: 'var(--text-3)', margin: '0 0 14px' }}>Nessuna decisione in corso.</p>
          <Link href={`${base}?nuova=1`} style={linkBtn}>+ Proponi una decisione</Link>
        </div>
      ) : (
        shown.map((poll) => (
          <PollCard key={poll.id} poll={poll} onVote={onVote} href={`${base}/${poll.id}`} />
        ))
      )}

      {polls.length > 0 && (
        <Link href={base} style={{ alignSelf: 'flex-end', display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 14, fontWeight: 700, color: 'var(--teal)', padding: '4px 4px' }}>
          Tutte le decisioni{polls.length > shown.length ? ` (${polls.length})` : ''} ›
        </Link>
      )}
    </section>
  )
}

const linkBtn = {
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', height: 44, padding: '0 18px',
  borderRadius: 12, background: 'var(--teal)', color: '#fff', fontWeight: 700, fontSize: 14,
}
