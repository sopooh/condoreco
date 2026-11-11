'use client'

import { Building2, Camera, ChevronRight, History, House, Map as LMap, MessageSquare, Pencil, Plus, ShieldCheck, Sparkles, UserRound, Users, Wrench, Zap } from 'lucide-react'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import Avatar from '@/components/ui/Avatar'
import AvatarPicker from '@/components/profile/AvatarPicker'
import OnboardingFlow from '@/components/profile/OnboardingFlow'
import EditProfile from '@/components/profile/EditProfile'
import ProfileHomeRow from '@/components/profile/ProfileHomeRow'
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
  const [pastOpen, setPastOpen] = useState(false)
  const [avatarSize, setAvatarSize] = useState(104)

  // Sotto ~400px avatar (104px) + nome + badge non entrano su una riga senza
  // restringere qualcosa: i badge devono restare a destra del nome (mai andare
  // a capo sotto), quindi si rimpicciolisce davvero l'avatar invece di scalarlo
  // solo visivamente (un transform CSS non libera spazio nel layout flex).
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 400px)')
    const update = () => setAvatarSize(mq.matches ? 72 : 104)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])

  const userId = session?.user?.id
  const { current: currentBuildings, past: pastBuildings, loading: buildingsLoading, refetch, reviewCount } = useUserBuildings(userId)

  // ── Carica profilo reale da Supabase ──
  // Onboarding automatico al primo accesso: la fonte di verità è il profilo
  // su Supabase (display_name già impostato = onboarding già completato),
  // non il localStorage da solo, altrimenti riappare su un altro browser/
  // dispositivo o se il localStorage viene svuotato.
  // Chiave localStorage con prefisso condorank_ mantenuto invariato di proposito:
  // la migrazione a condoreco_ è pianificata post-lancio, non va anticipata qui.
  useEffect(() => {
    if (!session) return
    let cancelled = false

    getProfile(session.user.id).then(({ data, error }) => {
      if (cancelled) return
      if (error) console.error('[ProfileClient] getProfile failed', error)

      const key = `condorank_onboarded_${session.user.id}`
      if (data) {
        const url = data.avatar_url || ''
        const isPhoto = url.startsWith('data:') || (url.startsWith('http') && !url.includes('/avatars/'))
        setProfile({
          username: data.display_name || '',
          avatar_id: !isPhoto && url ? url.replace('/avatars/', '').replace('.png', '') : null,
          photo_url: isPhoto ? url : null,
          role: data.role || 'condoranker',
          zone: data.zone || '',
          verified: data.verified || false,
        })
      }
      if (data?.display_name) {
        window.localStorage.setItem(key, '1')
      } else if (!window.localStorage.getItem(key)) {
        setOnboardingOpen(true)
      }
    })

    return () => { cancelled = true }
  }, [session])


  // ── Salva profilo su Supabase (helper condiviso) ──
  async function persistProfile(data) {
    const { error } = await upsertProfile({
      id: userId,
      username: data.username || data.first_name || '',
      avatarId: data.avatar_id || null,
      photoUrl: data.photo_url || null,
      role: data.role || 'condoranker',
      zone: data.zone || null,
      verified: data.verified || false,
    })
    if (error) console.error('Errore nel salvataggio del profilo:', error)
    return !error
  }

  async function completeOnboarding(data) {
    const merged = { ...profile, ...data }
    setProfile(merged)
    const saved = await persistProfile(merged)
    // Il flag locale viene impostato solo se il salvataggio è riuscito: se fallisce,
    // al prossimo accesso l'onboarding deve ripresentarsi invece di essere nascosto
    // da un flag che non corrisponde allo stato reale su Supabase.
    if (session && saved) window.localStorage.setItem(`condorank_onboarded_${session.user.id}`, '1')
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
      <div className="wrap profile-header-wrap">
        <div className="profile-card">
          <span className="profile-pill profile-pill-amber profile-early"><StarIcon />Early Member</span>

          <div className="profile-header-row">
            <div className="profile-avatar-col">
              <Avatar userId={userId} avatarId={profile.avatar_id} photoUrl={profile.photo_url} role={profile.role} size={avatarSize} />
            </div>

            <div className="profile-id">
              <h1 className="profile-name">{displayName}</h1>
              <div className="profile-email">{session.user.email}</div>
              <div className="profile-pills-row">
                <span className="profile-pill profile-pill-violet">
                  <ReviewIcon />{reviewCount} {reviewCount === 1 ? 'recensione' : 'recensioni'}
                </span>
                {profile.verified && (
                  <span className="profile-pill profile-pill-teal"><ShieldCheckIcon />Verificata</span>
                )}
              </div>
            </div>
          </div>

          <div className="profile-actions">
            <button onClick={() => setPickerOpen(true)} className="profile-btn profile-btn-outline">
              <CameraIcon />Cambia avatar
            </button>
            <button onClick={() => setEditOpen(true)} className="profile-btn profile-btn-soft">
              <PencilIcon />Modifica profilo
            </button>
          </div>
        </div>
      </div>

      {/* BODY */}
      <div className="wrap profile-body-wrap">
        <div className="profile-body-grid" style={{ display: 'grid' }}>

          {/* LE MIE ABITAZIONI */}
          <section>
            <div className="profile-section-head">
              <SectionTitle icon={<HouseIcon />}>Le mie abitazioni</SectionTitle>
              <Link href="/aggiungi-condominio" className="profile-add-link">
                Aggiungi abitazione <span className="profile-add-plus"><PlusIcon /></span>
              </Link>
            </div>

            <div style={{ ...card, overflow: 'hidden' }}>
              {buildingsLoading ? (
                <div style={{ fontSize: 14, color: 'var(--text-3)', padding: 20 }}>Caricamento...</div>
              ) : (
                <>
                  {currentBuildings.length > 0 ? (
                    currentBuildings.map(b => (
                      <ProfileHomeRow key={b.id} building={b} current
                        actionLabel="Non abito più qui"
                        onAction={() => handleLeave(b.id)}
                        busy={leavingId === b.id} />
                    ))
                  ) : (
                    <div style={{ padding: 20, fontSize: 14, color: 'var(--text-3)' }}>
                      Non hai ancora indicato dove abiti.{' '}
                      <Link href="/cerca" style={{ color: 'var(--teal)', fontWeight: 700 }}>Cerca il tuo condominio</Link>
                    </div>
                  )}

                  {pastBuildings.length > 0 && (
                    <>
                      <button type="button" className="profile-past-toggle"
                        onClick={() => setPastOpen(o => !o)} aria-expanded={pastOpen}>
                        <span className="profile-past-icon"><HistoryIcon /></span>
                        <span style={{ flex: 1, textAlign: 'left' }}>Ex abitazioni ({pastBuildings.length})</span>
                        <span style={{ display: 'inline-flex', transform: pastOpen ? 'rotate(90deg)' : 'none', transition: 'transform .15s' }}>
                          <ChevronRightIcon />
                        </span>
                      </button>
                      {pastOpen && pastBuildings.map(b => (
                        <ProfileHomeRow key={b.id} building={b}
                          actionLabel="Abito di nuovo qui"
                          onAction={() => handleReturn(b.id)}
                          busy={returningId === b.id} />
                      ))}
                    </>
                  )}
                </>
              )}
            </div>
          </section>

          {/* SIDEBAR */}
          <aside style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
            <section>
              <SectionTitle icon={<BoltIcon />}>Azioni rapide</SectionTitle>
              <nav style={{ ...card, overflow: 'hidden' }}>
                <ActionRow href="/fornitore" icon={<Wrench size={18} strokeWidth={2} aria-hidden="true" />} label={profile.role === 'condofixer' ? 'I miei interventi (Recofixer)' : 'Sei un fornitore? Diventa Recofixer'} />
                <ActionRow href="/aggiungi-condominio" icon={<BuildingIcon />} label="Aggiungi condominio" />
                <ActionRow href="/cerca" icon={<MapIcon />} label="Esplora edifici" />
                <ActionRow href="/amministratori" icon={<UsersIcon />} label="Cerca amministratori" last />
              </nav>
            </section>

            <section>
              <SectionTitle icon={<PersonIcon />}>Info account</SectionTitle>
              <div style={{ ...card, padding: '4px 18px' }}>
                <InfoRow label="Email" value={session.user.email} />
                <InfoRow
                  label="Zona"
                  value={profile.zone || (
                    <button onClick={() => setEditOpen(true)} className="profile-zone-add">
                      Aggiungi <ChevronRightIcon />
                    </button>
                  )}
                />
                <InfoRow label="Ruolo" value={roleConf?.label || 'Recoer'} />
                <InfoRow label="Membro da" value={memberSince} last />
              </div>
            </section>
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

function ShieldCheckIcon({ size = 14 } = {}) { return <ShieldCheck size={size} strokeWidth={2} aria-hidden="true" /> }

function StarIcon({ size = 14 } = {}) { return <Sparkles size={size} strokeWidth={2} aria-hidden="true" /> }

function ReviewIcon({ size = 14 } = {}) { return <MessageSquare size={size} strokeWidth={2} aria-hidden="true" /> }

function CameraIcon({ size = 14 } = {}) { return <Camera size={size} strokeWidth={2} aria-hidden="true" /> }

function ChevronRightIcon({ size = 16 } = {}) { return <ChevronRight size={size} strokeWidth={2} aria-hidden="true" /> }

function HouseIcon({ size = 16 } = {}) { return <House size={size} strokeWidth={2} aria-hidden="true" /> }

function SectionTitle({ children, icon }) {
  return (
    <h2 className="profile-section-title">
      {icon && <span className="profile-section-icon">{icon}</span>}
      {children}
    </h2>
  )
}

const card = {
  background: 'var(--white)', border: '1px solid var(--border)', borderRadius: 14,
}

// riga della card "Azioni rapide": icona a sinistra, freccia a destra, separatori
function ActionRow({ href, icon, label, last = false }) {
  return (
    <Link href={href} style={{
      display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px',
      borderBottom: last ? 'none' : '1px solid var(--border)', color: 'inherit',
    }}>
      <span className="profile-action-icon">{icon}</span>
      <span style={{ flex: 1, minWidth: 0, fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>{label}</span>
      <span style={{ color: 'var(--text-4)', display: 'inline-flex', flexShrink: 0 }}><ChevronRightIcon /></span>
    </Link>
  )
}

function BuildingIcon({ size = 18 } = {}) { return <Building2 size={size} strokeWidth={1.8} aria-hidden="true" /> }

function MapIcon({ size = 18 } = {}) { return <LMap size={size} strokeWidth={1.8} aria-hidden="true" /> }

function UsersIcon({ size = 18 } = {}) { return <Users size={size} strokeWidth={1.8} aria-hidden="true" /> }

function InfoRow({ label, value, last = false }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12,
      padding: '12px 0', borderBottom: last ? 'none' : '1px solid var(--border)', fontSize: 13,
    }}>
      <span style={{ color: 'var(--text-3)' }}>{label}</span>
      <span style={{ color: 'var(--text)', fontWeight: 500, textAlign: 'right', minWidth: 0, overflowWrap: 'anywhere' }}>{value}</span>
    </div>
  )
}

function PencilIcon({ size = 14 } = {}) { return <Pencil size={size} strokeWidth={2} aria-hidden="true" /> }

function PlusIcon({ size = 12 } = {}) { return <Plus size={size} strokeWidth={3} aria-hidden="true" /> }

function HistoryIcon({ size = 16 } = {}) { return <History size={size} strokeWidth={2} aria-hidden="true" /> }

function BoltIcon({ size = 16 } = {}) { return <Zap size={size} strokeWidth={2} aria-hidden="true" /> }

function PersonIcon({ size = 16 } = {}) { return <UserRound size={size} strokeWidth={2} aria-hidden="true" /> }
