'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import { RESIDENT_TYPES, ISSUES } from '@/lib/reviewOptions'
import { AMENITY_GROUPS } from '@/lib/amenities'
import PhotoUploader from '@/components/photos/PhotoUploader'
import { uploadPhoto } from '@/lib/photos'
import { createClient } from '@/lib/supabase/client'
import { useSession } from '@/components/providers/SessionProvider'
import { useMyReview } from '@/hooks/useMyReview'

function DotRating({ value, onChange, size = 28 }) {
  return (
    <div style={{ display: 'flex', gap: size > 20 ? 10 : 7, alignItems: 'center' }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} type="button" onClick={() => onChange(n)}
          style={{
            width: size, height: size, minWidth: size, maxWidth: size,
            aspectRatio: '1', borderRadius: '50%',
            flexShrink: 0, flexGrow: 0,
            border: `2px solid ${n <= value ? 'var(--teal)' : 'var(--border)'}`,
            background: n <= value ? 'var(--teal)' : 'transparent',
            cursor: 'pointer', padding: 0, transition: 'all 0.12s',
            appearance: 'none', WebkitAppearance: 'none',
            boxSizing: 'border-box', display: 'block',
          }} />
      ))}
    </div>
  )
}

const LABEL = { display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 10 }
const GROUP = { marginBottom: 22 }

