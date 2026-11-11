'use client'

import { useState } from 'react'
import { BadgeCheck, Bookmark, Building2, ChevronDown, MapPin, MessageCircle, Wrench } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useSession } from '@/components/providers/SessionProvider'
import { maintenanceCategory } from '@/lib/maintenanceCategories'
import MaintenanceIcon from '@/components/condo/MaintenanceIcon'
import ContactSheet from '@/components/directory/ContactSheet'
import { ROLES } from '@/lib/avatars'

const PURPLE = ROLES.condofixer.color
const initials = (name) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase()

// Card fornitore, stesso schema della card amministratore.
// Telefono ed email si leggono solo da registrati (RLS su suppliers).
export default function SupplierRow({ supplier: s, saved = false, onToggleSave }) {
  const session = useSession()
  const [open, setOpen] = useState(false)
  const [contact, setContact] = useState(null)
  const [busy, setBusy] = useState(false)
  const [expanded, setExpanded] = useState(false)

  async function openContact() {
    if (!session) {
      window.dispatchEvent(new CustomEvent('condoreco:open-auth', { detail: { next: '/fornitori' } }))
      return
    }
    if (!contact) {
      setBusy(true)
      const { data } = await createClient().from('suppliers').select('phone, email').eq('id', s.id).maybeSingle()
      setContact(data || { phone: null, email: null })
      setBusy(false)
    }
    setOpen(true)
  }

  const since = new Date(s.created_at).toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })
  const noContact = contact && !contact.phone && !contact.email

  return (
    <article className="dir-card" id={`supplier-${s.id}`}>
      <div className="dir-card-top">
        <div aria-hidden="true" style={{
          width: 64, height: 64, borderRadius: '50%', flexShrink: 0, border: `3px solid ${PURPLE}`,
          background: '#F3EEFF', color: '#6D28D9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 800,
        }}>{initials(s.company_name) || <Wrench size={24} />}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h2 className="dir-card-name" style={{ margin: 0, overflowWrap: 'anywhere' }}>
            {s.company_name}
            {s.verified && (
              <span className="dir-badge" title="Verificato"><BadgeCheck size={22} strokeWidth={2} fill="var(--teal)" color="#fff" aria-label="Verificato" /></span>
            )}
          </h2>
          <span style={{ display: 'inline-block', marginTop: 6, fontSize: 12, fontWeight: 700, color: '#6D28D9', background: '#F3EEFF', padding: '3px 10px', borderRadius: 999 }}>Recofixer</span>
        </div>
        <button type="button" className={`dir-bookmark${saved ? ' is-on' : ''}`} onClick={onToggleSave}
          aria-pressed={saved} aria-label={saved ? 'Rimuovi dai salvati' : 'Salva fornitore'}>
          <Bookmark size={24} strokeWidth={2} fill={saved ? 'currentColor' : 'none'} aria-hidden="true" />
        </button>
      </div>

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 14 }}>
        {s.categories.map((c) => {
          const cat = maintenanceCategory(c)
          return (
            <span key={c} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 13, fontWeight: 600, color: 'var(--teal-dk)', background: 'var(--teal-lt)', padding: '5px 11px', borderRadius: 999 }}>
              <MaintenanceIcon name={cat.icon} size={15} />{cat.label}
            </span>
          )
        })}
      </div>

      <div className="dir-meta">
        <span><Wrench size={18} strokeWidth={1.8} aria-hidden="true" />{s.jobs} {s.jobs === 1 ? 'intervento' : 'interventi'}</span>
        <span><Building2 size={18} strokeWidth={1.8} aria-hidden="true" />{s.condos} {s.condos === 1 ? 'condominio' : 'condomini'}</span>
        <span><MapPin size={18} strokeWidth={1.8} aria-hidden="true" />{s.zones.length ? s.zones.join(', ') : 'Tutte le zone'}</span>
      </div>

      {expanded && (
        <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border-2)' }}>
          {s.description && <p style={{ fontSize: 14.5, color: 'var(--text-2)', lineHeight: 1.6, margin: '0 0 8px', whiteSpace: 'pre-line' }}>{s.description}</p>}
          <div style={{ fontSize: 13, color: 'var(--text-4)' }}>Su Condoreco da {since}</div>
        </div>
      )}

      <div className="dir-actions">
        <button type="button" className="dir-btn dir-btn-ghost" onClick={() => setExpanded((v) => !v)} aria-expanded={expanded}>
          {expanded ? 'Meno dettagli' : 'Dettagli'}<ChevronDown size={18} strokeWidth={2} aria-hidden="true" style={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }} />
        </button>
        <button type="button" className="dir-btn dir-btn-primary" onClick={openContact} disabled={busy}>
          <MessageCircle size={20} strokeWidth={2} aria-hidden="true" />{busy ? 'Carico…' : 'Contatta'}
        </button>
      </div>

      <ContactSheet open={open} onClose={() => setOpen(false)} name={s.company_name}
        phone={contact?.phone} email={contact?.email}
        note={noContact ? 'Nessun contatto pubblico. Aggiungilo alla rubrica fornitori del tuo condominio (Interventi, Cerca Recofixer) e scrivigli nella chat dell’intervento.' : 'Per affidargli un lavoro aggiungilo alla rubrica fornitori del tuo condominio: così potete usare la chat dell’intervento.'} />
    </article>
  )
}

