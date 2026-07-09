import Link from 'next/link'
import { createStaticClient } from '@/lib/supabase/static'
import SearchBar from '@/components/search/SearchBar'
import LiveReviewedCounter from '@/components/home/LiveReviewedCounter'
import BuildingList from '@/components/buildings/BuildingList'

export const revalidate = 3600

// "Più recensiti questa settimana" limitava a un numero ragionevole di card;
// l'originale renderizzava l'intera lista senza ordinamento (la heading non
// corrispondeva ai dati). Qui l'ordinamento per review_count è reale.
const TOP_BUILDINGS_LIMIT = 12

async function getHomeData() {
  const supabase = createStaticClient()

  const [{ data: cityRows }, { data: topBuildings }, { count: reviewedCount }] = await Promise.all([
    supabase.from('building_scores').select('city'),
    supabase.from('building_scores').select('*').order('review_count', { ascending: false }).limit(TOP_BUILDINGS_LIMIT),
    supabase.from('building_scores').select('id', { count: 'exact', head: true }).gt('review_count', 0),
  ])

  const cityCounts = new Map()
  ;(cityRows || []).forEach((b) => {
    if (!b.city) return
    cityCounts.set(b.city, (cityCounts.get(b.city) || 0) + 1)
  })
  const cities = Array.from(cityCounts.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)

  return {
    cities,
    topBuildings: topBuildings || [],
    reviewedCount: reviewedCount || 0,
  }
}

export default async function HomePage() {
  const { cities, topBuildings, reviewedCount } = await getHomeData()

  return (
    <>
      <div style={{
        background: 'radial-gradient(circle at left center, rgba(255, 255, 255, 0.12) 0%, rgba(255, 255, 255, 0.04) 24%, rgba(13, 103, 111, 0) 48%), linear-gradient(145deg, #094B50 0%, var(--teal) 56%, #0E7E82 100%)',
        borderBottom: '1px solid rgba(255,255,255,0.10)',
        padding: '54px 0 40px',
      }}>
        <div className="home-hero-wrap" style={{ margin: '0 auto', textAlign: 'center' }}>
          <h1 style={{
            fontSize: 'clamp(34px, 6vw, 54px)',
            fontWeight: 800,
            lineHeight: 1.02,
            letterSpacing: '-1.4px',
            marginBottom: 14,
            color: '#FFFFFF',
            maxWidth: 760,
            margin: '0 auto 14px',
          }}>
            Scopri com'è <span style={{ color: '#BFEDEF' }}>davvero</span>
            <br />
            vivere qui
          </h1>
          <p style={{
            fontSize: 16,
            color: 'rgba(255,255,255,0.74)',
            lineHeight: 1.6,
            marginBottom: 20,
            maxWidth: 700,
            marginInline: 'auto',
          }}>
            Recensioni reali di residenti su amministratori, manutenzione e qualita della vita.
            Uno strumento chiaro per capire meglio un edificio prima di comprare, affittare o trasferirti.
          </p>

          <div style={{ maxWidth: 980, margin: '0 auto' }}>
            <SearchBar maxWidth="100%" />
          </div>

          <div style={{ marginTop: 24 }}>
            <LiveReviewedCounter value={reviewedCount} />
          </div>
        </div>
      </div>

      <div className="home-city-section" style={{ background: 'var(--white)', borderBottom: '1px solid var(--border)' }}>
        <div style={{ maxWidth: 1080, margin: '0 auto' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-4)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 10 }}>
            Esplora per città
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
            {cities.map((c) => (
              <Link key={c.name} href={`/cerca?city=${encodeURIComponent(c.name)}`}
                style={{
                  background: '#fff', border: '1.5px solid var(--border)', borderRadius: 100,
                  padding: '8px 16px', fontSize: 13, fontWeight: 600, color: 'var(--text-2)',
                  display: 'inline-block',
                }}>
                {c.name}
                <span style={{ fontSize: 11, color: 'var(--text-4)', marginLeft: 5 }}>{c.count}</span>
              </Link>
            ))}
            <Link
              href="/cerca"
              style={{
                background: 'transparent', border: '1.5px dashed var(--border)', borderRadius: 100,
                padding: '8px 16px', fontSize: 13, fontWeight: 600, color: 'var(--teal)',
                display: 'inline-block',
              }}
            >
              + Cerca un'altra città
            </Link>
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-4)', lineHeight: 1.5 }}>
            Oppure cerca qualsiasi via, quartiere o città dalla barra di ricerca qui sopra.
          </div>
        </div>
      </div>

      <div className="wrap home-buildings-section">
        <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>Più recensiti questa settimana</div>
        <BuildingList buildings={topBuildings} />
      </div>
    </>
  )
}
