'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

// Condomini clienti del Recofixer: attuali ed ex clienti.
export function useSupplierBuildings(enabled) {
  const [state, setState] = useState({ current: [], past: [], loading: true })
  useEffect(() => {
    if (!enabled) return
    let off = false
    ;(async () => {
      const supabase = createClient()
      const { data: rows, error } = await supabase.rpc('supplier_buildings')
      if (error) console.error('[useSupplierBuildings]', error)
      const ids = (rows || []).map((r) => r.building_id)
      let map = {}
      if (ids.length) {
        const { data: bs } = await supabase.from('building_scores').select('*').in('id', ids)
        map = Object.fromEntries((bs || []).map((b) => [b.id, b]))
      }
      if (off) return
      setState({
        current: (rows || []).filter((r) => r.is_current && map[r.building_id]).map((r) => map[r.building_id]),
        past: (rows || []).filter((r) => !r.is_current && map[r.building_id]).map((r) => map[r.building_id]),
        loading: false,
      })
    })()
    return () => { off = true }
  }, [enabled])
  return state
}
