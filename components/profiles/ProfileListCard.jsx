import Link from 'next/link'
import { BadgeCheck, ChevronRight, MessageCircle } from 'lucide-react'
import { scoreColor } from '@/lib/score'

// Card unica della lista per amministratori e fornitori: avatar tondo con
// icona, nome con spunta, etichetta del ruolo e categorie, dati principali,
// voto a destra, "Vedi profilo" e "Contatta".
export default function ProfileListCard({
  href, name, verified, sample, roleLabel, chips = [], meta = [], score, icon, tone = 'teal',
  onContact, contactDisabled, contactLabel = 'Contatta',
}) {
  const color = score != null ? scoreColor(score) : null
  return (
    <article className="pl-row">
      <div className="pl-row-top">
        <span className={`pl-row-av is-${tone}`} aria-hidden="true">{icon}</span>
        <div className="pl-row-main">
          <h2 className="pl-row-name">
            <Link href={href}>{name}</Link>
            {verified && <BadgeCheck size={22} strokeWidth={2} fill="var(--teal)" color="#fff" aria-label="Verificato" />}
          </h2>
          <div className="pl-row-chips">
            <span className="pl-row-role">{roleLabel}</span>
            {chips.map((c) => <span key={c.label} className="pl-row-chip">{c.icon}{c.label}</span>)}
            {sample && <span className="pl-row-sample">Profilo di prova</span>}
          </div>
        </div>
        <span className="pl-row-score" style={color ? { color, background: `color-mix(in srgb, ${color} 14%, white)` } : undefined}>
          {score != null ? Number(score).toLocaleString('it-IT', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) : 'Nuovo'}
        </span>
      </div>

      {meta.length > 0 && (
        <div className="pl-row-meta">
          {meta.map((m) => <span key={m.text}>{m.icon}{m.text}</span>)}
        </div>
      )}

      <div className="pl-row-actions">
        <Link href={href} className="pl-row-btn">Vedi profilo<ChevronRight size={18} aria-hidden="true" /></Link>
        <button type="button" className="pl-row-btn is-main" onClick={onContact} disabled={contactDisabled || !onContact}>
          <MessageCircle size={19} aria-hidden="true" />{contactLabel}
        </button>
      </div>
    </article>
  )
}
