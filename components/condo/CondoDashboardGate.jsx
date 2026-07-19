'use client'

import { useEffect, useState } from 'react'
import { useSession } from '@/components/providers/SessionProvider'
import { useCondoRole } from '@/hooks/useCondoRole'
import { getVerification } from '@/lib/residenceVerification'
import ResidenceVerificationPrompt from '@/components/condo/ResidenceVerificationPrompt'
import CondoDashboard from '@/components/condo/CondoDashboard'

// Area condominio (bacheca, decisioni, chat): una riga in condo_members è
// l'unica fonte di verità per l'accesso (rispecchia il gate server-side in
// middleware.ts). Un utente loggato ma non membro vede un invito alla
// verifica invece di una dashboard silenziosamente vuota.
export default function CondoDashboardGate({ buildingId }) {
  const session = useSession()
  const userId = session?.user?.id
  const { isMember, loading } = useCondoRole(buildingId)

  // Stato mock, solo cosmetico (vedi lib/residenceVerification.js): distingue
  // "non ancora iniziato" da "in attesa"/"rifiutato" nella schermata sotto.
  // Non influisce sulla decisione di accesso, quindi non serve bloccare il
  // render in attesa del suo caricamento (letto in effect per sicurezza idratazione).
  const [mockStatus, setMockStatus] = useState('not_started')
  useEffect(() => {
    if (!userId || !buildingId) return
    setMockStatus(getVerification(userId, buildingId).status)
  }, [userId, buildingId])

  if (!session) {
    return (
      <div className="empty">
        <div className="empty-title">Non hai effettuato l&apos;accesso</div>
        <p>Accedi dal menu in alto per vedere l&apos;area condominio.</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-4)', fontSize: 14 }}>
        Verifica accesso...
      </div>
    )
  }

  if (!isMember) {
    return <ResidenceVerificationPrompt condominiumId={buildingId} status={mockStatus} />
  }

  return <CondoDashboard buildingId={buildingId} />
}
