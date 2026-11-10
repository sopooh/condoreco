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
          <div className="profile-header-row">

            {/* AVATAR */}
            <div className="profile-avatar-col">
              <Avatar userId={userId} avatarId={profile.avatar_id} photoUrl={profile.photo_url} role={profile.role} size={avatarSize} />
            </div>

            {/* INFO */}
            <div style={{ flex: 1, minWidth: 0, paddingTop: 4 }}>
              <h1 className="profile-name">{displayName}</h1>
              <div className="profile-email">{session.user.email}</div>
            </div>

            {/* BADGES */}
            <div className="profile-badges-col">
              {profile.verified && (
                <span className="profile-pill profile-pill-teal"><ShieldCheckIcon />Verificata</span>
              )}
              <span className="profile-pill profile-pill-amber"><StarIcon />Early Member</span>
              <span className="profile-pill profile-pill-violet">
                <ReviewIcon />{reviewCount} {reviewCount === 1 ? 'recensione' : 'recensioni'}
              </span>
            </div>
          </div>

          {/* SECONDA RIGA: cambia avatar + statistica abitazioni */}
          <div className="profile-second-row">
            <button onClick={() => setPickerOpen(true)} className="profile-avatar-btn">
              <CameraIcon />Cambia avatar
            </button>
            <div className="profile-stat-row">
              <div className="profile-stat-icon"><HomeStatIcon /></div>
              <div>
                <div className="profile-stat-n">{currentBuildings.length + pastBuildings.length}</div>
                <div className="profile-stat-l">Abitazioni</div>
                <div className="profile-stat-sub">in cui hai vissuto</div>
              </div>
            </div>
          </div>

          <button onClick={() => setEditOpen(true)} className="profile-edit-btn">
            Modifica profilo <ChevronRightIcon />
          </button>
        </div>
      </div>

      {/* BODY */}
      <div className="wrap profile-body-wrap">
        <div className="profile-body-grid" style={{ display: 'grid' }}>

          {/* LE MIE ABITAZIONI: un solo blocco, un solo modo di aggiungere */}
          <section>
            <div className="profile-section-title-row" style={{ marginBottom: 14 }}>
              <HouseIcon />
              <h2 style={sectionHeading}>Le mie abitazioni</h2>
            </div>

            {buildingsLoading ? (
              <div style={{ fontSize: 14, color: 'var(--text-3)', padding: '20px 0' }}>Caricamento...</div>
            ) : currentBuildings.length === 0 && pastBuildings.length === 0 ? (
              <div style={{ ...card, padding: '28px 22px', textAlign: 'center' }}>
                <div style={{ width: 48, height: 48, borderRadius: 14, background: 'var(--teal-lt)', color: 'var(--teal)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                  <HomeStatIcon />
                </div>
                <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>
                  Non hai ancora aggiunto la tua casa
                </div>
                <p style={{ fontSize: 14, color: 'var(--text-3)', lineHeight: 1.5, margin: '0 auto 18px', maxWidth: 360 }}>
                  Aggiungi il condominio dove vivi, o dove hai vissuto, per recensirlo e accedere all&apos;area riservata ai residenti.
                </p>
                <Link href="/aggiungi-condominio" style={primaryBtn}>Aggiungi la tua casa</Link>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                {currentBuildings.length > 0 && (
                  <div>
                    <div style={groupLabel}>Dove abiti ora</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {currentBuildings.map(b => (
                        <div key={b.id}>
                          <BuildingRow building={b} showEnterCondo />
                          <button onClick={() => handleLeave(b.id)} disabled={leavingId === b.id} style={textBtn}>
                            {leavingId === b.id ? 'Aggiornamento...' : 'Non abito più qui'}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {pastBuildings.length > 0 && (
                  <div>
                    <div style={groupLabel}>Dove hai abitato</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {pastBuildings.map(b => (
                        <div key={b.id}>
                          <BuildingRow building={b} />
                          <button onClick={() => handleReturn(b.id)} disabled={returningId === b.id} style={textBtn}>
                            {returningId === b.id ? 'Aggiornamento...' : 'Abito di nuovo qui'}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <Link href="/aggiungi-condominio" style={secondaryBtn}>+ Aggiungi un&apos;altra abitazione</Link>
              </div>
            )}
          </section>

          {/* SIDEBAR */}
          <aside style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <section>
              <h2 style={{ ...sectionHeading, marginBottom: 10 }}>Esplora</h2>
              <nav style={{ ...card, overflow: 'hidden' }}>
                <NavRow href="/cerca" label="Cerca edifici" sub="Recensioni e spese dei condomini" />
                <NavRow href="/amministratori" label="Cerca amministratori" sub="Valutazioni degli amministratori" last />
              </nav>
            </section>

            <section>
              <h2 style={{ ...sectionHeading, marginBottom: 10 }}>Il tuo account</h2>
              <div style={{ ...card, padding: '4px 16px' }}>
                <InfoRow label="Email" value={session.user.email} />
                <InfoRow
                  label="Zona"
                  value={profile.zone || (
                    <button onClick={() => setEditOpen(true)} style={{ ...textBtn, marginTop: 0, padding: 0, lineHeight: 1.2 }}>Aggiungi</button>
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

function ShieldCheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M12 2l8 4v6c0 5-3.5 8-8 10-4.5-2-8-5-8-10V6l8-4z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  )
}

function StarIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M12 2l2.4 6.6L21 11l-6.6 2.4L12 20l-2.4-6.6L3 11l6.6-2.4z" />
    </svg>
  )
}

function ReviewIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
    </svg>
  )
}

function CameraIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M4 8a2 2 0 012-2h1l1.5-2h7L17 6h1a2 2 0 012 2v10a2 2 0 01-2 2H6a2 2 0 01-2-2V8z" />
      <circle cx="12" cy="13" r="3.5" />
    </svg>
  )
}

function HomeStatIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M4 10l8-6 8 6v9a1 1 0 01-1 1h-5v-6H10v6H5a1 1 0 01-1-1v-9z" />
    </svg>
  )
}

function ChevronRightIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M9 6l6 6-6 6" />
    </svg>
  )
}

function HouseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--teal)" strokeWidth="2" aria-hidden="true">
      <path d="M4 10l8-6 8 6v9a1 1 0 01-1 1h-5v-6H10v6H5a1 1 0 01-1-1v-9z" />
    </svg>
  )
}

