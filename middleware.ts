import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Gate server-side per /admin (richiede login + profiles.role === 'admin') e
// per /condominio/[id] (richiede login + profiles.role 'condoranker' o
// 'admin' + una recensione attiva, non former_resident, su quello specifico
// edificio — esclude solo 'condoranked', amministratore di condominio
// professionista).
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

  return response
}

export const config = {
  matcher: ['/admin/:path*', '/condominio/:path*'],
}
