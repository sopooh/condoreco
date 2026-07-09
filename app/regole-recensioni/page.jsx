export const metadata = {
  title: 'Regole per le recensioni',
  description: 'Le regole da rispettare per pubblicare recensioni su CondoReco: linguaggio, veridicità e tutela della privacy.',
}

const sections = [
  {
    title: '1. Responsabilita dell utente',
    paragraphs: [
      'Ogni utente e personalmente responsabile dei contenuti che pubblica su CondoReco, inclusi recensioni, commenti, valutazioni, immagini, documenti, messaggi e qualsiasi altra informazione caricata sulla piattaforma.',
      'Pubblicando una recensione, l utente dichiara sotto la propria responsabilita che:',
    ],
    list: [
      'il contenuto si basa su un esperienza reale;',
      'le informazioni inserite sono veritiere secondo la propria conoscenza;',
      'la recensione e formulata in modo rispettoso e proporzionato;',
      'il contenuto non ha finalita diffamatorie, offensive, intimidatorie o discriminatorie;',
      'il contenuto non contiene dati personali di terzi pubblicati senza consenso;',
      'il contenuto non attribuisce reati, illeciti o comportamenti scorretti senza elementi verificabili;',
      'l utente possiede i diritti necessari per pubblicare eventuali immagini, documenti o allegati.',
    ],
    closing: 'CondoReco ospita contenuti generati dagli utenti e non puo garantire il controllo preventivo, completo e continuo di tutte le informazioni pubblicate.',
  },
  {
    title: '2. Recensioni basate su esperienze reali',
    paragraphs: [
      'Le recensioni devono descrivere esperienze effettivamente vissute o conosciute direttamente dall utente.',
      'Sono ammesse opinioni personali, valutazioni soggettive e critiche, purche espresse in modo civile, pertinente e non lesivo della reputazione altrui.',
    ],
    examplesGood: [
      'Durante il periodo in cui ho vissuto nello stabile, ho percepito le spese condominiali come elevate rispetto ai servizi disponibili.',
      'La mia esperienza con la manutenzione e stata negativa perche alcune richieste hanno richiesto tempi lunghi.',
      'Ho trovato il condominio tranquillo e ben collegato.',
      'La comunicazione dell amministrazione mi e sembrata poco chiara in alcune occasioni.',
    ],
    examplesBad: [
      'L amministratore e un ladro.',
      'Qui truffano le persone.',
      'Il vicino del terzo piano e pazzo.',
      'Questo condominio e gestito da criminali.',
      'L impresa ruba i soldi.',
    ],
  },
  {
    title: '3. Divieto di contenuti diffamatori o offensivi',
    paragraphs: [
      'Non sono consentiti contenuti che possano danneggiare la reputazione di persone, amministratori, condomini, proprietari, inquilini, societa, fornitori o altri soggetti.',
      'E vietato pubblicare:',
    ],
    list: [
      'insulti;',
      'accuse personali non dimostrate;',
      'attribuzioni di reato;',
      'insinuazioni offensive;',
      'contenuti denigratori;',
      'minacce;',
      'linguaggio aggressivo o intimidatorio;',
      'espressioni volgari rivolte a persone o soggetti identificabili;',
      'campagne coordinate per danneggiare un soggetto.',
    ],
    closing: 'La critica e ammessa solo se formulata in modo rispettoso, pertinente e basato su fatti o esperienze personali.',
  },
  {
    title: '4. Divieto di accuse non provate',
    paragraphs: [
      'CondoReco non deve essere utilizzato per pubblicare accuse penali, fiscali, amministrative o professionali non accertate.',
      'Non sono ammesse frasi come:',
    ],
    examplesBad: [
      'Ha rubato i soldi del condominio.',
      'L amministratore e corrotto.',
      'Ci sono lavori abusivi.',
      'La ditta commette illeciti.',
      'Il proprietario evade le tasse.',
      'Il condominio e una truffa.',
    ],
    closing: 'Se un utente ritiene che esista un illecito, deve rivolgersi alle autorita competenti, a un professionista abilitato o agli organi condominiali previsti dalla legge. CondoReco puo rimuovere, oscurare o limitare contenuti che contengano accuse non verificate o potenzialmente lesive della reputazione di terzi.',
  },
  {
    title: '5. Divieto di pubblicare dati personali di terzi',
    paragraphs: [
      'E vietato pubblicare dati personali di altre persone senza autorizzazione.',
      'Non sono ammessi:',
    ],
    list: [
      'nomi e cognomi di vicini privati;',
      'numeri di telefono;',
      'indirizzi email;',
      'codici fiscali;',
      'targhe;',
      'firme;',
      'documenti personali;',
      'foto di persone riconoscibili;',
      'screenshot di chat private;',
      'email private;',
      'informazioni sulla salute, situazione economica, familiare, giudiziaria o personale di terzi;',
      'dettagli che permettano di identificare indirettamente una persona privata.',
    ],
    closing: 'Quando si descrive una situazione condominiale, e necessario usare formule generiche come un vicino, alcuni residenti, l amministrazione, la ditta incaricata, il proprietario o un inquilino, evitando riferimenti identificativi non necessari.',
  },
  {
    title: '6. Foto, documenti e allegati',
    paragraphs: [
      'L utente puo caricare immagini, documenti o allegati solo se ha il diritto di farlo e solo se il contenuto non viola la privacy, la riservatezza o i diritti di terzi.',
      'Non e consentito caricare:',
    ],
    list: [
      'verbali condominiali completi contenenti nomi o dati personali;',
      'documenti riservati;',
      'contratti;',
      'comunicazioni private;',
      'foto dell interno di abitazioni altrui;',
      'immagini di persone riconoscibili senza consenso;',
      'screenshot di conversazioni private;',
      'documenti contenenti dati fiscali, bancari o personali.',
    ],
    closing: 'Prima di caricare un documento, l utente deve oscurare nomi, recapiti, firme, codici fiscali, indirizzi email, numeri di telefono e ogni altro dato personale non necessario.',
  },
  {
    title: '7. Recensioni false, manipolate o strumentali',
    paragraphs: [
      'Non sono consentite recensioni false, inventate, manipolate, pagate o pubblicate con finalita scorrette.',
      'E vietato:',
    ],
    list: [
      'recensire un condominio senza averne esperienza diretta;',
      'pubblicare contenuti falsi per danneggiare un edificio, un amministratore o un soggetto terzo;',
      'creare account multipli per alterare i punteggi;',
      'pubblicare recensioni coordinate;',
      'offrire o ricevere compensi in cambio di recensioni;',
      'minacciare recensioni negative per ottenere vantaggi;',
      'pubblicare recensioni per conto di terzi senza dichiararlo.',
    ],
    closing: 'CondoReco puo rimuovere recensioni sospette e limitare o sospendere gli account coinvolti.',
  },
  {
    title: '8. Linguaggio da utilizzare',
    paragraphs: [
      'Le recensioni devono essere scritte con un linguaggio chiaro, civile e basato sull esperienza personale.',
      'Sono consigliate formule come:',
    ],
    examplesGood: [
      'Secondo la mia esperienza...',
      'Nel periodo in cui ho vissuto nello stabile...',
      'Ho riscontrato...',
      'Mi e sembrato...',
      'La mia percezione e stata...',
      'Non ho trovato chiaro...',
    ],
    extraLabel: 'Sono da evitare formule assolute o accusatorie come:',
    examplesBad: [
      'E sicuramente...',
      'Tutti sanno che...',
      'E illegale...',
      'Rubano...',
      'Truffano...',
      'Sono incapaci...',
      'E da denunciare...',
    ],
  },
  {
    title: '9. Moderazione dei contenuti',
    paragraphs: [
      'CondoReco puo moderare i contenuti pubblicati dagli utenti, sia prima sia dopo la pubblicazione.',
      'La moderazione puo avvenire tramite controlli manuali, sistemi automatici, filtri linguistici, segnalazioni degli utenti o verifiche successive.',
      'CondoReco puo, a propria discrezione e anche in via prudenziale:',
    ],
    list: [
      'rimuovere un contenuto;',
      'oscurarlo temporaneamente;',
      'limitarne la visibilita;',
      'richiedere chiarimenti all autore;',
      'modificare la visualizzazione di alcune informazioni;',
      'bloccare parole o espressioni a rischio;',
      'sospendere temporaneamente un account;',
      'chiudere un account in caso di violazioni gravi o ripetute.',
    ],
    closing: 'La rimozione o limitazione di un contenuto non implica che CondoReco riconosca automaticamente la falsita, l illiceita o la fondatezza della segnalazione, ma puo avvenire per ragioni di sicurezza, prudenza, tutela della community o riduzione del rischio legale.',
  },
  {
    title: '10. Segnalazione dei contenuti',
    paragraphs: [
      'Chiunque ritenga che un contenuto pubblicato su CondoReco sia falso, offensivo, diffamatorio, illecito, lesivo della privacy o contrario a queste regole puo inviare una segnalazione tramite l apposita pagina Segnala un contenuto.',
      'La segnalazione deve indicare:',
    ],
    list: [
      'il contenuto contestato;',
      'il motivo della segnalazione;',
      'eventuali elementi utili alla valutazione;',
      'un contatto email per eventuali comunicazioni.',
    ],
    closing: 'CondoReco valutera la segnalazione caso per caso e potra decidere di mantenere il contenuto online, limitarne la visibilita, richiedere chiarimenti, oscurarlo temporaneamente o rimuoverlo. L invio di una segnalazione non comporta automaticamente la rimozione del contenuto.',
  },
  {
    title: '11. Diritto di replica',
    paragraphs: [
      'I soggetti direttamente interessati da una recensione possono richiedere una verifica del contenuto o inviare una replica.',
      'La replica deve essere formulata in modo rispettoso, pertinente e non offensivo.',
      'CondoReco puo decidere se pubblicare, trasmettere o utilizzare la replica nell ambito della valutazione del contenuto segnalato.',
    ],
  },
  {
    title: '12. Contenuti vietati',
    paragraphs: ['Sono sempre vietati:'],
    list: [
      'contenuti diffamatori;',
      'insulti;',
      'minacce;',
      'molestie;',
      'contenuti discriminatori;',
      'contenuti violenti;',
      'dati personali non autorizzati;',
      'immagini o documenti riservati;',
      'recensioni false;',
      'spam;',
      'contenuti promozionali non autorizzati;',
      'contenuti non pertinenti alla vita condominiale;',
      'accuse di reato non documentate;',
      'contenuti pubblicati con finalita ritorsive o intimidatorie.',
    ],
  },
  {
    title: '13. Nessuna verifica professionale o legale',
    paragraphs: [
      'Le recensioni pubblicate su CondoReco rappresentano opinioni ed esperienze personali degli utenti.',
      'CondoReco non garantisce che le recensioni siano complete, aggiornate, imparziali o prive di errori.',
      'Le informazioni presenti sulla piattaforma non costituiscono consulenza legale, tecnica, immobiliare, fiscale, amministrativa o professionale.',
      'Gli utenti devono sempre svolgere verifiche autonome prima di prendere decisioni relative all acquisto, alla locazione, alla vendita o alla gestione di un immobile.',
    ],
  },
  {
    title: '14. Limitazione di responsabilita della piattaforma',
    paragraphs: [
      'Nei limiti consentiti dalla legge, CondoReco non e responsabile per i contenuti pubblicati dagli utenti, per le opinioni espresse dagli stessi o per eventuali conseguenze derivanti dall affidamento su recensioni, punteggi, commenti o informazioni presenti sulla piattaforma.',
      'CondoReco si riserva il diritto di intervenire sui contenuti quando riceve una segnalazione, quando rileva una possibile violazione delle regole o quando ritiene che un contenuto possa generare rischi per utenti, terzi o per la piattaforma.',
      'Resta inteso che l autore del contenuto rimane il principale responsabile di quanto pubblicato.',
    ],
  },
  {
    title: '15. Accettazione delle regole',
    paragraphs: [
      'Pubblicando una recensione su CondoReco, l utente conferma di aver letto e accettato queste regole.',
      'L utente conferma inoltre che la recensione e pubblicata in buona fede, sulla base di un esperienza reale e senza intento diffamatorio, offensivo, discriminatorio, intimidatorio o ritorsivo.',
      'CondoReco puo aggiornare queste regole in qualsiasi momento per adeguarle a modifiche normative, esigenze operative o necessita di tutela della community.',
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
        {items.map((item) => <li key={item}>"{item}"</li>)}
      </ul>
    </div>
  )
}

export default function ReviewRules() {
  return (
    <div className="legal-page">
      <div className="wrap legal-wrap">
        <div className="legal-hero">
          <div className="legal-eyebrow">Regole</div>
          <h1 className="legal-title">Regole per pubblicare recensioni su CondoReco</h1>
          <p className="legal-intro">
            CondoReco e una community dedicata alla condivisione di esperienze reali sulla vita condominiale,
            sugli edifici, sui quartieri e sui servizi collegati alla gestione degli stabili.
          </p>
          <p className="legal-intro">
            L obiettivo della piattaforma e aiutare gli utenti a orientarsi meglio nella scelta di un immobile,
            di un condominio o di una zona, attraverso opinioni, valutazioni e informazioni condivise da persone
            che hanno avuto un esperienza diretta.
          </p>
          <p className="legal-intro legal-intro-strong">
            CondoReco non e una piattaforma di denuncia, non e un autorita pubblica, non svolge attivita di
            accertamento giudiziario e non sostituisce amministratori, assemblee condominiali, avvocati,
            autorita competenti o organi di controllo.
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
              {section.closing && <p className="legal-paragraph">{section.closing}</p>}

              {section.extraLabel && <p className="legal-paragraph legal-label">{section.extraLabel}</p>}
              {section.examplesGood && <ExampleList title="Esempi ammessi" items={section.examplesGood} tone="good" />}
              {section.examplesBad && <ExampleList title="Esempi non ammessi" items={section.examplesBad} tone="bad" />}
            </section>
          ))}
        </div>
      </div>
    </div>
  )
}
