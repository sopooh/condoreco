import { notFound } from 'next/navigation'
import { createStaticClient } from '@/lib/supabase/static'
import { CondoPollDetailGate } from '@/components/condo/CondoPollsGate'

// Generata on demand e poi in cache (ISR): l'edificio e' pubblico, la
// decisione si carica lato client dietro il gate membri (RLS).
export const revalidate = 3600

export const metadata = {
  title: 'Decisione del condominio',
}

export default async function CondoPollDetailPage({ params }) {
  const { id, pollId } = await params
  const supabase = createStaticClient()
  const { data: building } = await supabase
    .from('building_scores')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (!building) notFound()

  return <CondoPollDetailGate building={building} pollId={pollId} />
}
