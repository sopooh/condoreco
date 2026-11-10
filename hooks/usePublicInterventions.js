import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

// Interventi programmati visibili a tutti i membri (solo titolo, categoria,
// data, orario, luogo) tramite la funzione condo_public_interventions.
// from/to: 'YYYY-MM-DD'.
export function usePublicInterventions(buildingId, from, to) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!buildingId || !from || !to) return
    let cancelled = false
    const supabase = createClient()
    supabase.rpc('condo_public_interventions', { p_building_id: buildingId, p_from: from, p_to: to })
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) console.error('[usePublicInterventions] rpc failed', error)
        setItems(data || [])
        setLoading(false)
      })
    return () => { cancelled = true }
  }, [buildingId, from, to])

  return { items, loading }
}
