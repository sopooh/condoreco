import BuildingCard from '@/components/buildings/BuildingCard'

export default function BuildingList({ buildings }) {
  if (!buildings.length) {
    return (
      <div className="empty">
        <div className="empty-title">Nessun edificio trovato</div>
        <p>Prova a cambiare città o ad aggiungere il primo edificio della zona.</p>
      </div>
    )
  }
  return (
    <div className="building-list-grid">
      {buildings.map((b) => <BuildingCard key={b.id} building={b} />)}
    </div>
  )
}
