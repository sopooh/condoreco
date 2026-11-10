import {
  ArrowUpDown, ConciergeBell, Dumbbell, WavesLadder, Sprout, Sun, SquareParking, Car, Bike, PlugZap,
  Fence, Package, Trash2, LandPlot, WashingMachine, Sofa, Cctv, Accessibility, Smartphone, Wifi, Circle,
} from 'lucide-react'

// Icone dei servizi del condominio (id come in lib/amenities.js), da lucide.dev
const ICONS = {
  elevator: ArrowUpDown, concierge: ConciergeBell, gym: Dumbbell, pool: WavesLadder, garden: Sprout,
  terrace: Sun, parking: SquareParking, box: Car, bike_room: Bike, ev_charging: PlugZap, gate: Fence,
  basement: Package, trash_room: Trash2, courtyard: LandPlot, laundry: WashingMachine, common_room: Sofa,
  cctv: Cctv, disabled_access: Accessibility, intercom: Smartphone, fiber: Wifi,
}

export function AmenityIcon({ id, size = 22 }) {
  const Icon = ICONS[id] || Circle
  return <Icon size={size} strokeWidth={1.7} aria-hidden="true" style={{ flexShrink: 0 }} />
}
