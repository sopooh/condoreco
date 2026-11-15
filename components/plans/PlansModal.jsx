'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, Check, Sparkles, X } from 'lucide-react'
import { PLANS } from '@/lib/plans'

// Popup dei piani mostrato sopra la dashboard del profilo (una volta per ruolo).
// Si chiude con la X o con "Continua gratis"; "Scegli Pro" porta al pagamento.
export default function PlansModal({ role, onClose }) {
  const router = useRouter()
  const group = PLANS[role] || PLANS.resident

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev }
  }, [onClose])

  return (
    <div className="pl-wrap" role="dialog" aria-modal="true" aria-labelledby="pl-title">
      <div className="pl-backdrop" onClick={onClose} />
      <div className="pl-modal">
        <div className="pl-top">
          <span className="pl-logo">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/condor-white.png" alt="" />
            <b>condo<em>reco</em></b>
          </span>
          <button type="button" className="pl-x" onClick={onClose} aria-label="Chiudi"><X size={26} /></button>
        </div>
        <h2 id="pl-title">{group.title}</h2>
        <p className="pl-lead">{group.lead}</p>

        <div className={`pl-cards n-${group.plans.length}`}>
          {group.plans.map((p) => {
            const hl = !!p.badge
            return (
              <article key={p.id} className={`pl-card${hl ? ' is-hl' : ''}`}>
                {p.badge && <span className="pl-badge">{p.badge}</span>}
                <h3>{p.name}</h3>
                <p className="pl-tag">{p.tagline}</p>
                <div className="pl-price">{p.price}</div>
                {p.note && <p className="pl-note">{p.note}</p>}
                <ul>
                  {p.features.map((f) => typeof f === 'string'
                    ? <li key={f}><Check size={17} strokeWidth={2.6} aria-hidden="true" />{f}</li>
                    : <li key={f.text}><Sparkles size={17} aria-hidden="true" className="pl-ai" /><span>{f.text}{f.sub && <small>({f.sub})</small>}</span></li>)}
                </ul>
                {p.free ? (
                  <button type="button" className="pl-cta is-free" onClick={onClose}>Continua gratis</button>
                ) : (
                  <button type="button" className="pl-cta" onClick={() => { onClose(); router.push(`/piani/checkout?piano=${p.id}`) }}>
                    Scegli {p.name}<ArrowRight size={17} aria-hidden="true" />
                  </button>
                )}
              </article>
            )
          })}
        </div>

        <PlansArt role={role} />
      </div>
    </div>
  )
}

function PlansArt({ role }) {
  return (
    <svg className="pl-art" viewBox="0 0 640 170" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
      <rect width="640" height="170" fill="#F7F4EE" />
      <ellipse cx="80" cy="150" rx="110" ry="60" fill="#8DBA5E" opacity=".55" />
      <ellipse cx="580" cy="152" rx="100" ry="55" fill="#8DBA5E" opacity=".55" />
      <circle cx="70" cy="80" r="34" fill="#7FB062" /><circle cx="104" cy="98" r="28" fill="#93C273" />
      <rect x="84" y="100" width="4" height="70" fill="#4F6E3A" />
      {/* palazzo */}
      <g transform="translate(330 30)">
        <rect x="0" y="0" width="230" height="150" fill="#F2DFC4" />
        <rect x="-6" y="-6" width="242" height="8" rx="2" fill="#E2C49B" />
        {[0, 1, 2].map((r) => [0, 1, 2, 3].map((c) => (
          <g key={`${r}${c}`}>
            <rect x={14 + c * 54} y={14 + r * 46} width="30" height="30" rx="2" fill="#5F7D80" />
            <rect x={28 + c * 54} y={14 + r * 46} width="2" height="30" fill="#D8BC95" />
            {r < 2 && c % 2 === 0 && (
              <g>
                <rect x={8 + c * 54} y={40 + r * 46} width="42" height="3" fill="#3C3A36" />
                <circle cx={14 + c * 54} cy={38 + r * 46} r="5" fill="#6A9A4B" /><circle cx={44 + c * 54} cy={38 + r * 46} r="5" fill="#5C8C42" />
                <circle cx={15 + c * 54} cy={35 + r * 46} r="1.6" fill="#E8651A" /><circle cx={43 + c * 54} cy={35 + r * 46} r="1.6" fill="#D9475C" />
              </g>
            )}
          </g>
        )))}
      </g>
      {role === 'supplier' ? (
        // furgone del fornitore
        <g transform="translate(130 92)">
          <rect x="0" y="10" width="170" height="56" rx="12" fill="#E6EEF0" />
          <path d="M120 10 h28 l22 26 v30 h-50 z" fill="#DCE7EA" />
          <path d="M126 16 h20 l16 20 h-36 z" fill="#5F7D80" />
          <rect x="14" y="22" width="44" height="22" rx="4" fill="#5F7D80" opacity=".5" />
          <circle cx="40" cy="68" r="14" fill="#24343A" /><circle cx="40" cy="68" r="6" fill="#B9C6CA" />
          <circle cx="140" cy="68" r="14" fill="#24343A" /><circle cx="140" cy="68" r="6" fill="#B9C6CA" />
          <path d="M70 34 q14 -12 30 -4 q-10 2 -14 10 q-6 -6 -16 -6 z" fill="var(--teal)" />
        </g>
      ) : (
        <g>
          <circle cx="250" cy="120" r="30" fill="#7FB062" /><circle cx="280" cy="132" r="22" fill="#93C273" />
          <rect x="262" y="130" width="4" height="40" fill="#4F6E3A" />
        </g>
      )}
    </svg>
  )
}
