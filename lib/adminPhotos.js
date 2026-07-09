'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

// Hook admin: foto con qualsiasi status, batch approve/reject. Vive in un
// file a parte da lib/photos.js perché usa hook React: lib/photos.js è
// importato anche da app/edificio/[id]/page.jsx (Server Component) per
// photoUrl(), e un solo hook lì dentro forzerebbe l'intero modulo — incluso
// quell'import server-side — a diventare Client Component.
export function useAdminPhotos(initialStatus = 'pending') {
  const [photos, setPhotos] = useState([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState(initialStatus)

  const load = useCallback(async (status) => {
    const s = status ?? statusFilter
    setLoading(true)
    const supabase = createClient()
    let q = supabase
      .from('photos')
      .select('*, buildings(address, street_number, city)')
      .order('created_at', { ascending: true })
    if (s !== 'all') q = q.eq('status', s)
    const { data } = await q
    setPhotos(data || [])
    setLoading(false)
  }, [statusFilter])

  useEffect(() => { load() }, [load])

  async function approve(photoId) {
    const supabase = createClient()
    await supabase.from('photos').update({ status: 'approved' }).eq('id', photoId)
    setPhotos((p) => p.filter((x) => x.id !== photoId))
  }

  async function reject(photoId) {
    const supabase = createClient()
    await supabase.from('photos').update({ status: 'rejected' }).eq('id', photoId)
    setPhotos((p) => p.filter((x) => x.id !== photoId))
  }

  async function setCover(photoId) {
    const supabase = createClient()
    await supabase.rpc('set_cover_override', { p_photo_id: photoId })
    load(statusFilter)
  }

  function changeFilter(s) {
    setStatusFilter(s)
    load(s)
  }

  return { photos, loading, approve, reject, setCover, statusFilter, changeFilter }
}
