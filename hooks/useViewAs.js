import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useSession } from '@/components/providers/SessionProvider'

// "Vedi come": solo per gli admin del sito. Cambia l'interfaccia (Recoer,
// Amministratore, Recofixer) senza toccare il profilo né i permessi nel
// database: serve per controllare le pagine di ogni tipo di utente.

export const VIEW_AS = {
  recoer: { label: 'Recoer', sub: 'Condomino' },
  amministratore: { label: 'Amministratore', sub: 'Gestisce i condomini' },
  recofixer: { label: 'Recofixer', sub: 'Fornitore' },
}
const KEY = 'condoreco:view-as'
const EVENT = 'condoreco:view-as'

let siteAdminCache = { userId: null, value: false, promise: null }

function readStored() {
  try {
    const v = window.localStorage.getItem(KEY)
    return VIEW_AS[v] ? v : null
  } catch { return null }
}

async function isSiteAdmin(userId) {
  if (siteAdminCache.userId === userId && !siteAdminCache.promise) return siteAdminCache.value
  if (siteAdminCache.userId === userId && siteAdminCache.promise) return siteAdminCache.promise
  const promise = createClient().from('profiles').select('role').eq('id', userId).maybeSingle()
    .then(({ data }) => {
      siteAdminCache = { userId, value: data?.role === 'admin', promise: null }
      return siteAdminCache.value
    })
  siteAdminCache = { userId, value: false, promise }
  return promise
}

export function useViewAs() {
  const session = useSession()
  const userId = session?.user?.id ?? null
  const [canSwitch, setCanSwitch] = useState(false)
  const [stored, setStored] = useState(null)

  useEffect(() => {
    let active = true
    if (!userId) { setCanSwitch(false); return }
    isSiteAdmin(userId).then((v) => { if (active) setCanSwitch(v) })
    return () => { active = false }
  }, [userId])

  useEffect(() => {
    setStored(readStored())
    const sync = () => setStored(readStored())
    window.addEventListener(EVENT, sync)
    window.addEventListener('storage', sync)
    return () => { window.removeEventListener(EVENT, sync); window.removeEventListener('storage', sync) }
  }, [])

  const setViewAs = useCallback((v) => {
    try {
      if (v) window.localStorage.setItem(KEY, v)
      else window.localStorage.removeItem(KEY)
    } catch { /* ignore */ }
    window.dispatchEvent(new Event(EVENT))
  }, [])

  // null = vista reale, senza simulazioni
  const viewAs = canSwitch ? stored : null
  return { viewAs, setViewAs, canSwitch }
}
