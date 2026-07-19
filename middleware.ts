import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Gate server-side per /admin (richiede login + profiles.role === 'admin') e
// /edificio/[id]/condominio (richiede login + una riga in condo_members per
// quell'edificio, unica fonte di verità per l'accesso). Il percorso
// /edificio/[id]/condominio/verifica resta fuori da questo gate perché deve
// restare raggiungibile da chi non è ancora membro (è l'unico modo per
// diventarlo).
// Le pagine restano client-heavy (query dirette al browser client), ma senza
// questo middleware un utente non autorizzato vedrebbe comunque la UI per un
// istante prima che il fetch client-side la nasconda — qui il redirect
// avviene prima ancora che l'HTML raggiunga il browser.
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (request.nextUrl.pathname.startsWith('/admin')) {
    if (profile?.role !== 'admin') {
      return NextResponse.redirect(new URL('/', request.url))
    }
    return response
  }

  // Area condominio: /edificio/[id]/condominio e la sua vista calendario.
  // Esclude di proposito /edificio/[id]/condominio/verifica (vedi commento sopra).
  const edificioCondoMatch = request.nextUrl.pathname.match(/^\/edificio\/([^/]+)\/condominio(?:\/calendario)?$/)
  if (edificioCondoMatch) {
    const buildingId = edificioCondoMatch[1]
    const { data: membership, error: membershipError } = await supabase
      .from('condo_members')
      .select('role')
      .eq('building_id', buildingId)
      .eq('user_id', user.id)
      .maybeSingle()
    // Fail-closed di proposito, ma logga: un errore di query (es. colonna
    // sbagliata) altrimenti si confonderebbe silenziosamente con "non membro".
    if (membershipError) {
      console.error('[middleware] condo_members check failed', membershipError.message)
    }
    if (!membership) {
      return NextResponse.redirect(new URL('/', request.url))
    }
    return response
  }

  return response
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/edificio/:id/condominio',
    '/edificio/:id/condominio/calendario',
  ],
}
