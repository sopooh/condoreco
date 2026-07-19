'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

// Lista amministratori per l'autocomplete del flusso "aggiungi condominio".
// Versione ridotta rispetto all'originale condorank: niente fallback mock
// (qui il client Supabase è sempre reale) e niente buildingsByAdmin, non
// usato da AddBuildingFlow.
export function useAdmins({ city } = {}) {
  const [admins, setAdmins] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    const supabase = createClient()
    async function load() {
      setLoading(true)
      let req = supabase.from('admin_scores').select('id, name, city, building_count')
      if (city) req = req.eq('city', city)
      const { data } = await req
      if (active) {
        setAdmins(data || [])
        setLoading(false)
      }
    }
    load()
    return () => { active = false }
  }, [city])

  return { admins, loading }
}
