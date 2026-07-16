import AddBuildingFlow from '@/components/buildings/AddBuildingFlow'

export const metadata = {
  title: 'Aggiungi un condominio',
  description: 'Registra un condominio non ancora presente su CondoReco: indirizzo, spese, servizi e amministratore.',
}

export default function AggiungiCondominioPage() {
  return <AddBuildingFlow />
}
