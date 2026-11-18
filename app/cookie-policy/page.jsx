export const metadata = {
  title: 'Cookie Policy',
  description: 'Quali cookie e strumenti di memorizzazione usa Condoreco: cookie tecnici e, solo con il tuo consenso, statistiche PostHog.',
}

const COOKIES = [
  { name: 'sb-…-auth-token', who: 'Condoreco (Supabase)', why: 'Mantiene l\'accesso al tuo account (sessione di login).', how: 'Fino al logout o alla scadenza della sessione' },
  { name: 'condoreco_after_auth', who: 'Condoreco', why: 'Ti riporta alla pagina giusta dopo aver aperto il link per reimpostare la password.', how: '1 ora' },
]

const STORAGE = [
  { name: 'condoreco:next', why: 'Ricorda la pagina da riaprire dopo il login.', how: 'Cancellata dopo il login' },
  { name: 'condoreco:view-as', why: 'Ricorda la vista scelta (residente, amministratore, fornitore) se hai più ruoli.', how: 'Finché non la cambi' },
  { name: 'condoreco:calendar-view', why: 'Ricorda se preferisci il calendario a mese o a lista.', how: 'Finché non la cambi' },
  { name: 'condorank_onboarded_<id>', why: 'Evita di mostrarti di nuovo la schermata di benvenuto.', how: 'Finché non svuoti i dati del browser' },
]

const ANALYTICS = [
  { name: 'ph_<chiave>_posthog', where: 'cookie e local storage', why: 'Identificativo casuale del browser per contare visite e sessioni.', how: '12 mesi' },
  { name: 'ph_<chiave>_window_id, ph_<chiave>_primary_window_exists', where: 'session storage', why: 'Distingue le schede aperte per le registrazioni di sessione.', how: 'Fino alla chiusura della scheda' },
  { name: 'condoreco:consent', where: 'local storage', why: 'Ricorda se hai accettato o rifiutato (tecnico, sempre presente dopo la scelta).', how: '6 mesi, poi ti chiediamo di nuovo' },
]

const THIRD = [
  { name: 'MapTiler (Svizzera)', why: 'Mappe interattive delle pagine di ricerca e degli edifici.' },
  { name: 'OpenStreetMap Foundation (Regno Unito)', why: 'Anteprime statiche delle mappe.' },
  { name: 'Photon di Komoot (Germania)', why: 'Suggerimenti di indirizzo mentre scrivi nella ricerca.' },
]

