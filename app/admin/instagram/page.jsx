'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useSession } from '@/components/providers/SessionProvider'
import InstagramStudio from '@/components/admin/instagram/InstagramStudio.jsx'

// Gate server-side in middleware.ts (matcher /admin/:path*). Qui solo la
// seconda linea di difesa + stato di caricamento, come in /admin.
export default function InstagramStudioPage() {
  const session = useSession()
  const [role, setRole] = useState(undefined)

  useEffect(() => {
    if (!session) return
    const supabase = createClient()
    supabase.from('profiles').select('role').eq('id', session.user.id).single()
      .then(({ data, error }) => {
        if (error) console.error('[instagram] role', error)
        setRole(data?.role ?? null)
      })
  }, [session])

  if (!session || role === undefined) {
    return <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-4)', fontSize: 14 }}>Verifica accesso...</div>
  }
  if (role !== 'admin') {
    return (
      <div style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
        <p style={{ fontSize: 15, color: 'var(--text-2)' }}>Accesso non autorizzato.</p>
        <Link href="/" className="btn btn-primary">Torna alla homepage</Link>
      </div>
    )
  }
  return <InstagramStudio />
}
