'use client'

import { useState } from 'react'
import { Building2, CalendarDays, MapPin } from 'lucide-react'
import ContactSheet from '@/components/directory/ContactSheet'
import ProfileListCard from '@/components/profiles/ProfileListCard'

export const toneFor = (score) => (score == null ? 'teal' : score >= 4 ? 'teal' : score >= 3.5 ? 'orange' : 'red')

// Card della lista Amministratori: stessa card dei fornitori (ProfileListCard).
export default function AdminRow({ admin: a }) {
  const [contactOpen, setContactOpen] = useState(false)
  const canContact = !a.is_sample && Boolean(a.phone || a.email)

  return (
    <>
      <ProfileListCard
        href={`/amministratore/${a.id}`}
        name={a.name}
        verified={a.verified}
        sample={a.is_sample}
        roleLabel="Amministratore"
        score={a.review_count > 0 ? a.score : null}
        tone={toneFor(a.review_count > 0 ? a.score : null)}
        icon={<Building2 size={30} strokeWidth={1.8} />}
        meta={[
          { icon: <Building2 size={17} aria-hidden="true" />, text: `${a.building_count} ${a.building_count === 1 ? 'condominio gestito' : 'condomini gestiti'}` },
          a.city && { icon: <MapPin size={17} aria-hidden="true" />, text: a.city },
          a.active_since && { icon: <CalendarDays size={17} aria-hidden="true" />, text: `Attivo dal ${a.active_since}` },
        ].filter(Boolean)}
        onContact={canContact ? () => setContactOpen(true) : null}
      />
      {canContact && <ContactSheet open={contactOpen} onClose={() => setContactOpen(false)} name={a.name} phone={a.phone} email={a.email} />}
    </>
  )
}
