import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

export function useUserBuildings(userId) {
  const [current, setCurrent] = useState([])
  const [past, setPast] = useState([])
  const [reviewCount, setReviewCount] = useState(0)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!userId) { setLoading(false); return }
    setLoading(true)
    try {
      const supabase = createClient()

      // Due fonti: le abitazioni dichiarate con "Vivo qui" (user_residences)
      // e le recensioni (resident_type). Lo stato in user_residences vince,
      // perche' e' quello che l'utente aggiorna esplicitamente.
      const [{ data: reviews, error: reviewsError }, { data: residences, error: residencesError }] = await Promise.all([
        supabase.from('reviews').select('resident_type, building_id').eq('user_id', userId),
        supabase.from('user_residences').select('building_id, status').eq('user_id', userId),
      ])
      if (reviewsError) console.error('[useUserBuildings] reviews failed', reviewsError)
      if (residencesError) console.error('[useUserBuildings] user_residences failed', residencesError)

      // Se per un edificio esiste almeno una recensione "former_resident" → ex-abitazione
      // altrimenti → attuale. Poi user_residences sovrascrive.
      const statusMap = {}
      ;(reviews || []).forEach(r => {
        if (!r.building_id) return
        if (!statusMap[r.building_id]) statusMap[r.building_id] = 'current'
        if (r.resident_type === 'former_resident') statusMap[r.building_id] = 'past'
      })
      ;(residences || []).forEach(r => {
        statusMap[r.building_id] = r.status === 'past' ? 'past' : 'current'
      })

      const ids = Object.keys(statusMap)
      if (!ids.length) {
        setCurrent([])
        setPast([])
        setReviewCount(reviews?.length || 0)
        return
      }

      const { data: buildings, error: buildingsError } = await supabase
        .from('building_scores')
        .select('*')
        .in('id', ids)
      if (buildingsError) console.error('[useUserBuildings] building_scores failed', buildingsError)

      const buildingMap = Object.fromEntries(buildings?.map(b => [b.id, b]) || [])

      const currentList = []
      const pastList = []
      Object.entries(statusMap).forEach(([id, status]) => {
        const b = buildingMap[id]
        if (!b) return
        if (status === 'past') pastList.push(b)
        else currentList.push(b)
      })

      setCurrent(currentList)
      setPast(pastList)
      setReviewCount(reviews?.length || 0)
    } finally {
      // finally, non solo dopo il "return" felice: se una query lancia
      // un'eccezione, loading non deve restare bloccato a true per sempre
      // (ProfileClient.jsx resta agganciato a questo flag per la sua UI).
      setLoading(false)
    }
  }, [userId])

  useEffect(() => { load() }, [load])

  const refetch = () => load()

  return { current, past, loading, refetch, reviewCount }
}
