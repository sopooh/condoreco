import {
  House, Building2, Users, UserPlus, Flag, Activity, ChartColumn, CalendarDays, ChevronDown,
  ArrowRight, Info, TrendingUp, TrendingDown, Star, Camera, Download, List, FileCheck2,
} from 'lucide-react'

// Icone dell'area admin, da lucide.dev
const ICONS = {
  home: House, building: Building2, users: Users, userPlus: UserPlus, flag: Flag, pulse: Activity,
  chart: ChartColumn, calendar: CalendarDays, chevronDown: ChevronDown, arrowRight: ArrowRight, info: Info,
  trendUp: TrendingUp, trendDown: TrendingDown, star: Star, camera: Camera, download: Download, list: List, fileCheck: FileCheck2,
}

export function AdminIcon({ name, size = 20 }) {
  const Icon = ICONS[name]
  return Icon ? <Icon size={size} strokeWidth={1.9} aria-hidden="true" style={{ flexShrink: 0 }} /> : null
}
