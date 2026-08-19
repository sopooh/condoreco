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
  { key: 'heating', label: 'Riscaldamento', icon: HeatingIcon, get: (b) => b.heating_type ?? null },
]

export default function BuildingFacts({ building }) {
  return (
    <div style={{ background: 'var(--white)', border: '1px solid var(--border)', borderRadius: 16, padding: '20px 24px' }}>
      <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 18 }}>Spese e caratteristiche del palazzo</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', columnGap: 16, rowGap: 20 }}>
        {FACTS.map(({ key, label, icon: Icon, get }) => (
          <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
            <div style={{ width: 26, height: 26, color: 'var(--teal-dk)', flexShrink: 0 }}><Icon /></div>
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

function CoinsIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="100%" height="100%">
      <ellipse cx="9" cy="7" rx="6" ry="3.5" />
      <path d="M3 7v4c0 1.93 2.69 3.5 6 3.5s6-1.57 6-3.5V7" />
      <path d="M9 14.5v2c0 1.93 2.69 3.5 6 3.5s6-1.57 6-3.5v-6c0-1.4-1.44-2.6-3.5-3.15" />
    </svg>
  )
}

function BuildingIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="100%" height="100%">
      <path d="M3 21h18M4 21V10l8-6 8 6v11M9 21v-6h6v6" />
    </svg>
  )
}

function StairsIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" width="100%" height="100%">
      <path d="M3 21v-4h4v-4h4v-4h4V5h4" />
    </svg>
  )
}

function UnitsIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="100%" height="100%">
      <rect x="3" y="3" width="8" height="8" rx="1" />
      <rect x="13" y="3" width="8" height="8" rx="1" />
      <rect x="3" y="13" width="8" height="8" rx="1" />
      <rect x="13" y="13" width="8" height="8" rx="1" />
    </svg>
  )
}

function ElevatorIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="100%" height="100%">
      <rect x="4" y="3" width="16" height="18" rx="1.5" />
      <path d="M10 8l2-2 2 2M10 15l2 2 2-2" />
    </svg>
  )
}

function ConciergeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="100%" height="100%">
      <path d="M3 18h18M5 18a7 7 0 0114 0M12 4v3" />
    </svg>
  )
}

function ParkingIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="100%" height="100%">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M9 16V8h3.5a2.5 2.5 0 010 5H9" />
    </svg>
  )
}

function GardenIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="100%" height="100%">
      <path d="M12 21V10M12 10C7 10 4 7 4 3c4 0 7 3 7 7zM12 10c0-4 3-7 7-7 0 4-3 7-7 7z" />
    </svg>
  )
}

function TerraceIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" width="100%" height="100%">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4L7 17M17 7l1.4-1.4" />
    </svg>
  )
}

function HeatingIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="100%" height="100%">
      <path d="M12 2c1 3-2 4-2 7a3 3 0 006 0c1.5 1.5 2 3 2 5a6 6 0 11-12 0c0-4 2-5 3-8 1 1 1 2 1 3 1-2 1-5 2-7z" />
    </svg>
  )
}
