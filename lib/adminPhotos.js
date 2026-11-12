'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { revalidatePublic } from '@/lib/revalidate'

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

  const buildingOf = (photoId) => photos.find((x) => x.id === photoId)?.building_id

  async function setStatus(photoId, status) {
    const supabase = createClient()
    const { data, error } = await supabase.from('photos').update({ status }).eq('id', photoId).select('id, building_id')
    if (error || !data?.length) return { error: 'Operazione non riuscita. Riprova.' }
    // la foto rifiutata non può restare copertina
    if (status === 'rejected') await supabase.rpc('recalculate_cover', { p_building_id: data[0].building_id })
    await revalidatePublic({ buildings: [data[0].building_id] })
    if (statusFilter !== 'all') setPhotos((p) => p.filter((x) => x.id !== photoId))
    else setPhotos((p) => p.map((x) => (x.id === photoId ? { ...x, status } : x)))
    return { error: null }
  }

  const approve = (photoId) => setStatus(photoId, 'approved')
  const reject = (photoId) => setStatus(photoId, 'rejected')

  async function setCover(photoId) {
    const supabase = createClient()
    await supabase.rpc('set_cover_override', { p_photo_id: photoId })
    await revalidatePublic({ buildings: [buildingOf(photoId)] })
    load(statusFilter)
  }

  function changeFilter(s) {
    setStatusFilter(s)
    load(s)
  }

  return { photos, loading, approve, reject, setCover, statusFilter, changeFilter }
}
