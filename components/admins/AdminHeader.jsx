import ScoreBar from '@/components/ui/ScoreBar'
import AdminContactButton from '@/components/admins/AdminContactButton'
import { scoreColor } from '@/lib/score'

export default function AdminHeader({ admin: a }) {
  return (
    <div style={{ background: 'var(--white)', borderBottom: '1px solid var(--border)' }}>
      <div className="wrap" style={{ padding: '32px 40px 24px' }}>
        <div className="admin-header-grid" style={{ display: 'grid', gap: 36, alignItems: 'start' }}>
          <div>
            <h1 style={{ fontSize: 32, fontWeight: 800, letterSpacing: '-1px', lineHeight: 1.1, marginBottom: 5 }}>
              {a.name}
            </h1>
            <div style={{ fontSize: 13, color: 'var(--text-4)', marginBottom: 18, fontWeight: 500 }}>
              {a.address} · {a.city} · attivo dal {a.active_since} · {a.building_count} condomini gestiti
            </div>
            <div style={{ marginBottom: 20 }}>
              <AdminContactButton admin={a} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7, maxWidth: 420 }}>
              <ScoreBar label="Reperibilità" value={a.score_availability} />
              <ScoreBar label="Trasparenza" value={a.score_transparency} />
              <ScoreBar label="Velocità" value={a.score_speed} />
              <ScoreBar label="Assemblee" value={a.score_assemblies} />
              <ScoreBar label="Qualità/prezzo" value={a.score_value} />
            </div>
          </div>
          <div style={{ background: 'var(--teal-lt)', borderRadius: 10, padding: 20, textAlign: 'center' }}>
            <div style={{ fontSize: 52, fontWeight: 800, color: scoreColor(a.score), letterSpacing: '-2px', lineHeight: 1 }}>
              {a.score?.toFixed(1) ?? 'N/D'}<span style={{ fontSize: 18, color: 'var(--teal-mid)' }}>/5</span>
            </div>
            <div style={{ fontSize: 11, color: 'var(--teal-dk)', fontWeight: 600, marginTop: 5, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Rating amministratore
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-4)', marginTop: 3 }}>{a.review_count} recensioni</div>
          </div>
        </div>
      </div>
    </div>
  )
}
