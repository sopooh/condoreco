import Link from 'next/link'

export const metadata = {
  title: 'Contatti',
  description: 'Come contattare CondoReco per richieste generali, assistenza, privacy o segnalazioni.',
}

export default function Contacts() {
  return (
    <div className="legal-page">
      <div className="wrap legal-wrap">
        <div className="legal-hero">
          <div className="legal-eyebrow">Supporto</div>
          <h1 className="legal-title">Contatti</h1>
          <p className="legal-intro">
            Hai bisogno di contattare CondoReco? Usa questa pagina per richieste generali, assistenza, informazioni sulla piattaforma o comunicazioni relative alla community.
          </p>
          <p className="legal-intro">
            Per segnalare recensioni, commenti, profili edificio, immagini o altri contenuti che ritieni falsi, offensivi, lesivi della privacy o contrari alle regole della community, ti invitiamo a usare la pagina dedicata:
          </p>
          <Link href="/segnala-contenuto" className="contacts-report-cta">
            Segnala un contenuto →
          </Link>
          <p className="legal-intro" style={{ marginTop: 14 }}>
            Le segnalazioni inviate tramite il modulo dedicato ci aiutano a gestire le richieste in modo più preciso e ordinato.
          </p>
        </div>

        <div className="legal-card">

          <section className="legal-section">
            <div className="contacts-section-icon">✉</div>
            <h2 className="legal-section-title">Richieste generali</h2>
            <p className="legal-paragraph">
              Per informazioni, collaborazioni, problemi tecnici o domande sul funzionamento della piattaforma:
            </p>
            <p className="contacts-contact-row">
              <span className="contacts-label">Email</span>
              <a href="mailto:info@condoreco.com" className="contacts-link">info@condoreco.com</a>
            </p>
          </section>

          <section className="legal-section">
            <div className="contacts-section-icon">🔒</div>
            <h2 className="legal-section-title">Privacy e dati personali</h2>
            <p className="legal-paragraph">
              Per richieste relative al trattamento dei dati personali, cancellazione account, esercizio dei diritti privacy o informazioni GDPR:
            </p>
            <p className="contacts-contact-row">
              <span className="contacts-label">Email privacy</span>
              <a href="mailto:privacy@condoreco.com" className="contacts-link">privacy@condoreco.com</a>
            </p>
          </section>

          <section className="legal-section">
            <div className="contacts-section-icon">⚑</div>
            <h2 className="legal-section-title">Segnalazioni contenuti</h2>
            <p className="legal-paragraph">
              Per contenuti potenzialmente falsi, offensivi, diffamatori, non pertinenti o lesivi della privacy:
            </p>
            <p className="contacts-contact-row">
              <span className="contacts-label">Usa il modulo</span>
              <Link href="/segnala-contenuto" className="contacts-link">Segnala un contenuto</Link>
            </p>
          </section>

          <section className="legal-section">
            <div className="contacts-section-icon">⏱</div>
            <h2 className="legal-section-title">Tempi di risposta</h2>
            <p className="legal-paragraph">
              Cerchiamo di rispondere alle richieste nel minor tempo possibile. Le segnalazioni sui contenuti vengono valutate caso per caso e l'invio di una richiesta non comporta automaticamente la rimozione del contenuto segnalato.
            </p>
          </section>

        </div>
      </div>
    </div>
  )
}
