'use client'

import { useSession } from '@/components/providers/SessionProvider'
import CondoDashboard from '@/components/condo/CondoDashboard'

// Area condominio (bacheca, decisioni, chat): riservata ai membri autenticati.
// Il ruolo (admin/resident/non membro) e' poi gestito lato RLS + useCondoRole.
export default function CondoDashboardGate({ buildingId }) {
  const session = useSession()

  if (!session) {
    return (
      <div className="empty">
        <div className="empty-title">Non hai effettuato l&apos;accesso</div>
        <p>Accedi dal menu in alto per vedere l&apos;area condominio.</p>
      </div>
    )
  }

  return <CondoDashboard buildingId={buildingId} />
}
