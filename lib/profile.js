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

export async function markBuildingAsFormerHome(buildingId, userId) {
  const supabase = createClient()
  return supabase.from('reviews').update({ resident_type: 'former_resident' })
    .eq('user_id', userId).eq('building_id', buildingId)
    .in('resident_type', ['resident', 'tenant', 'owner'])
}

export async function markBuildingAsCurrentHome(buildingId, userId) {
  const supabase = createClient()
  return supabase.from('reviews').update({ resident_type: 'resident' })
    .eq('user_id', userId).eq('building_id', buildingId)
    .eq('resident_type', 'former_resident')
}
