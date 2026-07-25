import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Gate server-side per /admin (richiede login + profiles.role === 'admin') e
// /edificio/[id]/condominio (richiede solo login: chi non è ancora membro
// deve comunque raggiungere la pagina, che lato client (CondoMemberGate)
// lo reindirizza al wizard di verifica invece di negargli l'accesso — non
// possono coesistere con un redirect server-side che lo blocca prima).
// La verifica reale dell'appartenenza (condo_members) resta comunque
// invariata: RLS sulle tabelle events/messages/polls continua a restituire
// solo dati vuoti a un non membro, quindi non c'è fuga di dati — qui si
// perde solo il redirect istantaneo pre-HTML per chi è loggato ma non
// membro, non la protezione stessa.
// Per /admin: le pagine restano client-heavy (query dirette al browser
// client), ma senza questo middleware un utente non autorizzato vedrebbe
// comunque la UI per un istante prima che il fetch client-side la nasconda —
// qui il redirect avviene prima ancora che l'HTML raggiunga il browser.
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
  // Il check di login sopra (righe 38-40) è già sufficiente qui — la verifica
  // dell'appartenenza è delegata a CondoMemberGate lato client (vedi commento
  // in testa al file).
  return response
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/edificio/:id/condominio',
    '/edificio/:id/condominio/calendario',
  ],
}
