'use client'

import { ChevronRight, Lock } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { scoreColor, feeBand, costPerSqm } from '@/lib/score'
import BuildingPreviewImage from '@/components/buildings/BuildingPreviewImage'

// Riga compatta di un'abitazione dentro la card "Le mie abitazioni" del profilo.
// current = abitazione attuale (mostra "Entra condo"), altrimenti ex abitazione.
export default function ProfileHomeRow({ building: b, current = false, actionLabel, onAction, busy = false }) {
  const router = useRouter()
  const band = feeBand(b.monthly_fee)
  const perSqm = costPerSqm(b.monthly_fee, b.avg_sqm)
  const verified = b.status === 'verified'

  return (
    <div className="phome">
      <Link href={`/edificio/${b.id}`} className="phome-preview" aria-hidden="true" tabIndex={-1}>
        <BuildingPreviewImage building={b} height="100%" radius={12} />
      </Link>

      <div className="phome-body">
        <Link href={`/edificio/${b.id}`} className="phome-title">
          <span className="phome-addr">{b.address}{b.street_number ? `, ${b.street_number}` : ''}</span>
          <ChevronIcon />
        </Link>
        <div className="phome-meta">
          {[b.neighborhood, b.city, b.year_built ? `Anno ${b.year_built}` : null].filter(Boolean).join(' · ')}
        </div>

        <div className="phome-chips">
          <Chip label="Rating" value={b.score != null ? b.score.toFixed(1) : 'N/D'} color={scoreColor(b.score)} />
          <Chip label="Spese" value={band ? band.range : 'N/D'} />
          {perSqm && <Chip label="Al mq" value={`${perSqm}€/mq`} />}
        </div>

        <div className="phome-foot">
          {current ? (
            <span className={verified ? 'phome-pill phome-pill-ok' : 'phome-pill phome-pill-pending'}>
              {verified ? 'Verificata' : 'Da verificare'}
            </span>
          ) : <span />}
          {current && (
            <button
              type="button"
              className="phome-enter"
              onClick={() => router.push(`/edificio/${b.id}/condominio`)}
              aria-label={`Entra nell'area condominio di ${b.address}`}
            >
              <LockIcon /> Entra condo
            </button>
          )}
        </div>

        {onAction && (
          <button type="button" className="phome-text-btn" onClick={onAction} disabled={busy}>
            {busy ? 'Aggiornamento...' : actionLabel}
          </button>
        )}
      </div>
    </div>
  )
}

function Chip({ label, value, color }) {
  return (
    <div className="phome-chip">
      <span>{label}</span>
      <strong style={{ color: color || 'var(--teal-dk)' }}>{value}</strong>
    </div>
  )
}

function ChevronIcon({ size = 16 } = {}) { return <ChevronRight size={size} strokeWidth={2.2} aria-hidden="true" /> }

function LockIcon({ size = 15 } = {}) { return <Lock size={size} strokeWidth={2} aria-hidden="true" /> }
