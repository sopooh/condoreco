import BuildingPreviewImage from '@/components/buildings/BuildingPreviewImage'
import { ROLES } from '@/lib/avatars'

// Card di apertura dell'area privata: stesso stile della card condominio già
// usata in BuildingRow (bianca, bordo 1px, radius 16) ma senza chip/pulsanti/
// icone punteggio, che qui non hanno senso.
export default function CondoPrivateHeader({ building }) {
  const roleConf = ROLES.condoranker

  return (
    <div style={{
      display: 'flex', gap: 14, background: 'var(--white)',
      border: '1px solid var(--border)', borderRadius: 16, padding: 14,
    }}>
      <div style={{ width: 100, minWidth: 100, height: 100, flexShrink: 0, borderRadius: 10, overflow: 'hidden' }}>
        <BuildingPreviewImage building={building} height="100%" radius={10} />
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--teal-dk)', marginBottom: 2 }}>
          {building.address}{building.street_number ? `, ${building.street_number}` : ''}
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: 4 }}>
          Area privata del condominio
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
          <span className="profile-pill" style={{ background: roleConf.color, color: '#fff', border: 'none' }}>
            <PersonIcon /> {roleConf.label}
          </span>
          <span className="profile-pill profile-pill-violet">
            <LockIcon /> Solo iscritti
          </span>
          {building.status === 'verified' && (
            <span className="profile-pill profile-pill-teal">
              <ShieldCheckIcon /> Verificata
            </span>
          )}
        </div>

        <div style={{ fontSize: 13, color: 'var(--text-3)' }}>
          Bacheca, decisioni e chat per i residenti verificati.
        </div>
      </div>
    </div>
  )
}

function PersonIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  )
}

function LockIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 018 0v4" />
    </svg>
  )
}

function ShieldCheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M12 2l8 4v6c0 5-3.5 8-8 10-4.5-2-8-5-8-10V6l8-4z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  )
}
