'use client'

import { useState } from 'react'
import Link from 'next/link'
import { BadgeCheck, Bookmark, Building2, CalendarDays, Mail, MapPin } from 'lucide-react'
import Stars, { formatScore } from '@/components/directory/Stars'
import ContactSheet from '@/components/directory/ContactSheet'
import { defaultAvatarFor, ROLES } from '@/lib/avatars'

// Card della lista Amministratori: avatar, nome con spunta se certificato,
// segnalibro, voto a stelle, dati principali e i due pulsanti.
// Punteggi per categoria, condomini e recensioni stanno nel profilo.
export default function AdminRow({ admin: a, saved = false, onToggleSave }) {
  const [contactOpen, setContactOpen] = useState(false)
  const canContact = Boolean(a.phone || a.email)
  const score = formatScore(a.score)

  return (
    <article className="dir-card">
      <div className="dir-card-top">
        <AdminAnimalAvatar adminId={a.id} size={64} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <h2 className="dir-card-name" style={{ margin: 0 }}>
            <Link href={`/amministratore/${a.id}`}>{a.name}</Link>
            {a.verified && (
              <span className="dir-badge" title="Certificato">
                <BadgeCheck size={22} strokeWidth={2} fill="var(--teal)" color="#fff" aria-label="Certificato" />
              </span>
            )}
          </h2>
          <div className="dir-rating">
            {score && <b>{score}</b>}
            <Stars value={a.score} size={17} />
            <span className="muted">{a.review_count > 0 ? `(${a.review_count} recension${a.review_count === 1 ? 'e' : 'i'})` : 'Ancora nessuna recensione'}</span>
          </div>
        </div>
        <button type="button" className={`dir-bookmark${saved ? ' is-on' : ''}`} onClick={onToggleSave}
          aria-pressed={saved} aria-label={saved ? 'Rimuovi dai salvati' : 'Salva amministratore'}>
          <Bookmark size={24} strokeWidth={2} fill={saved ? 'currentColor' : 'none'} aria-hidden="true" />
        </button>
      </div>

      <div className="dir-meta">
        <span><Building2 size={18} strokeWidth={1.8} aria-hidden="true" />{a.building_count} {a.building_count === 1 ? 'condominio gestito' : 'condomini gestiti'}</span>
        {a.city && <span><MapPin size={18} strokeWidth={1.8} aria-hidden="true" />{a.city}</span>}
        {a.active_since && <span><CalendarDays size={18} strokeWidth={1.8} aria-hidden="true" />Attivo dal {a.active_since}</span>}
      </div>

      <div className={`dir-actions${canContact ? '' : ' is-single'}`}>
        <Link href={`/amministratore/${a.id}`} className="dir-btn dir-btn-ghost">Vedi profilo</Link>
        {canContact && (
          <button type="button" className="dir-btn dir-btn-primary" onClick={() => setContactOpen(true)}>
            <Mail size={20} strokeWidth={2} aria-hidden="true" />Contatta
          </button>
        )}
      </div>

      <ContactSheet open={contactOpen} onClose={() => setContactOpen(false)} name={a.name} phone={a.phone} email={a.email} />
    </article>
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
