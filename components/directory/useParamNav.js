'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'

// Aggiorna i parametri dell'URL (filtri delle liste) senza far saltare lo scroll.
export function useParamNav() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  function setParams(patch) {
    const params = new URLSearchParams(searchParams.toString())
    Object.entries(patch).forEach(([k, v]) => (v == null || v === '' ? params.delete(k) : params.set(k, String(v))))
    const qs = params.toString()
    router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
  }
  return { searchParams, setParams }
}
