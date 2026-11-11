'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, Check, CircleAlert, KeyRound, ShieldCheck } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useSession, useSessionReady } from '@/components/providers/SessionProvider'
import { MIN_PASSWORD } from '@/components/auth/AuthDialog'
import { PasswordInput } from '@/components/auth/PasswordInput'

const RULES = [
  { id: 'len', label: `Almeno ${MIN_PASSWORD} caratteri`, test: (p) => p.length >= MIN_PASSWORD },
  { id: 'let', label: 'Almeno una lettera', test: (p) => /\p{L}/u.test(p) },
  { id: 'num', label: 'Almeno un numero', test: (p) => /\d/.test(p) },
]

function openForgot() {
  window.dispatchEvent(new CustomEvent('condoreco:open-auth', { detail: { mode: 'forgot' } }))
}

// Pagina d'arrivo del link "Password dimenticata?": il callback ha già aperto
// la sessione, qui si sceglie la nuova password. Da loggati serve anche per
// impostarla o cambiarla dal profilo.
export default function ResetPasswordClient() {
  const session = useSession()
  const ready = useSessionReady()
  const router = useRouter()
  const sp = useSearchParams()
  const expired = sp.get('link') === 'scaduto'
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [done, setDone] = useState(false)

  const ok = RULES.every((r) => r.test(pw))
  const match = pw.length > 0 && pw === pw2

  async function submit(e) {
    e.preventDefault()
    setErr('')
    if (!ok) { setErr('La password non rispetta ancora i requisiti.'); return }
    if (!match) { setErr('Le due password non coincidono.'); return }
    setBusy(true)
    const { error } = await createClient().auth.updateUser({ password: pw })
    setBusy(false)
    if (error) {
      const m = (error.message || '').toLowerCase()
      if (error.code === 'same_password' || m.includes('different from the old')) setErr('Scegli una password diversa da quella attuale.')
      else if (error.code === 'weak_password') setErr('Password troppo debole: allungala o aggiungi numeri e simboli.')
      else if (error.code === 'reauthentication_needed') setErr('Per sicurezza richiedi un nuovo link di reimpostazione.')
      else setErr('Non siamo riusciti a salvare la password. Riprova o richiedi un nuovo link.')
      return
    }
    setDone(true)
    setTimeout(() => router.push('/profilo'), 2500)
  }

  let body
  if (!ready) {
    body = <p style={{ color: 'var(--text-3)', fontSize: 15 }}>Un attimo…</p>
  } else if (done) {
    body = (
      <>
        <span className="rp-ico is-ok"><Check size={30} strokeWidth={2.4} aria-hidden="true" /></span>
        <h1 className="rp-title">Password aggiornata</h1>
        <p className="rp-sub">Da ora puoi entrare con la tua email e la nuova password. Ti portiamo al profilo…</p>
        <Link href="/profilo" className="ep-save rp-btn">Vai al profilo</Link>
      </>
    )
  } else if (!session) {
    body = (
      <>
        <span className="rp-ico is-warn"><CircleAlert size={30} strokeWidth={2} aria-hidden="true" /></span>
        <h1 className="rp-title">{expired ? 'Link scaduto o già usato' : 'Serve un link valido'}</h1>
        <p className="rp-sub">
          {expired
            ? 'Il link per reimpostare la password vale un’ora e si può usare una sola volta. Se l’hai aperto su un altro dispositivo, richiedine uno nuovo da qui.'
            : 'Per scegliere una nuova password apri il link che ti abbiamo mandato via email, oppure richiedine uno nuovo.'}
        </p>
        <button type="button" className="ep-save rp-btn" onClick={openForgot}>Richiedi un nuovo link</button>
        <Link href="/" className="rp-back"><ArrowLeft size={18} aria-hidden="true" />Torna alla home</Link>
      </>
    )
  } else {
    body = (
      <>
        <span className="rp-ico"><KeyRound size={28} strokeWidth={2} aria-hidden="true" /></span>
        <h1 className="rp-title">Scegli una nuova password</h1>
        <p className="rp-sub">Per l&apos;account <strong>{session.user.email}</strong>.</p>
        <form onSubmit={submit} style={{ textAlign: 'left' }}>
          <label className="ep-field"><span className="ep-label">Nuova password</span>
            <PasswordInput value={pw} onChange={setPw} autoComplete="new-password" placeholder={`Almeno ${MIN_PASSWORD} caratteri`} autoFocus />
          </label>
          <ul className="rp-rules" aria-label="Requisiti password">
            {RULES.map((r) => {
              const on = r.test(pw)
              return <li key={r.id} className={on ? 'is-ok' : ''}><Check size={15} strokeWidth={3} aria-hidden="true" />{r.label}</li>
            })}
          </ul>
          <label className="ep-field"><span className="ep-label">Ripeti la password</span>
            <PasswordInput value={pw2} onChange={setPw2} autoComplete="new-password" placeholder="Ripeti la nuova password" />
          </label>
          {pw2 && !match && <p className="auth-err">Le due password non coincidono.</p>}
          {err && <p className="auth-err" role="alert">{err}</p>}
          <button type="submit" className="ep-save" disabled={busy || !ok || !match}>{busy ? 'Salvataggio…' : 'Salva la nuova password'}</button>
        </form>
        <p className="rp-safe"><ShieldCheck size={16} aria-hidden="true" />Le altre sessioni aperte restano attive: se pensi che qualcuno conosca la vecchia password, esci anche dagli altri dispositivi.</p>
      </>
    )
  }

  return (
    <main className="rp-page">
      <svg aria-hidden="true" className="dir-hero-wave" viewBox="0 0 420 120" preserveAspectRatio="none">
        <path d="M0 70C90 20 170 18 250 40s120 30 170-10V0H0z" fill="rgba(13,103,111,0.05)" />
        <path d="M60 64C140 22 220 20 300 38s90 20 120-6" fill="none" stroke="#0D676F" strokeOpacity="0.18" strokeWidth="10" strokeLinecap="round" />
        <path d="M120 52C190 26 250 26 320 36s70 10 100-8" fill="none" stroke="#0D676F" strokeOpacity="0.32" strokeWidth="4" strokeLinecap="round" />
      </svg>
      <div className="rp-card">{body}</div>
    </main>
  )
}
