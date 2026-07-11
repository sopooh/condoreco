'use client'

import { useMemo, useState } from 'react'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'

const CONTENT_TYPES = [
  'Recensione',
  'Commento',
  'Profilo edificio',
  'Profilo amministratore',
  'Immagine o allegato',
  'Messaggio nella community',
  'Altro',
]

const REPORT_REASONS = [
  'Contenuto falso o fuorviante',
  'Linguaggio offensivo o diffamatorio',
  'Dati personali pubblicati senza consenso',
  'Accuse non provate verso persone o aziende',
  'Contenuto discriminatorio o minaccioso',
  'Spam o contenuto non pertinente',
  'Violazione copyright o uso non autorizzato di immagini/documenti',
  'Altro',
]

const RELATED_OPTIONS = ['Si', 'No', 'Preferisco non specificare']

const INITIAL_FORM = {
  contentType: '',
  reference: '',
  reason: '',
  description: '',
  related: 'Preferisco non specificare',
  fullName: '',
  email: '',
  attachments: [],
  goodFaith: false,
  privacyConsent: false,
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function ReportContentForm() {
  const [form, setForm] = useState(INITIAL_FORM)
  const [errors, setErrors] = useState({})
  const [submitted, setSubmitted] = useState(false)
  const attachmentNames = useMemo(() => Array.from(form.attachments || []).map((file) => file.name), [form.attachments])

  function setField(key, value) {
    setForm((current) => ({ ...current, [key]: value }))
    setErrors((current) => {
      if (!current[key]) return current
      const next = { ...current }
      delete next[key]
      return next
    })
  }

  function handleFiles(event) {
    const files = Array.from(event.target.files || [])
    setField('attachments', files)
  }

  function validate() {
    const nextErrors = {}
    if (!form.contentType) nextErrors.contentType = 'Seleziona il tipo di contenuto.'
    if (!form.reference.trim()) nextErrors.reference = 'Inserisci un link o un riferimento al contenuto.'
    if (!form.reason) nextErrors.reason = 'Seleziona il motivo della segnalazione.'
    if (!form.description.trim()) nextErrors.description = 'Descrivi brevemente la segnalazione.'
    if (!form.email.trim()) nextErrors.email = 'Inserisci la tua email di contatto.'
    else if (!EMAIL_RE.test(form.email.trim())) nextErrors.email = 'Inserisci un indirizzo email valido.'
    if (!form.goodFaith) nextErrors.goodFaith = 'Conferma che la segnalazione e inviata in buona fede.'
    if (!form.privacyConsent) nextErrors.privacyConsent = 'Devi accettare l\'informativa privacy per proseguire.'
    return nextErrors
  }

  function handleSubmit(event) {
    event.preventDefault()
    const nextErrors = validate()
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    // TODO: collegare il form a Supabase o a un workflow email/admin per persistere le segnalazioni.
    // TODO: gestire l'upload reale degli allegati in storage sicuro prima dell'invio al backend.
    setSubmitted(true)
    setForm(INITIAL_FORM)
  }

  return (
    <div className="report-page">
      <div className="wrap report-wrap">
        <div className="report-hero">
          <div className="legal-eyebrow">Moderazione</div>
          <h1 className="legal-title">Segnala un contenuto</h1>
          <p className="legal-intro legal-intro-strong">Aiutaci a mantenere CondoReco una community utile, sicura e rispettosa.</p>
          <p className="legal-intro">
            Se ritieni che un contenuto pubblicato su CondoReco violi le nostre linee guida, contenga informazioni false,
            dati personali non autorizzati, linguaggio offensivo o potenzialmente diffamatorio, puoi inviarci una segnalazione.
            Valuteremo la richiesta e, se necessario, potremo rimuovere, oscurare o limitare il contenuto.
          </p>
        </div>

        {submitted && (
          <Card hover={false} style={{ marginBottom: 20, borderColor: '#B7E4D4', background: '#F3FBF8' }}>
            <div className="report-success">
              <div className="report-success-badge">Segnalazione inviata</div>
              <p className="report-success-text">
                Segnalazione inviata correttamente. Il team CondoReco valutera il contenuto e potra intervenire secondo le linee guida della community.
              </p>
            </div>
          </Card>
        )}

        <div className="report-grid">
          <Card hover={false} style={{ borderRadius: 24 }}>
            <form className="report-form" onSubmit={handleSubmit} noValidate>
              <FormField label="Tipo di contenuto da segnalare" error={errors.contentType} required>
                <select value={form.contentType} onChange={(event) => setField('contentType', event.target.value)} className={fieldClass(errors.contentType)}>
                  <option value="">Seleziona un tipo di contenuto</option>
                  {CONTENT_TYPES.map((option) => <option key={option} value={option}>{option}</option>)}
                </select>
              </FormField>

              <FormField label="Link o riferimento del contenuto" error={errors.reference} required>
                <input
                  type="text"
                  value={form.reference}
                  onChange={(event) => setField('reference', event.target.value)}
                  placeholder="Incolla il link della pagina o descrivi dove si trova il contenuto"
                  className={fieldClass(errors.reference)}
                />
              </FormField>

              <FormField label="Motivo della segnalazione" error={errors.reason} required>
                <select value={form.reason} onChange={(event) => setField('reason', event.target.value)} className={fieldClass(errors.reason)}>
                  <option value="">Seleziona il motivo della segnalazione</option>
                  {REPORT_REASONS.map((option) => <option key={option} value={option}>{option}</option>)}
                </select>
              </FormField>

              <FormField label="Descrizione della segnalazione" error={errors.description} required>
                <textarea
                  value={form.description}
                  onChange={(event) => setField('description', event.target.value)}
                  placeholder="Spiega brevemente perché ritieni che il contenuto debba essere verificato."
                  className={fieldClass(errors.description)}
                  rows={5}
                />
              </FormField>

              <fieldset className="report-fieldset">
                <legend className="report-label">Il contenuto riguarda te o una tua attività?</legend>
                <div className="report-radio-group">
                  {RELATED_OPTIONS.map((option) => (
                    <label key={option} className="report-radio-option">
                      <input
                        type="radio"
                        name="related"
                        checked={form.related === option}
                        onChange={() => setField('related', option)}
                      />
                      <span>{option}</span>
                    </label>
                  ))}
                </div>
              </fieldset>

              <div className="report-two-col">
                <FormField label="Nome e cognome">
                  <input
                    type="text"
                    value={form.fullName}
                    onChange={(event) => setField('fullName', event.target.value)}
                    placeholder="Facoltativo"
                    className={fieldClass(errors.fullName)}
                  />
                </FormField>

                <FormField label="Email di contatto" error={errors.email} required>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(event) => setField('email', event.target.value)}
                    placeholder="Ti contatteremo solo se servono ulteriori informazioni."
                    className={fieldClass(errors.email)}
                  />
                </FormField>
              </div>

              <FormField label="Allegati o prove">
                <label className="report-upload">
                  <span className="report-upload-title">Carica immagini o PDF</span>
                  <span className="report-upload-subtitle">Formati supportati: JPG, PNG, WEBP, PDF</span>
                  <input type="file" accept="image/*,application/pdf" multiple onChange={handleFiles} style={{ display: 'none' }} />
                </label>
                {attachmentNames.length > 0 && (
                  <div className="report-attachment-list">
                    {attachmentNames.map((name) => <span key={name} className="report-attachment-item">{name}</span>)}
                  </div>
                )}
              </FormField>

              <label className="report-checkbox-row">
                <input type="checkbox" checked={form.goodFaith} onChange={(event) => setField('goodFaith', event.target.checked)} />
                <span>Confermo che le informazioni fornite sono veritiere e che la segnalazione è inviata in buona fede.</span>
              </label>
              {errors.goodFaith && <div className="report-error">{errors.goodFaith}</div>}

              <label className="report-checkbox-row">
                <input type="checkbox" checked={form.privacyConsent} onChange={(event) => setField('privacyConsent', event.target.checked)} />
                <span>Ho letto l'informativa privacy e acconsento al trattamento dei dati per la gestione della segnalazione.</span>
              </label>
              {errors.privacyConsent && <div className="report-error">{errors.privacyConsent}</div>}

              <p className="report-disclaimer">
                Le segnalazioni vengono gestite in via prudenziale e non implicano automaticamente che il contenuto segnalato sia falso, illecito o contrario alle linee guida.
              </p>

              <Button variant="primary" type="submit" block style={{ padding: 13 }}>
                Invia segnalazione
              </Button>
            </form>
          </Card>

          <div className="report-side-stack">
            <Card hover={false} style={{ borderRadius: 24 }}>
              <div className="report-info-card">
                <h2 className="report-info-title">Cosa succede dopo la segnalazione?</h2>
                <p className="report-info-text">
                  Le segnalazioni vengono valutate caso per caso. CondoReco può decidere di mantenere il contenuto online,
                  limitarne la visibilità, richiedere chiarimenti all'autore, modificarlo, oscurarlo temporaneamente o rimuoverlo.
                  L'invio di una segnalazione non comporta automaticamente la rimozione del contenuto.
                </p>
              </div>
            </Card>

            <Card hover={false} style={{ borderRadius: 24 }}>
              <div className="report-info-card">
                <h2 className="report-info-title">Uso corretto dello strumento</h2>
                <p className="report-info-text">
                  Lo strumento di segnalazione non deve essere utilizzato per intimidire altri utenti, rimuovere recensioni legittime
                  o ostacolare opinioni espresse in modo rispettoso. Le segnalazioni false, abusive o inviate in malafede possono comportare limitazioni dell'account.
                </p>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}

function FormField({ label, error, required, children }) {
  return (
    <div className="report-field">
      <label className="report-label">
        {label}
        {required && <span className="report-required"> *</span>}
      </label>
      {children}
      {error && <div className="report-error">{error}</div>}
    </div>
  )
}

function fieldClass(hasError) {
  return `report-input${hasError ? ' report-input-error' : ''}`
}
