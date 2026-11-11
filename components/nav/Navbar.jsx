'use client'

import { ChevronRight, Compass, LogOut, MailCheck, Settings, UserRound, Users, X, Wrench, ClipboardList } from 'lucide-react'
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
  const [isSupplier, setIsSupplier] = useState(false)

  // Il ruolo va letto dal profilo (protetto da RLS + trigger anti-escalation),
  // non da un'email hardcoded: is_admin() è la stessa fonte di verità usata
  // dal middleware server-side su /admin.
  useEffect(() => {
    if (!session) { setIsAdminUser(false); return }
    let cancelled = false
    supabase.from('profiles').select('role').eq('id', session.user.id).single()
      .then(({ data }) => { if (!cancelled) setIsAdminUser(data?.role === 'admin') })
    // Recofixer: chi ha un profilo fornitore vede "I miei interventi"
    supabase.from('suppliers').select('id').eq('id', session.user.id).maybeSingle()
      .then(({ data }) => { if (!cancelled) setIsSupplier(!!data) })
    return () => { cancelled = true }
  }, [session, supabase])

  // altre pagine possono chiedere il login (es. invito fornitore) e indicare
  // dove tornare dopo: il callback porta sempre in home, da lì si riparte
  useEffect(() => {
    const open = (e) => {
      try { if (e.detail?.next) window.localStorage.setItem('condoreco:next', e.detail.next) } catch { /* ignore */ }
      setAuthOpen(true)
    }
    window.addEventListener('condoreco:open-auth', open)
    return () => window.removeEventListener('condoreco:open-auth', open)
  }, [])
  useEffect(() => {
    if (!session) return
    try {
      const next = window.localStorage.getItem('condoreco:next')
      if (next && next.startsWith('/')) {
        window.localStorage.removeItem('condoreco:next')
        if (window.location.pathname !== next) window.location.assign(next)
      }
    } catch { /* ignore */ }
  }, [session])

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
          <Link href="/fornitori" style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-3)' }}>Fornitori</Link>
          {session ? (
            <>
              {isSupplier && <Link href="/fornitore" style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-3)' }}>I miei interventi</Link>}
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
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, width: 40, height: 40, minHeight: 0, flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 5 }}
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
                { to: '/fornitori', label: 'Fornitori', icon: 'wrench' },
                ...(isSupplier ? [{ to: '/fornitore', label: 'I miei interventi', icon: 'clipboard' }] : []),
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
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--teal-lt)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', color: 'var(--teal)' }}><MailCheck size={28} strokeWidth={1.8} aria-hidden="true" /></div>
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

const ICONS = { compass: Compass, people: Users, person: UserRound, gear: Settings, chevron: ChevronRight, close: X, logout: LogOut, wrench: Wrench, clipboard: ClipboardList }

function MenuIcon({ name }) {
  const Icon = ICONS[name]
  return Icon ? <Icon size={24} strokeWidth={1.9} aria-hidden="true" /> : null
}
