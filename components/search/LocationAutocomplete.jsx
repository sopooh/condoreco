'use client'

import { useState, useRef, useEffect } from 'react'
import { fetchWithTimeout } from '@/lib/fetchWithTimeout'

// ── Photon (Komoot / OpenStreetMap) ─────────────────────────────────────────
// Gratuito, no API key, ottimizzato per autocomplete live.
// Bounding box Italia: 6.6°W–18.5°E, 36.6°N–47.1°N
const PHOTON_URL = 'https://photon.komoot.io/api/'
const ITALY_BBOX = '6.6,36.6,18.5,47.1'

async function fetchPhoton(query, limit = 8) {
  try {
    const params = new URLSearchParams({ q: query, limit, bbox: ITALY_BBOX })
    const res = await fetchWithTimeout(`${PHOTON_URL}?${params}`, {}, 6000)
    if (!res.ok) return []
    const json = await res.json()
    return (json.features || [])
      .filter(f => {
        const c = f.properties?.country
        return c === 'Italia' || c === 'Italy'
      })
      .map(feature => {
        const p = feature.properties
        const [lng, lat] = feature.geometry.coordinates

        const street     = p.street || p.name || ''
        const number     = p.housenumber || ''
        const city       = p.city || p.town || p.village || p.county || ''
        const region     = p.state || ''
        const postcode   = p.postcode || ''
        const neighborhood = p.neighbourhood || p.suburb || p.district || ''

        // Label leggibile: "Via Manzoni 14, Milano, Lombardia"
        const label = [
          [street, number].filter(Boolean).join(' '),
          city,
          region,
        ].filter(Boolean).join(', ')

        return {
          label,
          address:       street,
          street_number: number || null,
          city,
          neighborhood:  neighborhood || null,
          postcode:      postcode || null,
          province:      p.county || null,
          region:        region || null,
          country:       p.country || 'Italia',
          lat,
          lng,
          osm_id:   p.osm_id  ? String(p.osm_id)  : null,
          osm_type: p.osm_type ? p.osm_type.toLowerCase() : null, // n/w/r → node/way/relation
          place_type: p.type || null, // house, street, city, neighbourhood…
        }
      })
  } catch (err) {
    if (err.name === 'AbortError') console.warn('Photon: timeout')
    else console.warn('Photon error:', err.message)
    return []
  }
}

// ── Componente ───────────────────────────────────────────────────────────────

/**
 * LocationAutocomplete — campo di ricerca geografica con suggerimenti OSM.
 *
 * Props:
 *   value            string             valore controllato esterno (opzionale)
 *   onChange         (text) => void     chiamata ad ogni keystroke
 *   onSelect         (LocationData) => void   chiamata quando l'utente sceglie un suggerimento
 *   placeholder      string
 *   size             'sm' | 'md' | 'lg'
 *   showSearchButton bool               mostra il pulsante "Cerca" a destra
 *   onSearchSubmit   (text) => void     chiamata on submit (solo se showSearchButton)
 *   autoFocus        bool
 *   style            object             stile del wrapper
 *   inputStyle       object             stile aggiuntivo sull'<input>
 *   minChars         number (default 3)
 *   debounceMs       number (default 300)
 *   maxResults       number (default 8)
 *
 * LocationData shape:
 *   { label, address, street_number, city, neighborhood,
 *     postcode, province, region, country,
 *     lat, lng, osm_id, osm_type, place_type }
 */
