'use client'

import { useEffect, useState } from 'react'
import { Calculator, ChevronDown, TriangleAlert } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useSession } from '@/components/providers/SessionProvider'
import { estimateMillesimi, fmtMill } from '@/lib/millesimiEstimate'

// "Non sai i tuoi millesimi?": stima indicativa da mq e spese mensili.
// I dati del residente si salvano nella sua abitazione (user_residences,
// visibili solo a lui) così la volta dopo sono già compilati.
export default function MillesimiEstimator({ buildingId }) {
  const session = useSession()
  const userId = session?.user?.id
  const [open, setOpen] = useState(false)
  const [b, setB] = useState(null)
  const [sqm, setSqm] = useState('')
  const [fee, setFee] = useState('')
  const [units, setUnits] = useState('')

  useEffect(() => {
    if (!open || !buildingId || b) return
    const supabase = createClient()
    ;(async () => {
      const [{ data: bs }, { data: res }] = await Promise.all([
        supabase.from('building_scores').select('units, avg_sqm, monthly_fee_building, monthly_fee').eq('id', buildingId).maybeSingle(),
        userId ? supabase.from('user_residences').select('avg_sqm, monthly_fee_building, monthly_fee').eq('user_id', userId).eq('building_id', buildingId).maybeSingle() : Promise.resolve({ data: null }),
      ])
      setB(bs || {})
      if (bs?.units >= 2) setUnits(String(bs.units))
      if (res?.avg_sqm) setSqm(String(res.avg_sqm))
      const f = res?.monthly_fee_building || res?.monthly_fee
      if (f) setFee(String(f))
    })()
  }, [open, buildingId, userId, b])

  // ricorda mq e spese per la prossima volta
  useEffect(() => {
    if (!userId || !buildingId || !b) return
    const s = Number(sqm), f = Number(String(fee).replace(',', '.'))
    if (!(s > 0) && !(f > 0)) return
    const t = setTimeout(() => {
      const patch = { user_id: userId, building_id: buildingId }
      if (s > 0) patch.avg_sqm = s
      if (f > 0) patch.monthly_fee_building = f
      createClient().from('user_residences').upsert(patch, { onConflict: 'user_id,building_id' }).then(() => {})
    }, 800)
    return () => clearTimeout(t)
  }, [sqm, fee, userId, buildingId, b])

  const est = b ? estimateMillesimi({
    mySqm: sqm, myFee: String(fee).replace(',', '.'), units,
    avgSqm: b.avg_sqm, avgFee: b.monthly_fee_building || b.monthly_fee,
  }) : null

  return (
    <div style={{ marginTop: 10, border: '1px solid var(--border)', borderRadius: 12, background: 'var(--bg)' }}>
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} style={{
        width: '100%', minHeight: 0, display: 'flex', alignItems: 'center', gap: 8, padding: '11px 12px',
        background: 'none', border: 'none', cursor: 'pointer', color: 'var(--teal-dk)', fontWeight: 700, fontSize: 14, textAlign: 'left',
      }}>
        <Calculator size={16} strokeWidth={2} aria-hidden="true" />
        <span style={{ flex: 1 }}>Non li sai? Fai una stima</span>
        <ChevronDown size={16} aria-hidden="true" style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }} />
      </button>
      {open && (
        <div style={{ padding: '0 12px 12px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <Field label="Metri quadri" suffix="m²" value={sqm} onChange={setSqm} placeholder="Es. 85" />
            <Field label="Spese al mese" suffix="€" value={fee} onChange={setFee} placeholder="Es. 120" />
          </div>
          {b && !(b.units >= 2) && (
            <Field label="Quanti appartamenti ha il condominio?" value={units} onChange={setUnits} placeholder="Es. 24" />
          )}
          {!b ? <p style={hint}>Carico i dati del condominio…</p>
            : est ? (
              <div style={{ background: 'var(--white)', border: '1px solid var(--border)', borderRadius: 10, padding: 12 }}>
                <div style={{ fontSize: 12, color: 'var(--text-4)', fontWeight: 600 }}>Stima dei tuoi millesimi</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--teal-dk)', letterSpacing: '-0.5px' }}>
                  circa {fmtMill(est.mid)}‰
                </div>
                <div style={{ fontSize: 12.5, color: 'var(--text-3)' }}>tra {fmtMill(est.low)} e {fmtMill(est.high)}‰</div>
                {est.yearlyTotal && (
                  <div style={{ fontSize: 12.5, color: 'var(--text-3)', marginTop: 6 }}>
                    Spesa del condominio stimata: circa {est.yearlyTotal.toLocaleString('it-IT')} € l&apos;anno. La vedi solo tu.
                  </div>
                )}
              </div>
            ) : <p style={hint}>Inserisci metri quadri o spese mensili per vedere la stima.</p>}
          <div style={{ display: 'flex', gap: 8, fontSize: 12.5, color: '#93370D', background: '#FFFAEB', border: '1px solid #FEDF89', borderRadius: 10, padding: '9px 10px', lineHeight: 1.4 }}>
            <TriangleAlert size={15} strokeWidth={2} aria-hidden="true" style={{ flexShrink: 0, marginTop: 1 }} />
            <span>È una stima non affidabile: i millesimi reali dipendono da piano, esposizione e pertinenze. Controllali su un documento ufficiale (tabella millesimale, riparto spese o rogito) e inserisci quel valore.</span>
          </div>
        </div>
      )}
    </div>
  )
}

function Field({ label, suffix, value, onChange, placeholder }) {
  return (
    <label style={{ display: 'block' }}>
      <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-3)', marginBottom: 4 }}>{label}</div>
      <div style={{ position: 'relative' }}>
        <input inputMode="decimal" value={value} onChange={(e) => onChange(e.target.value.replace(/[^\d.,]/g, ''))} placeholder={placeholder}
          style={{ width: '100%', boxSizing: 'border-box', border: '1px solid var(--border)', borderRadius: 10, padding: suffix ? '10px 34px 10px 12px' : '10px 12px', fontSize: 16, fontFamily: 'inherit', background: 'var(--white)' }} />
        {suffix && <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 13, color: 'var(--text-4)', fontWeight: 600 }}>{suffix}</span>}
      </div>
    </label>
  )
}

const hint = { fontSize: 12.5, color: 'var(--text-4)', margin: 0 }
