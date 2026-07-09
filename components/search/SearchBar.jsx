'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { fetchWithTimeout } from '@/lib/fetchWithTimeout'
import { searchNearbyBuildings } from '@/lib/buildings'
import { useIsMobile } from '@/hooks/useIsMobile'

async function photon(query) {
  if (!query || query.trim().length < 3) return []
  try {
    const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(query.trim())}&limit=8`
    const res = await fetchWithTimeout(url, {}, 6000)
    if (!res.ok) return []
    const data = await res.json()
    return (data.features || []).map(f => {
      const p = f.properties || {}
      const [lng, lat] = f.geometry?.coordinates || [null, null]
      const city = p.city || p.town || p.village || p.county || ''
      return {
        osm_id:        p.osm_id   || null,
        osm_type:      p.osm_type || null,
        name:          p.name     || '',
        street:        p.street   || p.name || '',
        street_number: p.housenumber || null,
        neighborhood:  p.district || p.suburb || p.neighbourhood || null,
        city,
        region:   p.state    || null,
        postcode: p.postcode || null,
        country:  p.country  || '',
        latitude:  lat,
        longitude: lng,
        label: [
          p.name,
          p.street && p.street !== p.name ? p.street : null,
          p.housenumber,
          city,
          p.state,
          p.country,
        ].filter(Boolean).join(', '),
        sub: [city, p.state, p.country].filter(Boolean).join(', '),
      }
    })
  } catch (err) {
    if (err.name !== 'AbortError') console.warn('Photon error:', err.message)
    return []
  }
}

export default function SearchBar({ initial = '', size = 'lg', maxWidth = 540 }) {
  const [q, setQ] = useState(initial)
  const [results, setResults] = useState([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const wrapRef = useRef(null)
  const debounceRef = useRef(null)

  useEffect(() => {
    const h = e => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  useEffect(() => {
    clearTimeout(debounceRef.current)
    if (!q || q.trim().length < 3) { setResults([]); setOpen(false); return }

    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      const data = await photon(q)
      setResults(data)
      setOpen(data.length > 0)
      setLoading(false)
    }, 300)

    return () => clearTimeout(debounceRef.current)
  }, [q])

  async function handleSelect(place) {
    setQ(place.label)
    setOpen(false)

    // Cerca edifici vicini (raggio 50m)
    const nearby = await searchNearbyBuildings(place.latitude, place.longitude, 50)

    if (nearby.length === 1) {
      // Un edificio esatto → vai alla scheda
      router.push(`/edificio/${nearby[0].id}`)
      return
    }

    // Con o senza edifici vicini → vai a Esplora centrata su quel punto
    router.push(
      `/cerca?q=${encodeURIComponent(place.label)}&lat=${place.latitude}&lng=${place.longitude}`
    )
  }

  function handleSubmit(e) {
    e.preventDefault()
    setOpen(false)
    if (q.trim()) router.push(`/cerca?q=${encodeURIComponent(q.trim())}`)
  }

  const isMobile = useIsMobile()
  const pad = size === 'lg' ? '15px 18px' : '11px 14px'
  const fs  = size === 'lg' ? 15 : 14

  return (
    <div ref={wrapRef} style={{ position: 'relative', maxWidth, width: '100%' }}>
      <form onSubmit={handleSubmit} style={{
        display: 'flex', border: '1.5px solid var(--border)', borderRadius: 8,
        overflow: 'hidden', background: 'var(--white)',
        boxShadow: open ? '0 2px 12px rgba(0,0,0,0.10)' : '0 1px 4px rgba(0,0,0,0.06)',
        transition: 'box-shadow 0.15s',
      }}>
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          onKeyDown={e => e.key === 'Escape' && setOpen(false)}
          placeholder={isMobile ? 'Cerca via, città...' : 'Cerca via, quartiere, città — es. Via Manzoni 14, Milano'}
          style={{ flex: 1, border: 'none', outline: 'none', padding: pad, fontSize: fs, fontFamily: 'Inter, sans-serif', minWidth: 0 }}
        />
        {loading && (
          <span style={{ display: 'flex', alignItems: 'center', padding: '0 10px', color: 'var(--text-4)', fontSize: 12 }}>…</span>
        )}
        <button
          type="submit"
          style={{
            flexShrink: 0,
            background: 'var(--teal)', color: '#fff',
            border: 'none', cursor: 'pointer',
            borderRadius: 0,
            padding: isMobile ? '0 18px' : '0 24px',
            fontSize: isMobile ? 20 : 14,
            fontWeight: 700,
            fontFamily: 'Inter, sans-serif',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            minWidth: isMobile ? 52 : 'auto',
          }}
        >
          {isMobile ? '→' : 'Cerca'}
        </button>
      </form>

      {open && results.length > 0 && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0,
          background: 'var(--white)', border: '1px solid var(--border)',
          borderRadius: 10, boxShadow: '0 8px 28px rgba(0,0,0,0.12)',
          zIndex: 500, overflow: 'hidden',
        }}>
          {results.map((item, i) => (
            <button
              key={i}
              type="button"
              onClick={() => handleSelect(item)}
              style={{
                display: 'flex', flexDirection: 'column',
                width: '100%', padding: '11px 16px',
                background: 'none', border: 'none',
                borderBottom: i < results.length - 1 ? '1px solid var(--border-2)' : 'none',
                cursor: 'pointer', textAlign: 'left',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg)'}
              onMouseLeave={e => e.currentTarget.style.background = 'none'}
            >
              <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>
                {[item.name || item.street, item.street_number].filter(Boolean).join(' ') || item.label.split(',')[0]}
              </span>
              {item.sub && (
                <span style={{ fontSize: 12, color: 'var(--text-4)', marginTop: 1 }}>{item.sub}</span>
              )}
            </button>
          ))}

          <button type="button" onClick={handleSubmit} style={{
            width: '100%', padding: '10px 16px', background: 'var(--bg)',
            border: 'none', borderTop: '1px solid var(--border)',
            fontSize: 13, color: 'var(--teal)', fontWeight: 600,
            cursor: 'pointer', textAlign: 'left',
          }}>
            Cerca "{q}" in tutti gli edifici →
          </button>
        </div>
      )}
    </div>
  )
}
