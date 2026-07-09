export const metadata = {
  title: 'Linee guida della community',
  description: 'Le regole di comportamento per partecipare alla community CondoReco in modo rispettoso e costruttivo.',
}

const sections = [
  {
    title: '1. Scrivi solo esperienze reali',
    paragraphs: [
      'Le recensioni devono riferirsi a esperienze effettivamente vissute o conosciute direttamente dall\'utente.',
      'Sono ammesse opinioni personali, valutazioni soggettive e racconti della propria esperienza, purche espresse in modo civile e non offensivo.',
    ],
    examplesGood: [
      'Nel periodo in cui ho vissuto nello stabile, ho trovato le spese condominiali alte rispetto ai servizi offerti.',
      'La mia esperienza con la manutenzione ordinaria non e stata positiva: alcune richieste hanno richiesto molto tempo.',
      'Il condominio mi e sembrato tranquillo e ben collegato.',
    ],
    examplesBad: [
      'L\'amministratore e un ladro.',
      'Qui sono tutti criminali.',
      'Questo palazzo e una truffa.',
      'Il vicino del terzo piano e pazzo.',
    ],
  },
  {
    title: '2. Non diffamare persone, aziende o condomini',
    paragraphs: [
      'Non sono consentiti contenuti che offendano, accusino o danneggino la reputazione di persone fisiche, amministratori, societa, condomini, vicini, proprietari, inquilini o fornitori.',
      'CondoReco consente la critica, ma non l\'attacco personale.',
    ],
    list: [
      'insultare persone specifiche;',
      'attribuire reati o comportamenti illeciti senza prove;',
      'usare termini come “ladro”, “truffatore”, “corrotto”, “criminale”, “mafioso”, “abusivo” o simili;',
      'pubblicare accuse personali non documentate;',
      'denigrare un amministratore o un vicino in modo aggressivo;',
      'pubblicare contenuti falsi o manipolati.',
    ],
  },
  {
    title: '3. Usa un linguaggio neutro e basato sui fatti',
    paragraphs: [
      'Per ridurre il rischio di contenuti offensivi o diffamatori, gli utenti devono descrivere i fatti in modo concreto.',
    ],
    examplesGood: [
      'La mia richiesta non ha ricevuto risposta per circa tre settimane.',
      'Ho riscontrato rumori frequenti nelle ore serali.',
      'Non ho trovato chiara la comunicazione sulle spese.',
    ],
    examplesBad: [
      'Non rispondono mai perche sono incapaci.',
      'E un condominio invivibile.',
      'L\'amministratore se ne frega.',
      'Qui rubano tutti.',
    ],
  },
  {
    title: '4. Non pubblicare dati personali',
    paragraphs: [
      'E vietato pubblicare dati personali di terzi senza consenso.',
      'Per parlare di una situazione condominiale, usa formule generiche come “un vicino”, “alcuni residenti”, “l\'amministrazione”, “il fornitore”, “la ditta incaricata”.',
    ],
    list: [
      'nomi e cognomi di vicini privati;',
      'numeri di telefono;',
      'indirizzi email personali;',
      'codici fiscali;',
      'documenti;',
      'targhe;',
      'foto riconoscibili di persone;',
      'dettagli che permettano di identificare un singolo vicino o inquilino;',
      'informazioni sulla salute, situazione familiare, economica, giudiziaria o privata di altre persone.',
    ],
  },
  {
    title: '5. Non pubblicare contenuti discriminatori o minacciosi',
    list: [
      'minacce;',
      'incitamento all\'odio;',
      'discriminazioni;',
      'molestie;',
      'linguaggio violento;',
      'riferimenti offensivi a nazionalita, religione, genere, orientamento sessuale, disabilita, eta o condizione personale;',
      'inviti a danneggiare persone, immobili o beni.',
    ],
  },
  {
    title: '6. Non pubblicare accuse penali senza prove ufficiali',
    paragraphs: [
      'CondoReco non e uno spazio per denunciare pubblicamente reati.',
      'Se ritieni che ci sia un illecito, rivolgiti alle autorita competenti, a un avvocato, all\'amministratore o agli organi condominiali previsti dalla legge.',
      'Salvo che l\'informazione sia gia pubblica, verificabile e riportata con fonte ufficiale, questi contenuti potranno essere rimossi.',
    ],
    examplesBad: [
      'Ha rubato i soldi del condominio.',
      'Fanno lavori abusivi.',
      'E una truffa.',
      'Ci sono attivita illegali nello stabile.',
    ],
  },
  {
    title: '7. Recensioni false o manipolate',
    paragraphs: [
      'Non sono consentite recensioni false, inventate, pagate, pilotate o pubblicate con l\'obiettivo di danneggiare o favorire artificialmente un edificio, un amministratore, una societa o un soggetto terzo.',
      'CondoReco puo rimuovere recensioni sospette e limitare o sospendere gli account coinvolti.',
    ],
    list: [
      'recensire un condominio senza averne esperienza diretta;',
      'creare account multipli per alterare il punteggio;',
      'pubblicare recensioni per conto di altri senza dichiararlo;',
      'offrire compensi in cambio di recensioni;',
      'minacciare recensioni negative per ottenere vantaggi;',
      'pubblicare recensioni coordinate contro un soggetto.',
    ],
  },
  {
    title: '8. Foto, documenti e allegati',
    paragraphs: [
      'Gli utenti possono caricare immagini o documenti solo se hanno il diritto di farlo e se il contenuto non viola la privacy di terzi.',
      'Eventuali allegati devono essere oscurati prima del caricamento, rimuovendo nomi, contatti, firme, dati fiscali e informazioni identificative.',
    ],
    list: [
      'documenti condominiali riservati;',
      'verbali completi con nomi dei condomini;',
      'foto di persone riconoscibili;',
      'foto dell\'interno di abitazioni altrui;',
      'screenshot di chat private;',
      'comunicazioni email private;',
      'documenti contenenti dati personali o sensibili.',
    ],
  },
  {
    title: '9. Chat di vicinato e aree private',
    paragraphs: [
      'Le eventuali chat di condominio o aree riservate devono essere usate per comunicazioni utili alla vita condominiale.',
      'CondoReco puo moderare, limitare o chiudere conversazioni che violano queste regole.',
    ],
    list: [
      'insulti tra vicini;',
      'minacce;',
      'pressioni personali;',
      'pubblicazione di informazioni private;',
      'accuse non verificate;',
      'contenuti discriminatori;',
      'discussioni aggressive o persecutorie.',
    ],
  },
  {
    title: '10. Segnalazione dei contenuti',
    paragraphs: [
      'Ogni utente, amministratore, proprietario, residente o soggetto interessato puo segnalare un contenuto ritenuto falso, offensivo, illecito, diffamatorio, lesivo della privacy o contrario a queste linee guida.',
      'CondoReco valutera la segnalazione e potra intervenire in base al caso concreto.',
    ],
    list: [
      'il contenuto contestato;',
      'il motivo della segnalazione;',
      'eventuali elementi utili alla verifica;',
      'un contatto per eventuali comunicazioni.',
    ],
    actions: [
      'mantenere il contenuto online;',
      'oscurarlo temporaneamente;',
      'modificarne la visibilita;',
      'richiedere chiarimenti all\'autore;',
      'rimuovere il contenuto;',
      'sospendere o limitare l\'account responsabile.',
    ],
  },
  {
    title: '11. Moderazione',
    paragraphs: [
      'CondoReco puo moderare i contenuti prima o dopo la pubblicazione.',
      'La moderazione puo avvenire manualmente, automaticamente o tramite sistemi di segnalazione degli utenti.',
      'La rimozione di un contenuto non implica necessariamente che CondoReco ne confermi la falsita o l\'illiceita, ma puo avvenire anche in via prudenziale.',
    ],
    list: [
      'violano queste linee guida;',
      'contengono insulti o accuse personali;',
      'espongono dati personali;',
      'appaiono falsi, manipolati o non verificabili;',
      'possono generare rischi legali;',
      'non sono pertinenti alla vita condominiale;',
      'compromettono la sicurezza o la serenita della community.',
    ],
  },
  {
    title: '12. Diritto di replica',
    paragraphs: [
      'I soggetti recensiti o menzionati possono richiedere la revisione di un contenuto o inviare una replica.',
      'CondoReco puo consentire una risposta pubblica o privata, purche formulata in modo rispettoso e conforme a queste linee guida.',
      'Le repliche devono concentrarsi sui fatti e non contenere attacchi personali verso l\'autore della recensione.',
    ],
  },
  {
    title: '13. Responsabilita degli utenti',
    paragraphs: [
      'Ogni utente e personalmente responsabile delle recensioni, commenti, immagini, documenti e messaggi che pubblica.',
      'Pubblicando un contenuto su CondoReco, l\'utente dichiara che:',
    ],
    list: [
      'il contenuto e basato su un\'esperienza reale;',
      'il contenuto non e falso o manipolato;',
      'il contenuto non viola diritti di terzi;',
      'il contenuto non contiene dati personali non autorizzati;',
      'il contenuto non ha finalita diffamatorie, intimidatorie o discriminatorie;',
      'possiede i diritti necessari per pubblicare eventuali immagini o allegati.',
    ],
  },
  {
    title: '14. Regole per parlare degli amministratori condominiali',
    paragraphs: [
      'E possibile recensire la propria esperienza con l\'amministrazione condominiale, ma il linguaggio deve restare neutro e professionale.',
    ],
    list: [
      'tempi di risposta;',
      'chiarezza delle comunicazioni;',
      'gestione delle assemblee;',
      'manutenzione ordinaria;',
      'trasparenza percepita delle spese;',
      'reperibilita;',
      'organizzazione generale.',
    ],
    blockedList: [
      'insulti personali;',
      'accuse di reato;',
      'attacchi alla vita privata;',
      'riferimenti a caratteristiche personali;',
      'contenuti denigratori;',
      'campagne coordinate contro un amministratore.',
    ],
    examplesGood: [
      'La mia esperienza con l\'amministrazione e stata negativa perche alcune comunicazioni non sono state chiare e alcune richieste hanno avuto tempi di risposta lunghi.',
    ],
    examplesBad: [
      'L\'amministratore e un incapace e ruba soldi.',
    ],
  },
  {
    title: '15. Finalita della piattaforma',
    paragraphs: [
      'CondoReco non nasce per attaccare persone, amministratori o condomini, ma per raccogliere esperienze utili, migliorare la trasparenza abitativa e aiutare gli utenti a comprendere meglio la qualita della vita in uno stabile.',
      'I contenuti devono quindi essere informativi, proporzionati e pertinenti.',
    ],
  },
  {
    title: '16. Violazioni delle linee guida',
    paragraphs: [
      'In caso di violazione, CondoReco puo adottare una o piu delle seguenti misure:',
    ],
    list: [
      'avviso all\'utente;',
      'modifica o oscuramento del contenuto;',
      'rimozione del contenuto;',
      'sospensione temporanea dell\'account;',
      'chiusura dell\'account;',
      'limitazione delle funzionalita;',
      'blocco della pubblicazione di nuove recensioni;',
      'collaborazione con autorita competenti nei casi previsti dalla legge.',
    ],
  },
  {
    title: '17. Aggiornamenti',
    paragraphs: [
      'CondoReco puo aggiornare queste linee guida per adeguarle a modifiche normative, esigenze della community o miglioramenti del servizio.',
      'L\'uso continuato della piattaforma comporta l\'accettazione delle linee guida aggiornate.',
    ],
  },
]

