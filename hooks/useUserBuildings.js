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

      const { data: reviews } = await supabase
        .from('reviews')
        .select('resident_type, building_id')
        .eq('user_id', userId)

      if (!reviews?.length) {
        setCurrent([])
        setPast([])
        setReviewCount(0)
        return
      }

      const ids = [...new Set(reviews.map(r => r.building_id).filter(Boolean))]
      const { data: buildings } = await supabase
        .from('building_scores')
        .select('*')
        .in('id', ids)

      const buildingMap = Object.fromEntries(buildings?.map(b => [b.id, b]) || [])

      // Se per un edificio esiste almeno una recensione "former_resident" → ex-abitazione
      // altrimenti → attuale. L'azione "Lascio" aggiorna la recensione esistente.
      const statusMap = {}
      reviews.forEach(r => {
        if (!statusMap[r.building_id]) statusMap[r.building_id] = 'current'
        if (r.resident_type === 'former_resident') statusMap[r.building_id] = 'past'
      })

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
      setReviewCount(reviews.length)
    } finally {
      // finally, non solo dopo il "return" felice: se una query lancia
      // un'eccezione, loading non deve restare bloccato a true per sempre
      // (una pagina come /condominio/[id] ci resta agganciata per l'accesso).
      setLoading(false)
    }
  }, [userId])

  useEffect(() => { load() }, [load])

  const refetch = () => load()

  return { current, past, loading, refetch, reviewCount }
}
