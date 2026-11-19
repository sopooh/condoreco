'use client'

import { useEffect, useRef, useTransition } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { navStart, navEnd } from '@/lib/navPending'

// Aggiorna i parametri dell'URL (filtri delle liste) senza far saltare lo scroll.
// La navigazione gira in una transition: finché i dati non arrivano il loader
// del condor resta visibile (vedi useNavPending).
export function useParamNav() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  const tracked = useRef(false)

  useEffect(() => {
    if (isPending && !tracked.current) { tracked.current = true; navStart() }
    if (!isPending && tracked.current) { tracked.current = false; navEnd() }
  }, [isPending])
  useEffect(() => () => { if (tracked.current) { tracked.current = false; navEnd() } }, [])

  function setParams(patch) {
    const params = new URLSearchParams(searchParams.toString())
    Object.entries(patch).forEach(([k, v]) => (v == null || v === '' ? params.delete(k) : params.set(k, String(v))))
    const qs = params.toString()
    startTransition(() => router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false }))
  }
  return { searchParams, setParams, isPending }
}
