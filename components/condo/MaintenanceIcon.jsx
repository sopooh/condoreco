import { ArrowUpDown, Heater, Zap, Droplets, Waves, KeyRound, Antenna, BrickWall, Ellipsis } from 'lucide-react'

// Icone delle categorie di manutenzione (lib/maintenanceCategories.js), da lucide.dev
const ICONS = {
  elevator: ArrowUpDown,
  radiator: Heater,
  bolt: Zap,
  tap: Droplets,
  drain: Waves,
  key: KeyRound,
  antenna: Antenna,
  bricks: BrickWall,
  dots: Ellipsis,
}

export default function MaintenanceIcon({ name, size = 26 }) {
  const Icon = ICONS[name] || Ellipsis
  return <Icon size={size} strokeWidth={1.8} aria-hidden="true" />
}
