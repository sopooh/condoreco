export const metadata = {
  title: 'Termini e Condizioni',
  description: "Termini e condizioni d'uso della piattaforma CondoReco: regole di utilizzo, responsabilità e diritti degli utenti.",
}

function BulletList({ items }) {
  return (
    <ul className="legal-list">
      {items.map((item) => <li key={item}>{item}</li>)}
    </ul>
  )
}

export default function TermsConditions() {
  return (
    <div className="legal-page">
      <div className="wrap legal-wrap">
        <div className="legal-hero">
          <div className="legal-eyebrow">Documento legale</div>
          <h1 className="legal-title">Termini e Condizioni</h1>
          <p className="legal-intro">Ultimo aggiornamento: 3 Luglio 2026</p>
          <p className="legal-intro">
            I presenti Termini e Condizioni disciplinano l'accesso e l'utilizzo del sito, della community, dei servizi, delle funzionalità, delle recensioni, delle segnalazioni e dei contenuti disponibili su CondoReco.
          </p>
          <p className="legal-intro">
            Utilizzando CondoReco, l'utente dichiara di aver letto, compreso e accettato i presenti Termini e Condizioni, la Privacy Policy, la Cookie Policy, le Regole Recensioni e le Linee Guida della Community.
          </p>
          <p className="legal-intro legal-intro-strong">
            Se l'utente non accetta i presenti Termini e Condizioni, deve interrompere l'utilizzo della piattaforma.
          </p>
        </div>

        <div className="legal-card">

          {/* 1 */}
          <section className="legal-section">
            <h2 className="legal-section-title">1. Definizioni</h2>
            <p className="legal-paragraph">Ai fini dei presenti Termini e Condizioni:</p>
            <ul className="legal-list legal-list-def">
              <li><span className="legal-label">CondoReco</span> indica la piattaforma online accessibile tramite il sito www.condoreco.com, gestita da CondoReco SRL.</li>
              <li><span className="legal-label">Piattaforma</span> indica il sito web, le pagine, le funzionalità, i servizi, i form, le aree community, le recensioni, i profili edificio, le pagine quartiere, i sistemi di segnalazione e ogni altra funzione collegata a CondoReco.</li>
              <li><span className="legal-label">Utente</span> indica qualsiasi persona che accede, consulta, si registra o utilizza la piattaforma.</li>
              <li><span className="legal-label">Utente registrato</span> indica l'utente che crea un account su CondoReco.</li>
              <li><span className="legal-label">Contenuti dell'utente</span> indica recensioni, commenti, valutazioni, segnalazioni, immagini, testi, documenti, messaggi, risposte, opinioni o qualsiasi altro contenuto pubblicato, inviato o caricato dall'utente.</li>
              <li><span className="legal-label">Community</span> indica l'insieme degli utenti e delle interazioni che avvengono sulla piattaforma.</li>
              <li><span className="legal-label">Titolare</span> indica il soggetto che gestisce CondoReco: CondoReco SRL — <a href="mailto:info@condoreco.com" className="legal-link">info@condoreco.com</a></li>
            </ul>
          </section>

          {/* 2 */}
          <section className="legal-section">
            <h2 className="legal-section-title">2. Oggetto del servizio</h2>
            <p className="legal-paragraph">
              CondoReco è una community informativa dedicata alla condivisione di esperienze reali sulla vita condominiale, sugli edifici, sui quartieri e sui servizi collegati alla gestione degli stabili.
            </p>
            <p className="legal-paragraph">La piattaforma consente agli utenti, ove disponibili le relative funzionalità, di:</p>
            <BulletList items={[
              'consultare informazioni su edifici, condomini e quartieri;',
              'pubblicare recensioni e valutazioni;',
              'leggere esperienze condivise da altri utenti;',
              'segnalare contenuti ritenuti contrari alle regole della community;',
              'partecipare ad eventuali aree community, chat o funzioni di confronto;',
              'contribuire al miglioramento delle informazioni disponibili sulla piattaforma.',
            ]} />
            <p className="legal-paragraph">
              CondoReco non è una piattaforma di denuncia, non è un'autorità pubblica, non svolge attività investigativa, non fornisce consulenza legale, tecnica, fiscale, immobiliare o condominiale e non sostituisce amministratori, assemblee condominiali, avvocati, autorità competenti o professionisti abilitati.
            </p>
          </section>

          {/* 3 */}
          <section className="legal-section">
            <h2 className="legal-section-title">3. Natura informativa dei contenuti</h2>
            <p className="legal-paragraph">
              Le informazioni presenti su CondoReco hanno finalità esclusivamente informative e orientative.
            </p>
            <p className="legal-paragraph">
              Recensioni, punteggi, commenti, classifiche, valutazioni e contenuti pubblicati dagli utenti rappresentano opinioni, esperienze personali e percezioni soggettive degli autori.
            </p>
            <p className="legal-paragraph">
              CondoReco non garantisce che i contenuti pubblicati dagli utenti siano completi, aggiornati, accurati, verificati, imparziali o privi di errori.
            </p>
            <p className="legal-paragraph">
              Gli utenti devono sempre svolgere verifiche autonome prima di prendere decisioni relative ad acquisto, locazione, vendita, gestione o valutazione di un immobile, di un condominio o di una zona.
            </p>
          </section>

          {/* 4 */}
          <section className="legal-section">
            <h2 className="legal-section-title">4. Registrazione e account</h2>
            <p className="legal-paragraph">
              Per utilizzare alcune funzionalità della piattaforma può essere richiesta la creazione di un account.
            </p>
            <p className="legal-paragraph">
              L'utente si impegna a fornire informazioni corrette, aggiornate e complete durante la registrazione e a mantenerle aggiornate.
            </p>
            <p className="legal-paragraph">
              L'utente è responsabile della custodia delle proprie credenziali di accesso e di tutte le attività svolte tramite il proprio account.
            </p>
            <p className="legal-paragraph">
              L'utente deve informare tempestivamente CondoReco in caso di uso non autorizzato dell'account, violazione delle credenziali o sospetta compromissione della sicurezza.
            </p>
            <p className="legal-paragraph">
              CondoReco può sospendere, limitare o chiudere un account in caso di violazione dei presenti Termini, delle Regole Recensioni, della Privacy Policy, delle Linee Guida della Community o della normativa applicabile.
            </p>
          </section>

          {/* 5 */}
          <section className="legal-section">
            <h2 className="legal-section-title">5. Età minima</h2>
            <p className="legal-paragraph">CondoReco non è destinato a minori di 14 anni.</p>
            <p className="legal-paragraph">
              Utilizzando la piattaforma, l'utente dichiara di avere almeno 14 anni o l'età minima richiesta dalla normativa applicabile per prestare validamente il consenso al trattamento dei dati personali.
            </p>
            <p className="legal-paragraph">
              CondoReco può rimuovere account o contenuti qualora venga a conoscenza dell'utilizzo della piattaforma da parte di soggetti che non hanno l'età minima richiesta.
            </p>
          </section>

          {/* 6 */}
          <section className="legal-section">
            <h2 className="legal-section-title">6. Contenuti pubblicati dagli utenti</h2>
            <p className="legal-paragraph">
              Gli utenti possono pubblicare contenuti solo nel rispetto dei presenti Termini, delle Regole Recensioni e delle Linee Guida della Community.
            </p>
            <p className="legal-paragraph">
              Ogni utente è personalmente responsabile dei contenuti che pubblica, invia, carica o rende disponibili tramite CondoReco.
            </p>
            <p className="legal-paragraph">Pubblicando un contenuto, l'utente dichiara che:</p>
            <BulletList items={[
              'il contenuto è basato su un\'esperienza reale, quando si tratta di recensioni o valutazioni;',
              'il contenuto è veritiero secondo la propria conoscenza;',
              'il contenuto è espresso in modo rispettoso, proporzionato e non offensivo;',
              'il contenuto non viola diritti di terzi;',
              'il contenuto non contiene dati personali di terzi pubblicati senza consenso;',
              'il contenuto non contiene accuse non provate, insulti, minacce o espressioni diffamatorie;',
              'l\'utente dispone dei diritti necessari per pubblicare eventuali immagini, documenti o allegati;',
              'il contenuto non è falso, manipolato, ingannevole o pubblicato con finalità ritorsive.',
            ]} />
          </section>

          {/* 7 */}
          <section className="legal-section">
            <h2 className="legal-section-title">7. Contenuti vietati</h2>
            <p className="legal-paragraph">È vietato pubblicare, inviare o caricare su CondoReco contenuti che:</p>
            <BulletList items={[
              'siano falsi, ingannevoli o manipolati;',
              'contengano insulti, minacce, molestie o linguaggio aggressivo;',
              'siano diffamatori, offensivi o lesivi della reputazione di persone, amministratori, condomini, società, fornitori, proprietari, inquilini o altri soggetti;',
              'attribuiscano reati, illeciti o condotte scorrette senza elementi verificabili;',
              'contengano dati personali di terzi senza consenso;',
              'includano dati sensibili o particolari, come informazioni sulla salute, religione, opinioni politiche, origine etnica, orientamento sessuale o situazione personale di terzi;',
              'contengano foto di persone riconoscibili senza consenso;',
              'contengano documenti riservati, verbali completi, contratti, email private, chat private o informazioni confidenziali;',
              'violino diritti d\'autore, marchi, segreti commerciali o altri diritti di proprietà intellettuale;',
              'siano discriminatori, violenti, osceni o contrari alla legge;',
              'costituiscano spam, pubblicità non autorizzata o contenuto promozionale non richiesto;',
              'siano pubblicati tramite account falsi, multipli o automatizzati;',
              'siano finalizzati ad alterare artificialmente recensioni, punteggi o ranking;',
              'siano non pertinenti rispetto alla finalità della piattaforma.',
            ]} />
          </section>

          {/* 8 */}
          <section className="legal-section">
            <h2 className="legal-section-title">8. Regole specifiche per le recensioni</h2>
            <p className="legal-paragraph">
              Le recensioni devono essere basate su esperienze reali e formulate con linguaggio civile, neutro e basato sui fatti.
            </p>
            <p className="legal-paragraph">
              Sono ammesse recensioni positive, negative o critiche, purché rispettose e non diffamatorie.
            </p>
            <p className="legal-paragraph">È consentito descrivere aspetti come:</p>
            <BulletList items={[
              'qualità della vita nello stabile;',
              'rumore;',
              'manutenzione;',
              'sicurezza percepita;',
              'vicinato;',
              'spese condominiali;',
              'servizi comuni;',
              'comunicazione dell\'amministrazione;',
              'gestione ordinaria dello stabile;',
              'esperienza generale nel condominio o nel quartiere.',
            ]} />
            <p className="legal-paragraph">
              Non è consentito usare le recensioni per attaccare personalmente persone, amministratori, vicini, proprietari, inquilini, società o fornitori.
            </p>
            <p className="legal-paragraph">
              Le recensioni devono rispettare anche la pagina "Regole Recensioni", che costituisce parte integrante dei presenti Termini.
            </p>
          </section>

          {/* 9 */}
          <section className="legal-section">
            <h2 className="legal-section-title">9. Profili edificio, quartiere e amministrazione</h2>
            <p className="legal-paragraph">
              Le pagine relative a edifici, condomini, quartieri o amministrazioni hanno finalità informativa.
            </p>
            <p className="legal-paragraph">
              CondoReco può creare, organizzare, modificare, aggiornare o rimuovere pagine relative a edifici, condomini o zone, anche sulla base di informazioni pubbliche, contributi degli utenti, segnalazioni o attività interna di gestione della piattaforma.
            </p>
            <p className="legal-paragraph">
              La presenza di un edificio, di un condominio, di un quartiere, di un amministratore o di una società su CondoReco non implica alcuna affiliazione, approvazione, partnership o rapporto commerciale con CondoReco, salvo diversa indicazione espressa.
            </p>
          </section>

          {/* 10 */}
          <section className="legal-section">
            <h2 className="legal-section-title">10. Punteggi, ranking e valutazioni</h2>
            <p className="legal-paragraph">
              I punteggi e i ranking presenti su CondoReco sono elaborazioni basate sulle recensioni, valutazioni e informazioni disponibili sulla piattaforma.
            </p>
            <p className="legal-paragraph">
              I ranking non rappresentano certificazioni ufficiali, valutazioni professionali, garanzie di qualità, perizie tecniche o giudizi definitivi.
            </p>
            <p className="legal-paragraph">
              I punteggi possono variare nel tempo in base a nuove recensioni, aggiornamenti, segnalazioni, rimozioni di contenuti o modifiche tecniche della piattaforma.
            </p>
            <p className="legal-paragraph">
              CondoReco può modificare criteri di calcolo, modalità di visualizzazione e sistemi di ranking per migliorare il servizio, prevenire abusi o rendere le informazioni più utili agli utenti.
            </p>
          </section>

          {/* 11 */}
          <section className="legal-section">
            <h2 className="legal-section-title">11. Segnalazione dei contenuti</h2>
            <p className="legal-paragraph">
              Gli utenti e i soggetti interessati possono segnalare contenuti ritenuti falsi, offensivi, diffamatori, illeciti, lesivi della privacy o contrari ai presenti Termini tramite la pagina "Segnala un contenuto" o tramite gli altri canali indicati dalla piattaforma.
            </p>
            <p className="legal-paragraph">La segnalazione deve contenere:</p>
            <BulletList items={[
              'riferimento al contenuto contestato;',
              'motivo della segnalazione;',
              'descrizione sintetica del problema;',
              'eventuali elementi utili alla valutazione;',
              'un contatto email per eventuali comunicazioni.',
            ]} />
            <p className="legal-paragraph">CondoReco valuterà le segnalazioni caso per caso e potrà decidere di:</p>
            <BulletList items={[
              'mantenere il contenuto online;',
              'limitarne la visibilità;',
              'oscurarlo temporaneamente;',
              'richiedere chiarimenti all\'autore;',
              'modificare la visualizzazione di alcuni dati;',
              'rimuovere il contenuto;',
              'sospendere o limitare l\'account responsabile.',
            ]} />
            <p className="legal-paragraph">
              L'invio di una segnalazione non comporta automaticamente la rimozione del contenuto.
            </p>
            <p className="legal-paragraph">
              La gestione delle segnalazioni avviene secondo le procedure previste dalla piattaforma e, ove applicabile, dalla normativa sui servizi digitali.
            </p>
          </section>

          {/* 12 */}
          <section className="legal-section">
            <h2 className="legal-section-title">12. Moderazione</h2>
            <p className="legal-paragraph">
              CondoReco può moderare i contenuti pubblicati dagli utenti prima o dopo la pubblicazione.
            </p>
            <p className="legal-paragraph">
              La moderazione può avvenire tramite controlli manuali, strumenti automatici, filtri linguistici, sistemi di rilevazione abusi, segnalazioni degli utenti o verifiche successive.
            </p>
            <p className="legal-paragraph">
              CondoReco può rimuovere, oscurare, limitare o modificare la visibilità di contenuti che, a propria valutazione e anche in via prudenziale, risultino contrari ai presenti Termini, alle Regole Recensioni, alle Linee Guida della Community, alla Privacy Policy o alla normativa applicabile.
            </p>
            <p className="legal-paragraph">
              La rimozione o limitazione di un contenuto non implica necessariamente che CondoReco riconosca la falsità, l'illiceità o la fondatezza della segnalazione, ma può avvenire per ragioni di sicurezza, tutela della community, prevenzione di abusi o riduzione del rischio legale.
            </p>
          </section>

          {/* 13 */}
          <section className="legal-section">
            <h2 className="legal-section-title">13. Diritto di replica e richieste di revisione</h2>
            <p className="legal-paragraph">
              I soggetti direttamente interessati da un contenuto possono richiedere una verifica, una revisione o inviare una replica.
            </p>
            <p className="legal-paragraph">
              La replica deve essere formulata in modo rispettoso, pertinente e non offensivo.
            </p>
            <p className="legal-paragraph">
              CondoReco potrà valutare se pubblicare, trasmettere, utilizzare internamente o tenere agli atti la replica nell'ambito della gestione della segnalazione o della revisione del contenuto.
            </p>
            <p className="legal-paragraph">
              CondoReco non garantisce la pubblicazione automatica di ogni replica ricevuta.
            </p>
          </section>

          {/* 14 */}
          <section className="legal-section">
            <h2 className="legal-section-title">14. Uso corretto della piattaforma</h2>
            <p className="legal-paragraph">
              L'utente si impegna a usare CondoReco in modo lecito, corretto e conforme alla finalità informativa della community.
            </p>
            <p className="legal-paragraph">È vietato:</p>
            <BulletList items={[
              'usare la piattaforma per molestare, intimidire o danneggiare altri utenti o terzi;',
              'pubblicare contenuti falsi o ritorsivi;',
              'creare account multipli per alterare recensioni o punteggi;',
              'usare bot, scraping non autorizzato o sistemi automatici non approvati;',
              'tentare di violare la sicurezza della piattaforma;',
              'accedere ad account altrui;',
              'interferire con il funzionamento del sito;',
              'copiare massivamente dati o contenuti;',
              'usare CondoReco per attività illegali, fraudolente o abusive.',
            ]} />
          </section>

          {/* 15 */}
          <section className="legal-section">
            <h2 className="legal-section-title">15. Proprietà intellettuale di CondoReco</h2>
            <p className="legal-paragraph">
              Il marchio CondoReco, il nome, il logo, la grafica, il design, l'interfaccia, il codice, la struttura del sito, i testi redazionali, gli elementi visivi e ogni altro contenuto realizzato dalla piattaforma sono di proprietà del Titolare o concessi in licenza al Titolare.
            </p>
            <p className="legal-paragraph">
              È vietato copiare, riprodurre, distribuire, modificare, vendere, riutilizzare o sfruttare tali elementi senza autorizzazione scritta.
            </p>
          </section>

          {/* 16 */}
          <section className="legal-section">
            <h2 className="legal-section-title">16. Licenza sui contenuti degli utenti</h2>
            <p className="legal-paragraph">
              Pubblicando contenuti su CondoReco, l'utente concede al Titolare una licenza non esclusiva, gratuita, trasferibile nei limiti necessari, valida a livello mondiale, per utilizzare, riprodurre, pubblicare, visualizzare, adattare tecnicamente, distribuire e rendere disponibili tali contenuti sulla piattaforma e nei servizi collegati.
            </p>
            <p className="legal-paragraph">
              La licenza è concessa al solo fine di gestire, promuovere, migliorare, moderare e rendere fruibile CondoReco.
            </p>
            <p className="legal-paragraph">
              L'utente conserva la titolarità dei diritti sui contenuti di cui è autore, nei limiti consentiti dalla legge.
            </p>
            <p className="legal-paragraph">
              L'utente garantisce di avere tutti i diritti necessari per pubblicare i contenuti caricati.
            </p>
          </section>

          {/* 17 */}
          <section className="legal-section">
            <h2 className="legal-section-title">17. Contenuti di terzi e link esterni</h2>
            <p className="legal-paragraph">
              CondoReco può contenere link a siti, servizi o contenuti di terzi.
            </p>
            <p className="legal-paragraph">
              CondoReco non controlla e non è responsabile per contenuti, politiche privacy, sicurezza, disponibilità o pratiche di siti e servizi esterni.
            </p>
            <p className="legal-paragraph">
              L'accesso a siti terzi avviene sotto la responsabilità dell'utente.
            </p>
          </section>

          {/* 18 */}
          <section className="legal-section">
            <h2 className="legal-section-title">18. Disponibilità del servizio</h2>
            <p className="legal-paragraph">
              CondoReco si impegna a mantenere la piattaforma funzionante e accessibile, ma non garantisce che il servizio sia sempre disponibile, continuo, privo di errori o immune da interruzioni.
            </p>
            <p className="legal-paragraph">
              La piattaforma può essere sospesa, modificata o interrotta per manutenzione, aggiornamenti, problemi tecnici, esigenze di sicurezza, cause di forza maggiore o decisioni organizzative.
            </p>
            <p className="legal-paragraph">
              CondoReco può modificare, aggiungere o rimuovere funzionalità in qualsiasi momento.
            </p>
          </section>

          {/* 19 */}
          <section className="legal-section">
            <h2 className="legal-section-title">19. Limitazione di responsabilità</h2>
            <p className="legal-paragraph">Nei limiti consentiti dalla legge, CondoReco non è responsabile per:</p>
            <BulletList items={[
              'contenuti pubblicati dagli utenti;',
              'inesattezza, incompletezza o mancato aggiornamento delle recensioni;',
              'opinioni, valutazioni o dichiarazioni espresse dagli utenti;',
              'decisioni prese dagli utenti sulla base delle informazioni presenti sulla piattaforma;',
              'danni derivanti dall\'uso o dall\'impossibilità di usare la piattaforma;',
              'condotte illecite, offensive o scorrette di utenti o terzi;',
              'contenuti presenti su siti esterni collegati tramite link;',
              'perdita di dati dovuta a eventi tecnici, forza maggiore o cause non imputabili a CondoReco.',
            ]} />
            <p className="legal-paragraph">
              Resta inteso che l'autore di un contenuto rimane il principale responsabile di quanto pubblicato.
            </p>
            <p className="legal-paragraph">
              Nulla nei presenti Termini esclude o limita responsabilità che non possono essere escluse o limitate ai sensi della legge applicabile.
            </p>
          </section>

          {/* 20 */}
          <section className="legal-section">
            <h2 className="legal-section-title">20. Manleva</h2>
            <p className="legal-paragraph">
              L'utente si impegna a manlevare e tenere indenne CondoReco, il Titolare, i collaboratori, i fornitori e gli eventuali partner da pretese, richieste, danni, perdite, responsabilità, costi o spese derivanti da:
            </p>
            <BulletList items={[
              'contenuti pubblicati dall\'utente;',
              'violazione dei presenti Termini;',
              'violazione delle Regole Recensioni o delle Linee Guida della Community;',
              'violazione di diritti di terzi;',
              'uso illecito o scorretto della piattaforma;',
              'pubblicazione di dati personali, immagini, documenti o informazioni senza autorizzazione.',
            ]} />
            <p className="legal-paragraph">Questa clausola opera nei limiti consentiti dalla normativa applicabile.</p>
          </section>

          {/* 21 */}
          <section className="legal-section">
            <h2 className="legal-section-title">21. Privacy e dati personali</h2>
            <p className="legal-paragraph">
              Il trattamento dei dati personali degli utenti è disciplinato dalla Privacy Policy di CondoReco.
            </p>
            <p className="legal-paragraph">
              L'uso di cookie e strumenti di tracciamento è disciplinato dalla Cookie Policy.
            </p>
            <p className="legal-paragraph">
              Utilizzando la piattaforma, l'utente dichiara di aver preso visione della Privacy Policy e della Cookie Policy.
            </p>
          </section>

          {/* 22 */}
          <section className="legal-section">
            <h2 className="legal-section-title">22. Sospensione e chiusura dell'account</h2>
            <p className="legal-paragraph">
              CondoReco può sospendere, limitare o chiudere un account, anche senza preavviso, nei seguenti casi:
            </p>
            <BulletList items={[
              'violazione dei presenti Termini;',
              'pubblicazione di contenuti vietati;',
              'uso abusivo della piattaforma;',
              'recensioni false o manipolate;',
              'account multipli o falsi;',
              'violazione della privacy di terzi;',
              'attività che possano danneggiare utenti, terzi o la piattaforma;',
              'richieste provenienti da autorità competenti;',
              'esigenze di sicurezza.',
            ]} />
            <p className="legal-paragraph">
              L'utente può richiedere la chiusura del proprio account secondo le modalità indicate nella piattaforma o nella Privacy Policy.
            </p>
          </section>

          {/* 23 */}
          <section className="legal-section">
            <h2 className="legal-section-title">23. Modifiche ai Termini</h2>
            <p className="legal-paragraph">
              CondoReco può modificare i presenti Termini e Condizioni in qualsiasi momento per esigenze tecniche, organizzative, legali o di evoluzione del servizio.
            </p>
            <p className="legal-paragraph">
              La versione aggiornata sarà pubblicata su questa pagina con indicazione della data di ultimo aggiornamento.
            </p>
            <p className="legal-paragraph">
              L'uso continuato della piattaforma dopo la pubblicazione delle modifiche comporta l'accettazione dei Termini aggiornati.
            </p>
          </section>

          {/* 24 */}
          <section className="legal-section">
            <h2 className="legal-section-title">24. Legge applicabile</h2>
            <p className="legal-paragraph">
              I presenti Termini sono disciplinati dalla legge italiana, salvo diversa disciplina inderogabile applicabile all'utente in qualità di consumatore.
            </p>
          </section>

          {/* 25 */}
          <section className="legal-section">
            <h2 className="legal-section-title">25. Foro competente</h2>
            <p className="legal-paragraph">
              Per eventuali controversie relative ai presenti Termini, sarà competente il foro previsto dalla normativa applicabile.
            </p>
            <p className="legal-paragraph">
              Se l'utente agisce in qualità di consumatore, resta ferma la competenza del foro del luogo di residenza o domicilio del consumatore, se situato in Italia.
            </p>
          </section>

          {/* 26 */}
          <section className="legal-section">
            <h2 className="legal-section-title">26. Contatti</h2>
            <p className="legal-paragraph">
              Per richieste relative ai presenti Termini e Condizioni, l'utente può contattare CondoReco ai seguenti recapiti:
            </p>
            <p className="legal-paragraph">
              <strong>CondoReco SRL</strong><br />
              Email: <a href="mailto:info@condoreco.com" className="legal-link">info@condoreco.com</a><br />
              Email privacy: <a href="mailto:privacy@condoreco.com" className="legal-link">privacy@condoreco.com</a><br />
              Sede: Viale del Lavoro 54/56
            </p>
          </section>

          {/* 27 */}
          <section className="legal-section">
            <h2 className="legal-section-title">27. Documenti collegati</h2>
            <p className="legal-paragraph">Fanno parte integrante dell'utilizzo della piattaforma:</p>
            <BulletList items={[
              'Privacy Policy;',
              'Cookie Policy;',
              'Regole Recensioni;',
              'Linee Guida della Community;',
              'Pagina Segnala un contenuto.',
            ]} />
            <p className="legal-paragraph">
              In caso di contrasto tra i presenti Termini e documenti specifici relativi a particolari funzionalità, prevalgono le disposizioni più specifiche, nei limiti consentiti dalla legge.
            </p>
          </section>

        </div>
      </div>
    </div>
  )
}
