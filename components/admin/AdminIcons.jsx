// Icone line dell'area admin (stroke = currentColor).
const PATHS = {
  home: <path d="M3 11l9-7 9 7v9a1 1 0 01-1 1h-5v-6h-6v6H4a1 1 0 01-1-1v-9z" />,
  building: <><rect x="4" y="3" width="11" height="18" rx="1" /><path d="M15 9h4a1 1 0 011 1v11h-5" /><path d="M8 7h1M11 7h1M8 11h1M11 11h1M8 15h1M11 15h1M9 21v-3h2v3" /></>,
  users: <><circle cx="9" cy="8" r="3.2" /><path d="M3 20v-1a6 6 0 0112 0v1" /><path d="M16 4.5a3 3 0 010 6M18 14a5 5 0 013 5v1" /></>,
  userPlus: <><circle cx="9" cy="8" r="3.2" /><path d="M3 20v-1a6 6 0 0112 0v1M19 8v6M16 11h6" /></>,
  flag: <path d="M5 21V4h11l-2 4 2 4H5" />,
  pulse: <path d="M3 12h4l2-6 4 12 2-6h6" />,
  chart: <path d="M5 20V12M10 20V6M15 20v-9M20 20V4" />,
  calendar: <><rect x="3.5" y="5" width="17" height="15.5" rx="2" /><path d="M3.5 10h17M8 3v4M16 3v4M8 14h2M14 14h2M8 17.5h2" /></>,
  chevronDown: <path d="M6 9l6 6 6-6" />,
  arrowRight: <path d="M5 12h14M13 6l6 6-6 6" />,
  info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></>,
  trendUp: <path d="M5 19L19 5M9 5h10v10" />,
  trendDown: <path d="M5 5l14 14M19 9v10H9" />,
  star: <path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z" />,
  camera: <><path d="M4 8a2 2 0 012-2h1l1.5-2h7L17 6h1a2 2 0 012 2v10a2 2 0 01-2 2H6a2 2 0 01-2-2V8z" /><circle cx="12" cy="13" r="3.5" /></>,
  download: <path d="M12 4v11M7 10l5 5 5-5M5 20h14" />,
  list: <path d="M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01" />,
}

export function AdminIcon({ name, size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flexShrink: 0 }}>
      {PATHS[name]}
    </svg>
  )
}
