'use client'

import CondoMemberGate from '@/components/condo/CondoMemberGate'
import InterventionsPage from '@/components/condo/InterventionsPage'
import BachecaPage from '@/components/condo/BachecaPage'
import ChatPage from '@/components/condo/ChatPage'
import ArchivePage from '@/components/condo/ArchivePage'
import AccountingPage from '@/components/condo/accounting/AccountingPage'
import RendicontazionePage from '@/components/condo/accounting/RendicontazionePage'
import PracticesPage from '@/components/condo/admin/PracticesPage'
import PeoplePage from '@/components/condo/admin/PeoplePage'
import BilancioPage from '@/components/condo/admin/BilancioPage'
import BilancioPrint from '@/components/condo/admin/BilancioPrint'
import JoinRequestsPage from '@/components/condo/admin/JoinRequestsPage'

// Sezioni dell'area condominio dietro il gate membri condiviso.
const PAGES = { interventi: InterventionsPage, bacheca: BachecaPage, chat: ChatPage, archivio: ArchivePage, contabilita: AccountingPage, rendicontazione: RendicontazionePage, pratiche: PracticesPage, persone: PeoplePage, bilancio: BilancioPage, stampa: BilancioPrint, richieste: JoinRequestsPage }

export default function CondoSectionGate({ building, section }) {
  const Page = PAGES[section]
  return (
    <CondoMemberGate building={building}>
      <Page building={building} />
    </CondoMemberGate>
  )
}
