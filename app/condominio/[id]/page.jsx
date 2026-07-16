'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useSession } from '@/components/providers/SessionProvider'
import { useUserBuildings } from '@/hooks/useUserBuildings'
import { getProfile } from '@/lib/profile'
import { urgentNotices, polls, chatPreview } from '@/lib/condoMockData'
import CondoPrivateHeader from '@/components/condo/CondoPrivateHeader'
import UrgentNoticesCard from '@/components/condo/UrgentNoticesCard'
import PollsCard from '@/components/condo/PollsCard'
import ChatPreviewCard from '@/components/condo/ChatPreviewCard'

// Gate client-side sullo stesso modello di app/admin/page.jsx: seconda linea
// di difesa, la protezione reale è nel middleware (redirect server-side prima
// che l'HTML raggiunga il browser).
function AccessDenied({ reason }) {
  return (
    <div style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
      <div style={{ fontSize: 48, marginBottom: 20 }}>🔒</div>
      <h1 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)', marginBottom: 8 }}>Area riservata</h1>
      <p style={{ fontSize: 14, color: 'var(--text-3)', marginBottom: 24, textAlign: 'center', maxWidth: 360 }}>
        {reason === 'signed-out'
          ? 'Accedi al tuo account per entrare nell\'area privata del condominio.'
          : 'Questa sezione è riservata ai residenti verificati di questo condominio.'}
      </p>
      <Link href="/profilo" style={{ padding: '10px 22px', background: 'var(--teal)', color: '#fff', borderRadius: 8, fontWeight: 700, fontSize: 13 }}>
        Vai al tuo profilo per verificarti
      </Link>
    </div>
  )
}

function Loading() {
  return (
    <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-4)', fontSize: 14 }}>
      Verifica accesso...
    </div>
  )
}

export default function CondoPrivatoPage({ params }) {
  const { id: condominiumId } = params
  const session = useSession()
  const userId = session?.user?.id
  const [role, setRole] = useState(undefined)
  const { current: currentBuildings, loading: buildingsLoading } = useUserBuildings(userId)

  useEffect(() => {
    if (!userId) return
    getProfile(userId).then(({ data }) => setRole(data?.role ?? null))
  }, [userId])

  // Come nel resto del progetto, session parte a null finché
  // onAuthStateChange non risponde: qui va bene lo stesso trattamento.
  if (!session) return <AccessDenied reason="signed-out" />
  if (role === undefined || buildingsLoading) return <Loading />

  const building = currentBuildings.find(b => b.id === condominiumId)
  // 'condoranker' = residente, 'admin' = moderatore del sito (ha già accesso
  // completo altrove). Escluso solo 'condoranked' (amministratore di
  // condominio professionista, non un residente).
  const canEnter = role === 'condoranker' || role === 'admin'
  if (!canEnter || !building) return <AccessDenied reason="not-a-member" />

  return (
    <div className="wrap condo-private-wrap">
      <CondoPrivateHeader building={building} />
      <UrgentNoticesCard notices={urgentNotices} />
      <PollsCard polls={polls} />
      <ChatPreviewCard messages={chatPreview} />
    </div>
  )
}
