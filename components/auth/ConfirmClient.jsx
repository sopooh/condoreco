'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const safeNext = (raw) => (!raw || !raw.startsWith('/') || raw.startsWith('//') || raw.includes('\\') ? '/' : raw)

// Completa l'accesso dai link via email: legge la sessione dall'hash dell'URL,
// la salva e porta al modulo dei dati se il profilo è ancora da completare.
export default function ConfirmClient() {
  const router = useRouter()
  const [error, setError] = useState(null)

  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''))
    const next = safeNext(new URLSearchParams(window.location.search).get('next'))
    const access_token = hash.get('access_token')
    const refresh_token = hash.get('refresh_token')
    const supabase = createClient()
    ;(async () => {
      if (!access_token || !refresh_token) {
        // forse la sessione c'è già (link aperto due volte nello stesso browser)
        const { data: { session } } = await supabase.auth.getSession()
        if (session) { router.replace(next); return }
        const code = hash.get('error_code')
        setError(code === 'otp_expired' ? 'Il link è scaduto o è già stato usato.' : 'Non è stato possibile completare l\'accesso con questo link.')
        return
      }
      const { data, error: e } = await supabase.auth.setSession({ access_token, refresh_token })
      if (e || !data.session) { setError('Non è stato possibile completare l\'accesso con questo link.'); return }
      window.history.replaceState(null, '', window.location.pathname)
      const { data: prof } = await supabase.from('profiles').select('display_name').eq('id', data.session.user.id).maybeSingle()
      const isRecovery = hash.get('type') === 'recovery'
      router.replace(isRecovery ? '/reimposta-password' : !prof?.display_name ? '/profilo' : next)
      router.refresh()
    })()
  }, [router])

  return (
    <div className="wrap" style={{ maxWidth: 480, padding: '60px 20px', textAlign: 'center' }}>
      {error ? (
        <>
          <h1 style={{ fontSize: 24, fontWeight: 800, margin: '0 0 8px' }}>Link non valido</h1>
          <p style={{ color: 'var(--text-3)', margin: '0 0 18px' }}>{error} Chiedine uno nuovo: arriva in pochi secondi.</p>
          <button type="button" className="ep-save"
            onClick={() => window.dispatchEvent(new CustomEvent('condoreco:open-auth', { detail: { mode: 'magic' } }))}>
            Richiedi un nuovo link
          </button>
        </>
      ) : (
        <p style={{ color: 'var(--text-3)' }}>Accesso in corso…</p>
      )}
    </div>
  )
}