function BulletList({ items }) {
  return (
    <ul className="legal-list">
      {items.map((item) => <li key={item}>{item}</li>)}
    </ul>
  )
}

function ExampleList({ title, items, tone }) {
  return (
    <div className={`legal-example legal-example-${tone}`}>
      <div className="legal-example-title">{title}</div>
      <ul className="legal-list">
        {items.map((item) => <li key={item}>“{item}”</li>)}
      </ul>
    </div>
  )
}

export default function CommunityGuidelines() {
  return (
    <div className="legal-page">
      <div className="wrap legal-wrap">
        <div className="legal-hero">
          <div className="legal-eyebrow">Community</div>
          <h1 className="legal-title">Linee guida della community CondoReco</h1>
          <p className="legal-intro">
            CondoReco e una community pensata per condividere esperienze reali sulla vita condominiale,
            sugli edifici e sui quartieri.
          </p>
          <p className="legal-intro">
            La piattaforma permette agli utenti di raccontare la propria esperienza abitativa in modo utile,
            rispettoso e trasparente, aiutando altre persone a valutare meglio un immobile, uno stabile o una zona
            prima di acquistare, affittare o trasferirsi.
          </p>
          <p className="legal-intro">
            CondoReco non e una piattaforma di denuncia, non sostituisce le autorita competenti e non deve essere
            utilizzata per attaccare, insultare o diffamare persone, amministratori, condomini, societa o altri soggetti.
          </p>
          <p className="legal-intro legal-intro-strong">
            Le recensioni pubblicate su CondoReco devono essere utili, verificabili nei limiti del possibile,
            rispettose e basate su esperienze reali. Ogni utente e responsabile dei contenuti che pubblica.
          </p>
        </div>

        <div className="legal-card">
          {sections.map((section) => (
            <section key={section.title} className="legal-section">
              <h2 className="legal-section-title">{section.title}</h2>

              {section.paragraphs?.map((paragraph) => (
                <p key={paragraph} className="legal-paragraph">{paragraph}</p>
              ))}

              {section.list && <BulletList items={section.list} />}

              {section.actions && (
                <>
                  <p className="legal-paragraph legal-label">CondoReco potra:</p>
                  <BulletList items={section.actions} />
                </>
              )}

              {section.blockedList && (
                <>
                  <p className="legal-paragraph legal-label">Non sono ammessi:</p>
                  <BulletList items={section.blockedList} />
                </>
              )}

              {section.examplesGood && <ExampleList title="Esempi corretti" items={section.examplesGood} tone="good" />}
              {section.examplesBad && <ExampleList title="Esempi non ammessi" items={section.examplesBad} tone="bad" />}
            </section>
          ))}
        </div>
      </div>
    </div>
  )
}
