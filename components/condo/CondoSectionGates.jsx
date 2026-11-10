'use client'

import CondoMemberGate from '@/components/condo/CondoMemberGate'
import InterventionsPage from '@/components/condo/InterventionsPage'
import BachecaPage from '@/components/condo/BachecaPage'
import ChatPage from '@/components/condo/ChatPage'
import ArchivePage from '@/components/condo/ArchivePage'

// Sezioni dell'area condominio dietro il gate membri condiviso.
const PAGES = { interventi: InterventionsPage, bacheca: BachecaPage, chat: ChatPage, archivio: ArchivePage }

export default function CondoSectionGate({ building, section }) {
  const Page = PAGES[section]
  return (
    <CondoMemberGate building={building}>
      <Page building={building} />
    </CondoMemberGate>
  )
}
