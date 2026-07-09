import { cache } from 'react'
import { notFound } from 'next/navigation'
import { createStaticClient } from '@/lib/supabase/static'
import AdminHeader from '@/components/admins/AdminHeader'
import AdminBuildings from '@/components/admins/AdminBuildings'
import AdminActions from '@/components/admins/AdminActions'
import AdminReviewList from '@/components/admins/AdminReviewList'

export const revalidate = 3600

const getAdminData = cache(async (id) => {
  const supabase = createStaticClient()

  const { data: admin } = await supabase
    .from('admin_scores')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (!admin) return null

  const [buildingsRes, reviewsRes] = await Promise.all([
    supabase
      .from('building_scores')
      .select('*')
      .eq('administrator_id', id),
    supabase
      .from('admin_reviews')
      .select('*, profiles(display_name, avatar_url, role)')
      .eq('administrator_id', id)
      .eq('is_published', true)
      .order('created_at', { ascending: false }),
  ])

  return {
    admin,
    buildings: buildingsRes.data || [],
    reviews: reviewsRes.data || [],
  }
})

// Pre-genera alla build tutte le pagine amministratore esistenti (ISR: revalidate
// = 3600 le tiene aggiornate). Richiede che getAdminData non tocchi cookies() —
// per questo usa il client static, non quello cookie-aware di '@/lib/supabase/server'.
export async function generateStaticParams() {
  const supabase = createStaticClient()
  const { data } = await supabase.from('admin_scores').select('id')
  return (data || []).map((a) => ({ id: a.id }))
}

export async function generateMetadata({ params }) {
  const { id } = await params
  const data = await getAdminData(id)
  if (!data) return {}

  const { admin } = data
  const title = `${admin.name} — Recensioni amministratore condominio ${admin.city}`

  const scoreText = admin.score != null ? `Punteggio ${admin.score.toFixed(1)}/5` : null
  const reviewText = admin.review_count != null ? `${admin.review_count} recensioni` : null
  const description = [scoreText, reviewText].filter(Boolean).join(' · ')
    || `Recensioni ed esperienze reali sull'amministratore ${admin.name}, ${admin.city}.`

  return {
    title,
    description,
    openGraph: { title, description },
  }
}

export default async function AdminPage({ params }) {
  const { id } = await params
  const data = await getAdminData(id)
  if (!data) notFound()

  const { admin, buildings, reviews } = data

  return (
    <>
      <AdminHeader admin={admin} />
      <AdminBuildings buildings={buildings} />

      <div className="wrap" style={{ padding: '24px 40px' }}>
        <AdminActions admin={admin} />
        <AdminReviewList reviews={reviews} />
      </div>
    </>
  )
}
