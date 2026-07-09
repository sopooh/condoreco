'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useSession } from '@/components/providers/SessionProvider'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'

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

        {/* Mobile hamburger — visibilità via CSS (.navbar-hamburger), non JS */}
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
      </nav>

      {/* Mobile menu drawer — montato solo se aperto (stato menuOpen, non
          viewport-dipendente: nessun rischio di hydration mismatch); la
          classe CSS lo nasconde comunque su desktop, incluso il caso limite
          di resize della finestra a drawer già aperto. */}
      {menuOpen && (
        <>
          <div onClick={closeMenu} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', zIndex: 98 }} />
          <div className="navbar-mobile-drawer" style={{
            position: 'fixed', top: 58, left: 0, right: 0, background: 'var(--white)',
            borderBottom: '1px solid var(--border)', zIndex: 99,
            flexDirection: 'column', padding: '8px 0',
            boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
          }}>
            {[
              { to: '/cerca', label: 'Esplora' },
              { to: '/amministratori', label: 'Amministratori' },
              ...(session ? [{ to: '/profilo', label: 'Profilo' }] : []),
              ...(isAdminUser ? [{ to: '/admin', label: 'Admin ⚙' }] : []),
            ].map(item => (
              <Link key={item.to} href={item.to} onClick={closeMenu}
                style={{ padding: '14px 20px', fontSize: 16, fontWeight: 600, color: 'var(--text)', borderBottom: '1px solid var(--border-2)' }}>
                {item.label}
              </Link>
            ))}
            <div style={{ padding: '12px 16px' }}>
              {session ? (
                <button onClick={() => { supabase.auth.signOut(); closeMenu() }} style={{
                  width: '100%', padding: '12px', borderRadius: 8, border: '1px solid var(--border)',
                  background: 'var(--white)', fontSize: 15, fontWeight: 600, color: 'var(--text-2)', cursor: 'pointer',
                }}>Esci</button>
              ) : (
                <button onClick={() => { setAuthOpen(true); closeMenu() }} style={{
                  width: '100%', padding: '12px', borderRadius: 8, border: 'none',
                  background: 'var(--teal)', color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer',
                }}>Accedi</button>
              )}
            </div>
          </div>
        </>
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
