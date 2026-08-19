import { cache } from 'react'
import { notFound } from 'next/navigation'
import { createStaticClient } from '@/lib/supabase/static'
import { photoUrl } from '@/lib/photos'
import BuildingGallery from '@/components/photos/BuildingGallery'
import BuildingHeader from '@/components/buildings/BuildingHeader'
import BuildingLayout from '@/components/buildings/BuildingLayout'
import BuildingActions from '@/components/buildings/BuildingActions'
import ReviewsSection from '@/components/reviews/ReviewsSection'
import { RESIDENT_TYPES, ISSUES, BUILDING_REVIEW_CATEGORIES } from '@/lib/reviewOptions'
import ResidentsDots from '@/components/buildings/ResidentsDots'
import AdminCard from '@/components/buildings/AdminCard'
import BuildingMap from '@/components/map/BuildingMap'
import RankingBar from '@/components/buildings/RankingBar'
import CategoryRatings from '@/components/buildings/CategoryRatings'
import InsightCards from '@/components/buildings/InsightCards'
import ReportsHistory from '@/components/buildings/ReportsHistory'
import BuildingFacts from '@/components/buildings/BuildingFacts'
import { buildingPercentiles } from '@/lib/percentile'
import { reviewTrend } from '@/lib/trend'

export const revalidate = 3600

const getBuildingData = cache(async (id) => {
  const supabase = createStaticClient()

  const { data: building } = await supabase
    .from('building_scores')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (!building) return null

  const [adminRes, reviewsRes, photosRes, residentsRes, cohortRes, reportsRes] = await Promise.all([
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
    // Cohort di edifici della stessa città, per il calcolo dei percentili
    // (lib/percentile.js). Solo i campi usati nel confronto, non l'intera riga.
    supabase
      .from('building_scores')
      .select('id, city, neighborhood, score, score_noise, score_safety, score_quality, score_maintenance, score_costs, score_admin')
      .eq('city', building.city),
    // Segnalazioni separate dalle recensioni (vedi sezione "Segnalazioni passate").
    supabase
      .from('building_reports')
      .select('id, category, status, created_at, resolved_at')
      .eq('building_id', id)
      .order('created_at', { ascending: false }),
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
    cohort: cohortRes.data || [],
    reports: reportsRes.data || [],
  }
})

// Pre-genera alla build tutte le pagine edificio esistenti (ISR: revalidate = 3600
// le tiene aggiornate). Richiede che getBuildingData non tocchi cookies() — myReview
// è per questo fetchato client-side in ReviewForm (useMyReview), non qui.
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

  const { building, admin, reviews, photos, residents, cohort, reports } = data
  const fullAddress = `${building.address}${building.street_number ? ', ' + building.street_number : ''}`

  const percentiles = buildingPercentiles(building, cohort)
  const trend = reviewTrend(reviews)
  const reportStats = reports.length === 0 ? null : buildReportStats(reports)

  return (
    <>
      <BuildingGallery photos={photos} address={fullAddress} />
      <BuildingHeader building={building} hideScore={photos.length > 0} />

      <div className="wrap" style={{ padding: '24px 40px 0' }}>
        <BuildingActions building={building} />
      </div>

      <div className="wrap" style={{ padding: '24px 40px 0', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <RankingBar percentile={percentiles?.score ?? null} sampleSize={percentiles?.sampleSize} />
        <CategoryRatings building={building} percentiles={percentiles} />
        <InsightCards
          trend={trend}
          maintenancePercentile={percentiles?.score_maintenance ?? null}
          reportStats={reportStats}
        />
        <ReportsHistory reports={reports} />
        <BuildingFacts building={building} />
      </div>

      <BuildingLayout
        left={
          <>
            <ReviewsSection
              reviews={reviews}
              photos={photos}
              table="reviews"
              column="building_id"
              entityId={building.id}
              subtitle={`${building.address}${building.street_number ? ', ' + building.street_number : ''} — ${building.city}`}
              residentTypes={RESIDENT_TYPES}
              categories={BUILDING_REVIEW_CATEGORIES}
              extras={{ issues: ISSUES, residentSince: true, amenities: true, photos: true }}
              subScores={[
                { label: 'Verificati', val: building.score_verified },
                { label: 'Ex residenti', val: building.score_former },
                { label: 'Chi valuta', val: building.score_evaluating },
              ]}
              emptyTitle="Ancora nessuna recensione"
              emptyText="Sii il primo a raccontare com'è vivere qui."
            />
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

            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-4)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>Posizione</div>
            <BuildingMap lat={building.lat} lng={building.lng} monthlyFee={building.monthly_fee} height={200} />
          </>
        }
      />
    </>
  )
}

// Statistiche aggregate per le card "Segnalazioni" (InsightCards) e la
// sezione "Segnalazioni passate" (ReportsHistory) — segnalazioni/anno
// calcolate sull'arco temporale reale coperto dai dati, non su 10 anni fissi.
function buildReportStats(reports) {
  const sorted = [...reports].sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
  const firstDate = new Date(sorted[0].created_at)
  const years = Math.max((Date.now() - firstDate.getTime()) / (1000 * 60 * 60 * 24 * 365), 1)
  return {
    total: reports.length,
    perYear: reports.length / years,
    percentile: null,
  }
}
