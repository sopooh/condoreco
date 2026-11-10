'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useSession } from '@/components/providers/SessionProvider'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import NotificationBell from '@/components/nav/NotificationBell'

// Niente useIsMobile qui: nav desktop e hamburger sono renderizzati SEMPRE
// entrambi, la visibilità è decisa da CSS (.navbar-desktop-nav/.navbar-hamburger
// in globals.css, stesso breakpoint 768px dell'hook). Un componente così in
// alto e su ogni pagina non può permettersi il flash post-idratazione che
// isMobile via JS comporterebbe al primo render.
export default function Navbar() {
  const session = useSession()
  const supabase = createClient()
  const [authOpen, setAuthOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [busyGoogle, setBusyGoogle] = useState(false)
  const [err, setErr] = useState('')
  const [isAdminUser, setIsAdminUser] = useState(false)

  // Il ruolo va letto dal profilo (protetto da RLS + trigger anti-escalation),
  // non da un'email hardcoded: is_admin() è la stessa fonte di verità usata
  // dal middleware server-side su /admin.
  useEffect(() => {
    if (!session) { setIsAdminUser(false); return }
    let cancelled = false
    supabase.from('profiles').select('role').eq('id', session.user.id).single()
      .then(({ data }) => { if (!cancelled) setIsAdminUser(data?.role === 'admin') })
    return () => { cancelled = true }
  }, [session, supabase])

  async function handleGoogleSignIn() {
    setErr(''); setBusyGoogle(true)
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback`, skipBrowserRedirect: true },
    })
    setBusyGoogle(false)
    if (error) { setErr(error.message); return }
    if (data?.url) { window.location.assign(data.url); return }
    setErr('Impossibile avviare l\'accesso con Google.')
  }

  async function handleMagicLink(e) {
    e.preventDefault(); setErr(''); setBusy(true)
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    })
    setBusy(false)
    if (error) setErr(error.message)
    else setSent(true)
  }

  function closeMenu() { setMenuOpen(false) }

  // menu aperto: niente scroll della pagina sotto, Esc chiude
  useEffect(() => {
    if (!menuOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e) => { if (e.key === 'Escape') setMenuOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => { document.body.style.overflow = prev; window.removeEventListener('keydown', onKey) }
  }, [menuOpen])

  return (
    <>
      <nav className="navbar" style={{
        background: 'var(--white)', borderBottom: '1px solid var(--border)',
        height: 58,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        position: 'sticky', top: 0, zIndex: 100,
      }}>
        {/* Logo */}
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 18, fontWeight: 800, color: 'var(--teal)', letterSpacing: '-0.5px' }}>
          <img src="/condoreco_transparent.png" alt="CondoReco" style={{ width: 28, height: 28, borderRadius: '50%' }} />
          <span>condo<span style={{ color: 'var(--text)' }}>reco</span></span>
        </Link>

        {/* Desktop nav — visibilità via CSS (.navbar-desktop-nav), non JS */}
        <div className="navbar-desktop-nav" style={{ alignItems: 'center', gap: 28 }}>
          <Link href="/cerca" style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-3)' }}>Esplora</Link>
          <Link href="/amministratori" style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-3)' }}>Amministratori</Link>
          {session ? (
            <>
              <Link href="/profilo" style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-3)' }}>Profilo</Link>
              <NotificationBell />
              {isAdminUser && (
                <Link href="/admin" style={{ fontSize: 13, fontWeight: 700, color: 'var(--teal)', background: 'var(--teal-lt)', padding: '5px 12px', borderRadius: 6 }}>
                  Admin
                </Link>
              )}
              <Button variant="ghost" onClick={() => supabase.auth.signOut()}>Esci</Button>
            </>
          ) : (
            <Button variant="ghost" onClick={() => setAuthOpen(true)}>Accedi</Button>
          )}
        </div>

        {/* Mobile: campanella + hamburger — visibilità via CSS, non JS */}
        <div className="navbar-mobile-right" style={{ alignItems: 'center', gap: 6 }}>
        {session && <NotificationBell />}
        <button
          className="navbar-hamburger"
          onClick={() => setMenuOpen(v => !v)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 8, flexDirection: 'column', gap: 5 }}
          aria-label="Menu"
        >
          <span style={{ display: 'block', width: 22, height: 2, background: 'var(--text)', borderRadius: 2, transition: 'all 0.2s', transform: menuOpen ? 'rotate(45deg) translate(5px, 5px)' : 'none' }} />
          <span style={{ display: 'block', width: 22, height: 2, background: 'var(--text)', borderRadius: 2, opacity: menuOpen ? 0 : 1, transition: 'all 0.2s' }} />
          <span style={{ display: 'block', width: 22, height: 2, background: 'var(--text)', borderRadius: 2, transition: 'all 0.2s', transform: menuOpen ? 'rotate(-45deg) translate(5px, -5px)' : 'none' }} />
        </button>
        </div>
      </nav>

      {/* Mobile menu: pannello che scende dall'alto e copre anche la navbar,
          con logo, chiusura, voci con icona e bordo inferiore a onda.
          Montato solo se aperto; la classe CSS lo nasconde su desktop. */}
      {menuOpen && (
        <div className="navbar-mobile-drawer" style={{ position: 'fixed', inset: 0, zIndex: 200, flexDirection: 'column' }}>
          <div onClick={closeMenu} className="menu-backdrop" style={{ position: 'absolute', inset: 0, background: 'rgba(15,41,38,0.35)', backdropFilter: 'blur(3px)', WebkitBackdropFilter: 'blur(3px)' }} />
          <div role="dialog" aria-modal="true" aria-label="Menu" className="menu-panel" style={{
            position: 'relative', background: 'linear-gradient(180deg, #FFFFFF 0%, #F4FAFA 55%, #E6F2F2 100%)',
            padding: 'calc(14px + env(safe-area-inset-top)) 20px 0', boxShadow: '0 18px 40px rgba(13,103,111,0.18)',
          }}>
            {/* decorazione a onda in alto */}
            <svg aria-hidden="true" viewBox="0 0 390 120" preserveAspectRatio="none" style={{ position: 'absolute', top: 0, right: 0, width: '75%', height: 120, pointerEvents: 'none' }}>
              <path d="M0 0h390v70C320 20 230 110 120 60 70 38 30 30 0 34z" fill="rgba(13,103,111,0.07)" />
            </svg>

            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 44, marginBottom: 14 }}>
              <Link href="/" onClick={closeMenu} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 22, fontWeight: 800, color: 'var(--teal)', letterSpacing: '-0.5px' }}>
                <img src="/condoreco_transparent.png" alt="" style={{ width: 34, height: 34, borderRadius: '50%' }} />
                <span>condo<span style={{ color: 'var(--text)' }}>reco</span></span>
              </Link>
              <button onClick={closeMenu} aria-label="Chiudi menu" style={{
                width: 44, height: 44, borderRadius: '50%', border: 'none', cursor: 'pointer',
                background: 'rgba(13,103,111,0.08)', color: 'var(--teal)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 2px 8px rgba(13,103,111,0.12)',
              }}>
                <MenuIcon name="close" />
              </button>
            </div>

            <nav style={{ position: 'relative', display: 'flex', flexDirection: 'column' }}>
              {[
                { to: '/cerca', label: 'Esplora', icon: 'compass' },
                { to: '/amministratori', label: 'Amministratori', icon: 'people' },
                ...(session ? [{ to: '/profilo', label: 'Profilo', icon: 'person' }] : []),
                ...(isAdminUser ? [{ to: '/admin', label: 'Admin', icon: 'gear', badge: 'Admin' }] : []),
              ].map((item, i, arr) => (
                <Link key={item.to} href={item.to} onClick={closeMenu} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '8px 0', color: 'var(--text)' }}>
                  <span style={{ width: 48, height: 48, borderRadius: 14, background: 'rgba(13,103,111,0.08)', color: 'var(--teal)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <MenuIcon name={item.icon} />
                  </span>
                  <span style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10, alignSelf: 'stretch', borderBottom: i < arr.length - 1 ? '1px solid rgba(13,103,111,0.12)' : 'none', minHeight: 56 }}>
                    <span style={{ fontSize: 18, fontWeight: 700 }}>{item.label}</span>
                    {item.badge && <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--teal-dk)', background: 'var(--teal-lt)', padding: '3px 10px', borderRadius: 999 }}>{item.badge}</span>}
                    <span style={{ marginLeft: 'auto', color: 'var(--text-2)', display: 'flex' }}><MenuIcon name="chevron" /></span>
                  </span>
                </Link>
              ))}
            </nav>

            <div style={{ position: 'relative', padding: '18px 0 30px' }}>
              {session ? (
                <button onClick={() => { supabase.auth.signOut(); closeMenu() }} style={{
                  width: '100%', height: 52, borderRadius: 14, border: '1.5px solid rgba(13,103,111,0.45)',
                  background: 'rgba(255,255,255,0.7)', fontSize: 16, fontWeight: 700, color: 'var(--teal-dk)', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                }}><MenuIcon name="logout" /> Esci</button>
              ) : (
                <button onClick={() => { setAuthOpen(true); closeMenu() }} style={{
                  width: '100%', height: 52, borderRadius: 14, border: 'none',
                  background: 'var(--teal)', color: '#fff', fontSize: 16, fontWeight: 700, cursor: 'pointer',
                }}>Accedi</button>
              )}
            </div>

            {/* bordo inferiore a onda */}
            <svg aria-hidden="true" viewBox="0 0 390 56" preserveAspectRatio="none" style={{ display: 'block', width: 'calc(100% + 40px)', height: 56, margin: '0 -20px -1px' }}>
              <path d="M0 6c80 34 170 40 260 18 50-12 95-14 130-8v40H0z" fill="url(#menuWave)" />
              <defs>
                <linearGradient id="menuWave" x1="0" x2="1" y1="0" y2="0">
                  <stop offset="0" stopColor="#0D676F" />
                  <stop offset="1" stopColor="#1C8A8F" />
                </linearGradient>
              </defs>
            </svg>
          </div>
        </div>
      )}

      {/* Auth Modal */}
      <Modal open={authOpen} onClose={() => { setAuthOpen(false); setSent(false) }}
             title="Accedi a CondoReco"
             subtitle="Entra per scrivere recensioni e seguire i tuoi edifici.">
        {sent ? (
          <div style={{ textAlign: 'center', padding: '12px 0' }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--teal-lt)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: 28 }}>📩</div>
            <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 8 }}>Controlla la tua email</div>
            <p style={{ fontSize: 14, color: 'var(--text-2)', lineHeight: 1.7 }}>
              Abbiamo inviato un link di accesso a <strong>{email}</strong>. Apri la mail e clicca per entrare.
            </p>
            <p style={{ fontSize: 12, color: 'var(--text-4)', marginTop: 14 }}>Non la trovi? Controlla nello spam.</p>
          </div>
        ) : (
          <>
            <Button variant="ghost" block onClick={handleGoogleSignIn} disabled={busyGoogle} style={{ marginBottom: 16, padding: 12 }}>
              {busyGoogle ? 'Reindirizzamento...' : 'Continua con Google'}
            </Button>
            <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-4)', margin: '8px 0 16px' }}>oppure con email</div>
            <form onSubmit={handleMagicLink}>
              <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                placeholder="latua@email.com"
                style={{ width: '100%', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6, padding: '11px 14px', fontSize: 14, marginBottom: 12, outline: 'none' }}
              />
              {err && <p style={{ color: '#DC2626', fontSize: 13, marginBottom: 12 }}>{err}</p>}
              <Button variant="primary" block type="submit" disabled={busy} style={{ padding: 12 }}>
                {busy ? 'Invio in corso...' : 'Inviami il link di accesso'}
              </Button>
            </form>
          </>
        )}
      </Modal>
    </>
  )
}

const ICONS = {
  compass: <><circle cx="12" cy="12" r="9" /><path d="M15.5 8.5l-2 5-5 2 2-5z" /></>,
  people: <><circle cx="9" cy="8" r="3.2" /><path d="M3 20a6 6 0 0112 0" /><path d="M16 5a3 3 0 010 6M18 20a6 6 0 00-3-5.2" /></>,
  person: <><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0116 0" /></>,
  gear: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z" /></>,
  chevron: <path d="M9 6l6 6-6 6" />,
  close: <path d="M6 6l12 12M18 6L6 18" />,
  logout: <><path d="M15 4h3a2 2 0 012 2v12a2 2 0 01-2 2h-3" /><path d="M10 17l5-5-5-5M15 12H4" /></>,
}

function MenuIcon({ name }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {ICONS[name]}
    </svg>
  )
}
