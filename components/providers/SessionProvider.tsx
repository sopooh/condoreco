'use client'

import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import posthog from 'posthog-js'
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
  const identifiedUserId = useRef<string | null>(null)

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => { setSession(session); setReady(true) }
    )
    return () => subscription.unsubscribe()
  }, [supabase])

  // This runs after Supabase restores an existing session as well as after sign-in.
  // Its UUID is stable and lets browser events and exception autocapture share a person.
  useEffect(() => {
    const user = session?.user
    const posthogConfigured = Boolean(
      process.env.NEXT_PUBLIC_POSTHOG_KEY && process.env.NEXT_PUBLIC_POSTHOG_HOST
    )

    if (!user) {
      if (identifiedUserId.current && posthogConfigured) posthog.reset()
      identifiedUserId.current = null
      return
    }

    if (identifiedUserId.current === user.id) return
    if (identifiedUserId.current && posthogConfigured) posthog.reset()

    if (posthogConfigured) {
      const name = user.user_metadata.full_name ?? user.user_metadata.name
      posthog.identify(user.id, {
        ...(user.email ? { email: user.email } : {}),
        ...(typeof name === 'string' ? { name } : {}),
      })
    }
    identifiedUserId.current = user.id
  }, [session?.user])

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
