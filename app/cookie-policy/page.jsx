import CookiePreferencesButton from '@/components/cookie/CookiePreferencesButton'

export const metadata = {
  title: 'Cookie Policy',
  description: 'Informazioni sui cookie utilizzati da CondoReco e su come gestire le preferenze di consenso.',
}

export default function CookiePolicy() {
  return (
    <div className="legal-page">
      <div className="wrap legal-wrap">
        <div className="legal-hero">
          <div className="legal-eyebrow">Documento legale</div>
          <h1 className="legal-title">Cookie Policy</h1>
          <p className="legal-intro">Ultimo aggiornamento: 3 Luglio 2026</p>
          <p className="legal-intro">
            La presente Cookie Policy descrive come CondoReco utilizza cookie e tecnologie simili di tracciamento sul sito e sulla piattaforma.
          </p>
          <p className="legal-intro">
            Per maggiori informazioni sul trattamento dei dati personali, consulta la <a href="/privacy-policy" className="legal-link">Privacy Policy</a>.
          </p>
        </div>

        <div className="legal-card">

          <section className="legal-section">
            <h2 className="legal-section-title">1. Cosa sono i cookie</h2>
            <p className="legal-paragraph">
              I cookie sono piccoli file di testo che i siti web salvano nel browser dell'utente quando questo visita una pagina. Vengono utilizzati per ricordare le preferenze, garantire il funzionamento del sito, raccogliere dati statistici o, quando previsto e con consenso, per attività di marketing e profilazione.
            </p>
            <p className="legal-paragraph">
              Tecnologie simili, come il local storage, i pixel e gli identificatori di sessione, possono essere usate per scopi analoghi.
            </p>
          </section>

          <section className="legal-section">
            <h2 className="legal-section-title">2. Cookie utilizzati da CondoReco</h2>

            <div className="legal-subsection">
              <h3 className="legal-subsection-title">2.1 Cookie tecnici e necessari</h3>
              <p className="legal-paragraph">
                Sono sempre attivi e non richiedono il consenso dell'utente. Sono indispensabili per il funzionamento del sito e non possono essere disabilitati.
              </p>
              <p className="legal-paragraph">Includono:</p>
              <ul className="legal-list">
                <li>cookie di sessione per la gestione dell'autenticazione e dell'account;</li>
                <li>cookie di preferenza per salvare le scelte dell'utente, come le preferenze cookie;</li>
                <li>cookie di sicurezza per prevenire accessi non autorizzati e proteggere la piattaforma;</li>
                <li>cookie tecnici necessari al corretto funzionamento delle pagine e delle funzionalità.</li>
              </ul>
            </div>

            <div className="legal-subsection">
              <h3 className="legal-subsection-title">2.2 Cookie analitici</h3>
              <p className="legal-paragraph">
                Sono attivi solo con il consenso dell'utente. Ci aiutano a capire come viene utilizzata la piattaforma: quali pagine, edifici, quartieri e funzionalità vengono consultati di più, quali sono i percorsi di navigazione e dove si incontrano difficoltà.
              </p>
              <p className="legal-paragraph">
                Queste informazioni vengono usate esclusivamente per migliorare CondoReco e non per finalità di profilazione commerciale.
              </p>
              <p className="legal-paragraph">
                Strumenti che potrebbero essere utilizzati: Google Analytics o strumenti equivalenti. {/* TODO: aggiornare con gli strumenti analitici effettivamente in uso */}
              </p>
            </div>

            <div className="legal-subsection">
              <h3 className="legal-subsection-title">2.3 Cookie di marketing</h3>
              <p className="legal-paragraph">
                Sono attivi solo con il consenso esplicito dell'utente. Potranno essere usati in futuro per misurare campagne pubblicitarie, affiliazioni, comunicazioni promozionali o per personalizzare la fruizione della piattaforma.
              </p>
              <p className="legal-paragraph">
                Al momento, CondoReco non utilizza cookie di marketing o pixel pubblicitari attivi. {/* TODO: aggiornare se vengono introdotti strumenti di marketing */}
              </p>
            </div>
          </section>

          <section className="legal-section">
            <h2 className="legal-section-title">3. Cookie di terze parti</h2>
            <p className="legal-paragraph">
              Alcune funzionalità della piattaforma possono richiedere l'utilizzo di servizi di terze parti che installano i propri cookie, soggetti alle rispettive privacy policy.
            </p>
            <p className="legal-paragraph">
              CondoReco non è responsabile per i cookie installati da servizi terzi. L'utente può consultare le privacy policy dei singoli fornitori per maggiori informazioni.
            </p>
          </section>

          <section className="legal-section">
            <h2 className="legal-section-title">4. Gestione del consenso</h2>
            <p className="legal-paragraph">
              Alla prima visita, CondoReco mostra un banner cookie che consente di accettare tutti i cookie, rifiutare quelli non essenziali o personalizzare le preferenze.
            </p>
            <p className="legal-paragraph">
              La scelta viene salvata nel browser e il banner non viene mostrato nelle visite successive, salvo che l'utente non cancelli i dati del browser.
            </p>
            <p className="legal-paragraph">
              L'utente può modificare le proprie preferenze in qualsiasi momento tramite il link "Preferenze cookie" presente nel footer del sito, oppure cliccando il pulsante qui sotto.
            </p>
            <CookiePreferencesButton />
          </section>

          <section className="legal-section">
            <h2 className="legal-section-title">5. Come disabilitare i cookie dal browser</h2>
            <p className="legal-paragraph">
              Indipendentemente dalle scelte effettuate sul banner, l'utente può gestire o disabilitare i cookie direttamente dalle impostazioni del proprio browser.
            </p>
            <ul className="legal-list">
              <li><strong>Chrome:</strong> Impostazioni › Privacy e sicurezza › Cookie e altri dati dei siti</li>
              <li><strong>Firefox:</strong> Preferenze › Privacy e sicurezza › Cookie e dati dei siti</li>
              <li><strong>Safari:</strong> Preferenze › Privacy › Gestisci i dati dei siti web</li>
              <li><strong>Edge:</strong> Impostazioni › Cookie e autorizzazioni del sito</li>
            </ul>
            <p className="legal-paragraph">
              La disabilitazione di tutti i cookie potrebbe compromettere il corretto funzionamento di alcune funzionalità di CondoReco.
            </p>
          </section>

          <section className="legal-section">
            <h2 className="legal-section-title">6. Durata dei cookie</h2>
            <p className="legal-paragraph">
              I cookie tecnici di sessione scadono alla chiusura del browser. I cookie di preferenza (come la scelta del consenso) possono essere conservati per un periodo più lungo, indicato nella documentazione tecnica del servizio.
            </p>
            <p className="legal-paragraph">
              I cookie analitici e di marketing, quando attivi, hanno durata variabile secondo i termini del fornitore del servizio.
            </p>
          </section>

          <section className="legal-section">
            <h2 className="legal-section-title">7. Aggiornamenti alla Cookie Policy</h2>
            <p className="legal-paragraph">
              CondoReco può aggiornare questa Cookie Policy per riflettere modifiche normative, tecniche o organizzative, o in caso di introduzione di nuovi strumenti.
            </p>
            <p className="legal-paragraph">
              La versione aggiornata sarà pubblicata su questa pagina con indicazione della data di ultimo aggiornamento. In caso di modifiche sostanziali, potrà essere mostrato nuovamente il banner di consenso.
            </p>
          </section>

          <section className="legal-section">
            <h2 className="legal-section-title">8. Contatti</h2>
            <p className="legal-paragraph">
              Per domande relative all'uso dei cookie o al trattamento dei dati personali, l'utente può contattare il Titolare:
            </p>
            <p className="legal-paragraph">
              <strong>CondoReco SRL</strong><br />
              Email privacy: <a href="mailto:privacy@condoreco.com" className="legal-link">privacy@condoreco.com</a>
            </p>
          </section>

        </div>
      </div>
    </div>
  )
}
