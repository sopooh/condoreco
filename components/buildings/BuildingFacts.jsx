import { ArrowUpDown, Broom, ChartNoAxesColumnIncreasing, Coins, ConciergeBell, Flame, House, LayoutGrid, Sprout, SquareParking, Sun } from 'lucide-react'
// Sezione "Spese condominiali + caratteristiche del palazzo": riga di
// icone in stile Booking/Stoop, sostituisce la vecchia lista testuale
// "Info edificio" in sidebar — stessi dati, più in vista. Mai un valore
// inventato: null/undefined resta N/D, un booleano noto (anche false)
// mostra Sì/No.
const FACTS = [
  { key: 'fee', label: 'Spese condominiali', icon: CoinsIcon, get: (b) => b.monthly_fee != null ? `€ ${b.monthly_fee} / mese` : null },
  { key: 'year', label: 'Anno di costruzione', icon: BuildingIcon, get: (b) => b.year_built ?? null },
  { key: 'floors', label: 'Piani', icon: StairsIcon, get: (b) => b.floors ?? null },
  { key: 'units', label: 'Unità abitative', icon: UnitsIcon, get: (b) => b.units ?? null },
  { key: 'elevator', label: 'Ascensore', icon: ElevatorIcon, get: (b) => boolLabel(b.has_elevator) },
  { key: 'concierge', label: 'Portineria', icon: ConciergeIcon, get: (b) => boolLabel(b.has_concierge) },
  { key: 'parking', label: 'Parcheggio / garage', icon: ParkingIcon, get: (b) => boolLabel(b.has_parking ?? b.has_box) },
  { key: 'garden', label: 'Giardino', icon: GardenIcon, get: (b) => boolLabel(b.has_garden) },
  { key: 'terrace', label: 'Terrazzo comune', icon: TerraceIcon, get: (b) => boolLabel(b.has_terrace) },
  { key: 'stairs_cleaning', label: 'Pulizia scale', icon: BroomIcon, get: (b) => boolLabel(b.has_stairs_cleaning) },
  { key: 'heating', label: 'Riscaldamento', icon: HeatingIcon, get: (b) => b.heating_type ?? null },
]

export default function BuildingFacts({ building }) {
  return (
    <div style={{ background: 'var(--white)', border: '1px solid var(--border)', borderRadius: 16, padding: '20px 24px' }}>
      <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 18 }}>Spese e caratteristiche del palazzo</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', columnGap: 16, rowGap: 20 }}>
        {FACTS.map(({ key, label, icon: Icon, get }) => (
          <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
            <div style={{ width: 26, height: 26, color: 'var(--teal-dk)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon size={24} /></div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 11, color: 'var(--text-4)', fontWeight: 500, marginBottom: 2, whiteSpace: 'nowrap' }}>{label}</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-2)' }}>{get(building) ?? 'N/D'}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function boolLabel(v) {
  if (v == null) return null
  return v ? 'Sì' : 'No'
}

function CoinsIcon({ size = 24 } = {}) { return <Coins size={size} strokeWidth={2} aria-hidden="true" /> }

function BuildingIcon({ size = 24 } = {}) { return <House size={size} strokeWidth={2} aria-hidden="true" /> }

function StairsIcon({ size = 24 } = {}) { return <ChartNoAxesColumnIncreasing size={size} strokeWidth={2} aria-hidden="true" /> }

function UnitsIcon({ size = 24 } = {}) { return <LayoutGrid size={size} strokeWidth={2} aria-hidden="true" /> }

function ElevatorIcon({ size = 24 } = {}) { return <ArrowUpDown size={size} strokeWidth={2} aria-hidden="true" /> }

function ConciergeIcon({ size = 24 } = {}) { return <ConciergeBell size={size} strokeWidth={2} aria-hidden="true" /> }

function ParkingIcon({ size = 24 } = {}) { return <SquareParking size={size} strokeWidth={2} aria-hidden="true" /> }

function GardenIcon({ size = 24 } = {}) { return <Sprout size={size} strokeWidth={2} aria-hidden="true" /> }

function TerraceIcon({ size = 24 } = {}) { return <Sun size={size} strokeWidth={2} aria-hidden="true" /> }

function HeatingIcon({ size = 24 } = {}) { return <Flame size={size} strokeWidth={2} aria-hidden="true" /> }

function BroomIcon({ size = 24 } = {}) { return <Broom size={size} strokeWidth={2} aria-hidden="true" /> }
