import { cache } from 'react'
import { notFound } from 'next/navigation'
import { createStaticClient } from '@/lib/supabase/static'
import AdminHeader from '@/components/admins/AdminHeader'
import AdminBuildings from '@/components/admins/AdminBuildings'
import AdminActions from '@/components/admins/AdminActions'
import ReviewsSection from '@/components/reviews/ReviewsSection'
import { ADMIN_RESIDENT_TYPES, ADMIN_REVIEW_CATEGORIES } from '@/lib/reviewOptions'
import JsonLd from '@/components/seo/JsonLd'
import { SITE_URL } from '@/lib/site'

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
  const where = admin.city ? ` a ${admin.city}` : ''
  const title = `${admin.name}, amministratore di condominio${where}: recensioni`

  const hasReviews = admin.review_count > 0 && admin.score != null
  const description = hasReviews
    ? `Opinioni su ${admin.name}${where}: punteggio ${admin.score.toFixed(1)}/5 su ${admin.review_count} ${admin.review_count === 1 ? 'recensione' : 'recensioni'} dei residenti. Trasparenza, rapidità, assemblee e condomini gestiti.`
    : `${admin.name}, amministratore di condominio${where}: condomini gestiti e opinioni dei residenti. Lo conosci? Lascia la tua recensione.`

  return {
    title,
    description,
    alternates: { canonical: `/amministratore/${id}` },
    openGraph: { title, description, url: `/amministratore/${id}` },
  }
}

export default async function AdminPage({ params }) {
  const { id } = await params
  const data = await getAdminData(id)
  if (!data) notFound()

  const { admin, buildings, reviews } = data

  // Recensioni scritte da residenti terzi, non dall'amministratore stesso:
  // AggregateRating ammesso per le stelline nei risultati Google.
  const adminJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ProfessionalService',
    name: admin.studio_name || admin.name,
    ...(admin.studio_name && admin.studio_name !== admin.name && { alternateName: admin.name }),
    description: 'Amministratore di condominio',
    url: `${SITE_URL}/amministratore/${admin.id}`,
    ...(admin.city && {
      address: {
        '@type': 'PostalAddress',
        ...(admin.address && { streetAddress: admin.address }),
        addressLocality: admin.city,
        addressCountry: 'IT',
      },
    }),
    ...(admin.review_count > 0 && admin.score != null && {
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: Number(admin.score.toFixed(1)),
        reviewCount: admin.review_count,
        bestRating: 5,
        worstRating: 1,
      },
    }),
  }

  return (
    <>
      <JsonLd data={adminJsonLd} />
      <AdminHeader admin={admin} />

      <div className="wrap" style={{ padding: '24px 40px' }}>
        <AdminActions admin={admin} />
        <ReviewsSection
          reviews={reviews}
          table="admin_reviews"
          column="administrator_id"
          entityId={admin.id}
          subtitle={admin.name}
          residentTypes={ADMIN_RESIDENT_TYPES}
          categories={ADMIN_REVIEW_CATEGORIES}
          extras={{}}
          emptyTitle="Ancora nessuna recensione"
          emptyText="Sii il primo a raccontare la tua esperienza con questo amministratore."
        />
      </div>

      <AdminBuildings buildings={buildings} />
    </>
  )
}
