export const metadata = {
  title: 'Privacy Policy',
  description: 'Come Condoreco tratta i dati personali di utenti, residenti, amministratori di condominio e fornitori, nel rispetto del GDPR.',
}

// Indirizzo completo del titolare: da completare con CAP e città.
const TITOLARE_INDIRIZZO = 'Viale del Lavoro 54/56'
const EMAIL = 'hello@condoreco.com'

function BulletList({ items }) {
  return (
    <ul className="legal-list">
      {items.map((item) => <li key={item}>{item}</li>)}
    </ul>
  )
}

function SubSection({ title, children, id }) {
  return (
    <div className="legal-subsection" id={id}>
      <h3 className="legal-subsection-title">{title}</h3>
      {children}
    </div>
  )
}

function Table({ head, rows }) {
  return (
    <div className="legal-table-wrap">
      <table className="legal-table legal-table-stack">
        <thead><tr>{head.map(h => <th key={h} scope="col">{h}</th>)}</tr></thead>
        <tbody>{rows.map((r) => <tr key={r[0]}>{r.map((c, i) => <td key={i} data-label={head[i]}>{c}</td>)}</tr>)}</tbody>
      </table>
    </div>
  )
}

const Mail = () => <a href={`mailto:${EMAIL}`} className="legal-link">{EMAIL}</a>

const PURPOSES = [
  ['Account e profilo', 'email, password (cifrata), nome utente, avatar o foto, zona, ruolo, data di iscrizione', 'contratto (art. 6.1.b)', 'fino alla cancellazione dell\'account'],
  ['Accesso con Google', 'email, nome e identificativo Google', 'contratto (art. 6.1.b)', 'come l\'account'],
  ['Recensioni di edifici e amministratori', 'testo, punteggi, edificio o amministratore recensito, data, nome utente pubblico', 'contratto (art. 6.1.b)', 'finché non le cancelli; se cancelli l\'account restano in forma anonima, senza collegamento a te'],
  ['Foto degli edifici', 'immagini caricate (i metadati, compresa la posizione GPS, vengono eliminati prima del caricamento)', 'contratto (art. 6.1.b)', 'finché non le cancelli o non vengono rimosse in moderazione'],
  ['Moderazione, segnalazioni, sicurezza', 'contenuti segnalati, autore della segnalazione, storico delle modifiche alle recensioni, log tecnici', 'legittimo interesse (art. 6.1.f) a una piattaforma affidabile e sicura', 'log di accesso e navigazione: 12 mesi; storico moderazione: per il tempo necessario a gestire il caso'],
  ['Area condominio', 'vedi la sezione 3', 'vedi la sezione 3', 'vedi la sezione 3'],
  ['Verifica di residenza', 'documento scelto da te (certificato di residenza, contratto, rogito o bolletta), tipo di documento, piano, millesimi, proprietario o inquilino', 'contratto (art. 6.1.b): serve a darti accesso all\'area privata del tuo condominio', 'il documento viene cancellato appena la richiesta è approvata, respinta o ritirata; l\'esito della richiesta resta 12 mesi'],
  ['Richieste privacy e assistenza', 'contenuto della richiesta, email, esito', 'obbligo legale (art. 6.1.c, artt. 12-22 GDPR)', '24 mesi dalla chiusura'],
  ['Notifiche nel sito ed email di servizio', 'contenuto della notifica, stato di lettura', 'contratto (art. 6.1.b)', 'le notifiche lette vengono cancellate dopo 12 mesi'],
  ['Difesa di diritti e obblighi di legge', 'i dati necessari al caso', 'obbligo legale (art. 6.1.c) e legittimo interesse (art. 6.1.f)', 'per il tempo previsto dalla legge o necessario alla difesa'],
]

