import Link from 'next/link'
import { defaultAvatarFor, ROLES } from '@/lib/avatars'

function AdminAvatar({ adminId }) {
  const animal = defaultAvatarFor(adminId || '')
  const ringColor = ROLES.condoranked?.color || 'var(--teal)'
  return (
    <div style={{
      width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
      border: `2.5px solid ${ringColor}`, overflow: 'hidden', background: 'var(--bg)',
    }}>
      <img src={animal.src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
    </div>
  )
}

export default function AdminCard({ admin }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-4)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>Amministratore</div>
      <Link href={`/amministratore/${admin.id}`}>
        <div style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 14, background: '#fff' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <AdminAvatar adminId={admin.id} />
            <div>
              <div style={{ fontSize: 14, fontWeight: 700 }}>{admin.name}</div>
              <div style={{ fontSize: 11, color: 'var(--text-4)' }}>{admin.city} · Attivo dal {admin.active_since}</div>
            </div>
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-4)', marginBottom: 10 }}>
            {admin.building_count} condomini gestiti
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 10, borderTop: '1px solid var(--border)' }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--teal)' }}>{admin.score?.toFixed(1) ?? '—'}</div>
            <div style={{ fontSize: 11, color: 'var(--text-4)' }}>Rating admin<br />{admin.review_count} recensioni</div>
          </div>
        </div>
      </Link>
    </div>
  )
}
