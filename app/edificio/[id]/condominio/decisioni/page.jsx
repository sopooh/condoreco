import { notFound } from 'next/navigation'
import { createStaticClient } from '@/lib/supabase/static'
import { CondoPollsGate } from '@/components/condo/CondoPollsGate'

export const revalidate = 3600

export async function generateStaticParams() {
  const supabase = createStaticClient()
  const { data } = await supabase.from('building_scores').select('id')
  return (data || []).map((b) => ({ id: b.id }))
}

export const metadata = {
  title: 'Decisioni del condominio',
}

export default async function CondoPollsPage({ params }) {
  const { id } = await params
  const supabase = createStaticClient()
  const { data: building } = await supabase
    .from('building_scores')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (!building) notFound()

  return <CondoPollsGate building={building} />
}
