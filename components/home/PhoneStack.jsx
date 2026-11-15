'use client'

import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, FileText, Plus, SendHorizontal, Star } from 'lucide-react'

// Due telefoni con anteprime dell'app. Al passaggio del mouse (o quando la
// sezione entra nello schermo, su touch) si aprono a ventaglio come carte.
export default function PhoneStack() {
  const ref = useRef(null)
  const [inView, setInView] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el || !('IntersectionObserver' in window)) return
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { threshold: 0.45 })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  return (
    <div ref={ref} className={`lp-phones${inView ? ' is-in' : ''}`} aria-hidden="true">
      <div className="lp-phone lp-phone-a">
        <div className="lp-screen">
          <div className="lp-ph-top"><ChevronLeft size={14} /><b>Via Solari 12</b></div>
          <MiniBuilding />
          <div className="lp-ph-tabs"><span className="is-on">Panoramica</span><span>Domande</span><span>Recensioni</span></div>
          <div className="lp-ph-score"><Star size={16} fill="#F5A524" stroke="#F5A524" /><b>4,6</b><small>(24 recensioni)</small></div>
          {[['Gestione', 86], ['Manutenzione', 74], ['Spese', 68], ['Tranquillità', 80], ['Servizi', 72]].map(([l, v]) => (
            <div key={l} className="lp-ph-bar"><small>{l}</small><i><em style={{ width: `${v}%` }} /></i></div>
          ))}
        </div>
      </div>
      <div className="lp-phone lp-phone-b">
        <div className="lp-screen">
          <div className="lp-ph-top"><ChevronLeft size={14} /><span className="lp-ph-av" /><b>Via Solari 12<small>Condominio</small></b></div>
          <div className="lp-ph-tabs"><span className="is-on">Condominio</span><span>Amministratore</span><span>Fornitori</span></div>
          <div className="lp-ph-msg"><span className="lp-ph-dot" /><p>L&apos;intervento in cortile è confermato per martedì.<small>09:12</small></p></div>
          <div className="lp-ph-file"><FileText size={16} /><p><b>Convocazione assemblea.pdf</b><small>2,4 MB</small></p></div>
          <div className="lp-ph-msg is-me"><p>Perfetto, grazie!<small>09:24</small></p></div>
          <div className="lp-ph-input"><Plus size={14} /><span>Scrivi un messaggio…</span><SendHorizontal size={14} /></div>
        </div>
      </div>
    </div>
  )
}

// Piccolo condominio disegnato per l'anteprima nel telefono
function MiniBuilding() {
  const cols = [30, 62, 94, 126]
  const rows = [22, 46, 70]
  return (
    <svg viewBox="0 0 180 100" className="lp-ph-photo" preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id="mbSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#BFDDEA" /><stop offset="1" stopColor="#E9F3F1" /></linearGradient>
        <linearGradient id="mbStone" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#F1DCBB" /><stop offset="1" stopColor="#D9B386" /></linearGradient>
      </defs>
      <rect width="180" height="100" fill="url(#mbSky)" />
      <rect x="18" y="12" width="144" height="90" fill="url(#mbStone)" />
      <rect x="14" y="8" width="152" height="6" rx="1.5" fill="#C9A47A" />
      {[1, 2].map((i) => <rect key={i} x="18" y={14 + i * 24 + 6} width="144" height="2.5" fill="#DDBF96" />)}
      {rows.map((y, r) => cols.map((x, c) => (
        <g key={`${r}-${c}`}>
          <rect x={x - 2} y={y - 2} width="22" height="17" rx="1.5" fill="#E6CBA4" />
          <rect x={x} y={y} width="18" height="13" rx="1" fill={r === 2 && (c === 1 || c === 2) ? 'none' : '#3E4C4F'} />
          <rect x={x + 8.5} y={y} width="1" height="13" fill="#C9A77E" />
          {r < 2 && (c + r) % 2 === 0 && (
            <g>
              <rect x={x - 4} y={y + 11} width="26" height="2" fill="#3C3A36" />
              <circle cx={x - 1} cy={y + 10} r="2.6" fill="#5C8C42" /><circle cx={x + 19} cy={y + 10} r="2.6" fill="#4F7D3A" />
              <circle cx={x} cy={y + 8.6} r="1" fill="#E8651A" /><circle cx={x + 18} cy={y + 8.6} r="1" fill="#D9475C" />
            </g>
          )}
        </g>
      )))}
      <path d="M78 102 V82 a12 12 0 0 1 24 0 V102 Z" fill="#5E4331" />
      <ellipse cx="8" cy="10" rx="14" ry="10" fill="#6E9F48" /><ellipse cx="172" cy="94" rx="12" ry="9" fill="#5B8A3C" />
    </svg>
  )
}
