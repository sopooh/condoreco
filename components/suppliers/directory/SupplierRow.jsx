'use client'

import { useState } from 'react'
import { Building2, MapPin, Wrench } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useSession } from '@/components/providers/SessionProvider'
import { maintenanceCategory } from '@/lib/maintenanceCategories'
import MaintenanceIcon from '@/components/condo/MaintenanceIcon'
import ContactSheet from '@/components/directory/ContactSheet'
import ProfileListCard from '@/components/profiles/ProfileListCard'
import { toneFor } from '@/components/admins/AdminRow'

// Card fornitore: stessa card degli amministratori (ProfileListCard).
// Telefono ed email si leggono solo da registrati (RLS su suppliers).
export default function SupplierRow({ supplier: s }) {
  const session = useSession()
  const [open, setOpen] = useState(false)
  const [contact, setContact] = useState(null)
  const [busy, setBusy] = useState(false)

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

  const cats = (s.categories || []).slice(0, 2).map(maintenanceCategory)
  const noContact = contact && !contact.phone && !contact.email

  return (
    <>
      <ProfileListCard
        href={`/fornitori/${s.id}`}
        name={s.company_name}
        verified={s.verified}
        sample={s.is_sample}
        roleLabel="Fornitore"
        chips={cats.map((c) => ({ label: c.label, icon: <MaintenanceIcon name={c.icon} size={15} /> }))}
        score={s.score ?? null}
        tone={toneFor(s.score ?? null)}
        icon={<MaintenanceIcon name={cats[0]?.icon || 'wrench'} size={30} />}
        meta={[
          { icon: <Wrench size={17} aria-hidden="true" />, text: `${s.jobs} ${s.jobs === 1 ? 'intervento' : 'interventi'}` },
          { icon: <Building2 size={17} aria-hidden="true" />, text: `${s.condos} ${s.condos === 1 ? 'condominio' : 'condomini'}` },
          { icon: <MapPin size={17} aria-hidden="true" />, text: s.zones?.length ? s.zones.join(', ') : 'Tutte le zone' },
        ]}
        onContact={s.is_sample ? null : openContact}
        contactLabel={busy ? 'Carico…' : 'Contatta'}
      />
      {!s.is_sample && (
        <ContactSheet open={open} onClose={() => setOpen(false)} name={s.company_name}
          phone={contact?.phone} email={contact?.email}
          note={noContact ? 'Nessun contatto pubblico. Aggiungilo ai fornitori del tuo condominio (Interventi, Cerca fornitori) e scrivigli nella chat dell’intervento.' : null} />
      )}
    </>
  )
}
