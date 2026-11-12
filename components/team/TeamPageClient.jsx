'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Briefcase, Users, Wrench } from 'lucide-react'
import { useSession, useSessionReady } from '@/components/providers/SessionProvider'
import { useMyTeams } from '@/hooks/useTeams'
import { useAdminOverview } from '@/hooks/useAdminArea'
import { useSupplierBuildings } from '@/hooks/useSupplierBuildings'
import { getMySupplier } from '@/lib/suppliers'
import TeamWorkspace from '@/components/team/TeamWorkspace'

// Pagina /team: i team di cui fai parte. Il titolare di uno studio di amministrazione
// o di un'azienda Recofixer crea qui il proprio team.
export default function TeamPageClient() {
  const session = useSession()
  const ready = useSessionReady()
  const userId = session?.user?.id
  const params = useSearchParams()
  const router = useRouter()
  const { teams, reload, ensure } = useMyTeams(!!userId)
  const admin = useAdminOverview()
  const [supplier, setSupplier] = useState(undefined)
  const [err, setErr] = useState(null)
  const [busy, setBusy] = useState(false)
  useEffect(() => { if (userId) getMySupplier(userId).then(setSupplier) }, [userId])

  const current = useMemo(() => {
    if (!teams?.length) return null
    return teams.find((t) => t.id === params.get('team')) || teams[0]
  }, [teams, params])
  const clients = useSupplierBuildings(!!current && current.is_owner && current.kind === 'supplier')

  if (!ready) return <div className="tm-page"><p className="rfx-muted">Caricamento…</p></div>
  if (!userId) {
    return (
      <div className="tm-page">
        <section className="rfx-card">
          <h1 className="rfx-h1">Team e attività</h1>
          <p className="rfx-sub">Accedi per vedere i team di cui fai parte.</p>
          <button type="button" className="rfx-btn is-primary" onClick={() => window.dispatchEvent(new CustomEvent('condoreco:open-auth', { detail: { next: '/team' } }))}>Accedi</button>
        </section>
      </div>
    )
  }
  if (teams === null) return <div className="tm-page"><p className="rfx-muted">Caricamento…</p></div>

  const hasAdminTeam = teams.some((t) => t.is_owner && t.kind === 'admin')
  const hasSupplierTeam = teams.some((t) => t.is_owner && t.kind === 'supplier')
  const create = async (kind) => {
    setBusy(true); setErr(null)
    const r = await ensure(kind)
    setBusy(false)
    if (r.error) setErr(r.error); else router.replace(`/team?team=${r.id}`)
  }
  const buildings = !current?.is_owner ? [] : current.kind === 'admin'
    ? admin.buildings.map((b) => ({ id: b.id, label: `${b.address}${b.street_number ? `, ${b.street_number}` : ''}` }))
    : clients.current.map((b) => ({ id: b.id, label: `${b.address}${b.street_number ? `, ${b.street_number}` : ''}` }))

  return (
    <div className="tm-page">
      {(teams.length > 1 || (admin.isAdmin && !hasAdminTeam) || (supplier && !hasSupplierTeam)) && (
        <div className="tm-teams">
          {teams.map((t) => (
            <button key={t.id} type="button" className={`p2-chip${current?.id === t.id ? ' is-on' : ''}`} onClick={() => router.replace(`/team?team=${t.id}`)}>
              {t.kind === 'supplier' ? <Wrench size={15} aria-hidden="true" /> : <Briefcase size={15} aria-hidden="true" />} {t.name}{t.open_tasks ? ` (${t.open_tasks})` : ''}
            </button>
          ))}
        </div>
      )}

      {admin.isAdmin && !hasAdminTeam && (
        <CreateCard icon={<Briefcase size={22} aria-hidden="true" />} title="Crea il team del tuo studio"
          text="Aggiungi i collaboratori, dai a ognuno un livello e assegna le attività sui tuoi condomini."
          busy={busy} onCreate={() => create('admin')} />
      )}
      {supplier && !hasSupplierTeam && (
        <CreateCard icon={<Wrench size={22} aria-hidden="true" />} title="Crea il team della tua azienda"
          text="Aggiungi tecnici e collaboratori: li assegni agli interventi e alle attività."
          busy={busy} onCreate={() => create('supplier')} />
      )}
      {err && <p className="auth-err">{err}</p>}

      {current ? (
        <TeamWorkspace key={current.id} team={current} buildings={buildings} initialTaskId={params.get('task')}
          onLeft={async () => { await reload(); router.replace('/team') }} />
      ) : !admin.isAdmin && !supplier && (
        <section className="rfx-card">
          <div className="rfx-empty">
            <Users size={26} aria-hidden="true" />
            <strong>Non fai ancora parte di un team</strong>
            <span>Quando un amministratore o un Recofixer ti invita, il suo team comparirà qui.</span>
          </div>
        </section>
      )}
    </div>
  )
}

function CreateCard({ icon, title, text, busy, onCreate }) {
  return (
    <section className="rfx-card" style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 12, flexWrap: 'wrap' }}>
      <span className="rfx-avatar" style={{ borderRadius: 14 }}>{icon}</span>
      <div style={{ flex: '1 1 220px', minWidth: 0 }}>
        <strong style={{ display: 'block', fontSize: 16 }}>{title}</strong>
        <span style={{ fontSize: 14, color: 'var(--text-3)' }}>{text}</span>
      </div>
      <button type="button" className="rfx-btn is-primary" disabled={busy} onClick={onCreate}>{busy ? 'Creazione…' : 'Crea team'}</button>
    </section>
  )
}
