import { createClient } from '@/lib/supabase/client'

export async function getProfile(userId) {
  const supabase = createClient()
  return supabase
    .from('profiles')
    .select('id, display_name, avatar_url, role, zone, verified')
    .eq('id', userId)
    .maybeSingle()
}

export async function upsertProfile({ id, username, avatarId, photoUrl, role, zone, verified }) {
  const supabase = createClient()
  return supabase.from('profiles').upsert({
    id,
    display_name: username || null,
    // photoUrl (data URI) ha precedenza su avatarId (animale)
    avatar_url: photoUrl || (avatarId ? `/avatars/${avatarId}.png` : null),
    role: role || 'condoranker',
    zone: zone || null,
    verified: !!verified,
  })
}

// "Vivo qui": registra (o aggiorna) l'abitazione attuale con i dati raccolti
export async function saveResidence(userId, buildingId, data = {}) {
  const supabase = createClient()
  return supabase
    .from('user_residences')
    .upsert({ user_id: userId, building_id: buildingId, status: 'current', ...data }, { onConflict: 'user_id,building_id' })
    .select('building_id')
}

// Cambio stato dal profilo: aggiorna sia user_residences (upsert, cosi vale
// anche per edifici noti solo da una recensione) sia le recensioni.
async function setResidenceStatus(supabase, userId, buildingId, status) {
  const { error } = await supabase
    .from('user_residences')
    .upsert({ user_id: userId, building_id: buildingId, status }, { onConflict: 'user_id,building_id' })
  if (error) console.error('[profile] user_residences status update failed', error)
  return error
}

export async function markBuildingAsFormerHome(buildingId, userId) {
  const supabase = createClient()
  const resError = await setResidenceStatus(supabase, userId, buildingId, 'past')
  const res = await supabase.from('reviews').update({ resident_type: 'former_resident' })
    .eq('user_id', userId).eq('building_id', buildingId)
    .in('resident_type', ['resident', 'tenant', 'owner'])
  return res.error ? res : { ...res, error: resError }
}

export async function markBuildingAsCurrentHome(buildingId, userId) {
  const supabase = createClient()
  const resError = await setResidenceStatus(supabase, userId, buildingId, 'current')
  const res = await supabase.from('reviews').update({ resident_type: 'resident' })
    .eq('user_id', userId).eq('building_id', buildingId)
    .eq('resident_type', 'former_resident')
  return res.error ? res : { ...res, error: resError }
}
