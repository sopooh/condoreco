'use client'

import { useState } from 'react'
import { Building2, Check, ChevronDown, Mail, MapPin, Phone, Wrench } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useSession } from '@/components/providers/SessionProvider'
import { maintenanceCategory } from '@/lib/maintenanceCategories'
import MaintenanceIcon from '@/components/condo/MaintenanceIcon'
import { ROLES } from '@/lib/avatars'
import { telLink, waLink } from '@/lib/contact'

const PURPLE = ROLES.condofixer.color

function initials(name) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase()
}

// Card fornitore sul modello di AdminRow: intestazione sempre visibile,
// dettagli e contatti nella parte espandibile.
export default function SupplierRow({ supplier: s, expanded, onToggle }) {
  const session = useSession()
  const [contact, setContact] = useState(null)
  const [loading, setLoading] = useState(false)

  async function showContact() {
    if (!session) {
      window.dispatchEvent(new CustomEvent('condoreco:open-auth', { detail: { next: '/fornitori' } }))
      return
    }
    setLoading(true)
    const { data } = await createClient().from('suppliers').select('phone, email').eq('id', s.id).maybeSingle()
    setContact(data || { phone: null, email: null })
    setLoading(false)
  }

  const since = new Date(s.created_at).toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })

  return (
    <div id={`supplier-${s.id}`} style={{
      background: 'var(--white)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden',
      boxShadow: expanded ? '0 4px 20px rgba(0,0,0,0.07)' : 'none', transition: 'box-shadow 0.15s',
    }}>
      <div style={{ padding: '20px 24px' }} className="supplier-row-head">
        <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
          <div aria-hidden="true" style={{
            width: 52, height: 52, borderRadius: '50%', flexShrink: 0, border: `2.5px solid ${PURPLE}`,
            background: '#F3EEFF', color: '#6D28D9', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 17, fontWeight: 800,
          }}>{initials(s.company_name) || <Wrench size={22} />}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 16, fontWeight: 700, overflowWrap: 'anywhere' }}>{s.company_name}</span>
              {s.verified && (
                <span title="Verificato" style={{ color: '#10B981', background: '#ECFDF5', borderRadius: '50%', width: 18, height: 18, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Check size={12} strokeWidth={3} aria-hidden="true" />
                </span>
              )}
            </div>
            <span style={{ display: 'inline-block', marginTop: 4, fontSize: 11.5, fontWeight: 700, color: '#6D28D9', background: '#F3EEFF', padding: '2px 9px', borderRadius: 999 }}>Recofixer</span>
          </div>
          <button onClick={onToggle} aria-label={expanded ? 'Comprimi dettagli' : 'Espandi dettagli'} aria-expanded={expanded} style={{
            width: 34, height: 34, minHeight: 0, borderRadius: '50%', border: '1px solid var(--border)', background: 'var(--white)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0,
            color: 'var(--text-3)', transition: 'transform 0.2s', transform: expanded ? 'rotate(180deg)' : 'none',
          }}><ChevronDown size={18} strokeWidth={2} aria-hidden="true" /></button>
        </div>

        {/* Categorie */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 12 }}>
          {s.categories.map((c) => {
            const cat = maintenanceCategory(c)
            return (
              <span key={c} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12.5, fontWeight: 600, color: 'var(--teal-dk)', background: 'var(--teal-lt)', padding: '4px 10px', borderRadius: 999 }}>
                <MaintenanceIcon name={cat.icon} size={14} />{cat.label}
              </span>
            )
          })}
        </div>

        <div style={{ fontSize: 12.5, color: 'var(--text-3)', marginTop: 10, lineHeight: 1.6, display: 'flex', flexWrap: 'wrap', columnGap: 12 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Wrench size={13} aria-hidden="true" />{s.jobs} {s.jobs === 1 ? 'intervento completato' : 'interventi completati'}</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Building2 size={13} aria-hidden="true" />{s.condos} {s.condos === 1 ? 'condominio' : 'condomini'}</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><MapPin size={13} aria-hidden="true" />{s.zones.length ? s.zones.join(', ') : 'Tutte le zone'}</span>
        </div>
      </div>

      {expanded && (
        <div style={{ borderTop: '1px solid var(--border-2)', padding: '18px 24px 20px' }}>
          {s.description && <p style={{ fontSize: 14, color: 'var(--text-2)', lineHeight: 1.6, margin: '0 0 14px', whiteSpace: 'pre-line' }}>{s.description}</p>}
          <div style={{ fontSize: 12.5, color: 'var(--text-4)', marginBottom: 14 }}>Su Condoreco da {since}</div>

          {contact ? (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {contact.phone && <a href={telLink(contact.phone)} style={btn}><Phone size={16} aria-hidden="true" />Chiama</a>}
              {contact.phone && <a href={waLink(contact.phone, '')} target="_blank" rel="noopener noreferrer" style={btn}>WhatsApp</a>}
              {contact.email && <a href={`mailto:${contact.email}`} style={btn}><Mail size={16} aria-hidden="true" />Email</a>}
              {!contact.phone && !contact.email && <span style={{ fontSize: 13, color: 'var(--text-3)' }}>Nessun contatto pubblico: aggiungilo alla rubrica del tuo condominio e scrivigli in chat.</span>}
            </div>
          ) : (
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-ghost" onClick={showContact} disabled={loading}>
                {loading ? 'Carico…' : session ? 'Mostra contatti' : 'Accedi per i contatti'}
              </button>
            </div>
          )}
          <p style={{ fontSize: 12, color: 'var(--text-4)', margin: '12px 0 0' }}>
            Per affidargli un intervento vai nel tuo condominio, sezione Interventi, e usa <strong style={{ color: 'var(--text-3)' }}>Cerca Recofixer</strong> nella rubrica fornitori.
          </p>
        </div>
      )}
    </div>
  )
}

const btn = {
  display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 14px', borderRadius: 10,
  border: '1px solid var(--border)', background: 'var(--white)', color: 'var(--teal-dk)', fontWeight: 700, fontSize: 13.5,
}
