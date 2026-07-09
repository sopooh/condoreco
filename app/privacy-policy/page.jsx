export const metadata = {
  title: 'Privacy Policy',
  description: 'Informativa sulla privacy di CondoReco: come trattiamo i dati personali degli utenti nel rispetto del GDPR.',
}

function BulletList({ items }) {
  return (
    <ul className="legal-list">
      {items.map((item) => <li key={item}>{item}</li>)}
    </ul>
  )
}

function Base({ text }) {
  return <p className="legal-base"><span className="legal-base-label">Base giuridica:</span> {text}</p>
}

function SubSection({ title, children }) {
  return (
    <div className="legal-subsection">
      <h3 className="legal-subsection-title">{title}</h3>
      {children}
    </div>
  )
}

export default function PrivacyPolicy() {
  return (
    <div className="legal-page">
      <div className="wrap legal-wrap">
        <div className="legal-hero">
          <div className="legal-eyebrow">Documento legale</div>
          <h1 className="legal-title">Privacy Policy</h1>
          <p className="legal-intro">
            Ultimo aggiornamento: 3 Luglio 2026
          </p>
          <p className="legal-intro">
            La presente Privacy Policy descrive le modalità con cui CondoReco raccoglie, utilizza, conserva e protegge i dati personali degli utenti che visitano o utilizzano il sito, la community, i form, le funzionalità di recensione, segnalazione e interazione presenti sulla piattaforma.
          </p>
          <p className="legal-intro">
            CondoReco tratta i dati personali nel rispetto del Regolamento UE 2016/679, noto come GDPR, e della normativa italiana applicabile in materia di protezione dei dati personali.
          </p>
        </div>

        <div className="legal-card">

          {/* 1 */}
          <section className="legal-section">
            <h2 className="legal-section-title">1. Titolare del trattamento</h2>
            <p className="legal-paragraph">Il Titolare del trattamento dei dati personali è:</p>
            <p className="legal-paragraph">
              <strong>Sophie Perazzolo</strong><br />
              Sede: Viale del Lavoro 54/56<br />
              Email privacy: <a href="mailto:privacy@condoreco.com" className="legal-link">privacy@condoreco.com</a>
            </p>
            <p className="legal-paragraph">
              Per qualsiasi richiesta relativa al trattamento dei dati personali, l'utente può contattare il Titolare all'indirizzo email indicato sopra.
            </p>
            <p className="legal-paragraph">
              Se verrà nominato un Responsabile della protezione dei dati (DPO), i relativi contatti saranno indicati in questa sezione.
            </p>
          </section>

          {/* 2 */}
          <section className="legal-section">
            <h2 className="legal-section-title">2. Tipologie di dati personali trattati</h2>
            <p className="legal-paragraph">CondoReco può trattare le seguenti categorie di dati personali.</p>

            <SubSection title="2.1 Dati forniti direttamente dall'utente">
              <p className="legal-paragraph">Rientrano in questa categoria:</p>
              <BulletList items={[
                'nome utente;',
                'nome e cognome, se forniti;',
                'indirizzo email;',
                'password in forma protetta;',
                'contenuti pubblicati dall\'utente, come recensioni, commenti, valutazioni, segnalazioni, messaggi, risposte e descrizioni;',
                'informazioni inserite nei form di contatto o di segnalazione;',
                'eventuali immagini, documenti o allegati caricati dall\'utente;',
                'dati forniti in caso di richiesta di assistenza, moderazione o esercizio dei diritti privacy.',
              ]} />
            </SubSection>

            <SubSection title="2.2 Dati relativi all'uso della piattaforma">
              <p className="legal-paragraph">CondoReco può raccogliere dati tecnici e di utilizzo, tra cui:</p>
              <BulletList items={[
                'indirizzo IP;',
                'data e ora di accesso;',
                'tipo di dispositivo;',
                'browser utilizzato;',
                'sistema operativo;',
                'pagine visitate;',
                'azioni effettuate sulla piattaforma;',
                'log tecnici necessari alla sicurezza e al corretto funzionamento del sito.',
              ]} />
            </SubSection>

            <SubSection title="2.3 Dati relativi alle recensioni e alla community">
              <p className="legal-paragraph">Quando l'utente pubblica una recensione o partecipa alla community, CondoReco può trattare:</p>
              <BulletList items={[
                'contenuto della recensione;',
                'punteggi e valutazioni;',
                'edificio, condominio, quartiere o area oggetto della recensione;',
                'data di pubblicazione;',
                'eventuale nome utente pubblico;',
                'eventuali interazioni con altri contenuti;',
                'segnalazioni ricevute o inviate.',
              ]} />
              <p className="legal-paragraph">
                L'utente non deve inserire nelle recensioni dati personali di terzi, informazioni riservate, dati sensibili, nomi di vicini privati, recapiti, documenti, codici fiscali, targhe, immagini di persone riconoscibili o dettagli che permettano di identificare soggetti terzi senza consenso.
              </p>
            </SubSection>
          </section>

          {/* 3 */}
          <section className="legal-section">
            <h2 className="legal-section-title">3. Finalità del trattamento</h2>
            <p className="legal-paragraph">I dati personali sono trattati per le seguenti finalità.</p>

            <SubSection title="3.1 Registrazione e gestione dell'account">
              <p className="legal-paragraph">
                I dati sono trattati per consentire all'utente di creare un account, accedere alla piattaforma, gestire il profilo, pubblicare contenuti, salvare preferenze e utilizzare le funzionalità disponibili.
              </p>
              <Base text="esecuzione di un contratto o di misure precontrattuali richieste dall'utente." />
            </SubSection>

            <SubSection title="3.2 Pubblicazione e gestione delle recensioni">
              <p className="legal-paragraph">
                I dati sono trattati per consentire la pubblicazione, visualizzazione, gestione, modifica, moderazione e rimozione di recensioni, valutazioni e contenuti generati dagli utenti.
              </p>
              <Base text="esecuzione del servizio richiesto dall'utente e legittimo interesse del Titolare al funzionamento della community." />
            </SubSection>

            <SubSection title="3.3 Moderazione, sicurezza e prevenzione di abusi">
              <p className="legal-paragraph">I dati possono essere trattati per:</p>
              <BulletList items={[
                'prevenire spam, recensioni false, contenuti offensivi o illeciti;',
                'verificare segnalazioni;',
                'applicare le regole della community;',
                'proteggere utenti, terzi e piattaforma;',
                'prevenire frodi, accessi non autorizzati o usi impropri del servizio;',
                'documentare eventuali violazioni delle regole.',
              ]} />
              <Base text="legittimo interesse del Titolare alla sicurezza della piattaforma, alla tutela della community e alla prevenzione di abusi." />
            </SubSection>

            <SubSection title="3.4 Gestione delle segnalazioni">
              <p className="legal-paragraph">
                I dati inseriti nella pagina "Segnala un contenuto" sono trattati per ricevere, analizzare e gestire segnalazioni relative a recensioni, commenti, profili, immagini, documenti o altri contenuti ritenuti falsi, offensivi, diffamatori, lesivi della privacy o contrari alle regole della community.
              </p>
              <Base text="legittimo interesse del Titolare alla gestione responsabile della piattaforma e, ove applicabile, adempimento di obblighi previsti dalla normativa applicabile ai servizi digitali." />
            </SubSection>

            <SubSection title="3.5 Risposta a richieste di contatto o assistenza">
              <p className="legal-paragraph">
                I dati forniti tramite email, form o altri canali di contatto sono trattati per rispondere alle richieste dell'utente, fornire supporto e gestire comunicazioni relative al servizio.
              </p>
              <Base text="esecuzione di misure precontrattuali o contrattuali richieste dall'utente." />
            </SubSection>

            <SubSection title="3.6 Adempimento di obblighi di legge">
              <p className="legal-paragraph">
                I dati possono essere trattati per adempiere a obblighi previsti da leggi, regolamenti, ordini dell'autorità o richieste legittime provenienti da autorità competenti.
              </p>
              <Base text="obbligo legale." />
            </SubSection>

            <SubSection title="3.7 Accertamento, esercizio o difesa di diritti">
              <p className="legal-paragraph">
                I dati possono essere conservati e utilizzati per accertare, esercitare o difendere un diritto del Titolare, degli utenti o di terzi in sede giudiziale o stragiudiziale.
              </p>
              <Base text="legittimo interesse e, ove applicabile, esercizio o difesa di un diritto." />
            </SubSection>

            <SubSection title="3.8 Comunicazioni di servizio">
              <p className="legal-paragraph">
                CondoReco può usare l'email dell'utente per inviare comunicazioni strettamente relative al servizio, come conferme di registrazione, notifiche di sicurezza, aggiornamenti importanti, gestione dell'account, modifiche ai termini o risposte a segnalazioni.
              </p>
              <Base text="esecuzione del servizio e legittimo interesse del Titolare." />
            </SubSection>

            <SubSection title="3.9 Marketing e newsletter">
              <p className="legal-paragraph">
                Se previsto, CondoReco può trattare l'indirizzo email dell'utente per inviare newsletter, aggiornamenti, comunicazioni promozionali o contenuti informativi.
              </p>
              <Base text="consenso dell'utente." />
              <p className="legal-paragraph">
                L'utente può revocare il consenso in qualsiasi momento, seguendo le istruzioni presenti nelle comunicazioni ricevute o scrivendo al Titolare.
              </p>
            </SubSection>
          </section>

          {/* 4 */}
          <section className="legal-section">
            <h2 className="legal-section-title">4. Dati particolari e dati di terzi</h2>
            <p className="legal-paragraph">
              CondoReco non richiede agli utenti di fornire dati particolari ai sensi dell'art. 9 GDPR, come dati relativi a salute, opinioni politiche, religione, orientamento sessuale, origine etnica o altre categorie sensibili.
            </p>
            <p className="legal-paragraph">
              Gli utenti non devono pubblicare dati particolari propri o di terzi all'interno di recensioni, commenti, chat, segnalazioni, immagini o allegati.
            </p>
            <p className="legal-paragraph">
              Se CondoReco rileva la presenza di dati particolari, dati personali di terzi o informazioni non necessarie, potrà rimuovere, oscurare o limitare il contenuto.
            </p>
          </section>

          {/* 5 */}
          <section className="legal-section">
            <h2 className="legal-section-title">5. Visibilità dei contenuti pubblicati</h2>
            <p className="legal-paragraph">
              Le recensioni, i punteggi, i commenti e gli altri contenuti pubblicati dall'utente possono essere visibili agli altri utenti della piattaforma e ai visitatori del sito, secondo le impostazioni e le funzionalità disponibili.
            </p>
            <p className="legal-paragraph">
              L'utente è invitato a non pubblicare informazioni che non desidera rendere pubbliche.
            </p>
            <p className="legal-paragraph">
              CondoReco può mostrare accanto ai contenuti pubblicati un nome utente, una data di pubblicazione, un punteggio o altre informazioni necessarie al funzionamento della community.
            </p>
          </section>

          {/* 6 */}
          <section className="legal-section">
            <h2 className="legal-section-title">6. Modalità del trattamento</h2>
            <p className="legal-paragraph">
              Il trattamento dei dati personali avviene con strumenti informatici, telematici e, se necessario, manuali, secondo principi di liceità, correttezza, trasparenza, minimizzazione, esattezza, integrità e riservatezza.
            </p>
            <p className="legal-paragraph">
              CondoReco adotta misure tecniche e organizzative ragionevoli per proteggere i dati personali da accessi non autorizzati, perdita, alterazione, diffusione o uso improprio.
            </p>
            <p className="legal-paragraph">
              Tuttavia, nessun sistema informatico può garantire sicurezza assoluta. L'utente è responsabile della custodia delle proprie credenziali di accesso e deve comunicare tempestivamente eventuali usi non autorizzati del proprio account.
            </p>
          </section>

          {/* 7 */}
          <section className="legal-section">
            <h2 className="legal-section-title">7. Conservazione dei dati</h2>
            <p className="legal-paragraph">I dati personali sono conservati per il tempo necessario a perseguire le finalità per cui sono stati raccolti.</p>
            <p className="legal-paragraph">In particolare:</p>
            <BulletList items={[
              'i dati dell\'account sono conservati finché l\'account resta attivo;',
              'le recensioni e i contenuti pubblici possono restare visibili finché l\'utente non li cancella, finché l\'account resta attivo o finché la loro conservazione è necessaria per il funzionamento della piattaforma, la moderazione o la tutela di diritti;',
              'i dati relativi a segnalazioni, moderazione e sicurezza possono essere conservati per il tempo necessario alla gestione del caso e alla tutela della piattaforma, degli utenti o di terzi;',
              'i dati di contatto sono conservati per il tempo necessario a rispondere alla richiesta;',
              'i dati trattati per obblighi di legge sono conservati per il periodo previsto dalla normativa applicabile;',
              'i log tecnici e di sicurezza sono conservati per un periodo proporzionato alle esigenze di sicurezza, prevenzione abusi e tutela del servizio;',
              'i dati trattati per marketing sono conservati fino alla revoca del consenso o per il diverso periodo indicato al momento della raccolta.',
            ]} />
            <p className="legal-paragraph">
              I dati potranno essere conservati più a lungo quando necessario per adempiere a obblighi di legge, rispondere a richieste dell'autorità o accertare, esercitare o difendere un diritto.
            </p>
          </section>

          {/* 8 */}
          <section className="legal-section">
            <h2 className="legal-section-title">8. Destinatari dei dati personali</h2>
            <p className="legal-paragraph">I dati personali possono essere comunicati, nei limiti necessari, alle seguenti categorie di soggetti:</p>
            <BulletList items={[
              'fornitori di servizi hosting, cloud, database e infrastruttura tecnica;',
              'fornitori di servizi email, autenticazione, sicurezza, backup e manutenzione;',
              'consulenti legali, fiscali, tecnici o amministrativi;',
              'soggetti incaricati della moderazione o assistenza utenti;',
              'autorità pubbliche, giudiziarie o amministrative, quando previsto dalla legge;',
              'soggetti terzi coinvolti nella gestione di segnalazioni, controversie o richieste legittime.',
            ]} />
            <p className="legal-paragraph">
              I fornitori che trattano dati personali per conto di CondoReco saranno nominati responsabili del trattamento ove richiesto dalla normativa applicabile.
            </p>
            <p className="legal-paragraph">
              L'elenco aggiornato dei responsabili del trattamento può essere richiesto al Titolare.
            </p>
          </section>

          {/* 9 */}
          <section className="legal-section">
            <h2 className="legal-section-title">9. Trasferimento dei dati fuori dallo Spazio Economico Europeo</h2>
            <p className="legal-paragraph">
              I dati personali sono trattati preferibilmente all'interno dello Spazio Economico Europeo.
            </p>
            <p className="legal-paragraph">
              Qualora fosse necessario trasferire dati personali verso Paesi situati fuori dallo Spazio Economico Europeo, il trasferimento avverrà solo in presenza di una base giuridica adeguata, come decisioni di adeguatezza della Commissione Europea, clausole contrattuali standard o altre garanzie previste dal GDPR.
            </p>
          </section>

          {/* 10 */}
          <section className="legal-section">
            <h2 className="legal-section-title">10. Cookie e strumenti di tracciamento</h2>
            <p className="legal-paragraph">
              CondoReco può utilizzare cookie e strumenti simili per garantire il funzionamento del sito, migliorare l'esperienza utente, analizzare il traffico e, se previsto, svolgere attività di marketing o personalizzazione.
            </p>
            <p className="legal-paragraph">
              I cookie tecnici sono necessari al funzionamento del sito e non richiedono il consenso dell'utente.
            </p>
            <p className="legal-paragraph">
              I cookie analitici non tecnici, di profilazione, marketing o tracciamento sono utilizzati solo nei casi e con le modalità previste dalla normativa applicabile, anche tramite banner cookie e consenso dell'utente, ove necessario.
            </p>
            <p className="legal-paragraph">
              Per maggiori informazioni, l'utente può consultare la Cookie Policy di CondoReco.
            </p>
          </section>

          {/* 11 */}
          <section className="legal-section">
            <h2 className="legal-section-title">11. Recensioni, contenuti pubblici e responsabilità dell'utente</h2>
            <p className="legal-paragraph">
              L'utente è responsabile dei dati personali e dei contenuti che decide di pubblicare su CondoReco.
            </p>
            <p className="legal-paragraph">Prima di pubblicare recensioni, commenti, immagini o allegati, l'utente deve verificare di non inserire:</p>
            <BulletList items={[
              'dati personali di terzi;',
              'informazioni riservate;',
              'documenti privati;',
              'immagini di persone riconoscibili senza consenso;',
              'dati sensibili;',
              'informazioni non necessarie;',
              'accuse o contenuti lesivi della reputazione altrui.',
            ]} />
            <p className="legal-paragraph">
              CondoReco può rimuovere, oscurare o limitare contenuti che violano questa Privacy Policy, le regole della community, i termini di servizio o la normativa applicabile.
            </p>
          </section>

          {/* 12 */}
          <section className="legal-section">
            <h2 className="legal-section-title">12. Minori</h2>
            <p className="legal-paragraph">
              CondoReco non è destinato a minori di 14 anni.
            </p>
            <p className="legal-paragraph">
              Gli utenti minori di 14 anni non devono registrarsi né fornire dati personali attraverso la piattaforma.
            </p>
            <p className="legal-paragraph">
              Se il Titolare viene a conoscenza della raccolta di dati personali relativi a minori in assenza dei presupposti richiesti dalla legge, adotterà misure ragionevoli per cancellare tali dati.
            </p>
          </section>

          {/* 13 */}
          <section className="legal-section">
            <h2 className="legal-section-title">13. Diritti dell'interessato</h2>
            <p className="legal-paragraph">L'utente, in qualità di interessato, può esercitare i diritti previsti dal GDPR, tra cui:</p>
            <BulletList items={[
              'diritto di accesso ai dati personali;',
              'diritto di rettifica dei dati inesatti;',
              'diritto di cancellazione, nei casi previsti;',
              'diritto di limitazione del trattamento;',
              'diritto di opposizione al trattamento;',
              'diritto alla portabilità dei dati, ove applicabile;',
              'diritto di revocare il consenso, quando il trattamento si basa sul consenso;',
              'diritto di proporre reclamo al Garante per la protezione dei dati personali.',
            ]} />
            <p className="legal-paragraph">Le richieste possono essere inviate al Titolare all'indirizzo:</p>
            <p className="legal-paragraph">
              <a href="mailto:privacy@condoreco.com" className="legal-link">privacy@condoreco.com</a>
            </p>
            <p className="legal-paragraph">
              Il Titolare risponderà nei termini previsti dalla normativa applicabile.
            </p>
          </section>

          {/* 14 */}
          <section className="legal-section">
            <h2 className="legal-section-title">14. Reclamo al Garante Privacy</h2>
            <p className="legal-paragraph">
              L'utente che ritenga che il trattamento dei propri dati personali avvenga in violazione della normativa applicabile può proporre reclamo al Garante per la protezione dei dati personali o rivolgersi all'autorità giudiziaria competente.
            </p>
          </section>

          {/* 15 */}
          <section className="legal-section">
            <h2 className="legal-section-title">15. Modifiche alla Privacy Policy</h2>
            <p className="legal-paragraph">
              CondoReco può modificare o aggiornare questa Privacy Policy in qualsiasi momento, anche a seguito di modifiche normative, evoluzioni tecniche della piattaforma o introduzione di nuove funzionalità.
            </p>
            <p className="legal-paragraph">
              La versione aggiornata sarà pubblicata su questa pagina con indicazione della data di ultimo aggiornamento.
            </p>
            <p className="legal-paragraph">
              L'uso continuato della piattaforma dopo la pubblicazione delle modifiche comporta la presa visione della Privacy Policy aggiornata.
            </p>
          </section>

        </div>
      </div>
    </div>
  )
}