const sectionHeading = {
  fontSize: 15, fontWeight: 700, color: 'var(--text)', margin: 0,
}

const groupLabel = {
  fontSize: 13, fontWeight: 600, color: 'var(--text-3)', marginBottom: 10,
}

const card = {
  background: 'var(--white)', border: '1px solid var(--border)', borderRadius: 12,
}

const primaryBtn = {
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  padding: '12px 22px', borderRadius: 10, background: 'var(--teal)', color: '#fff',
  fontWeight: 700, fontSize: 14,
}

const secondaryBtn = {
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  padding: '12px 16px', borderRadius: 10, border: '1.5px dashed var(--border)',
  color: 'var(--teal-dk)', fontWeight: 600, fontSize: 14, background: 'transparent',
}

// azione secondaria sotto una scheda: testo, non un secondo bottone pieno
const textBtn = {
  marginTop: 6, padding: '4px 2px', border: 'none', background: 'none',
  color: 'var(--teal)', fontWeight: 600, fontSize: 13, cursor: 'pointer',
}

// riga di navigazione: icona-freccia a destra, separatori, chiaramente un link
function NavRow({ href, label, sub, last = false }) {
  return (
    <Link href={href} style={{
      display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px',
      borderBottom: last ? 'none' : '1px solid var(--border)', color: 'inherit',
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{label}</div>
        <div style={{ fontSize: 12, color: 'var(--text-4)', marginTop: 2 }}>{sub}</div>
      </div>
      <span style={{ color: 'var(--text-4)', display: 'inline-flex' }}><ChevronRightIcon /></span>
    </Link>
  )
}

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
