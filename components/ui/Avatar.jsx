import { defaultAvatarFor, avatarById, ROLES } from '@/lib/avatars'

// Avatar circolare con anello colorato e pallino ruolo sotto.
// Supporta sia gli animali scelti (avatar_id) sia una vera foto (photoUrl).
export default function Avatar({ userId, avatarId, photoUrl, role, size = 96, showRole = true }) {
  const roleConf = role ? ROLES[role] : null
  const ring = roleConf ? roleConf.color : 'var(--teal)'

  // Determina la sorgente immagine: foto reale > animale scelto > animale default
  let imgSrc
  let imgAlt = 'Avatar'
  if (photoUrl && (photoUrl.startsWith('data:') || photoUrl.startsWith('http'))) {
    imgSrc = photoUrl
    imgAlt = 'Foto profilo'
  } else {
    const animal = avatarById(avatarId) || defaultAvatarFor(userId)
    imgSrc = animal.src
    imgAlt = animal.label
  }

  return (
    <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{
        width: size, height: size, borderRadius: '50%',
        border: `3px solid ${ring}`, overflow: 'hidden',
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)', background: 'var(--bg)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <img src={imgSrc} alt={imgAlt}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      </div>
      {showRole && roleConf && (
        <div style={{
          background: roleConf.color, color: '#fff',
          fontSize: 12, fontWeight: 700, padding: '4px 14px',
          borderRadius: 100, marginTop: -14, position: 'relative',
          boxShadow: '0 2px 6px rgba(0,0,0,0.12)',
        }}>
          {roleConf.label}
        </div>
      )}
    </div>
  )
}
