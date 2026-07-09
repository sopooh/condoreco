import { createClient } from '@/lib/supabase/client'

// Città reali (da building_scores), non l'elenco fisso di data/mockData.js
// del vecchio progetto — stesso principio del porting di Home/Cerca.
export async function getCities() {
  const supabase = createClient()
  const { data } = await supabase.from('building_scores').select('city')
  const cities = new Set()
  ;(data || []).forEach((b) => { if (b.city) cities.add(b.city) })
  return Array.from(cities).sort()
}
