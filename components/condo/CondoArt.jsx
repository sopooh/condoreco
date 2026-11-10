// Illustrazioni condivise dell'area condominio (palette Condoreco)
const T = '#0D676F', TL = '#CFE6E6', O = '#E8651A'

export function ToolboxArt() {
  return (
    <svg viewBox="0 0 84 84" width="100%" height="100%" aria-hidden="true">
      <ellipse cx="42" cy="74" rx="30" ry="5" fill="rgba(13,103,111,0.12)" />
      <path d="M30 22h24a4 4 0 014 4v6h-6v-4H32v4h-6v-6a4 4 0 014-4z" fill={T} />
      <rect x="10" y="30" width="64" height="40" rx="9" fill={TL} />
      <rect x="10" y="30" width="64" height="12" rx="6" fill="#E6F2F2" />
      <path d="M50 46a7 7 0 00-9.5 8.5L30 65l4 4 10.5-10.5A7 7 0 0053 49l-4 4-3.5-3.5 4-4z" fill={T} />
      <circle cx="66" cy="38" r="4" fill={O} />
    </svg>
  )
}
