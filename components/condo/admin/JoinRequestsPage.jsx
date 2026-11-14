'use client'

import Link from 'next/link'
import { useCondoRole } from '@/hooks/useCondoRole'
import JoinRequestsList from '@/components/condo/JoinRequestsList'

// Richieste di accesso del condominio: solo per l'amministratore.
export default function JoinRequestsPage({ building }) {
  const base = `/edificio/${building.id}/condominio`
  const { isCondoAdmin, loading } = useCondoRole(building.id)
  return (
    <div className="acc-wrap" style={{ maxWidth: 900 }}>
      <Link href={base} className="acc-back">‹ Torna al condominio</Link>
      <h1 className="acc-h1" style={{ marginBottom: 14 }}>Richieste di accesso</h1>
      {loading ? <p className="rc-muted">Caricamento…</p>
        : isCondoAdmin ? <JoinRequestsList buildingId={building.id} />
        : <p className="rc-muted">Solo l&apos;amministratore del condominio può vedere le richieste di accesso.</p>}
    </div>
  )
}
