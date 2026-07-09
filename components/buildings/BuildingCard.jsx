'use client'

import { useRouter } from 'next/navigation'
import Card from '@/components/ui/Card'
import Tag from '@/components/ui/Tag'
import IconRow from '@/components/buildings/IconRow'
import BuildingPreviewImage from '@/components/buildings/BuildingPreviewImage'
import { autoTags, scoreColor } from '@/lib/score'

export default function BuildingCard({ building: b }) {
  const router = useRouter()
  const tags = autoTags(b)

  return (
    <Card onClick={() => router.push(`/edificio/${b.id}`)}>
      {/* Foto / Mappa statica in cima alla card */}
      <div style={{ borderRadius: '10px 10px 0 0', overflow: 'hidden' }}>
        <BuildingPreviewImage building={b} height={180} radius={0} />
      </div>

      <div style={{ padding: 18 }}>
        {/* Score + recensioni */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: 28, fontWeight: 800, color: scoreColor(b.score), letterSpacing: '-1px', lineHeight: 1 }}>
              {b.score?.toFixed(1) ?? '—'}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-4)', marginTop: 4, fontWeight: 500 }}>
              {b.review_count || 0} {b.review_count === 1 ? 'recensione' : 'recensioni'}
            </div>
          </div>
          {b.verified_count > 0 && (
            <span style={{
              fontSize: 11, fontWeight: 600, color: 'var(--teal-dk)',
              background: 'var(--teal-lt)', borderRadius: 4, padding: '2px 7px',
            }}>{b.verified_count} verificati</span>
          )}
        </div>

        {/* Indirizzo */}
        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 2 }}>
          {b.address}{b.street_number ? `, ${b.street_number}` : ''}
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-4)', marginBottom: 14, fontWeight: 500 }}>
          {b.city}{b.neighborhood ? ` · ${b.neighborhood}` : ''}
        </div>

        {/* Icon row */}
        <div style={{ paddingBottom: 14, marginBottom: 14, borderBottom: '1px solid var(--border-2)' }}>
          <IconRow b={b} />
        </div>

        {/* Tag auto */}
        {tags.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
            {tags.map(t => <Tag key={t.label} label={t.label} tone={t.tone} />)}
          </div>
        )}
      </div>
    </Card>
  )
}
