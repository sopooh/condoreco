'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Avatar from '@/components/ui/Avatar'
import AvatarPicker from '@/components/profile/AvatarPicker'
import OnboardingFlow from '@/components/profile/OnboardingFlow'
import EditProfile from '@/components/profile/EditProfile'
import BuildingRow from '@/components/buildings/BuildingRow'
import { ROLES } from '@/lib/avatars'
import { getProfile, upsertProfile, markBuildingAsFormerHome, markBuildingAsCurrentHome } from '@/lib/profile'
import { useUserBuildings } from '@/hooks/useUserBuildings'
import { useSession } from '@/components/providers/SessionProvider'

export default function ProfileClient() {
  const session = useSession()

  const [profile, setProfile] = useState({
    username: '',
    avatar_id: null,
    photo_url: null,   // foto caricata dall'utente (data URI o URL)
    role: 'condoranker',
    zone: '',
    verified: false,
  })
  const [pickerOpen, setPickerOpen] = useState(false)
  const [onboardingOpen, setOnboardingOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [leavingId, setLeavingId] = useState(null)
  const [returningId, setReturningId] = useState(null)

  const userId = session?.user?.id
  const { current: currentBuildings, past: pastBuildings, loading: buildingsLoading, refetch } = useUserBuildings(userId)

  // ── Carica profilo reale da Supabase ──
  useEffect(() => {
    if (!session) return
    let cancelled = false

    getProfile(session.user.id).then(({ data }) => {
      if (cancelled) return

      const displayName = data?.display_name?.trim() || ''
      const hasPersistedProfile = Boolean(displayName)
      const onboardingKey = `condorank_onboarded_${session.user.id}`
      const alreadyOnboarded = hasPersistedProfile || Boolean(window.localStorage.getItem(onboardingKey))

      if (hasPersistedProfile) window.localStorage.setItem(onboardingKey, '1')
      setOnboardingOpen(!alreadyOnboarded)

      if (data) {
        const url = data.avatar_url || ''
        const isPhoto = url.startsWith('data:') || (url.startsWith('http') && !url.includes('/avatars/'))
        setProfile({
          username: displayName,
          avatar_id: !isPhoto && url ? url.replace('/avatars/', '').replace('.png', '') : null,
          photo_url: isPhoto ? url : null,
          role: data.role || 'condoranker',
          zone: data.zone || '',
          verified: data.verified || false,
        })
      }
    })

    return () => { cancelled = true }
  }, [session])

  // ── Salva profilo su Supabase (helper condiviso) ──
  async function persistProfile(data) {
    await upsertProfile({
      id: userId,
      username: data.username || data.first_name || '',
      avatarId: data.avatar_id || null,
      photoUrl: data.photo_url || null,
      role: data.role || 'condoranker',
      zone: data.zone || null,
      verified: data.verified || false,
    })
  }

  function completeOnboarding(data) {
    const merged = { ...profile, ...data }
    setProfile(merged)
    persistProfile(merged)
    if (session) window.localStorage.setItem(`condorank_onboarded_${session.user.id}`, '1')
  }

  function handleSave(data) {
    setProfile(data)
    persistProfile(data)
  }

  // ── "Segno come ex-abitazione" ──
  async function handleLeave(buildingId) {
    setLeavingId(buildingId)
    await markBuildingAsFormerHome(buildingId, userId)
    refetch()
    setLeavingId(null)
  }

  // ── "Abito di nuovo qui" ──
  async function handleReturn(buildingId) {
    setReturningId(buildingId)
    await markBuildingAsCurrentHome(buildingId, userId)
    refetch()
    setReturningId(null)
  }

  if (!session) {
    return (
      <div className="empty">
        <div className="empty-title">Non hai effettuato l&apos;accesso</div>
        <p>Accedi dal menu in alto per vedere il tuo profilo.</p>
      </div>
    )
  }

  const displayName = profile.username || session.user.email?.split('@')[0] || 'Utente'
  const roleConf = ROLES[profile.role] || ROLES['condoranker']
  const memberSince = new Date(session.user.created_at).toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })

  return (
    <>
      {/* HEADER */}
      <div style={{ background: 'var(--white)', borderBottom: '1px solid var(--border)' }}>
        <div className="wrap profile-header-wrap">
          <div className="profile-header-row" style={{ display: 'flex', alignItems: 'flex-start' }}>

            {/* AVATAR */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <Avatar userId={userId} avatarId={profile.avatar_id} photoUrl={profile.photo_url} role={profile.role} size={104} />
              <button onClick={() => setPickerOpen(true)}
                style={{ marginTop: 12, fontSize: 12, fontWeight: 600, color: 'var(--teal)', background: 'none', border: 'none', cursor: 'pointer' }}>
                Cambia avatar
              </button>
            </div>

            {/* INFO */}
            <div style={{ flex: 1, paddingTop: 4 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.5px' }}>{displayName}</h1>
                {profile.verified && (
                  <span style={{ background: 'var(--teal)', color: '#fff', fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 100 }}>
                    Verificato
                  </span>
                )}
              </div>
              <div style={{ fontSize: 14, color: 'var(--text-3)', marginBottom: 12 }}>{session.user.email}</div>
              <div style={{ fontSize: 13, color: 'var(--text-4)', marginTop: 6, marginBottom: 16 }}>
                <span style={{ background: '#FEF3C7', color: '#92400E', fontSize: 12, fontWeight: 700, padding: '5px 12px', borderRadius: 100 }}>
                  Early Member
                </span>
              </div>
            </div>

            {/* AZIONI */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 20 }}>
              <div style={{ display: 'flex', gap: 28 }}>
                <StatBox n={currentBuildings.length + pastBuildings.length} l="Abitazioni" />
              </div>
              <button onClick={() => setEditOpen(true)} style={{
                padding: '9px 18px', borderRadius: 8, border: '1px solid var(--border)',
                background: 'var(--white)', fontWeight: 600, fontSize: 13, color: 'var(--text-2)', cursor: 'pointer',
              }}>Modifica profilo</button>
            </div>
          </div>
        </div>
      </div>

      {/* BODY */}
      <div className="wrap profile-body-wrap">
        <div className="profile-body-grid" style={{ display: 'grid' }}>

          {/* LE MIE ABITAZIONI */}
          <div>
            <SectionTitle>Le mie abitazioni</SectionTitle>

            {buildingsLoading && (
              <div style={{ fontSize: 14, color: 'var(--text-3)', padding: '20px 0' }}>Caricamento...</div>
            )}


            {/* Ora abiti qui */}
            {!buildingsLoading && (
              <div style={{ marginBottom: 32 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--teal)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
                  Ora abiti qui
                </div>

                {currentBuildings.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {currentBuildings.map(b => (
                      <div key={b.id}>
                        <BuildingRow building={b} />
                        <div style={{ marginTop: 8 }}>
                          <button
                            onClick={() => handleLeave(b.id)}
                            disabled={leavingId === b.id}
                            style={ghostTealBtn}
                          >
                            {leavingId === b.id ? 'Aggiornamento...' : 'Segno come ex-abitazione →'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ fontSize: 14, color: 'var(--text-4)', marginBottom: 12 }}>
                    Nessuna abitazione attuale registrata.
                  </p>
                )}

                {/* Sempre visibile: aggiungi condominio */}
                <Link href="/aggiungi-condominio" style={{
                  marginTop: 12, padding: '10px 20px', borderRadius: 8, border: 'none',
                  background: 'var(--teal)', color: '#fff', fontWeight: 700, fontSize: 13,
                  cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6,
                }}>
                  + Aggiungi condominio
                </Link>
              </div>
            )}

            {/* Hai abitato in */}
            {!buildingsLoading && pastBuildings.length > 0 && (
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-4)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
                  Hai abitato in
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {pastBuildings.map(b => (
                    <div key={b.id}>
                      <BuildingRow building={b} />
                      <div style={{ marginTop: 8 }}>
                        <button
                          onClick={() => handleReturn(b.id)}
                          disabled={returningId === b.id}
                          style={ghostTealBtn}
                        >
                          {returningId === b.id ? 'Aggiornamento...' : 'Abito di nuovo qui'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Aggiungi altri condomini passati */}
                <Link
                  href="/aggiungi-condominio"
                  style={{
                    marginTop: 12, padding: '10px 20px', borderRadius: 8, border: 'none',
                    background: 'var(--teal)', color: '#fff', fontWeight: 700,
                    fontSize: 13, cursor: 'pointer', display: 'inline-block',
                  }}
                >
                  + Aggiungi condominio dove hai vissuto
                </Link>
              </div>
            )}
          </div>

          {/* SIDEBAR */}
          <aside>
            <SectionTitle>Azioni rapide</SectionTitle>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 28 }}>
              <QuickLink href="/aggiungi-condominio" label="+ Aggiungi condominio" />
              <QuickLink href="/cerca" label="Esplora edifici" />
              <QuickLink href="/amministratori" label="Cerca amministratori" />
            </div>

            <SectionTitle>Info account</SectionTitle>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13, color: 'var(--text-3)' }}>
              <InfoRow label="Email" value={session.user.email} />
              <InfoRow label="Zona" value={profile.zone || '—'} />
              <InfoRow label="Ruolo" value={roleConf?.label || 'Recoer'} />
              <InfoRow label="Membro da" value={memberSince} />
            </div>
          </aside>
        </div>
      </div>

      <AvatarPicker open={pickerOpen} onClose={() => setPickerOpen(false)}
        current={profile.avatar_id}
        onSelect={(id) => {
          const updated = { ...profile, avatar_id: id, photo_url: null }
          setProfile(updated)
          persistProfile(updated)
        }}
        onSelectPhoto={(dataUri) => {
          const updated = { ...profile, photo_url: dataUri, avatar_id: null }
          setProfile(updated)
          persistProfile(updated)
        }} />

      <OnboardingFlow open={onboardingOpen} onClose={() => setOnboardingOpen(false)}
        initial={profile} onComplete={completeOnboarding} />

      <EditProfile open={editOpen} onClose={() => setEditOpen(false)}
        profile={profile} userId={userId} onSave={handleSave} />
    </>
  )
}

function StatBox({ n, l }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.5px' }}>{n}</div>
      <div style={{ fontSize: 12, color: 'var(--text-4)', marginTop: 2, fontWeight: 500 }}>{l}</div>
    </div>
  )
}

function SectionTitle({ children }) {
  return (
    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-4)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16 }}>
      {children}
    </div>
  )
}

function QuickLink({ href, label }) {
  return (
    <Link href={href} style={{
      width: '100%', textAlign: 'left', padding: '11px 14px', borderRadius: 8,
      border: '1px solid var(--border)', background: 'var(--white)',
      fontSize: 13, fontWeight: 600, color: 'var(--teal-dk)', cursor: 'pointer',
      display: 'block', boxSizing: 'border-box',
    }}>{label} →</Link>
  )
}

const ghostTealBtn = {
  padding: '8px 18px', borderRadius: 8,
  border: '1.5px solid var(--teal)',
  background: 'var(--teal-lt)',
  color: 'var(--teal-dk)',
  fontWeight: 600, fontSize: 13,
  cursor: 'pointer',
}

function InfoRow({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
      <span>{label}</span>
      <span style={{ color: 'var(--text-2)', fontWeight: 500, textAlign: 'right' }}>{value}</span>
    </div>
  )
}
