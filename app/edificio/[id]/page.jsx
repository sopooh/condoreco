import { cache } from 'react'
import { notFound } from 'next/navigation'
import { createStaticClient } from '@/lib/supabase/static'
import { photoUrl } from '@/lib/photos'
import BuildingGallery from '@/components/photos/BuildingGallery'
import BuildingHeader from '@/components/buildings/BuildingHeader'
import BuildingLayout from '@/components/buildings/BuildingLayout'
import BuildingActions from '@/components/buildings/BuildingActions'
import BuildingReviewsSection from '@/components/reviews/BuildingReviewsSection'
import ScoreBreakdown from '@/components/buildings/ScoreBreakdown'
import ResidentsDots from '@/components/buildings/ResidentsDots'
import AdminCard from '@/components/buildings/AdminCard'
import BuildingMap from '@/components/map/BuildingMap'

export const revalidate = 3600

const getBuildingData = cache(async (id) => {
  const supabase = createStaticClient()

  const { data: building } = await supabase
    .from('building_scores')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (!building) return null

  const [adminRes, reviewsRes, photosRes, residentsRes] = await Promise.all([
    building.administrator_id
      ? supabase.from('admin_scores').select('*').eq('id', building.administrator_id).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase
      .from('reviews')
      .select('*, profiles(display_name, avatar_url, role)')
      .eq('building_id', id)
      .eq('is_published', true)
      .order('created_at', { ascending: false }),
    supabase
      .from('photos')
      .select('id, storage_path, quality_score, is_cover, review_id')
      .eq('building_id', id)
      .eq('status', 'approved')
      .order('is_cover', { ascending: false })
      .order('quality_score', { ascending: false }),
    supabase
      .from('reviews')
      .select('user_id, resident_type, profiles(avatar_url, role, display_name)')
      .eq('building_id', id)
      .in('resident_type', ['resident', 'tenant', 'owner'])
      .eq('is_published', true)
      .limit(10),
  ])

  const seenResidents = new Set()
  const residents = (residentsRes.data || []).filter((r) => {
    if (seenResidents.has(r.user_id)) return false
    seenResidents.add(r.user_id)
    return true
  })

  return {
    building,
    admin: adminRes.data || null,
    reviews: reviewsRes.data || [],
    photos: photosRes.data || [],
    residents,
  }
})

// Pre-genera alla build tutte le pagine edificio esistenti (ISR: revalidate = 3600
// le tiene aggiornate). Richiede che getBuildingData non tocchi cookies() — myReview
// è per questo fetchato client-side in BuildingReviewForm, non qui.
export async function generateStaticParams() {
  const supabase = createStaticClient()
  const { data } = await supabase.from('building_scores').select('id')
  return (data || []).map((b) => ({ id: b.id }))
}

export async function generateMetadata({ params }) {
  const { id } = await params
  const data = await getBuildingData(id)
  if (!data) return {}

  const { building, photos } = data
  const title = `${building.address}${building.street_number ? ' ' + building.street_number : ''}, ${building.city} — Recensioni e punteggi`

  const scoreText = building.score != null ? `Punteggio ${building.score.toFixed(1)}/5` : null
  const reviewText = building.review_count != null ? `${building.review_count} recensioni` : null
  const description = [scoreText, reviewText].filter(Boolean).join(' · ')
    || `Recensioni ed esperienze reali su ${building.address}, ${building.city}.`

  const cover = photos[0]

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: cover ? [{ url: photoUrl(cover.storage_path) }] : undefined,
    },
  }
}

export default async function BuildingPage({ params }) {
  const { id } = await params
  const data = await getBuildingData(id)
  if (!data) notFound()

  const { building, admin, reviews, photos, residents } = data
  const fullAddress = `${building.address}${building.street_number ? ', ' + building.street_number : ''}`

  return (
    <>
      <BuildingGallery photos={photos} address={fullAddress} />
      <BuildingHeader building={building} hideScore={photos.length > 0} />

      <BuildingLayout
        left={
          <>
            <BuildingActions building={building} />
            <BuildingReviewsSection reviews={reviews} photos={photos} building={building}>
              <div style={{ maxWidth: 460, marginBottom: 32 }}>
                <ScoreBreakdown building={building} />
              </div>
            </BuildingReviewsSection>
          </>
        }
        aside={
          <>
            {residents.length > 0 && (
              <div style={{ marginBottom: 24 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-4)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>
                  Vivono qui
                </div>
                <ResidentsDots residents={residents} />
              </div>
            )}

            {admin && <AdminCard admin={admin} />}

            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-4)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>Info edificio</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              <Info k="Anno" v={building.year_built} />
              <Info k="Piani" v={building.floors} />
              <Info k="Unità" v={building.units} />
              <Info k="Riscaldamento" v={building.heating_type} />
              <Info k="Ascensore" v={building.has_elevator ? 'Sì' : 'No'} />
              <Info k="Giardino" v={building.has_garden ? 'Sì' : 'No'} />
            </div>

            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-4)', textTransform: 'uppercase', letterSpacing: 1, margin: '20px 0 10px' }}>Posizione</div>
            <BuildingMap lat={building.lat} lng={building.lng} monthlyFee={building.monthly_fee} height={200} />
          </>
        }
      />
    </>
  )
}

function Info({ k, v }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
      <span style={{ color: 'var(--text-4)', fontWeight: 500 }}>{k}</span>
      <span style={{ color: 'var(--text-2)', fontWeight: 600 }}>{v}</span>
    </div>
  )
}
