'use client'

import { createContext, useContext, useEffect, useRef, useState } from 'react'
import posthog from 'posthog-js'
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
  const identifiedUserId = useRef<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session)
        setReady(true)

        const isNewIdentity = Boolean(session?.user && identifiedUserId.current !== session.user.id)
        if (isNewIdentity && session?.user) {
          if (identifiedUserId.current) posthog.reset()

          posthog.identify(session.user.id, {
            email: session.user.email,
          })
          identifiedUserId.current = session.user.id
        }

        if (event === 'SIGNED_IN' && isNewIdentity) {
          posthog.capture('user_signed_in')
        } else if (event === 'SIGNED_OUT') {
          posthog.reset()
          identifiedUserId.current = null
        }
      }
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
