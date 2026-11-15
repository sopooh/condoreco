import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { EmailOtpType } from '@supabase/supabase-js'

// Destinazione dei link di accesso: Google (OAuth), link via email, conferma
// registrazione e reimpostazione password. Due formati:
//  - ?code=...            (PKCE: funziona nello stesso browser che ha fatto la richiesta)
//  - ?token_hash=...&type= (template email con {{ .TokenHash }}: funziona su qualsiasi dispositivo)
// La reimpostazione password si riconosce dal metodo di accesso nella sessione
// (amr "recovery") o dal cookie condoreco_after_auth che l'app imposta prima
// di chiedere il link: così redirectTo resta /auth/callback, già consentito.
const RESET_PATH = '/reimposta-password'
const AFTER_COOKIE = 'condoreco_after_auth'

function isRecoverySession(accessToken?: string) {
  try {
    const payload = JSON.parse(Buffer.from(accessToken!.split('.')[1], 'base64url').toString('utf8'))
    return Array.isArray(payload.amr) && payload.amr.some((m: { method?: string }) => m.method === 'recovery')
  } catch {
    return false
  }
}

function safeNext(raw: string | null) {
  if (!raw || !raw.startsWith('/') || raw.startsWith('//') || raw.includes('\\')) return '/'
  return raw
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const tokenHash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null
  const cookieStore = await cookies()
  let next = safeNext(searchParams.get('next') || cookieStore.get(AFTER_COOKIE)?.value || null)
  if (type === 'recovery') next = RESET_PATH
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        },
      },
    }
  )

  // Link via email (flusso implicit): la sessione è nell'hash dell'URL, che il
  // server non vede. Il browser conserva l'hash nel redirect, quindi la pagina
  // client /auth/confirm la legge e completa l'accesso.
  if (!tokenHash && !code && !searchParams.get('error')) {
    return NextResponse.redirect(`${origin}/auth/confirm${next !== '/' ? `?next=${encodeURIComponent(next)}` : ''}`)
  }

  let failed = false
  let accessToken: string | undefined
  if (tokenHash && type) {
    const { data, error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type })
    failed = Boolean(error)
    accessToken = data?.session?.access_token
  } else if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    failed = Boolean(error)
    accessToken = data?.session?.access_token
  } else if (searchParams.get('error')) {
    failed = true
  }
  if (!failed && isRecoverySession(accessToken)) next = RESET_PATH
  // primo accesso: profilo senza nome, si va al profilo dove parte il modulo dei dati
  if (!failed && next !== RESET_PATH) {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: prof } = await supabase.from('profiles').select('display_name').eq('id', user.id).maybeSingle()
      if (!prof?.display_name) next = '/profilo'
    }
  }
  cookieStore.delete(AFTER_COOKIE)

  // Link scaduto o già usato: per la password mostriamo la pagina che
  // permette di chiederne uno nuovo, altrimenti si torna alla home.
  if (failed) {
    return NextResponse.redirect(next === RESET_PATH ? `${origin}${RESET_PATH}?link=scaduto` : `${origin}/`)
  }
  return NextResponse.redirect(`${origin}${next}`)
}
