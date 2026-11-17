import BuildingList from '@/components/buildings/BuildingList'

export default function AdminBuildings({ buildings }) {
  return (
    <div style={{ padding: '24px 0 8px' }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-4)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16 }}>
        Palazzi amministrati ({buildings.length})
      </div>
      <BuildingList buildings={buildings} />
    </div>
  )
}
