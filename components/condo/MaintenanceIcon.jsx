// Icone delle categorie di manutenzione (lib/maintenanceCategories.js)
const base = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round', viewBox: '0 0 24 24', 'aria-hidden': true }

const PATHS = {
  elevator: <><rect x="4" y="3" width="16" height="18" rx="2" /><path d="M12 3v18" /><path d="M8 9l-1.5 2h3zM16 11l-1.5-2h3z" /></>,
  radiator: <><path d="M5 6v12M8 5v14M11 5v14M14 5v14M17 5v14M20 6v12" /><path d="M3 9h2M3 15h2M20 9h1M20 15h1" /></>,
  bolt: <path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z" />,
  tap: <><path d="M4 9h8a3 3 0 013 3v2" /><path d="M4 7v4M8 5h4M10 5v4" /><path d="M15 17.5c0 1-.7 1.8-1.5 1.8S12 18.5 12 17.5c0-1 1.5-2.6 1.5-2.6s1.5 1.6 1.5 2.6z" /></>,
  drain: <><circle cx="12" cy="12" r="8" /><path d="M8 10h8M7.5 13h9M9 16h6" /></>,
  key: <><circle cx="8" cy="15" r="4" /><path d="M11 12l8-8M16 7l2 2M14 9l2 2" /></>,
  antenna: <><path d="M12 10v11M8 21h8" /><path d="M5 5a10 10 0 0014 0" /><path d="M9 3l3 7 3-7" /></>,
  bricks: <><rect x="3" y="5" width="18" height="14" rx="1" /><path d="M3 10h18M3 14h18M9 5v5M15 10v4M9 14v5" /></>,
  dots: <path d="M5 12h.01M12 12h.01M19 12h.01" strokeWidth={3.2} />,
}

export default function MaintenanceIcon({ name, size = 26 }) {
  return <svg {...base} width={size} height={size}>{PATHS[name] || PATHS.dots}</svg>
}
