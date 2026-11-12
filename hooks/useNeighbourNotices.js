import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useSession } from '@/components/providers/SessionProvider'
import { fetchMyMillesimiVerification, submitMillesimiVerification } from '@/lib/millesimiVerification'

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
  const [myUnit, setMyUnit] = useState(undefined)   // { floor, millesimi, tenure, verification }
  const [floorCounts, setFloorCounts] = useState({})

  const load = useCallback(async () => {
    if (!userId || !buildingId) return
    const supabase = createClient()
    const [{ data: me }, { data: counts }, verification] = await Promise.all([
      supabase.from('condo_members').select('floor, millesimi, tenure').eq('building_id', buildingId).eq('user_id', userId).maybeSingle(),
      supabase.rpc('condo_floor_counts', { p_building: buildingId }),
      fetchMyMillesimiVerification(buildingId, userId),
    ])
    setMyFloor(me?.floor ?? null)
    // millesimi in condo_members = solo quelli verificati; verification = ultima richiesta (in attesa o respinta)
    setMyUnit(me ? { floor: me.floor ?? null, millesimi: me.millesimi ?? null, tenure: me.tenure ?? null, verification } : null)
    setFloorCounts(Object.fromEntries((counts || []).map((r) => [r.floor, r.residents])))
  }, [userId, buildingId])

  useEffect(() => { load() }, [load])

  async function saveFloor(floor) {
    return saveUnit({ floor })
  }

  // piano e titolo (proprietario/inquilino) del residente. I millesimi non si
  // scrivono qui: passano dalla verifica del documento (proof).
  async function saveUnit({ floor = null, tenure = null, proof = null }) {
    const { error } = await createClient().rpc('set_my_unit', {
      p_building: buildingId, p_floor: normalizeFloor(floor), p_millesimi: null, p_tenure: tenure,
    })
    if (error) {
      console.error('[set_my_unit]', error.message)
      return { error: 'Non riesco a salvare. Riprova.' }
    }
    if (proof) {
      const res = await submitMillesimiVerification({ buildingId, userId, ...proof })
      if (res.error) { await load(); return res }
    }
    await load()
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

  return { myFloor, myUnit, floorCounts, saveFloor, saveUnit, sendNotice }
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

// "12,345" / "12.345" / "12" -> 12.345; null se non valido (0 < x <= 1000)
export function parseMillesimi(str) {
  const n = Number(String(str ?? '').trim().replace(',', '.'))
  if (!Number.isFinite(n) || n <= 0 || n > 1000) return null
  return Math.round(n * 1000) / 1000
}
