import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useSession } from '@/components/providers/SessionProvider'

export const NOTICE_KINDS = [
  { value: 'elevator_doors', label: "Porte dell'ascensore aperte", short: 'Porte ascensore', icon: 'elevator',
    message: (floor) => `Le porte dell'ascensore sono rimaste aperte${floor ? ` al piano ${floor}` : ''}. Chi è più vicino può chiuderle? Grazie!` },
  { value: 'main_door', label: 'Portone o cancello aperto', short: 'Portone aperto', icon: 'door',
    message: () => 'Il portone (o il cancello) è rimasto aperto. Chi passa può chiuderlo? Grazie!' },
  { value: 'water_leak', label: "Perdita d'acqua", short: 'Perdita acqua', icon: 'drop',
    message: (floor) => `C'è una perdita d'acqua${floor ? ` al piano ${floor}` : ''}. Controllate i vostri appartamenti, per favore.` },
  { value: 'noise', label: 'Rumori', short: 'Rumori', icon: 'sound',
    message: () => 'Si sentono rumori forti. Potete controllare se arrivano da casa vostra? Grazie.' },
  { value: 'smell', label: 'Odore di gas o di bruciato', short: 'Odore gas/bruciato', icon: 'flame',
    message: (floor) => `Si sente odore di gas o di bruciato${floor ? ` al piano ${floor}` : ''}. Controllate i fornelli e le prese.` },
  { value: 'other', label: 'Altro', short: 'Altro', icon: 'megaphone', message: () => '' },
]

// Piano del residente + invio degli avvisi ai vicini.
export function useNeighbourNotices(buildingId) {
  const session = useSession()
  const userId = session?.user?.id ?? null
  const [myFloor, setMyFloor] = useState(undefined) // undefined = in caricamento, null = non indicato
  const [floorCounts, setFloorCounts] = useState({})

  const load = useCallback(async () => {
    if (!userId || !buildingId) return
    const supabase = createClient()
    const [{ data: me }, { data: counts }] = await Promise.all([
      supabase.from('condo_members').select('floor').eq('building_id', buildingId).eq('user_id', userId).maybeSingle(),
      supabase.rpc('condo_floor_counts', { p_building: buildingId }),
    ])
    setMyFloor(me?.floor ?? null)
    setFloorCounts(Object.fromEntries((counts || []).map((r) => [r.floor, r.residents])))
  }, [userId, buildingId])

  useEffect(() => { load() }, [load])

  async function saveFloor(floor) {
    const value = normalizeFloor(floor)
    const { error } = await createClient().from('condo_members')
      .update({ floor: value }).eq('building_id', buildingId).eq('user_id', userId).select('floor')
    if (error) return { error: 'Non riesco a salvare il piano. Riprova.' }
    setMyFloor(value)
    load()
    return { error: null }
  }

  async function sendNotice({ kind, message, target, floor }) {
    const supabase = createClient()
    const { data, error } = await supabase.rpc('send_condo_notice', {
      p_building: buildingId, p_kind: kind, p_message: message, p_target: target, p_floor: target === 'floor' ? normalizeFloor(floor) : null,
    })
    if (error) {
      const msg = /too many/.test(error.message) ? 'Hai inviato molti avvisi nell\'ultima ora. Riprova più tardi.' : 'Non riesco a inviare l\'avviso. Riprova.'
      return { error: msg }
    }
    const row = Array.isArray(data) ? data[0] : data
    // email: best effort, l'avviso in app e' gia' partito
    if (row?.notice_id && row.recipients > 0) {
      supabase.functions.invoke('notify-notice', { body: { notice_id: row.notice_id } }).catch(() => {})
    }
    return { error: null, recipients: row?.recipients ?? 0 }
  }

  return { myFloor, floorCounts, saveFloor, sendNotice }
}

export function normalizeFloor(f) {
  const s = String(f ?? '').trim().toUpperCase()
  if (!s) return null
  if (['T', 'PT', 'PIANO TERRA', 'TERRA', '0'].includes(s)) return 'T'
  return s.replace(/°|º/g, '')
}

export function floorLabel(f) {
  if (f == null) return ''
  return f === 'T' ? 'piano terra' : `piano ${f}`
}
