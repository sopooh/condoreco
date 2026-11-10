'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Session } from '@supabase/supabase-js'

const SessionContext = createContext<Session | null>(null)
// false finche' Supabase non ha letto la sessione salvata (INITIAL_SESSION):
// distingue "non ancora noto" da "utente non loggato".
const SessionReadyContext = createContext<boolean>(false)

export function SessionProvider({
  initialSession = null,
  children,
}: {
  initialSession?: Session | null
  children: React.ReactNode
}) {
  const [session, setSession] = useState(initialSession)
  const [ready, setReady] = useState(initialSession != null)
  const supabase = createClient()

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => { setSession(session); setReady(true) }
    )
    return () => subscription.unsubscribe()
  }, [supabase])

  return (
    <SessionReadyContext.Provider value={ready}>
      <SessionContext.Provider value={session}>
        {children}
      </SessionContext.Provider>
    </SessionReadyContext.Provider>
  )
}

export const useSession = () => useContext(SessionContext)
export const useSessionReady = () => useContext(SessionReadyContext)