export default function LocationAutocomplete({
  value,
  onChange,
  onSelect,
  placeholder = 'Cerca via, quartiere, città…',
  size = 'md',
  showSearchButton = false,
  onSearchSubmit,
  autoFocus = false,
  style = {},
  inputStyle = {},
  minChars = 3,
  debounceMs = 300,
  maxResults = 8,
}) {
  const [query, setQuery] = useState(value ?? '')
  const [results, setResults] = useState([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [activeIdx, setActiveIdx] = useState(-1)
  const wrapRef = useRef(null)
  const debounceRef = useRef(null)

  // Sync valore esterno
  useEffect(() => {
    if (value !== undefined && value !== query) setQuery(value)
  }, [value]) // eslint-disable-line react-hooks/exhaustive-deps

  // Chiudi dropdown cliccando fuori
  useEffect(() => {
    const handler = e => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false)
        setActiveIdx(-1)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Ricerca con debounce
  useEffect(() => {
    clearTimeout(debounceRef.current)
    const q = query.trim()
    if (q.length < minChars) { setResults([]); setOpen(false); return }

    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      const data = await fetchPhoton(q, maxResults)
      setResults(data)
      setOpen(data.length > 0)
      setActiveIdx(-1)
      setLoading(false)
    }, debounceMs)

    return () => clearTimeout(debounceRef.current)
  }, [query, minChars, debounceMs, maxResults])

  function handleChange(e) {
    const val = e.target.value
    setQuery(val)
    onChange?.(val)
  }

  function handleSelect(item) {
    setQuery(item.label)
    setResults([])
    setOpen(false)
    setActiveIdx(-1)
    onChange?.(item.label)
    onSelect?.(item)
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (activeIdx >= 0 && results[activeIdx]) {
      handleSelect(results[activeIdx])
    } else {
      setOpen(false)
      onSearchSubmit?.(query)
    }
  }

  function handleKeyDown(e) {
    if (!open) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIdx(i => Math.min(i + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIdx(i => Math.max(i - 1, -1))
    } else if (e.key === 'Escape') {
      setOpen(false)
      setActiveIdx(-1)
    } else if (e.key === 'Enter' && activeIdx >= 0) {
      e.preventDefault()
      handleSelect(results[activeIdx])
    }
  }

  const pad = { lg: '15px 18px', md: '11px 14px', sm: '9px 12px' }[size] || '11px 14px'
  const fs  = { lg: 15, md: 14, sm: 13 }[size] || 14

  return (
    <div ref={wrapRef} style={{ position: 'relative', width: '100%', ...style }}>
      <form onSubmit={handleSubmit} style={{ display: 'flex', width: '100%' }}>
        <div style={{
          flex: 1, display: 'flex', alignItems: 'center',
          border: '1.5px solid var(--border)',
          borderRadius: showSearchButton ? '8px 0 0 8px' : 8,
          overflow: 'hidden', background: 'var(--white)',
          boxShadow: open ? '0 2px 12px rgba(0,0,0,0.10)' : '0 1px 4px rgba(0,0,0,0.06)',
          transition: 'box-shadow 0.15s',
        }}>
          <input
            autoFocus={autoFocus}
            value={query}
            onChange={handleChange}
            onFocus={() => results.length > 0 && setOpen(true)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            autoComplete="off"
            style={{
              flex: 1, border: 'none', outline: 'none',
              padding: pad, fontSize: fs,
              fontFamily: 'Inter, sans-serif', color: 'var(--text)',
              ...inputStyle,
            }}
          />
          {loading && (
            <div style={{ padding: '0 10px', color: 'var(--text-4)', fontSize: 12 }}>…</div>
          )}
        </div>
        {showSearchButton && (
          <button type="submit" className="btn btn-primary"
            style={{ borderRadius: '0 8px 8px 0', padding: '0 22px', flexShrink: 0 }}>
            Cerca
          </button>
        )}
      </form>

      {/* Dropdown suggerimenti */}
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
                background: i === activeIdx ? 'var(--teal-lt)' : 'none',
                border: 'none',
                borderBottom: i < results.length - 1 ? '1px solid var(--border-2)' : 'none',
                cursor: 'pointer', textAlign: 'left',
              }}
              onMouseEnter={e => {
                if (i !== activeIdx) e.currentTarget.style.background = 'var(--bg)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = i === activeIdx ? 'var(--teal-lt)' : 'none'
              }}
            >
              <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>
                {[item.address, item.street_number].filter(Boolean).join(' ') || item.label.split(',')[0]}
              </span>
              <span style={{ fontSize: 12, color: 'var(--text-4)', marginTop: 1 }}>
                {[item.city, item.region, item.country].filter(Boolean).join(', ')}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