export default function BuildingReviewForm({ open, onClose, building }) {
  const session = useSession()
  const router = useRouter()

  const [existingReview, fetchMyReview] = useMyReview('reviews', 'building_id', building.id)

  const [type, setType] = useState('resident')
  const [score, setScore] = useState(0)
  const [cats, setCats] = useState({ admin: 0, maintenance: 0, costs: 0, quality: 0, noise: 0, safety: 0 })
  const [issue, setIssue] = useState('none')
  const [body, setBody] = useState('')
  const [since, setSince] = useState('')
  const [amenities, setAmenities] = useState([])
  const [photos, setPhotos] = useState([])
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [policyConfirmed, setPolicyConfirmed] = useState(false)

  function setCat(k, v) { setCats((c) => ({ ...c, [k]: v })) }

  // Prefill in modalità modifica: existingReview arriva async (useMyReview),
  // quindi i campi non possono essere inizializzati direttamente da useState.
  // Rieseguito anche alla riapertura (dipendenza su open) per scartare eventuali
  // modifiche non salvate di un'apertura precedente.
  useEffect(() => {
    if (!existingReview) return
    setType(existingReview.resident_type || 'resident')
    setScore(existingReview.score || 0)
    setCats({
      admin: existingReview.score_admin || 0,
      maintenance: existingReview.score_maintenance || 0,
      costs: existingReview.score_costs || 0,
      quality: existingReview.score_quality || 0,
      noise: existingReview.score_noise || 0,
      safety: existingReview.score_safety || 0,
    })
    setIssue(existingReview.main_issue || 'none')
    setBody(existingReview.body || '')
    setSince(existingReview.resident_since || '')
  }, [existingReview, open])

  async function submit() {
    if (!session) { setErr('Devi accedere per pubblicare una recensione.'); return }
    if (!score) { setErr('Assegna una valutazione generale.'); return }
    if (!policyConfirmed) {
      setErr('Devi confermare la dichiarazione di responsabilita per pubblicare la recensione.')
      return
    }
    setBusy(true); setErr('')
    try {
      const supabase = createClient()

      let reviewId
      if (existingReview?.id) {
        // Modifica: aggiorna solo corpo/punteggi. Il resto (tipo residente, da
        // quando, problema ricorrente) resta quello dell'invio originale. Il
        // trigger DB rimette la recensione in verifica (moderation_status/is_published),
        // qui non li forziamo.
        const updatePayload = {
          score,
          score_admin: cats.admin || null, score_maintenance: cats.maintenance || null,
          score_costs: cats.costs || null, score_quality: cats.quality || null,
          score_noise: cats.noise || null, score_safety: cats.safety || null,
          body,
        }
        const { error } = await supabase.from('reviews').update(updatePayload).eq('id', existingReview.id)
        if (error) throw error
        reviewId = existingReview.id
      } else {
        const payload = {
          resident_type: type, resident_since: since, score,
          score_admin: cats.admin || null, score_maintenance: cats.maintenance || null,
          score_costs: cats.costs || null, score_quality: cats.quality || null,
          score_noise: cats.noise || null, score_safety: cats.safety || null,
          main_issue: issue, body,
          user_id: session.user.id, building_id: building.id, is_published: true,
        }
        const { data, error } = await supabase.from('reviews').insert(payload).select('id').single()
        if (error) throw error
        reviewId = data.id
      }

      if (photos.length > 0) {
        await Promise.all(photos.map((f) => uploadPhoto(f.blob, building.id, reviewId))).catch(console.warn)
      }
      onClose()
      await fetchMyReview()
      router.refresh()
    } catch (e) { setErr(e.message) }
    finally { setBusy(false) }
  }

  return (
    <Modal open={open} onClose={onClose}
           title={existingReview ? 'Aggiorna la tua recensione' : 'Scrivi una recensione'}
           subtitle={`${building.address}${building.street_number ? ', ' + building.street_number : ''} — ${building.city}`}>
      {existingReview && (
        <p style={{ fontSize: 12, color: 'var(--amber-tx)', background: 'var(--amber-bg)', borderRadius: 6, padding: '8px 12px', marginBottom: 16 }}>
          Salvando le modifiche la recensione tornerà in verifica.
        </p>
      )}

      <div style={GROUP}>
        <label style={LABEL}>Chi sei rispetto a questo edificio?</label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 7 }}>
          {RESIDENT_TYPES.map((rt) => (
            <button key={rt.value} onClick={() => setType(rt.value)}
              style={{
                border: `1px solid ${type === rt.value ? 'var(--teal)' : 'var(--border)'}`,
                borderRadius: 6, padding: '9px 12px', fontSize: 13, fontWeight: 600,
                background: type === rt.value ? 'var(--teal-lt)' : '#fff',
                color: type === rt.value ? 'var(--teal-dk)' : 'var(--text-2)',
                textAlign: 'left', cursor: 'pointer',
              }}>{rt.label}</button>
          ))}
        </div>
      </div>

      <div style={GROUP}>
        <label style={LABEL}>Valutazione generale</label>
        <DotRating value={score} onChange={setScore} />
      </div>

      <div style={GROUP}>
        <label style={LABEL}>Per categoria</label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {[['admin', 'Amministratore'], ['maintenance', 'Manutenzione'], ['costs', 'Spese'],
            ['quality', 'Qualità vita'], ['noise', 'Silenziosità'], ['safety', 'Sicurezza']].map(([k, l]) => (
            <div key={k}>
              <span style={{ display: 'block', fontSize: 12, color: 'var(--text-4)', fontWeight: 500, marginBottom: 5 }}>{l}</span>
              <DotRating value={cats[k]} onChange={(v) => setCat(k, v)} size={18} />
            </div>
          ))}
        </div>
      </div>

      <div style={GROUP}>
        <label style={LABEL}>Problemi ricorrenti</label>
        <select value={issue} onChange={(e) => setIssue(e.target.value)}
          style={{ width: '100%', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6, padding: '10px 12px', fontSize: 14 }}>
          {ISSUES.map((i) => <option key={i.value} value={i.value}>{i.label}</option>)}
        </select>
      </div>

      <div style={{ height: 1, background: 'var(--border)', margin: '20px 0' }} />

      <div style={GROUP}>
        <label style={LABEL}>La tua esperienza</label>
        <textarea value={body} onChange={(e) => setBody(e.target.value)}
          placeholder="Com'è vivere qui? Amministratore, vicini, manutenzione, parti comuni..."
          style={{ width: '100%', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6, padding: 12, fontSize: 14, minHeight: 90, resize: 'vertical', lineHeight: 1.6 }} />
      </div>

      <div style={GROUP}>
        <label style={LABEL}>Da quando sei residente?</label>
        <input value={since} onChange={(e) => setSince(e.target.value)} placeholder="es. Dal 2019"
          style={{ width: '100%', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6, padding: '10px 12px', fontSize: 14 }} />
      </div>

      {/* Servizi — conferma o correggi */}
      <div style={GROUP}>
        <label style={LABEL}>Quali servizi sono presenti nello stabile?</label>
        <p style={{ fontSize: 12, color: 'var(--text-4)', marginBottom: 12, marginTop: -6 }}>
          Seleziona solo quelli realmente disponibili per i condomini.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {AMENITY_GROUPS.map(group => (
            <div key={group.label}>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-4)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 7 }}>
                {group.label}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
                {group.items.map(([id, l]) => {
                  const active = amenities.includes(id)
                  return (
                    <button key={id} type="button"
                      onClick={() => setAmenities(a => a.includes(id) ? a.filter(x => x !== id) : [...a, id])}
                      style={{
                        padding: '7px 8px', borderRadius: 6, fontSize: 12, fontWeight: 600,
                        border: `1px solid ${active ? 'var(--teal)' : 'var(--border)'}`,
                        background: active ? 'var(--teal-lt)' : '#fff',
                        color: active ? 'var(--teal-dk)' : 'var(--text-3)',
                        cursor: 'pointer', textAlign: 'left',
                      }}
                    >{active ? '✓ ' : ''}{l}</button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={GROUP}>
        <label style={LABEL}>Aggiungi foto (opzionale)</label>
        <PhotoUploader files={photos} onChange={setPhotos} maxFiles={5} />
      </div>

      {err && <p style={{ color: '#DC2626', fontSize: 13, marginBottom: 12 }}>{err}</p>}
      <Button variant="primary" block onClick={submit} disabled={busy} style={{ padding: 13 }}>
        {busy ? 'Salvataggio...' : existingReview ? 'Aggiorna recensione' : 'Pubblica recensione'}
      </Button>
      <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginTop: 12, fontSize: 12, lineHeight: 1.6, color: 'var(--text-3)' }}>
        <input
          type="checkbox"
          checked={policyConfirmed}
          onChange={(e) => setPolicyConfirmed(e.target.checked)}
          style={{ marginTop: 2 }}
        />
        <span>
          Confermo che la recensione si basa su un'esperienza reale, e scritta in buona fede, non contiene insulti,
          accuse non provate, dati personali di terzi o contenuti diffamatori. Sono consapevole di essere personalmente responsabile di quanto pubblico.
        </span>
      </label>
      <p style={{ fontSize: 12, color: 'var(--text-4)', lineHeight: 1.6, marginTop: 10 }}>
        Nessun dato personale identificabile viene pubblicato. Le recensioni sono moderate prima della pubblicazione.
      </p>
    </Modal>
  )
}
