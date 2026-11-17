import { notFound } from 'next/navigation'
import { createStaticClient } from '@/lib/supabase/static'
import SupplierProfileView from '@/components/suppliers/directory/SupplierProfileView'

export const revalidate = 300

async function loadSupplier(id) {
  const { data } = await createStaticClient().rpc('public_suppliers')
  const s = (data || []).find((x) => x.id === id)
  return s ? {
    ...s, categories: s.categories || [], zones: s.zones || [],
    perks: s.perks || [], services: s.services || [], priceFrom: s.price_from || null,
  } : null
}

export async function generateMetadata({ params }) {
  const { id } = await params
  const s = await loadSupplier(id)
  if (!s) return { title: 'Fornitore non trovato' }
  return {
    title: `${s.company_name} · Recofixer`,
    description: (s.description || '').slice(0, 160),
    robots: s.is_sample ? { index: false } : undefined,
  }
}

export default async function SupplierPage({ params }) {
  const { id } = await params
  const s = await loadSupplier(id)
  if (!s) notFound()
  return <SupplierProfileView supplier={s} />
}
