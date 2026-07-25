'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from '@/components/providers/SessionProvider'
import { useCondoRole } from '@/hooks/useCondoRole'
import { getVerification } from '@/lib/residenceVerification'
import ResidenceVerificationPrompt from '@/components/condo/ResidenceVerificationPrompt'

// Gate condiviso da tutte le pagine dell'area condominio (dashboard,
// calendario, ...): una riga in condo_members è l'unica fonte di verità per
// l'accesso, rispecchia il gate server-side in middleware.ts. Un utente
// loggato ma non membro vede un invito alla verifica invece di una pagina
// silenziosamente vuota.
export default function CondoMemberGate({ building, children }) {
  const buildingId = building.id
  const router = useRouter()
  const session = useSession()
  const userId = session?.user?.id
  const { isMember, loading } = useCondoRole(buildingId)

  // Stato mock (vedi lib/residenceVerification.js): distingue "non ancora
  // iniziato" da "in attesa"/"rifiutato". undefined finche' non letto da
  // localStorage (in effect, per sicurezza idratazione), poi usato sia per
  // la messaggistica sotto sia per decidere se saltare dritti al wizard.
  const [mockStatus, setMockStatus] = useState(undefined)
  useEffect(() => {
    if (!userId || !buildingId) return
    setMockStatus(getVerification(userId, buildingId).status)
  }, [userId, buildingId])

  // Non ancora membro e non ha mai iniziato la verifica: salta la schermata
  // intermedia "Verifica che abiti qui" e porta dritti al wizard di upload.
  // L'intento e' gia' chiaro (ha cliccato "Entra condo"); chi invece ha una
  // verifica pending/rejected vede comunque il messaggio di stato apposito.
  useEffect(() => {
    if (loading || isMember || mockStatus === undefined) return
    if (mockStatus === 'not_started') {
      router.replace(`/edificio/${buildingId}/condominio/verifica`)
    }
  }, [loading, isMember, mockStatus, buildingId, router])

  if (!session) {
    return (
      <div className="empty">
        <div className="empty-title">Non hai effettuato l&apos;accesso</div>
        <p>Accedi dal menu in alto per vedere l&apos;area condominio.</p>
      </div>
    )
  }

  if (loading || (!isMember && mockStatus === undefined) || (!isMember && mockStatus === 'not_started')) {
    return (
      <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-4)', fontSize: 14 }}>
        Verifica accesso...
      </div>
    )
  }

  if (!isMember) {
    return <ResidenceVerificationPrompt condominiumId={buildingId} status={mockStatus} />
  }

  return children
}