export default function CookiePolicy() {
  return (
    <div className="legal-page">
      <div className="wrap legal-wrap">
        <div className="legal-hero">
          <div className="legal-eyebrow">Documento legale</div>
          <h1 className="legal-title">Cookie Policy</h1>
          <p className="legal-intro">Ultimo aggiornamento: 14 novembre 2026</p>
          <p className="legal-intro">
            In breve: Condoreco usa cookie e strumenti di memorizzazione tecnici, necessari a farti accedere e a ricordare alcune preferenze. Solo se lo accetti dal banner usiamo anche PostHog per statistiche di utilizzo, mappe dei clic e registrazioni anonimizzate della navigazione. Non usiamo cookie di profilazione pubblicitaria né pixel di social network.
          </p>
          <p className="legal-intro">
            Per il resto dei trattamenti di dati personali leggi la <a href="/privacy-policy" className="legal-link">Privacy Policy</a>.
          </p>
        </div>

        <div className="legal-card">

          <section className="legal-section">
            <h2 className="legal-section-title">1. Chi è il titolare</h2>
            <p className="legal-paragraph">
              Il titolare del trattamento è <strong>Sophie Perazzolo</strong>, che gestisce Condoreco. Per qualsiasi domanda scrivi a <a href="mailto:hello@condoreco.com" className="legal-link">hello@condoreco.com</a>. I dati completi del titolare sono nella <a href="/privacy-policy#titolare" className="legal-link">Privacy Policy</a>.
            </p>
          </section>

          <section className="legal-section">
            <h2 className="legal-section-title">2. Cosa sono cookie e local storage</h2>
            <p className="legal-paragraph">
              I cookie sono piccoli file di testo che un sito salva nel browser. Il local storage è uno spazio simile, sempre nel browser, che il sito usa per ricordare informazioni senza inviarle a ogni richiesta. Le regole sono le stesse per entrambi (art. 122 del Codice privacy).
            </p>
          </section>

          <section className="legal-section">
            <h2 className="legal-section-title">3. Cookie che usiamo</h2>
            <p className="legal-paragraph">Sono tutti cookie tecnici di prima parte. Senza di loro non potresti accedere al tuo account.</p>
            <div className="legal-table-wrap">
              <table className="legal-table">
                <thead><tr><th scope="col">Nome</th><th scope="col">Di chi</th><th scope="col">A cosa serve</th><th scope="col">Durata</th></tr></thead>
                <tbody>
                  {COOKIES.map(c => (
                    <tr key={c.name}><td><code>{c.name}</code></td><td>{c.who}</td><td>{c.why}</td><td>{c.how}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="legal-section">
            <h2 className="legal-section-title">4. Dati salvati nel local storage</h2>
            <p className="legal-paragraph">Servono solo a ricordare le tue scelte su questo dispositivo. Non vengono usati per profilarti e non vengono condivisi con terzi.</p>
            <div className="legal-table-wrap">
              <table className="legal-table">
                <thead><tr><th scope="col">Chiave</th><th scope="col">A cosa serve</th><th scope="col">Durata</th></tr></thead>
                <tbody>
                  {STORAGE.map(c => (
                    <tr key={c.name}><td><code>{c.name}</code></td><td>{c.why}</td><td>{c.how}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="legal-section" id="statistiche">
            <h2 className="legal-section-title">5. Statistiche con PostHog (solo con il tuo consenso)</h2>
            <p className="legal-paragraph">
              Se clicchi &quot;Accetta&quot; nel banner, il sito attiva PostHog, un servizio di analisi fornito da PostHog Inc. con i dati conservati nel cloud UE di PostHog (Francoforte, Germania). Le richieste passano dal nostro dominio. Lo usiamo per capire quali pagine vengono visitate, dove si clicca (mappe dei clic) e dove le persone incontrano difficoltà, con lo scopo di migliorare il sito. Non lo usiamo per pubblicità e non vendiamo i dati.
            </p>
            <p className="legal-paragraph">
              Le registrazioni di sessione riproducono i movimenti nella pagina con tutti i campi dei moduli oscurati, e sono attive solo nelle pagine pubbliche: nell&apos;area condominio, nel profilo, nelle notifiche e nel pannello di amministrazione non registriamo la sessione e non salviamo il testo degli elementi cliccati. Se hai un account, colleghiamo le statistiche solo al suo identificativo interno, mai a email o nome.
            </p>
            <div className="legal-table-wrap">
              <table className="legal-table">
                <thead><tr><th scope="col">Nome</th><th scope="col">Dove</th><th scope="col">A cosa serve</th><th scope="col">Durata</th></tr></thead>
                <tbody>
                  {ANALYTICS.map(c => (
                    <tr key={c.name}><td><code>{c.name}</code></td><td>{c.where}</td><td>{c.why}</td><td>{c.how}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="legal-paragraph">
              Base giuridica: il tuo consenso (art. 6.1.a GDPR e art. 122 del Codice privacy). Se rifiuti o chiudi il banner, PostHog non viene caricato e il sito funziona allo stesso modo. Puoi revocare il consenso in qualsiasi momento da &quot;Preferenze cookie&quot; in fondo a ogni pagina: cancelliamo subito i dati PostHog dal tuo browser. I dati raccolti sono conservati per un massimo di 12 mesi.
            </p>
          </section>

          <section className="legal-section">
            <h2 className="legal-section-title">6. Servizi esterni che ricevono il tuo indirizzo IP</h2>
            <p className="legal-paragraph">
              Alcune funzioni caricano contenuti da servizi esterni. Questi servizi non installano cookie, ma per mostrarti mappe e suggerimenti ricevono, come ogni server web, il tuo indirizzo IP e le informazioni tecniche del browser.
            </p>
            <div className="legal-table-wrap">
              <table className="legal-table">
                <thead><tr><th scope="col">Servizio</th><th scope="col">Quando</th></tr></thead>
                <tbody>
                  {THIRD.map(c => <tr key={c.name}><td>{c.name}</td><td>{c.why}</td></tr>)}
                </tbody>
              </table>
            </div>
            <p className="legal-paragraph">
              Se accedi con Google, la schermata di accesso è gestita da Google, che applica la propria informativa. Il sito è ospitato da Vercel, che riceve il tuo IP per servirti le pagine (vedi la <a href="/privacy-policy#fornitori" className="legal-link">Privacy Policy</a>).
            </p>
          </section>

          <section className="legal-section">
            <h2 className="legal-section-title">7. Come funziona il banner</h2>
            <p className="legal-paragraph">
              Seguiamo le Linee guida del Garante privacy sui cookie e altri strumenti di tracciamento del 10 giugno 2021: i cookie tecnici non richiedono consenso, le statistiche PostHog sì. Nel banner &quot;Rifiuta&quot; e &quot;Accetta&quot; hanno lo stesso peso e chiudere il banner con la X equivale a rifiutare. Ricordiamo la tua scelta per 6 mesi, poi te la chiediamo di nuovo.
            </p>
          </section>

          <section className="legal-section">
            <h2 className="legal-section-title">8. Come cancellarli</h2>
            <p className="legal-paragraph">
              Puoi cancellare cookie e local storage in qualsiasi momento dalle impostazioni del browser (di solito alla voce Privacy o Dati dei siti). Se cancelli il cookie di sessione dovrai accedere di nuovo. Se cancelli la tua scelta sul consenso, il banner ricomparirà.
            </p>
          </section>

        </div>
      </div>
    </div>
  )
}
