import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useSession, useSessionReady } from '@/components/providers/SessionProvider'
import { useViewAs } from '@/hooks/useViewAs'

// Ruolo condominiale dell'utente corrente per un building.
// Cache a livello di modulo: piu' componenti possono usare questo hook
// sullo stesso building senza ripetere la query.
const roleCache = new Map() // chiave: `${buildingId}:${userId}` -> 'admin' | 'resident' | null
const pending = new Map()   // richieste in corso, per non duplicarle
const ERROR = Symbol('role-error')

async function fetchRole(buildingId, userId) {
  const cacheKey = `${buildingId}:${userId}`
  if (roleCache.has(cacheKey)) return roleCache.get(cacheKey)

  // Se un'altra istanza dell'hook sta gia' chiedendo, aspetta quella
  if (pending.has(cacheKey)) return pending.get(cacheKey)

  const supabase = createClient()
  const promise = supabase
    .from('condo_members')
    .select('role')
    .eq('building_id', buildingId)
    .eq('user_id', userId)
    .maybeSingle()
    .then(({ data, error }) => {
      // Fail-closed di proposito (role null = non membro), ma logga: un
      // errore di query altrimenti si confonderebbe silenziosamente con
      // "non e' membro" per un utente che invece ha una riga in condo_members
      // (vedi stesso pattern in middleware.ts).
      pending.delete(cacheKey)
      if (error) {
        // errore di rete/sessione: NON e' "non membro". Non si mette in cache
        // e si segnala, cosi' il gate non manda alla verifica per sbaglio.
        console.error('[useCondoRole] condo_members check failed', error.message)
        return ERROR
      }
      const role = data?.role ?? null // null = non membro
      roleCache.set(cacheKey, role)
      return role
    })

  pending.set(cacheKey, promise)
  return promise
}

export function useCondoRole(buildingId) {
  const session = useSession()
  const ready = useSessionReady()
  const userId = session?.user?.id ?? null
  // il ruolo e' legato alla coppia building+utente per cui e' stato letto:
  // finche' non corrisponde a quella attuale si e' ancora "in caricamento"
  // (evita che un null letto prima del login sembri "non membro").
  const key = `${buildingId}:${userId}`
  const [state, setState] = useState({ key: null, role: undefined })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    if (!buildingId || !ready) return
    if (!userId) { setState({ key, role: null }); return }

    let active = true
    let retry
    fetchRole(buildingId, userId).then((role) => {
      if (!active) return
      if (role === ERROR) {
        setState({ key, role: 'error' })
        retry = setTimeout(() => setAttempt((n) => n + 1), 2000)
        return
      }
      setState({ key, role })
    })

    return () => { active = false; clearTimeout(retry) }
  }, [buildingId, userId, ready, key, attempt])

  const { viewAs } = useViewAs()
  const real = state.key === key && ready ? state.role : undefined
  // anteprima "vedi come" (solo admin del sito): da Recoer o Recofixer
  // l'amministratore vede il condominio come un condomino qualsiasi
  const role = real === 'admin' && (viewAs === 'recoer' || viewAs === 'recofixer') ? 'resident' : real
  return {
    role: role === 'error' ? undefined : role,  // 'admin' | 'resident' | null | undefined
    userId,
    isCondoAdmin: role === 'admin',
    isMember: role === 'admin' || role === 'resident',
    loading: role === undefined || role === 'error',
    error: role === 'error',
  }
}

// Da chiamare se il ruolo cambia (es. admin assegnato da un pannello):
// invalida la cache e al prossimo mount l'hook rilegge dal database.
export function invalidateRoleCache(buildingId, userId) {
  roleCache.delete(`${buildingId}:${userId}`)
}
