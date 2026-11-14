'use client'

import { useEffect, useState } from 'react'
import { ArrowLeft, KeyRound, Mail, MailCheck } from 'lucide-react'
import { PasswordInput } from '@/components/auth/PasswordInput'
import Modal from '@/components/ui/Modal'
import { createClient } from '@/lib/supabase/client'

export const MIN_PASSWORD = 8

// s*****@g*****.com: conferma l'indirizzo senza mostrarlo per intero
export function maskEmail(email) {
  const [user, domain = ''] = email.trim().split('@')
  const dot = domain.lastIndexOf('.')
  const host = dot > 0 ? domain.slice(0, dot) : domain
  const tld = dot > 0 ? domain.slice(dot) : ''
  const star = (s) => (s ? s[0] + '*****' : '')
  return `${star(user)}@${star(host)}${tld}`
}

function friendlyError(error, mode) {
  const msg = (error?.message || '').toLowerCase()
  const code = error?.code || ''
  if (code === 'invalid_credentials' || msg.includes('invalid login credentials')) {
    return 'Email o password non corretti. Se finora sei entrato con Google o con il link via email non hai ancora una password: tocca "Password dimenticata?" per crearne una.'
  }
  if (code === 'email_not_confirmed' || msg.includes('email not confirmed')) return 'confirm'
  if (code === 'weak_password' || msg.includes('password should')) return `Password troppo debole: usa almeno ${MIN_PASSWORD} caratteri con lettere e numeri.`
  if (code === 'over_email_send_rate_limit' || code === 'over_request_rate_limit' || msg.includes('rate limit') || msg.includes('seconds')) {
    return 'Hai fatto troppe richieste di fila. Aspetta qualche minuto e riprova.'
  }
  if (code === 'user_already_exists' || msg.includes('already registered')) return 'exists'
  if (msg.includes('signups not allowed')) return 'Le nuove registrazioni con email sono momentaneamente chiuse. Prova con Google.'
  return mode === 'signup' ? 'Registrazione non riuscita. Riprova tra poco.' : 'Qualcosa non ha funzionato. Riprova tra poco.'
}

function EmailField({ value, onChange, autoFocus }) {
  return (
    <span className="ep-input">
      <Mail size={20} strokeWidth={2} className="ep-ico" aria-hidden="true" />
      <input type="email" required value={value} onChange={(e) => onChange(e.target.value)} placeholder="latua@email.com"
        autoComplete="email" inputMode="email" autoFocus={autoFocus} />
    </span>
  )
}

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  )
}

const TITLES = {
  login: ['Accedi a Condoreco', 'Entra per scrivere recensioni e seguire i tuoi edifici.'],
  signup: ['Crea il tuo account', 'Gratis, ti servono solo email e password.'],
  forgot: ['Reimposta la password', 'Ti mandiamo un link per sceglierne una nuova.'],
  magic: ['Accedi con un link', 'Ti mandiamo un link: lo apri e sei dentro, senza password.'],
}

