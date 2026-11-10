// Icone line per i servizi del condominio (id come in lib/amenities.js).
const P = {
  elevator: <><rect x="4" y="3" width="16" height="18" rx="1.5" /><path d="M12 3v18M7.5 9l1.5-1.5L10.5 9M13.5 15l1.5 1.5 1.5-1.5" /></>,
  concierge: <><circle cx="12" cy="7" r="3" /><path d="M6 21v-2a6 6 0 0112 0v2M4 21h16" /></>,
  gym: <path d="M4 9v6M7 7v10M17 7v10M20 9v6M7 12h10" />,
  pool: <path d="M3 17c1.5 1 3 1 4.5 0s3-1 4.5 0 3 1 4.5 0 3-1 4.5 0M3 20.5c1.5 1 3 1 4.5 0s3-1 4.5 0 3 1 4.5 0 3-1 4.5 0M8 14V6a2 2 0 014 0M16 14V6a2 2 0 00-2-2M8 9h8M8 12h8" />,
  garden: <><path d="M5 19c0-8 6-14 15-14 0 9-6 14-14 14z" /><path d="M5 19l8-8" /></>,
  terrace: <><circle cx="12" cy="12" r="4" /><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6L7 7M17 17l1.4 1.4M5.6 18.4L7 17M17 7l1.4-1.4" /></>,
  parking: <><rect x="3.5" y="3.5" width="17" height="17" rx="2" /><path d="M9.5 16.5v-9h3.5a2.8 2.8 0 010 5.6H9.5" /></>,
  box: <><path d="M5 11l1.6-4.2A2 2 0 018.5 5.5h7a2 2 0 011.9 1.3L19 11" /><rect x="3" y="11" width="18" height="6" rx="2" /><path d="M6 17v2M18 17v2" /><circle cx="7.5" cy="14" r="1" /><circle cx="16.5" cy="14" r="1" /></>,
  bike_room: <><circle cx="6" cy="16" r="3.5" /><circle cx="18" cy="16" r="3.5" /><path d="M6 16l4-7h5l3 7M10 9l2 7h2M9 6h3" /></>,
  ev_charging: <path d="M9 3v4M15 3v4M7 7h10v4a5 5 0 01-10 0V7zM12 16v5" />,
  gate: <path d="M3 21V5M21 21V5M3 8h18M7 8v13M11 8v13M15 8v13M19 8v13" />,
  basement: <><path d="M3 8l9-4 9 4-9 4-9-4z" /><path d="M3 8v8l9 4 9-4V8M12 12v8" /></>,
  trash_room: <path d="M4 7h16M10 3h4M6 7l1 14h10l1-14M10 11v6M14 11v6" />,
  courtyard: <><rect x="3" y="3" width="18" height="18" rx="2" /><rect x="8" y="8" width="8" height="8" rx="1" /></>,
  laundry: <><rect x="4" y="3" width="16" height="18" rx="2" /><circle cx="12" cy="13" r="4.5" /><circle cx="12" cy="13" r="1.5" /><path d="M7.5 6.5h1M10.5 6.5h1" /></>,
  common_room: <><circle cx="8" cy="8" r="3" /><circle cx="17" cy="9" r="2.5" /><path d="M2.5 20v-1a5.5 5.5 0 0111 0v1M14 20v-1a4 4 0 017.5-2" /></>,
  cctv: <path d="M3 9l13-4 2 6-13 4-2-6zM16 11l4 1.5M10 14v4H4M4 15v6" />,
  disabled_access: <><circle cx="11" cy="4.5" r="1.8" /><path d="M11 8v6h6l2 5M11 11h5M8 11.5a5 5 0 107 6" /></>,
  intercom: <><rect x="5" y="3" width="14" height="18" rx="2" /><rect x="8" y="6" width="8" height="5" rx="1" /><path d="M9 15h.01M12 15h.01M15 15h.01M9 18h6" /></>,
  fiber: <path d="M2.5 9a14 14 0 0119 0M5.5 12.5a9.5 9.5 0 0113 0M8.5 16a5 5 0 017 0M12 19.5h.01" />,
}

export function AmenityIcon({ id, size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flexShrink: 0 }}>
      {P[id] || <circle cx="12" cy="12" r="8" />}
    </svg>
  )
}
