'use client'

// PostHog (cloud UE, Francoforte) caricato SOLO dopo il consenso esplicito.
// - Le chiamate passano dal nostro dominio (/ingest, rewrite in next.config.ts).
// - Nell'area privata (condominio, profilo, admin, notifiche) niente
//   registrazione di sessione e il testo degli elementi cliccati viene tolto.
// - Identifichiamo l'utente solo con l'id Supabase (mai email o nome).

import { useEffect, useRef, useSyncExternalStore } from 'react'
import { usePathname } from 'next/navigation'
import posthog from 'posthog-js'
import { useSession } from '@/components/providers/SessionProvider'
import { consentServerSnapshot, consentSnapshot, subscribeConsent } from '@/lib/consent'

const KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY

const PRIVATE_PATHS = [
  /^\/edificio\/[^/]+\/condominio/,
  /^\/profilo/,
  /^\/admin/,
  /^\/notifiche/,
  /^\/reimposta-password/,
  /^\/auth/,
]
const isPrivate = (path) => PRIVATE_PATHS.some((re) => re.test(path || ''))

let initialized = false

function stripText(event) {
  if (!event || !isPrivate(window.location.pathname)) return event
  const p = event.properties || {}
  delete p.$el_text
  if (typeof p.$elements_chain === 'string') {
    p.$elements_chain = p.$elements_chain.replace(/text="(?:[^"\\]|\\.)*"/g, '')
  }
  if (Array.isArray(p.$elements)) {
    p.$elements = p.$elements.map((el) => { const copy = { ...el }; delete copy.$el_text; return copy })
  }
  return event
}

function start() {
  if (!KEY) return
  if (initialized) {
    posthog.opt_in_capturing()
    return
  }
  posthog.init(KEY, {
    api_host: '/ingest',
    ui_host: 'https://eu.posthog.com',
    defaults: '2026-01-30',
    person_profiles: 'identified_only',
    disable_session_recording: true, // accesa per route, vedi sotto
    session_recording: { maskAllInputs: true, maskTextSelector: '[data-ph-mask]' },
    before_send: stripText,
  })
  initialized = true
}

function clearPostHogStorage() {
  try {
    Object.keys(window.localStorage)
      .filter((k) => k.startsWith('ph_'))
      .forEach((k) => window.localStorage.removeItem(k))
  } catch {}
  document.cookie.split(';').map((c) => c.split('=')[0].trim())
    .filter((n) => n.startsWith('ph_'))
    .forEach((n) => { document.cookie = `${n}=; Max-Age=0; path=/` })
}

function stop() {
  if (!initialized) return
  posthog.stopSessionRecording()
  posthog.reset()
  posthog.opt_out_capturing()
  clearPostHogStorage()
}

export default function AnalyticsProvider({ children }) {
  const consent = useSyncExternalStore(subscribeConsent, consentSnapshot, consentServerSnapshot)
  const allowed = Boolean(KEY) && consent === 'granted'
  const pathname = usePathname()
  const session = useSession()
  const identifiedRef = useRef(null)

  useEffect(() => {
    if (!KEY) return
    if (consent === 'unknown') return
    if (allowed) start()
    else { stop(); identifiedRef.current = null }
  }, [allowed, consent])

  // Registrazione di sessione solo fuori dall'area privata.
  useEffect(() => {
    if (!allowed || !initialized) return
    if (isPrivate(pathname)) posthog.stopSessionRecording()
    else posthog.startSessionRecording()
  }, [allowed, pathname])

  useEffect(() => {
    if (!allowed || !initialized) return
    const uid = session?.user?.id || null
    if (uid && identifiedRef.current !== uid) {
      posthog.identify(uid)
      identifiedRef.current = uid
    } else if (!uid && identifiedRef.current) {
      posthog.reset()
      identifiedRef.current = null
    }
  }, [allowed, session])

  return children
}
