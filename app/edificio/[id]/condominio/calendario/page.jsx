import { notFound } from 'next/navigation'
import { createStaticClient } from '@/lib/supabase/static'
import CondoCalendarGate from '@/components/condo/CondoCalendarGate'

export const revalidate = 3600

export async function generateStaticParams() {
  const supabase = createStaticClient()
  const { data } = await supabase.from('building_scores').select('id')
  return (data || []).map((b) => ({ id: b.id }))
}

export const metadata = {
  title: 'Calendario condominio',
}

export default async function CondoCalendarPage({ params }) {
  const { id } = await params
  const supabase = createStaticClient()
  const { data: building } = await supabase
    .from('building_scores')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (!building) notFound()

  return <CondoCalendarGate building={building} />
}
