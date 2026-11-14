export const metadata = {
  title: 'Cookie Policy',
  description: 'Quali cookie e strumenti di memorizzazione usa Condoreco: solo tecnici, nessun cookie di profilazione o di analisi.',
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
            In breve: Condoreco usa solo cookie e strumenti di memorizzazione tecnici, necessari a farti accedere e a ricordare alcune preferenze. Non usiamo cookie di profilazione, pubblicità, pixel o strumenti di analisi del traffico. Per questo non ti chiediamo il consenso e non vedi un banner cookie.
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

          <section className="legal-section">
            <h2 className="legal-section-title">5. Servizi esterni che ricevono il tuo indirizzo IP</h2>
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
            <h2 className="legal-section-title">6. Perché non c&apos;è un banner cookie</h2>
            <p className="legal-paragraph">
              Secondo le Linee guida del Garante privacy sui cookie e altri strumenti di tracciamento del 10 giugno 2021, per i soli cookie tecnici non serve il consenso: basta questa informativa. Se in futuro useremo strumenti di analisi o di marketing, aggiorneremo questa pagina e ti chiederemo il consenso prima di attivarli.
            </p>
          </section>

          <section className="legal-section">
            <h2 className="legal-section-title">7. Come cancellarli</h2>
            <p className="legal-paragraph">
              Puoi cancellare cookie e local storage in qualsiasi momento dalle impostazioni del browser (di solito alla voce Privacy o Dati dei siti). Se cancelli il cookie di sessione dovrai accedere di nuovo.
            </p>
          </section>

        </div>
      </div>
    </div>
  )
}
