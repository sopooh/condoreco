import { createStaticClient } from '@/lib/supabase/static'
import { feeBand } from '@/lib/score'

// Dati pubblici (stesse view usate dal sito) per i template "(dati)".
// Lanciano Error con messaggio in italiano: la route lo mostra nello studio.

function buildingTitle(b) {
  return [b.address, b.street_number].filter(Boolean).join(' ')
}

export async function loadTemplateData(kind, params = {}) {
  const supabase = createStaticClient()

  if (kind === 'ranking') {
    const limit = Math.min(Math.max(Number(params.limit) || 5, 3), 6)
    const minReviews = Math.max(Number(params.minReviews) || 1, 1)
    let q = supabase
      .from('building_scores')
      .select('id, address, street_number, city, neighborhood, score, review_count')
      .not('score', 'is', null)
      .gte('review_count', minReviews)
      .order('score', { ascending: false })
      .order('review_count', { ascending: false })
      .limit(limit)
    if (params.city) q = q.ilike('city', params.city)
    if (params.neighborhood) q = q.ilike('neighborhood', params.neighborhood)
    const { data, error } = await q
    if (error) throw new Error(`Errore lettura dati: ${error.message}`)
    if (!data || data.length < 3) {
      throw new Error(`Servono almeno 3 condomini con ${minReviews}+ recensioni in questa zona (trovati ${data?.length ?? 0}).`)
    }
    return {
      area: params.neighborhood || params.city || 'Italia',
      rows: data.map((b) => ({ ...b, title: buildingTitle(b), score: Number(b.score) })),
    }
  }

  if (kind === 'building') {
    if (!params.buildingId) throw new Error('Scegli un condominio.')
    const { data: b, error } = await supabase
      .from('building_scores').select('*').eq('id', params.buildingId).maybeSingle()
    if (error) throw new Error(`Errore lettura dati: ${error.message}`)
    if (!b) throw new Error('Condominio non trovato.')
    const facts = []
    facts.push(`${b.review_count ?? 0} recension${b.review_count === 1 ? 'e' : 'i'}`)
    if (b.verified_count) facts.push(`${b.verified_count} verificat${b.verified_count === 1 ? 'a' : 'e'}`)
    const band = feeBand(b.monthly_fee != null ? Number(b.monthly_fee) : null)
    if (band) facts.push(`Spese ${band.range}`)
    if (b.is_supercondominio) facts.push('Parte di un supercondominio')
    if (b.year_built) facts.push(`Costruito nel ${b.year_built}`)
    if (b.has_elevator) facts.push('Ascensore')
    return {
      ...b,
      title: buildingTitle(b),
      subtitle: [b.neighborhood, b.city].filter(Boolean).join(', '),
      score: b.score == null ? null : Number(b.score),
      facts: facts.slice(0, 5),
    }
  }

  if (kind === 'admin') {
    if (!params.adminId) throw new Error('Scegli un amministratore.')
    const { data: a, error } = await supabase
      .from('admin_scores').select('*').eq('id', params.adminId).maybeSingle()
    if (error) throw new Error(`Errore lettura dati: ${error.message}`)
    if (!a) throw new Error('Amministratore non trovato.')
    const facts = []
    facts.push(`${a.review_count ?? 0} recension${a.review_count === 1 ? 'e' : 'i'}`)
    if (a.building_count) facts.push(`${a.building_count} condomini gestiti`)
    if (a.active_since) facts.push(`Attivo dal ${a.active_since}`)
    if (a.verified) facts.push('Profilo verificato')
    return {
      ...a,
      title: a.studio_name || a.name,
      subtitle: [a.studio_name ? a.name : null, a.city].filter(Boolean).join(', '),
      score: a.score == null ? null : Number(a.score),
      facts,
    }
  }

  return null
}
