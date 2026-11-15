// Illustrazione della facciata di un palazzo milanese per la home:
// pietra calda, balconi in ferro battuto con fiori, cielo chiaro e rami in primo piano.
// SVG puro: niente foto da scaricare, nitido su qualsiasi schermo.

const FLOORS = [
  { y: 70, h: 96 },
  { y: 196, h: 96 },
  { y: 322, h: 96 },
  { y: 448, h: 110 },
]
const COLS = [250, 352, 454, 556]

function Window({ x, y, w = 56, h, balcony, shade }) {
  return (
    <g>
      {/* cornice e timpano */}
      <rect x={x - 8} y={y - 16} width={w + 16} height={10} rx={2} fill="#E9D3B2" />
      <path d={`M${x - 10} ${y - 16} L${x + w / 2} ${y - 30} L${x + w + 10} ${y - 16} Z`} fill="#E4C9A3" />
      <rect x={x - 6} y={y - 6} width={w + 12} height={h + 12} rx={3} fill="#E6CBA4" />
      {/* vetro e persiane */}
      <rect x={x} y={y} width={w} height={h} rx={2} fill={shade} />
      <rect x={x + w / 2 - 1.5} y={y} width={3} height={h} fill="#C9A77E" />
      <rect x={x} y={y + h * 0.42} width={w} height={3} fill="#C9A77E" />
      <rect x={x + 3} y={y + 3} width={w / 2 - 6} height={h * 0.38} fill="#FFFFFF" opacity="0.18" />
      {balcony && (
        <g>
          <rect x={x - 22} y={y + h - 8} width={w + 44} height={9} rx={2} fill="#D7B88E" />
          <rect x={x - 22} y={y + h + 1} width={w + 44} height={5} fill="#B8966C" opacity="0.6" />
          {/* ringhiera */}
          <rect x={x - 20} y={y + h - 34} width={w + 40} height={3} fill="#3C3A36" />
          {Array.from({ length: 11 }).map((_, i) => (
            <rect key={i} x={x - 18 + i * ((w + 36) / 10)} y={y + h - 33} width={2} height={26} fill="#3C3A36" />
          ))}
          {/* fioriere */}
          <ellipse cx={x - 8} cy={y + h - 34} rx={18} ry={11} fill="#4F7D3A" />
          <ellipse cx={x + w + 8} cy={y + h - 34} rx={18} ry={11} fill="#5C8C42" />
          <ellipse cx={x + w / 2} cy={y + h - 30} rx={14} ry={7} fill="#6A9A4B" />
          {[[-14, -38], [-4, -42], [4, -36], [w + 2, -40], [w + 14, -36], [w / 2 - 6, -34], [w / 2 + 6, -35]].map(([dx, dy], i) => (
            <circle key={i} cx={x + dx} cy={y + h + dy} r={3.4} fill={i % 3 === 0 ? '#E8651A' : i % 3 === 1 ? '#D9475C' : '#F2A3B3'} />
          ))}
        </g>
      )}
    </g>
  )
}

export default function HeroFacade() {
  return (
    <svg viewBox="0 0 640 560" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Facciata di un palazzo con balconi fioriti" className="lp-facade">
      <defs>
        <linearGradient id="lpSky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#BFDDEA" />
          <stop offset="1" stopColor="#EAF3F1" />
        </linearGradient>
        <linearGradient id="lpStone" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#F2DDBD" />
          <stop offset="0.55" stopColor="#E7C79D" />
          <stop offset="1" stopColor="#D2AC7F" />
        </linearGradient>
        <linearGradient id="lpGlass" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#5A6B6E" />
          <stop offset="1" stopColor="#2F3B3E" />
        </linearGradient>
        <linearGradient id="lpSun" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#FFF6E5" stopOpacity="0" />
          <stop offset="1" stopColor="#FFF0D6" stopOpacity="0.5" />
        </linearGradient>
      </defs>

      <rect width="640" height="560" fill="url(#lpSky)" />
      {/* tetti lontani */}
      <g fill="#C98F6B" opacity="0.85">
        <rect x="20" y="360" width="150" height="200" />
        <rect x="40" y="330" width="16" height="30" />
        <rect x="80" y="324" width="16" height="36" />
        <rect x="120" y="330" width="16" height="30" />
      </g>
      <g fill="#E6CCA6">
        {[0, 1, 2].map((r) => [0, 1, 2].map((c) => <rect key={`${r}${c}`} x={36 + c * 42} y={384 + r * 56} width={20} height={34} rx="2" fill="#7D6B5C" />))}
      </g>

      {/* facciata principale in prospettiva leggera */}
      <path d="M190 0 H640 V560 H170 Z" fill="url(#lpStone)" />
      <rect x="170" y="0" width="470" height="560" fill="url(#lpSun)" />
      {/* marcapiani */}
      {FLOORS.map((f, i) => <rect key={i} x="180" y={f.y + f.h + 18} width="460" height="8" fill="#DDBF96" />)}
      {/* lesene */}
      {[205, 620].map((x) => <rect key={x} x={x} y="0" width="14" height="560" fill="#E2C49B" opacity="0.8" />)}

      {FLOORS.map((f, r) => COLS.map((x, c) => (
        <Window key={`${r}-${c}`} x={x} y={f.y} h={f.h} balcony={r < 3 && (c + r) % 2 === 0}
          shade={r === 3 ? '#3A3A36' : 'url(#lpGlass)'} />
      )))}

      {/* portone */}
      <path d="M330 470 a42 42 0 0 1 84 0 V560 H330 Z" fill="#4A3426" />
      <path d="M338 474 a34 34 0 0 1 68 0 V560 H338 Z" fill="#5E4331" />

      {/* rami e foglie in primo piano */}
      <g opacity="0.95">
        <path d="M0 0 C70 30 120 60 175 120" stroke="#3E5B2C" strokeWidth="5" fill="none" />
        <path d="M60 30 C80 70 90 110 92 160" stroke="#3E5B2C" strokeWidth="3" fill="none" />
        {[[20, 10, 34], [70, 30, 30], [120, 50, 34], [160, 100, 28], [40, 60, 26], [92, 120, 28], [10, 90, 24], [140, 10, 26], [190, 60, 22]].map(([cx, cy, r], i) => (
          <g key={i}>
            <ellipse cx={cx} cy={cy} rx={r} ry={r * 0.72} fill={i % 2 ? '#5B8A3C' : '#6E9F48'} />
            <ellipse cx={cx + r * 0.3} cy={cy - r * 0.25} rx={r * 0.55} ry={r * 0.38} fill="#8DBA5E" opacity="0.7" />
          </g>
        ))}
      </g>
    </svg>
  )
}
