'use client'

import { useEffect, useState } from 'react'
import { BadgeCheck, Copy, Search, Send, Wrench } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { INVITE_URL } from '@/lib/suppliers'
import { MAINTENANCE_CATEGORIES, maintenanceCategoryLabel } from '@/lib/maintenanceCategories'
import { waLink } from '@/lib/contact'

// Badge "Su Condoreco" o pulsante "Invita" per una voce della rubrica
export function SupplierLinkBadge({ maintainer, onInvite }) {
  if (maintainer.supplier_user_id) {
    return (
      <span title="Iscritto a Condoreco come Recofixer" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 9px', borderRadius: 999, background: '#EDE9FE', color: '#6D28D9', fontSize: 11.5, fontWeight: 800, whiteSpace: 'nowrap' }}>
        <Wrench size={12} strokeWidth={2.2} aria-hidden="true" /> Su Condoreco
      </span>
    )
  }
  return (
    <button type="button" onClick={onInvite} style={{ minHeight: 0, padding: '5px 10px', borderRadius: 999, border: '1.5px solid #C4B5FD', background: 'var(--white)', color: '#6D28D9', fontSize: 12, fontWeight: 800, cursor: 'pointer', whiteSpace: 'nowrap' }}>
      Invita
    </button>
  )
}

// Foglio con il link di invito da mandare al fornitore
export function InviteSupplierPanel({ maintainer, buildingLabel }) {
  const [url, setUrl] = useState(null)
  const [err, setErr] = useState(null)
  const [copied, setCopied] = useState(false)
  useEffect(() => {
    createClient().rpc('create_supplier_invite', { p_maintainer: maintainer.id })
      .then(({ data, error }) => { if (error) setErr('Non riesco a creare l\'invito.'); else setUrl(INVITE_URL(data)) })
  }, [maintainer.id])
  const text = `Ciao ${maintainer.name}, ti invito su Condoreco per gestire gli interventi del condominio${buildingLabel ? ` di ${buildingLabel}` : ''}: chat con i residenti, date, preventivi e fatture in un posto solo. Iscriviti qui: ${url}`

  if (err) return <p style={{ fontSize: 14, color: '#B42318' }}>{err}</p>
  if (!url) return <p style={{ fontSize: 14, color: 'var(--text-3)' }}>Preparo il link...</p>
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <p style={{ fontSize: 14.5, color: 'var(--text-2)', margin: 0, lineHeight: 1.5 }}>
        Quando {maintainer.name} si iscrive con questo link diventa <strong>Recofixer</strong>: entra nella chat dei vostri interventi, propone le date e carica preventivi e fatture.
      </p>
      <div style={{ padding: '10px 12px', borderRadius: 12, background: '#F5F7F7', fontSize: 13, color: 'var(--text-2)', wordBreak: 'break-all' }}>{url}</div>
      {maintainer.phone && (
        <a href={waLink(maintainer.phone, text)} target="_blank" rel="noopener noreferrer" style={{ ...btn, background: '#25D366', color: '#fff', border: 'none' }}>
          <Send size={17} aria-hidden="true" /> Manda su WhatsApp
        </a>
      )}
      {maintainer.email && (
        <a href={`mailto:${maintainer.email}?subject=${encodeURIComponent('Invito su Condoreco')}&body=${encodeURIComponent(text)}`} style={btn}>Manda per email</a>
      )}
      <button type="button" style={btn} onClick={async () => {
        try {
          if (navigator.share) await navigator.share({ title: 'Invito su Condoreco', text })
          else { await navigator.clipboard.writeText(text); setCopied(true) }
        } catch { /* annullato */ }
      }}><Copy size={16} aria-hidden="true" /> {copied ? 'Copiato' : 'Condividi o copia'}</button>
    </div>
  )
}

// Ricerca dei Recofixer iscritti e aggiunta alla rubrica del condominio
export function FindSupplierPanel({ buildingId, city, defaultCategory, onAdded }) {
  const [category, setCategory] = useState(defaultCategory && defaultCategory !== 'other' ? defaultCategory : null)
  const [results, setResults] = useState(null)
  const [busy, setBusy] = useState(null)
  const [err, setErr] = useState(null)

  useEffect(() => {
    let cancelled = false
    createClient().rpc('search_suppliers', { p_category: category, p_city: city || null })
      .then(({ data }) => { if (!cancelled) setResults(data || []) })
    return () => { cancelled = true }
  }, [category, city])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 2 }}>
        {[{ value: null, label: 'Tutti' }, ...MAINTENANCE_CATEGORIES.filter((c) => c.value !== 'other')].map((c) => {
          const on = category === c.value
          return (
            <button key={c.label} type="button" onClick={() => setCategory(c.value)} style={{ flex: '0 0 auto', minHeight: 0, padding: '7px 12px', borderRadius: 999, fontSize: 13, fontWeight: 700, cursor: 'pointer',
              border: `1.5px solid ${on ? 'var(--teal)' : 'var(--border)'}`, background: on ? 'var(--teal)' : 'var(--white)', color: on ? '#fff' : 'var(--text)' }}>{c.label}</button>
          )
        })}
      </div>
      {results === null ? <p style={muted}>Cerco...</p> : results.length === 0 ? (
        <p style={muted}>Nessun Recofixer iscritto {city ? `a ${city} ` : ''}per questa categoria. Puoi aggiungere il fornitore a mano e invitarlo.</p>
      ) : results.map((s) => (
        <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px', borderRadius: 14, border: '1px solid var(--border)', background: 'var(--white)' }}>
          <span style={{ width: 42, height: 42, borderRadius: 12, background: '#EDE9FE', color: '#6D28D9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Wrench size={20} aria-hidden="true" /></span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 15, fontWeight: 800 }}>{s.company_name}{s.verified && <BadgeCheck size={16} aria-label="Verificato" style={{ color: 'var(--teal)' }} />}</div>
            <div style={{ fontSize: 12.5, color: 'var(--text-3)' }}>{s.categories.map(maintenanceCategoryLabel).join(', ')}{s.zones.length ? ` · ${s.zones.join(', ')}` : ''}{s.jobs ? ` · ${s.jobs} lavori su Condoreco` : ''}</div>
          </div>
          <button type="button" disabled={busy === s.id} onClick={async () => {
            setBusy(s.id); setErr(null)
            const { error } = await createClient().rpc('add_supplier_to_condo', { p_building: buildingId, p_supplier: s.id, p_category: category || s.categories[0] || null })
            setBusy(null)
            if (error) setErr('Non riesco ad aggiungerlo. Riprova.'); else onAdded()
          }} style={{ minHeight: 0, height: 38, padding: '0 14px', borderRadius: 10, border: 'none', background: 'var(--teal)', color: '#fff', fontWeight: 800, fontSize: 13.5, cursor: 'pointer' }}>
            {busy === s.id ? '...' : 'Aggiungi'}
          </button>
        </div>
      ))}
      {err && <p style={{ fontSize: 13, color: '#B42318', margin: 0 }}>{err}</p>}
    </div>
  )
}

export function SearchIconSmall() { return <Search size={16} aria-hidden="true" /> }

const muted = { fontSize: 14, color: 'var(--text-3)', margin: 0, lineHeight: 1.5 }
const btn = { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 0, height: 48, borderRadius: 14, border: '1.5px solid var(--border)', background: 'var(--white)', color: 'var(--text)', fontWeight: 700, fontSize: 15, cursor: 'pointer', textDecoration: 'none' }
