'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Briefcase, Users, Wrench } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useSession, useSessionReady } from '@/components/providers/SessionProvider'
import { ROLE_LABEL, TEAM_ROLES, friendlyTeamError } from '@/hooks/useTeams'
import { RoleBadge } from '@/components/team/TeamWorkspace'

export default function TeamInviteClient({ token }) {
  const session = useSession()
  const ready = useSessionReady()
  const router = useRouter()
  const [info, setInfo] = useState(undefined)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)
  const userId = session?.user?.id

  useEffect(() => {
    if (!ready) return
    createClient().rpc('team_invite_info', { p_token: token }).then(({ data }) => setInfo(data?.[0] || null))
  }, [ready, token, userId])

  const accept = async () => {
    setBusy(true); setErr(null)
    const { data, error } = await createClient().rpc('team_accept_invite', { p_token: token })
    setBusy(false)
    if (error) setErr(friendlyTeamError(error)); else router.replace(`/team?team=${data}`)
  }

  let body
  if (!ready || info === undefined) body = <p className="rfx-muted">Caricamento…</p>
  else if (!info) body = <Empty title="Invito non trovato" text="Il link non è valido. Chiedi a chi te l'ha mandato di crearne uno nuovo." />
  else if (info.already_member) body = (
    <>
      <Empty title={`Fai già parte di ${info.team_name}`} text="Trovi le attività del team nella pagina Team." />
      <button type="button" className="ep-save" onClick={() => router.replace('/team')}>Vai al team</button>
    </>
  )
  else if (!info.valid) body = <Empty title="Invito scaduto" text="Il link vale 7 giorni e si usa una volta sola. Chiedine uno nuovo." />
  else body = (
    <>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 14 }}>
        <span className="rfx-avatar" style={{ borderRadius: 14, width: 52, height: 52 }}>
          {info.kind === 'supplier' ? <Wrench size={24} aria-hidden="true" /> : <Briefcase size={24} aria-hidden="true" />}
        </span>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 13, color: 'var(--text-3)', fontWeight: 700 }}>{info.kind === 'supplier' ? 'Team Recofixer' : 'Studio di amministrazione'}</div>
          <strong style={{ display: 'block', fontSize: 19 }}>{info.team_name}</strong>
          {info.owner_name && <span style={{ fontSize: 14, color: 'var(--text-3)' }}>Invito di {info.owner_name}</span>}
        </div>
      </div>
      <p style={{ fontSize: 15, margin: '0 0 8px' }}>
        {info.member_name ? <>Entrerai come <strong>{info.member_name}</strong> con livello </> : <>Entrerai con livello </>}
        <RoleBadge role={info.role} />
      </p>
      <p className="rfx-muted" style={{ marginBottom: 16 }}>{TEAM_ROLES.find((r) => r.id === info.role)?.hint}.</p>
      {err && <p className="auth-err">{err}</p>}
      {userId ? (
        <button type="button" className="ep-save" disabled={busy} onClick={accept}>{busy ? 'Ingresso…' : `Entra come ${ROLE_LABEL[info.role]}`}</button>
      ) : (
        <button type="button" className="ep-save"
          onClick={() => window.dispatchEvent(new CustomEvent('condoreco:open-auth', { detail: { next: `/team/invito/${token}` } }))}>
          Accedi o registrati per entrare
        </button>
      )}
    </>
  )

  return (
    <div className="tm-page" style={{ maxWidth: 520 }}>
      <section className="rfx-card" style={{ padding: 20 }}>
        <h1 className="rfx-h1" style={{ marginBottom: 12 }}>Invito al team</h1>
        {body}
      </section>
    </div>
  )
}

function Empty({ title, text }) {
  return <div className="rfx-empty"><Users size={26} aria-hidden="true" /><strong>{title}</strong><span>{text}</span></div>
}
