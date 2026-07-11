'use client'

import Link from 'next/link'
import { scoreColor } from '@/lib/score'
import BuildingRow from '@/components/buildings/BuildingRow'
import { defaultAvatarFor, ROLES } from '@/lib/avatars'

// Pallini di rating (come le stelle ma con cerchi pieni/vuoti)
function RatingDots({ value, size = 11 }) {
  return (
    <span style={{ display: 'inline-flex', gap: 3, alignItems: 'center' }}>
      {[1, 2, 3, 4, 5].map(n => {
        const filled = value != null && n <= Math.round(value)
        return (
          <span key={n} style={{
            width: size, height: size, borderRadius: '50%', display: 'inline-block',
            background: filled ? scoreColor(value) : '#E5E7EB',
          }} />
        )
      })}
    </span>
  )
}

function autoAdminTags(a) {
  const tags = []
  if ((a.score_assemblies || 0) >= 4.3) tags.push({ label: 'Assemblee ben organizzate', tone: 'green' })
  if ((a.score_transparency || 0) >= 4.3) tags.push({ label: 'Amministratore disponibile', tone: 'green' })
  if ((a.score_maintenance || 0) >= 4.0) tags.push({ label: 'Manutenzione ordinaria buona', tone: 'green' })
  if ((a.score_speed || 0) > 0 && (a.score_speed || 5) < 3.8)
    tags.push({ label: 'Tempi lunghi per interventi straordinari', tone: 'amber' })
  if ((a.score_value || 0) > 0 && (a.score_value || 5) < 3.8)
    tags.push({ label: 'Spesa percepita come alta', tone: 'red' })
  return tags
}

export default function AdminRow({ admin: a, buildings = [], expanded, onToggle }) {
  const tags = autoAdminTags(a)

  return (
    <div style={{
      background: 'var(--white)', border: '1px solid var(--border)', borderRadius: 12,
      overflow: 'hidden', boxShadow: expanded ? '0 4px 20px rgba(0,0,0,0.07)' : 'none',
      transition: 'box-shadow 0.15s',
    }}>
      {/* Header: righe pulite a piena larghezza, nessuna colonna in competizione con il testo */}
      <div style={{ padding: '20px 24px' }}>
        {/* Riga 1: avatar + nome studio + badge verificato + espandi */}
        <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
          <AdminAnimalAvatar adminId={a.id} size={52} />
          <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 16, fontWeight: 700 }}>{a.name}</span>
            {a.verified && (
              <span style={{
                color: '#10B981', fontSize: 13, fontWeight: 700,
                background: '#ECFDF5', borderRadius: '50%', width: 18, height: 18,
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }} title="Verificato">✓</span>
            )}
          </div>
          <button
            onClick={onToggle}
            aria-label={expanded ? 'Comprimi dettagli' : 'Espandi dettagli'}
            style={{
              width: 30, height: 30, borderRadius: '50%', border: '1px solid var(--border)',
              background: 'var(--white)', display: 'flex', alignItems: 'center',
              justifyContent: 'center', cursor: 'pointer', flexShrink: 0,
              fontSize: 10, color: 'var(--text-3)', transition: 'transform 0.2s',
              transform: expanded ? 'rotate(180deg)' : 'none',
            }}
          >▼</button>
        </div>

        {/* Riga 2: stelle + conteggio recensioni */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: scoreColor(a.score) }}>{a.score?.toFixed(1)}</span>
          <RatingDots value={a.score} size={11} />
          <span style={{ fontSize: 12, color: 'var(--text-4)' }}>({a.review_count} recensioni)</span>
        </div>

        {/* Riga 3: metadati su una riga, wrap normale se lo spazio non basta */}
        <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 8, lineHeight: 1.5 }}>
          {a.building_count} condomini gestiti · {a.city} · Attivo dal {a.active_since}
        </div>

        {/* Ultima riga: Vedi profilo, da solo, a destra */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 14 }}>
          <Link className="btn btn-ghost" href={`/amministratore/${a.id}`} onClick={e => e.stopPropagation()}>
            Vedi profilo
          </Link>
        </div>
      </div>

      {/* Expanded section */}
      {expanded && (
        <div style={{ borderTop: '1px solid var(--border-2)', padding: '20px 24px' }}>
          {/* Score bars — vanno a capo su più righe se non c'è spazio, mai in overflow orizzontale */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20, marginBottom: 24 }}>
            <ScoreCell label="Trasparenza" value={a.score_transparency} />
            <ScoreCell label="Tempi di risposta" value={a.score_speed} />
            <ScoreCell label="Manutenzione" value={a.score_maintenance} />
            <ScoreCell label="Costi" value={a.score_value} />
            <ScoreCell label="Assemblee" value={a.score_assemblies} />
          </div>

          {/* Building cards — same style as Esplora */}
          {buildings.length > 0 && (
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>
                Condomini amministrati
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {buildings.slice(0, 3).map(b => <BuildingRow key={b.id} building={b} />)}
              </div>
            </div>
          )}

          {/* Auto tags */}
          {tags.length > 0 && (
            <div style={{ marginTop: 18 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-2)', marginBottom: 8 }}>
                Recensioni ricapitolate dai condomini{' '}
                <span style={{ color: 'var(--text-4)', cursor: 'help' }} title="Generati automaticamente dai punteggi">ⓘ</span>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {tags.map((t, i) => (
                  <span key={i} className={`tag ${t.tone}`}>
                    {t.tone === 'green' ? '✓ ' : t.tone === 'amber' ? '⚠ ' : '✕ '}
                    {t.label}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function ScoreCell({ label, value }) {
  const color = scoreColor(value)
  const pct = value != null ? (value / 5) * 100 : 0
  return (
    <div style={{ flex: '1 1 130px', minWidth: 130 }}>
      <div style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 500, marginBottom: 5, whiteSpace: 'nowrap' }}>
        {label}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <div style={{ flex: 1, height: 4, background: 'var(--border)', borderRadius: 100, overflow: 'hidden' }}>
          <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 100 }} />
        </div>
        <span style={{ fontSize: 11, fontWeight: 700, color, whiteSpace: 'nowrap' }}>
          {value != null ? value.toFixed(1) : '—'}
          <span style={{ color: 'var(--text-4)', fontWeight: 400 }}> /5</span>
        </span>
      </div>
    </div>
  )
}

// Animale con cerchio arancione condoranked, uguale allo stile profilo
function AdminAnimalAvatar({ adminId, size = 52 }) {
  const animal = defaultAvatarFor(adminId || '')
  const ring = ROLES.condoranked.color  // arancione
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      border: `2.5px solid ${ring}`, overflow: 'hidden',
      background: 'var(--bg)',
    }}>
      <img src={animal.src} alt={animal.label}
        style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
    </div>
  )
}
