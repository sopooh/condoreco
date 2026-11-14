'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession, useSessionReady } from '@/components/providers/SessionProvider'
import { useCondoRole } from '@/hooks/useCondoRole'
import { getMyJoinRequest } from '@/lib/residenceVerification'
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
  const sessionReady = useSessionReady()
  const userId = session?.user?.id
  const { isMember, loading } = useCondoRole(buildingId)

  // Stato della richiesta di accesso (condo_join_requests): distingue "non
  // ancora iniziato" da "in attesa"/"rifiutato". undefined finche' non letto.
  const [request, setRequest] = useState(undefined)
  const [reloadKey, setReloadKey] = useState(0)
  useEffect(() => {
    if (!userId || !buildingId || loading || isMember) return
    let cancelled = false
    getMyJoinRequest(buildingId).then(r => { if (!cancelled) setRequest(r) })
    return () => { cancelled = true }
  }, [userId, buildingId, loading, isMember, reloadKey])
  const requestStatus = request?.status

  // pulizia delle chiavi della vecchia verifica simulata (localStorage)
  useEffect(() => {
    try {
      Object.keys(window.localStorage)
        .filter(k => k.startsWith('condorank_residence_verification_'))
        .forEach(k => window.localStorage.removeItem(k))
    } catch { /* storage non disponibile */ }
  }, [])

  // Non ancora membro e non ha mai iniziato la verifica: salta la schermata
  // intermedia "Verifica che abiti qui" e porta dritti al wizard di upload.
  // L'intento e' gia' chiaro (ha cliccato "Entra condo"); chi invece ha una
  // verifica pending/rejected vede comunque il messaggio di stato apposito.
  useEffect(() => {
    if (loading || isMember || requestStatus === undefined) return
    if (requestStatus === 'not_started') {
      router.replace(`/edificio/${buildingId}/condominio/verifica`)
    }
  }, [loading, isMember, requestStatus, buildingId, router])

  if (!sessionReady) {
    return (
      <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-4)', fontSize: 14 }}>
        Verifica accesso...
      </div>
    )
  }

  if (!session) {
    return (
      <div className="empty">
        <div className="empty-title">Non hai effettuato l&apos;accesso</div>
        <p>Accedi dal menu in alto per vedere l&apos;area condominio.</p>
      </div>
    )
  }

  if (loading || (!isMember && requestStatus === undefined) || (!isMember && requestStatus === 'not_started')) {
    return (
      <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-4)', fontSize: 14 }}>
        Verifica accesso...
      </div>
    )
  }

  if (!isMember) {
    return <ResidenceVerificationPrompt condominiumId={buildingId} status={requestStatus} request={request} onChange={() => { setRequest(undefined); setReloadKey(k => k + 1) }} />
  }

  return children
}
