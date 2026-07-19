import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Gate server-side per /admin (richiede login + profiles.role === 'admin'),
// /condominio/[id] (vecchia area privata, in dismissione — richiede login +
// profiles.role 'condoranker'/'admin' + una recensione attiva su quell'edificio)
// e /edificio/[id]/condominio (nuova area, sostituisce /condominio/[id]:
// richiede login + una riga in condo_members per quell'edificio, unica fonte
// di verità per l'accesso — non più profiles.role né reviews). Il percorso
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

  const condoMatch = request.nextUrl.pathname.match(/^\/condominio\/([^/]+)/)
  if (condoMatch) {
    // 'condoranker' = residente, 'admin' = moderatore del sito (accesso
    // completo già altrove). Escluso solo 'condoranked' (amministratore di
    // condominio professionista, non un residente).
    if (profile?.role !== 'condoranker' && profile?.role !== 'admin') {
      return NextResponse.redirect(new URL('/', request.url))
    }
    const buildingId = condoMatch[1]
    const { data: residency } = await supabase
      .from('reviews')
      .select('id')
      .eq('user_id', user.id)
      .eq('building_id', buildingId)
      .neq('resident_type', 'former_resident')
      .limit(1)
      .maybeSingle()
    if (!residency) {
      return NextResponse.redirect(new URL('/', request.url))
    }
    return response
  }

  // Nuova area condominio: /edificio/[id]/condominio e la sua vista calendario.
  // Esclude di proposito /edificio/[id]/condominio/verifica (vedi commento sopra).
  const edificioCondoMatch = request.nextUrl.pathname.match(/^\/edificio\/([^/]+)\/condominio(?:\/calendario)?$/)
  if (edificioCondoMatch) {
    const buildingId = edificioCondoMatch[1]
    const { data: membership } = await supabase
      .from('condo_members')
      .select('id')
      .eq('building_id', buildingId)
      .eq('user_id', user.id)
      .maybeSingle()
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
    '/condominio/:path*',
    '/edificio/:id/condominio',
    '/edificio/:id/condominio/calendario',
  ],
}