const PROCESSORS = [
  ['Supabase Inc.', 'database, autenticazione, archiviazione file', 'server in Irlanda (UE); società statunitense, con clausole contrattuali standard'],
  ['Vercel Inc.', 'hosting del sito', 'USA, aderente al Data Privacy Framework UE-USA'],
  ['Google LLC', 'accesso con Google (solo se lo scegli)', 'USA, aderente al Data Privacy Framework UE-USA'],
  ['MapTiler AG', 'mappe interattive (riceve il tuo IP)', 'Svizzera, Paese con decisione di adeguatezza'],
  ['OpenStreetMap Foundation', 'anteprime delle mappe (riceve il tuo IP)', 'Regno Unito, Paese con decisione di adeguatezza'],
  ['komoot GmbH (Photon)', 'suggerimenti di indirizzo nella ricerca (riceve il tuo IP e il testo digitato)', 'Germania (UE)'],
]

export default function PrivacyPolicy() {
  return (
    <div className="legal-page">
      <div className="wrap legal-wrap">
        <div className="legal-hero">
          <div className="legal-eyebrow">Documento legale</div>
          <h1 className="legal-title">Privacy Policy</h1>
          <p className="legal-intro">Ultimo aggiornamento: 14 novembre 2026</p>
          <p className="legal-intro">
            Questa informativa spiega quali dati personali tratta Condoreco (www.condoreco.com), perché, per quanto tempo e quali diritti hai. Vale per chi visita il sito, per chi si iscrive, per i residenti che usano l&apos;area condominio e per gli amministratori di condominio e i fornitori presenti nel sito (artt. 13 e 14 del Regolamento UE 2016/679, &quot;GDPR&quot;).
          </p>
        </div>

        <div className="legal-card">

          <section className="legal-section" id="titolare">
            <h2 className="legal-section-title">1. Titolare del trattamento</h2>
            <p className="legal-paragraph">
              <strong>Sophie Perazzolo</strong>, che gestisce Condoreco<br />
              Indirizzo: {TITOLARE_INDIRIZZO}<br />
              Email per privacy e diritti: <Mail />
            </p>
            <p className="legal-paragraph">
              Non è stato nominato un Responsabile della protezione dei dati (DPO), perché per le dimensioni e il tipo di trattamento non è obbligatorio.
            </p>
          </section>

          <section className="legal-section" id="finalita">
            <h2 className="legal-section-title">2. Quali dati trattiamo, perché e per quanto tempo</h2>
            <Table head={['Finalità', 'Dati', 'Base giuridica', 'Conservazione']} rows={PURPOSES} />
            <p className="legal-paragraph">
              Non usiamo i tuoi dati per pubblicità, profilazione o decisioni automatizzate e non li vendiamo. Non usiamo strumenti di analisi del traffico. Non ti chiediamo dati particolari (salute, opinioni politiche, religione e simili): non inserirli nelle recensioni, nelle chat o nei documenti.
            </p>
            <p className="legal-paragraph">
              Nelle recensioni non inserire dati di altre persone (nomi di vicini, recapiti, targhe, foto di persone riconoscibili). Possiamo oscurare o rimuovere i contenuti che li contengono.
            </p>
          </section>

          <section className="legal-section" id="area-condominio">
            <h2 className="legal-section-title">3. Area condominio</h2>
            <p className="legal-paragraph">
              L&apos;area condominio è privata: entra solo chi ha una richiesta di accesso approvata. Contiene bacheca, chat, sondaggi, eventi, interventi, pratiche e preventivi, documenti e, se l&apos;amministratore la usa, la contabilità.
            </p>

            <SubSection title="3.1 Dati trattati" id="verifica-residenza">
              <BulletList items={[
                'appartenenza al condominio e ruolo (residente o amministratore), piano, millesimi, proprietario o inquilino;',
                'documento caricato per la verifica di residenza: lo vede solo chi decide la richiesta (l\'amministratore del condominio o, se il condominio non ha amministratore, lo staff Condoreco) e viene cancellato appena la richiesta è decisa o ritirata;',
                'messaggi e allegati della chat, avvisi, eventi, ticket e interventi;',
                'sondaggi e voti: nei sondaggi non anonimi gli altri membri del condominio vedono come hai votato;',
                'rate, pagamenti, contabili caricate, estratti conto con i nomi dei paganti, IBAN del condominio, bilanci e preventivi.',
              ]} />
            </SubSection>

            <SubSection title="3.2 Chi vede cosa">
              <BulletList items={[
                'gli altri residenti vedono di te solo nome utente, avatar, piano e ruolo, oltre ai contenuti che pubblichi nelle sezioni comuni;',
                'millesimi, proprietario o inquilino e situazione dei pagamenti li vedete solo tu e l\'amministratore;',
                'la tua situazione di eventuale morosità non viene mostrata agli altri condomini: la vedono solo tu e l\'amministratore, che può comunicarla in assemblea come previsto dalla legge;',
                'i file privati (chat, contabili, documenti, interventi, immagini dei sondaggi, documenti di residenza) sono in archivi non pubblici e si aprono solo con link temporanei.',
              ]} />
            </SubSection>

            <SubSection title="3.3 Ruoli privacy">
              <p className="legal-paragraph">
                Per i dati della gestione condominiale (rate, pagamenti, documenti, contabilità, comunicazioni dell&apos;amministratore) il titolare è il condominio e l&apos;amministratore agisce come suo responsabile del trattamento, come indicato dal Garante privacy. Quando l&apos;amministratore usa Condoreco per questa gestione, Condoreco tratta questi dati per conto del condominio, secondo le istruzioni dell&apos;amministratore e sulla base di un accordo ai sensi dell&apos;art. 28 GDPR contenuto nei termini per gli amministratori. I dati contabili del condominio vanno conservati 10 anni per obbligo civilistico: la conservazione è decisa dal condominio.
              </p>
              <p className="legal-paragraph">
                Per gli strumenti della piattaforma (account, accesso all&apos;area, chat, bacheca e sondaggi nei condomini che non hanno un amministratore su Condoreco) il titolare è Condoreco.
              </p>
              <p className="legal-paragraph">
                I sondaggi di Condoreco servono a raccogliere pareri prima dell&apos;assemblea e non sostituiscono le delibere dell&apos;assemblea condominiale.
              </p>
            </SubSection>
          </section>

          <section className="legal-section" id="amministratori-fornitori">
            <h2 className="legal-section-title">4. Informativa per amministratori di condominio e fornitori presenti nel sito</h2>
            <p className="legal-paragraph">
              Condoreco pubblica schede di amministratori di condominio e di fornitori (manutenzione, imprese, professionisti) con nome, studio o ragione sociale, zona, recapiti professionali (telefono, email, sito) e recensioni degli utenti. Questa sezione vale anche se non ti sei iscritto (art. 14 GDPR).
            </p>
            <BulletList items={[
              'Fonte dei dati: informazioni pubblicate da te o dalla tua attività, registri ed elenchi pubblici, segnalazioni e recensioni degli utenti, dati inseriti da un amministratore che ti ha aggiunto ai fornitori del suo condominio.',
              'Finalità: aiutare chi cerca casa o vive in un condominio a scegliere e valutare amministratori e fornitori.',
              'Base giuridica: legittimo interesse di Condoreco e degli utenti a un\'informazione trasparente sui servizi condominiali (art. 6.1.f); trattiamo solo dati professionali, non dati privati.',
              'Conservazione: finché l\'attività è svolta o finché non ti opponi e la tua opposizione è accolta.',
              'Diritti: puoi chiedere di rettificare i dati, opporti alla pubblicazione o chiedere la cancellazione della scheda scrivendo a ' + EMAIL + '. Valutiamo ogni richiesta e rispondiamo entro 30 giorni. Le recensioni che contengono informazioni false o offensive possono essere segnalate dalla pagina "Segnala un contenuto".',
            ]} />
          </section>

          <section className="legal-section" id="fornitori">
            <h2 className="legal-section-title">5. A chi comunichiamo i dati</h2>
            <p className="legal-paragraph">
              Usiamo fornitori tecnici che trattano i dati per nostro conto come responsabili del trattamento (art. 28 GDPR):
            </p>
            <Table head={['Fornitore', 'Servizio', 'Dove e con quali garanzie']} rows={PROCESSORS} />
            <p className="legal-paragraph">
              Se in futuro attiveremo pagamenti online (Stripe) o un servizio di invio email (Resend), aggiorneremo questa tabella prima dell&apos;attivazione. I trasferimenti fuori dallo Spazio economico europeo avvengono solo verso Paesi con decisione di adeguatezza o con le garanzie del Capo V del GDPR (Data Privacy Framework, clausole contrattuali standard).
            </p>
            <p className="legal-paragraph">
              I dati possono essere comunicati anche a consulenti del titolare vincolati alla riservatezza e alle autorità, quando lo impone la legge.
            </p>
          </section>

          <section className="legal-section" id="sicurezza">
            <h2 className="legal-section-title">6. Sicurezza</h2>
            <p className="legal-paragraph">
              Usiamo connessioni cifrate, password cifrate, controlli di accesso a livello di database per ogni tabella, archivi privati con link temporanei per i file, eliminazione dei metadati dalle foto e cancellazione automatica dei log dopo 12 mesi. Nessun sistema è sicuro al 100%: custodisci le tue credenziali e scrivici se noti accessi sospetti.
            </p>
          </section>

          <section className="legal-section" id="diritti">
            <h2 className="legal-section-title">7. I tuoi diritti</h2>
            <p className="legal-paragraph">Hai diritto di:</p>
            <BulletList items={[
              'accedere ai tuoi dati e riceverne una copia (art. 15);',
              'ricevere i dati in un formato leggibile da una macchina e trasferirli (art. 20);',
              'far correggere i dati inesatti (art. 16);',
              'chiedere la cancellazione (art. 17);',
              'chiedere la limitazione del trattamento (art. 18);',
              'opporti ai trattamenti basati sul legittimo interesse (art. 21).',
            ]} />
            <p className="legal-paragraph">
              Dal tuo profilo, nella sezione <a href="/profilo?sezione=privacy" className="legal-link">Privacy e dati</a>, puoi scaricare subito tutti i tuoi dati e inviare le altre richieste, compresa la cancellazione dell&apos;account. Puoi anche scrivere a <Mail />. Rispondiamo entro 30 giorni (prorogabili di altri 60 nei casi complessi, avvisandoti). Nome utente, zona e foto puoi modificarli da solo da Modifica profilo, e puoi cancellare in ogni momento le tue recensioni.
            </p>
            <p className="legal-paragraph">
              Per i dati della gestione condominiale (sezione 3.3) rivolgiti prima all&apos;amministratore del condominio: se ci scrivi, inoltriamo la richiesta a lui.
            </p>
          </section>

          <section className="legal-section" id="minori">
            <h2 className="legal-section-title">8. Minori</h2>
            <p className="legal-paragraph">
              Per iscriversi bisogna avere almeno 14 anni (art. 2-quinquies del Codice privacy): lo dichiari al momento della registrazione. Se scopriamo un account di una persona più giovane, lo cancelliamo.
            </p>
          </section>

          <section className="legal-section" id="reclamo">
            <h2 className="legal-section-title">9. Reclamo al Garante</h2>
            <p className="legal-paragraph">
              Se ritieni che il trattamento violi il GDPR puoi presentare reclamo al Garante per la protezione dei dati personali (<a href="https://www.garanteprivacy.it" className="legal-link" target="_blank" rel="noopener noreferrer">www.garanteprivacy.it</a>) o all&apos;autorità del Paese UE in cui vivi o lavori.
            </p>
          </section>

          <section className="legal-section" id="cookie">
            <h2 className="legal-section-title">10. Cookie</h2>
            <p className="legal-paragraph">
              Usiamo solo cookie e local storage tecnici. L&apos;elenco completo è nella <a href="/cookie-policy" className="legal-link">Cookie Policy</a>.
            </p>
          </section>

          <section className="legal-section" id="modifiche">
            <h2 className="legal-section-title">11. Modifiche</h2>
            <p className="legal-paragraph">
              Se cambiamo questa informativa aggiorniamo la data in alto. Se il cambiamento riguarda nuove finalità o nuovi destinatari, te lo comunichiamo nel sito prima che si applichi.
            </p>
          </section>

        </div>
      </div>
    </div>
  )
}
