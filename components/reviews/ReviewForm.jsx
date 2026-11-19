'use client'

import { Check } from 'lucide-react'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import { AMENITY_GROUPS } from '@/lib/amenities'
import PhotoUploader from '@/components/photos/PhotoUploader'
import { uploadPhoto } from '@/lib/photos'
import { createClient } from '@/lib/supabase/client'
import { useSession } from '@/components/providers/SessionProvider'
import { useMyReview } from '@/hooks/useMyReview'
import { track } from '@/lib/analytics'
import { useAdmins } from '@/hooks/useAdmins'

// "Chi è il vostro amministratore?": autocompletamento sugli studi già
// presenti, oppure nome libero. Collega studio e palazzo (trigger DB).
function AdminQuestion({ value, onChange }) {
  const { admins } = useAdmins({})
  const [focus, setFocus] = useState(false)
  const q = value.name.trim().toLowerCase()
  const matches = q.length >= 2 && !value.id
    ? admins.filter((a) => !a.is_sample && `${a.name} ${a.studio_name || ''}`.toLowerCase().includes(q)).slice(0, 6)
    : []
  return (
    <div style={{ position: 'relative' }}>
      <input value={value.name} placeholder="Nome dello studio o dell'amministratore"
        onChange={(e) => onChange({ id: null, name: e.target.value })}
        onFocus={() => setFocus(true)} onBlur={() => setTimeout(() => setFocus(false), 150)}
        className={`rv-input${value.id ? ' is-picked' : ''}`} />
      {value.id && (
        <p style={{ fontSize: 12, color: 'var(--teal-dk)', margin: '6px 0 0', display: 'flex', alignItems: 'center', gap: 5 }}>
          <Check size={13} strokeWidth={2.6} aria-hidden="true" /> Studio presente su Condoreco
        </p>
      )}
      {focus && matches.length > 0 && (
        <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 20, background: '#fff', border: '1px solid var(--border)', borderRadius: 12, boxShadow: '0 8px 24px rgba(0,0,0,.1)', overflow: 'hidden' }}>
          {matches.map((a) => (
            <button key={a.id} type="button" onMouseDown={(e) => e.preventDefault()}
              onClick={() => { onChange({ id: a.id, name: a.name }); setFocus(false) }}
              style={{ display: 'block', width: '100%', textAlign: 'left', padding: '9px 12px', background: 'none', border: 'none', borderBottom: '1px solid var(--border)', cursor: 'pointer' }}>
              <span style={{ display: 'block', fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{a.name}</span>
              {a.city && <span style={{ fontSize: 12, color: 'var(--text-4)' }}>{a.city}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

const SCORE_WORDS = ['', 'Pessimo', 'Scarso', 'Nella media', 'Buono', 'Ottimo']

function DotRating({ value, onChange, small = false, label }) {
  return (
    <div className={`rv-rate${small ? ' is-sm' : ''}`} role="radiogroup" aria-label={label}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} type="button" role="radio" aria-checked={value === n}
          aria-label={`${n} su 5`} onClick={() => onChange(n)}
          className={`rv-dot${n <= value ? ' is-on' : ''}`}>{n}</button>
      ))}
    </div>
  )
}

function initialCats(categories) {
  return Object.fromEntries(categories.map((c) => [c.key, 0]))
}

// Form recensione condiviso da pagina edificio e pagina amministratore.
// Le differenze tra le due (tipi di rapporto, categorie punteggio, campi
// extra come problema ricorrente/da quando/servizi/foto) arrivano tutte
// come prop invece di essere due componenti separati. Stessa UX per
// entrambe: punteggio generale, categorie, testo, stesso avviso pre-submit
// in modalità modifica, stessa validazione, stesso update ristretto a
// solo punteggi + testo (il resto del payload di insert non viene mai
// toccato da una modifica).
export default function ReviewForm({
  open, onClose,
  table, column, entityId,
  subtitle,
  residentTypes,
  categories,
  extras = {},
}) {
  const session = useSession()
  const router = useRouter()

  const [existingReview, fetchMyReview] = useMyReview(table, column, entityId)

  const [type, setType] = useState('resident')
  const [score, setScore] = useState(0)
  const [cats, setCats] = useState(() => initialCats(categories))
  const [issue, setIssue] = useState('none')
  const [body, setBody] = useState('')
  const [since, setSince] = useState('')
  const [amenities, setAmenities] = useState([])
  const [photos, setPhotos] = useState([])
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [policyConfirmed, setPolicyConfirmed] = useState(false)
  const [adminAnswer, setAdminAnswer] = useState({ id: null, name: '' })

  function setCat(k, v) { setCats((c) => ({ ...c, [k]: v })) }

  console.log('[ReviewForm]', table, 'render', { open, entityId, existingReview, body, score })

  // Prefill in modalità modifica: existingReview arriva async (useMyReview),
  // quindi i campi non possono essere inizializzati direttamente da useState.
  // Rieseguito anche alla riapertura (dipendenza su open) per scartare eventuali
  // modifiche non salvate di un'apertura precedente.
  useEffect(() => {
    console.log('[ReviewForm]', table, 'sync effect fired', { open, existingReview })
    if (!existingReview) return
    setType(existingReview.resident_type || 'resident')
    setScore(existingReview.score || 0)
    setCats(Object.fromEntries(categories.map((c) => [c.key, existingReview[c.field] || 0])))
    if (extras.issues) setIssue(existingReview.main_issue || 'none')
    setBody(existingReview.body || '')
    if (extras.residentSince) setSince(existingReview.resident_since || '')
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
      const catFields = Object.fromEntries(categories.map((c) => [c.field, cats[c.key] || null]))

      let reviewId
      if (existingReview?.id) {
        // Modifica: aggiorna solo punteggi + testo. Il resto (tipo residente,
        // da quando, problema ricorrente) resta quello dell'invio originale.
        // Il trigger DB rimette la recensione in verifica (moderation_status/
        // is_published), qui non li forziamo.
        const updatePayload = { score, ...catFields, body }
        // .select() forza un errore esplicito se RLS blocca l'update (0 righe
        // aggiornate) invece di un no-op silenzioso che lascerebbe la modifica
        // non salvata senza alcun avviso all'utente.
        const { data, error } = await supabase.from(table).update(updatePayload).eq('id', existingReview.id).select()
        if (error) throw error
        if (!data || data.length === 0) {
          throw new Error('Non è stato possibile aggiornare la recensione. Riprova più tardi o contattaci se il problema persiste.')
        }
        reviewId = existingReview.id
      } else {
        const payload = {
          resident_type: type, score, ...catFields, body,
          user_id: session.user.id, [column]: entityId, is_published: true,
        }
        if (extras.residentSince) payload.resident_since = since
        if (extras.issues) payload.main_issue = issue
        if (extras.issues && adminAnswer.id) payload.reported_administrator_id = adminAnswer.id
        else if (extras.issues && adminAnswer.name.trim()) payload.reported_administrator_name = adminAnswer.name.trim().slice(0, 120)

        const { data, error } = await supabase.from(table).insert(payload).select('id').single()
        if (error) throw error
        reviewId = data.id
      }

      if (extras.photos && photos.length > 0) {
        await Promise.all(photos.map((f) => uploadPhoto(f.blob, entityId, reviewId))).catch(console.warn)
      }
      track('review_submitted', {
        submission_type: existingReview ? 'update' : 'create',
        subject_type: extras.issues ? 'building' : 'administrator',
        score,
        photo_count: photos.length,
        ...(extras.issues && !existingReview ? { admin_answer: adminAnswer.id ? 'existing' : adminAnswer.name.trim() ? 'free_text' : 'skipped' } : {}),
      })
      onClose()
      await fetchMyReview()
      router.refresh()
    } catch (e) { setErr(e.message) }
    finally { setBusy(false) }
  }

  return (
    <Modal open={open} onClose={onClose}
           title={existingReview ? 'Aggiorna la tua recensione' : 'Scrivi una recensione'}
           subtitle={subtitle}>
      <div className="rv-form">
        {existingReview && (
          <p className="rv-note">Salvando le modifiche la recensione tornerà in verifica.</p>
        )}

        <section className="rv-section">
          <h3 className="rv-label">Chi sei rispetto a {extras.issues ? 'questo edificio' : 'questo amministratore'}?</h3>
          <div className="rv-chips">
            {residentTypes.map((rt) => (
              <button key={rt.value} type="button" onClick={() => setType(rt.value)}
                className={`rv-chip${type === rt.value ? ' is-on' : ''}`}>{rt.label}</button>
            ))}
          </div>
        </section>

        <section className="rv-section">
          <div className="rv-label-row">
            <h3 className="rv-label">Valutazione generale</h3>
            <span className={`rv-score-word${score ? ' is-on' : ''}`}>{score ? SCORE_WORDS[score] : 'Tocca un voto'}</span>
          </div>
          <DotRating value={score} onChange={setScore} label="Valutazione generale" />
        </section>

        <section className="rv-section">
          <h3 className="rv-label">Per categoria</h3>
          <p className="rv-hint">1 = pessimo, 5 = ottimo</p>
          <div className="rv-cats">
            {categories.map((c) => (
              <div key={c.key} className="rv-cat">
                <span className="rv-cat-label">{c.label}</span>
                <DotRating small value={cats[c.key]} onChange={(v) => setCat(c.key, v)} label={c.label} />
              </div>
            ))}
          </div>
        </section>

        {extras.issues && !existingReview && (
          <section className="rv-section">
            <h3 className="rv-label">Chi è il vostro amministratore?</h3>
            <p className="rv-hint">Facoltativo. Ci aiuta a collegare il palazzo al suo studio.</p>
            <AdminQuestion value={adminAnswer} onChange={setAdminAnswer} />
          </section>
        )}

        {extras.issues && (
          <section className="rv-section">
            <h3 className="rv-label">Problemi ricorrenti</h3>
            <select className="rv-input" value={issue} onChange={(e) => setIssue(e.target.value)}>
              {extras.issues.map((i) => <option key={i.value} value={i.value}>{i.label}</option>)}
            </select>
          </section>
        )}

        <section className="rv-section">
          <h3 className="rv-label">La tua esperienza</h3>
          <textarea className="rv-input rv-textarea" value={body} onChange={(e) => setBody(e.target.value)}
            placeholder={extras.issues
              ? "Com'è vivere qui? Amministratore, vicini, manutenzione, parti comuni..."
              : "Com'è la gestione? Reperibilità, chiarezza delle comunicazioni, assemblee..."} />
        </section>

        {extras.residentSince && (
          <section className="rv-section">
            <h3 className="rv-label">Da quando sei residente?</h3>
            <input className="rv-input" value={since} onChange={(e) => setSince(e.target.value)} placeholder="es. Dal 2019" />
          </section>
        )}

        {extras.amenities && (
          <section className="rv-section">
            <h3 className="rv-label">Quali servizi ci sono nello stabile?</h3>
            <p className="rv-hint">Seleziona solo quelli realmente disponibili per i condomini.</p>
            {AMENITY_GROUPS.map((group) => (
              <div key={group.label} className="rv-amen-group">
                <div className="rv-amen-title">{group.label}</div>
                <div className="rv-chips">
                  {group.items.map(([id, l]) => {
                    const active = amenities.includes(id)
                    return (
                      <button key={id} type="button"
                        onClick={() => setAmenities((a) => a.includes(id) ? a.filter((x) => x !== id) : [...a, id])}
                        className={`rv-chip is-sm${active ? ' is-on' : ''}`}>
                        {active && <Check size={14} strokeWidth={2.6} aria-hidden="true" />}{l}
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </section>
        )}

        {extras.photos && (
          <section className="rv-section">
            <h3 className="rv-label">Aggiungi foto <span className="rv-optional">(facoltativo)</span></h3>
            <PhotoUploader files={photos} onChange={setPhotos} maxFiles={5} />
          </section>
        )}

        <label className="rv-consent">
          <input type="checkbox" checked={policyConfirmed} onChange={(e) => setPolicyConfirmed(e.target.checked)} />
          <span>
            Confermo che la recensione si basa su un&apos;esperienza reale, è scritta in buona fede e non contiene insulti,
            accuse non provate, dati personali di terzi o contenuti diffamatori. Sono consapevole di essere personalmente responsabile di quanto pubblico.
          </span>
        </label>

        {err && <p className="rv-err">{err}</p>}
        <Button variant="primary" block onClick={submit} disabled={busy} style={{ padding: 14, borderRadius: 999 }}>
          {busy ? 'Salvataggio...' : existingReview ? 'Aggiorna recensione' : 'Pubblica recensione'}
        </Button>
        <p className="rv-foot">Nessun dato personale identificabile viene pubblicato. Le recensioni sono moderate prima della pubblicazione.</p>
      </div>
    </Modal>
  )
}
