import { notFound } from 'next/navigation'
import { createStaticClient } from '@/lib/supabase/static'
import { findDemoSupplier } from '@/lib/demoSuppliers'
import SupplierProfileView from '@/components/suppliers/directory/SupplierProfileView'

export const revalidate = 300

async function loadSupplier(id) {
  const demo = findDemoSupplier(id)
  if (demo) return demo
  const { data } = await createStaticClient().rpc('public_suppliers')
  const s = (data || []).find((x) => x.id === id)
  return s ? { ...s, categories: s.categories || [], zones: s.zones || [] } : null
}

export async function generateMetadata({ params }) {
  const { id } = await params
  const s = await loadSupplier(id)
  if (!s) return { title: 'Fornitore non trovato' }
  return {
    title: s.demo ? `${s.company_name} (esempio)` : `${s.company_name} · Recofixer`,
    description: (s.description || '').slice(0, 160),
    robots: s.demo ? { index: false } : undefined,
  }
}

export default async function SupplierPage({ params }) {
  const { id } = await params
  const s = await loadSupplier(id)
  if (!s) notFound()
  return <SupplierProfileView supplier={s} />
}