// Finestra unica di accesso: Google, email + password, registrazione,
// password dimenticata e link via email. mode iniziale da chi la apre.
// Il Navbar la monta solo quando è aperta, così ogni apertura riparte pulita.
export default function AuthDialog({ open, onClose, initialMode = 'login' }) {
  const supabase = createClient()
  const [mode, setMode] = useState(initialMode)
  const [sent, setSent] = useState(null) // 'reset' | 'confirm' | 'magic'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [busyGoogle, setBusyGoogle] = useState(false)
  const [err, setErr] = useState('')
  const [needsConfirm, setNeedsConfirm] = useState(false)
  const [cooldown, setCooldown] = useState(0)
  // art. 2-quinquies Codice privacy: almeno 14 anni per iscriversi da soli
  const [ageOk, setAgeOk] = useState(false)

  useEffect(() => {
    if (cooldown <= 0) return
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000)
    return () => clearTimeout(t)
  }, [cooldown])

  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  const go = (m) => { setMode(m); setErr(''); setNeedsConfirm(false); setSent(null) }

  async function google() {
    if (mode === 'signup' && !ageOk) { setErr('Per registrarti conferma di avere almeno 14 anni e di aver letto l’informativa.'); return }
    setErr(''); setBusyGoogle(true)
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${origin}/auth/callback`, skipBrowserRedirect: true },
    })
    setBusyGoogle(false)
    if (error || !data?.url) { setErr('Impossibile avviare l’accesso con Google.'); return }
    window.location.assign(data.url)
  }

  async function sendReset() {
    // dopo il link si va a /reimposta-password (letto dal callback)
    const secure = window.location.protocol === 'https:' ? '; Secure' : ''
    document.cookie = `condoreco_after_auth=/reimposta-password; Max-Age=3600; Path=/; SameSite=Lax${secure}`
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${origin}/auth/callback`,
    })
    // Rate limit a parte, rispondiamo sempre allo stesso modo:
    // non riveliamo se un'email è registrata o no.
    if (error) {
      const f = friendlyError(error, 'forgot')
      if (f.startsWith('Hai fatto troppe')) { setErr(f); return false }
    }
    setCooldown(60)
    return true
  }

  async function resendConfirm() {
    const { error } = await supabase.auth.resend({ type: 'signup', email: email.trim(), options: { emailRedirectTo: `${origin}/auth/callback` } })
    if (error) setErr(friendlyError(error))
    else { setCooldown(60); setSent('confirm') }
  }

  async function submit(e) {
    e.preventDefault()
    setErr(''); setNeedsConfirm(false); setBusy(true)
    const addr = email.trim()
    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email: addr, password })
        if (error) {
          const f = friendlyError(error, 'login')
          if (f === 'confirm') { setNeedsConfirm(true); setErr('Prima di entrare devi confermare l’email: apri il link che ti abbiamo mandato.') }
          else setErr(f)
          return
        }
        onClose()
      } else if (mode === 'signup') {
        if (!ageOk) { setErr('Per registrarti conferma di avere almeno 14 anni e di aver letto l’informativa.'); return }
        if (password.length < MIN_PASSWORD) { setErr(`La password deve avere almeno ${MIN_PASSWORD} caratteri.`); return }
        const { data, error } = await supabase.auth.signUp({ email: addr, password, options: { emailRedirectTo: `${origin}/auth/callback` } })
        if (error) {
          const f = friendlyError(error, 'signup')
          setErr(f === 'exists' ? 'Esiste già un account con questa email. Accedi, oppure usa "Password dimenticata?" se non ne hai una.' : f)
          return
        }
        // Con conferma email attiva Supabase non dice se l'email esisteva già:
        // in quel caso identities è vuoto.
        if (data.user && data.user.identities?.length === 0) {
          setErr('Esiste già un account con questa email. Accedi, oppure usa "Password dimenticata?" se non ne hai una.')
          return
        }
        if (data.session) { onClose(); return }
        setCooldown(60); setSent('confirm')
      } else if (mode === 'forgot') {
        if (await sendReset()) setSent('reset')
      } else if (mode === 'magic') {
        const { error } = await supabase.auth.signInWithOtp({ email: addr, options: { emailRedirectTo: `${origin}/auth/callback` } })
        if (error) { setErr(friendlyError(error)); return }
        setCooldown(60); setSent('magic')
      }
    } finally {
      setBusy(false)
    }
  }

  if (!open) return null

  if (sent) {
    const texts = {
      reset: ['Controlla la tua email', `Se esiste un account con questo indirizzo, abbiamo mandato a ${maskEmail(email)} il link per reimpostare la password. Il link vale un’ora.`],
      confirm: ['Conferma la tua email', `Abbiamo mandato a ${maskEmail(email)} il link per attivare l’account. Aprilo e sei dentro.`],
      magic: ['Controlla la tua email', `Abbiamo mandato a ${maskEmail(email)} il link di accesso. Aprilo e sei dentro.`],
    }[sent]
    const resend = sent === 'reset' ? async () => { setErr(''); await sendReset() }
      : sent === 'confirm' ? resendConfirm
      : async () => { await supabase.auth.signInWithOtp({ email: email.trim(), options: { emailRedirectTo: `${origin}/auth/callback` } }); setCooldown(60) }
    return (
      <Modal open onClose={onClose} title={texts[0]}>
        <div className="auth-sent">
          <span className="auth-sent-ico"><MailCheck size={30} strokeWidth={1.8} aria-hidden="true" /></span>
          <p>{texts[1]}</p>
        </div>
        <div className="auth-help">
          <strong>Non è arrivata?</strong>
          <span>Controlla nello spam e verifica di aver scritto bene l&apos;indirizzo.</span>
        </div>
        {err && <p className="auth-err">{err}</p>}
        <button type="button" className="auth-secondary" disabled={cooldown > 0} onClick={resend}>
          {cooldown > 0 ? `Puoi reinviarla tra ${cooldown}s` : 'Reinvia email'}
        </button>
        <button type="button" className="auth-link" onClick={() => go(sent === 'reset' ? 'forgot' : 'login')} style={{ marginTop: 10 }}>
          Ho sbagliato indirizzo
        </button>
      </Modal>
    )
  }

  const [title, subtitle] = TITLES[mode]
  const back = mode === 'forgot' || mode === 'magic'

  return (
    <Modal open onClose={onClose} title={title} subtitle={subtitle}>
      {back && (
        <button type="button" className="auth-back" onClick={() => go('login')}>
          <ArrowLeft size={18} aria-hidden="true" />Torna all&apos;accesso
        </button>
      )}

      {(mode === 'login' || mode === 'signup') && (
        <>
          <div className="auth-tabs" role="tablist">
            <button type="button" role="tab" aria-selected={mode === 'login'} className={mode === 'login' ? 'is-on' : ''} onClick={() => go('login')}>Accedi</button>
            <button type="button" role="tab" aria-selected={mode === 'signup'} className={mode === 'signup' ? 'is-on' : ''} onClick={() => go('signup')}>Registrati</button>
          </div>
          <button type="button" className="auth-google" onClick={google} disabled={busyGoogle}>
            <GoogleIcon />{busyGoogle ? 'Reindirizzamento…' : 'Continua con Google'}
          </button>
          <div className="auth-or"><span>oppure con email</span></div>
        </>
      )}

      <form onSubmit={submit} noValidate={false}>
        <label className="ep-field"><span className="ep-label">Email</span>
          <EmailField value={email} onChange={setEmail} autoFocus={back} />
        </label>

        {(mode === 'login' || mode === 'signup') && (
          <label className="ep-field" htmlFor="auth-pw">
            <span className="ep-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              Password
              {mode === 'login' && <button type="button" className="auth-link" onClick={() => go('forgot')}>Password dimenticata?</button>}
            </span>
            <PasswordInput id="auth-pw" value={password} onChange={setPassword}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              placeholder={mode === 'signup' ? `Almeno ${MIN_PASSWORD} caratteri` : 'La tua password'} />
          </label>
        )}

        {mode === 'signup' && (
          <label className="auth-age" style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 13.5, color: 'var(--text-2)', margin: '4px 0 12px', lineHeight: 1.4 }}>
            <input type="checkbox" checked={ageOk} onChange={(e) => setAgeOk(e.target.checked)} style={{ marginTop: 2, width: 18, height: 18, flexShrink: 0 }} />
            <span>Dichiaro di avere almeno 14 anni e di aver letto l&apos;<a href="/privacy-policy" target="_blank" rel="noopener" style={{ color: 'var(--teal)', fontWeight: 600 }}>informativa privacy</a>.</span>
          </label>
        )}

        {err && <p className="auth-err" role="alert">{err}</p>}
        {needsConfirm && (
          <button type="button" className="auth-link" disabled={cooldown > 0} onClick={resendConfirm} style={{ marginBottom: 12 }}>
            {cooldown > 0 ? `Reinvia conferma tra ${cooldown}s` : 'Reinvia l’email di conferma'}
          </button>
        )}

        <button type="submit" className="ep-save" disabled={busy}>
          {busy ? 'Attendi…' : { login: 'Accedi', signup: 'Crea account', forgot: 'Inviami il link', magic: 'Inviami il link di accesso' }[mode]}
        </button>
      </form>

      {mode === 'login' && (
        <button type="button" className="auth-alt" onClick={() => go('magic')}>
          <KeyRound size={17} aria-hidden="true" />Accedi con un link via email
        </button>
      )}
      {mode === 'signup' && (
        <p className="auth-fine">Creando l&apos;account accetti i <a href="/termini-e-condizioni">Termini e condizioni</a>. Come trattiamo i tuoi dati è spiegato nella <a href="/privacy-policy">Privacy policy</a>.</p>
      )}
      {(mode === 'login' || mode === 'magic') && (
        <p className="auth-fine">Se entri per la prima volta (anche con Google o con il link via email) dichiari di avere almeno 14 anni e di aver letto la <a href="/privacy-policy">Privacy policy</a>.</p>
      )}
    </Modal>
  )
}
