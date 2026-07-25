import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useSession } from '@/components/providers/SessionProvider'

// Ruolo condominiale dell'utente corrente per un building.
// Cache a livello di modulo: piu' componenti possono usare questo hook
// sullo stesso building senza ripetere la query.
const roleCache = new Map() // chiave: `${buildingId}:${userId}` -> 'admin' | 'resident' | null
const pending = new Map()   // richieste in corso, per non duplicarle

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
      if (error) {
        console.error('[useCondoRole] condo_members check failed', error.message)
      }
      const role = data?.role ?? null // null = non membro
      roleCache.set(cacheKey, role)
      pending.delete(cacheKey)
      return role
    })

  pending.set(cacheKey, promise)
  return promise
}

export function useCondoRole(buildingId) {
  const session = useSession()
  const userId = session?.user?.id ?? null
  const [role, setRole] = useState(undefined) // undefined = in caricamento

  useEffect(() => {
    if (!buildingId) return
    if (!userId) { setRole(null); return }

    let active = true
    fetchRole(buildingId, userId).then((role) => {
      if (active) setRole(role)
    })

    return () => { active = false }
  }, [buildingId, userId])

  return {
    role,                              // 'admin' | 'resident' | null | undefined
    userId,
    isCondoAdmin: role === 'admin',
    isMember: role === 'admin' || role === 'resident',
    loading: role === undefined,
  }
}

// Da chiamare se il ruolo cambia (es. admin assegnato da un pannello):
// invalida la cache e al prossimo mount l'hook rilegge dal database.
export function invalidateRoleCache(buildingId, userId) {
  roleCache.delete(`${buildingId}:${userId}`)
}
