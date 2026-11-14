// Ricette di carosello pronte: un clic genera tutte le slide + la didascalia.
// Formati pensati per il salvataggio e la condivisione (consigli pratici)
// che portano a condoreco.com senza sembrare pubblicità.

export const HASHTAGS = '#condominio #comprarecasa #casa #affitto #amministratorecondominio #vivereacasa #milano #condoreco'

export function utmLink(campaign) {
  return `condoreco.com/?utm_source=instagram&utm_medium=organic&utm_campaign=${campaign}`
}

export const RECIPES = [
  {
    id: 'in-pari',
    title: 'Chiacchiere di condominio: sei in pari con le rate?',
    description: 'Tutto su bianco. Condor che salta in apertura, dorme sonni tranquilli in chiusura.',
    slides: [
      { template: 'mascot', params: { theme: 'light', pose: 'jump', kicker: 'Chiacchiere di condominio', text: 'Sei in pari con le rate del condominio? Scoprilo in un attimo!' } },
      { template: 'chat', params: { lines: 'coniglio: Ho pagato la rata di marzo? Non me lo ricordo più...\nrana: Io ogni volta scrivo all\'amministratore e aspetto giorni.\ngufo: Su Condoreco apri Il mio condominio: in La mia situazione vedi subito prossima quota, scadenza e arretrati.' } },
      { template: 'chat', params: { lines: 'gatto: E se ho pagato con un bonifico?\ngufo: Carichi la ricevuta da Le mie quote e l\'amministratore la trova lì, senza email.\npanda: E i vicini vedono quanto devo?\ngufo: No. La tua situazione la vedete solo tu e l\'amministratore.' } },
      { template: 'chat', params: { lines: 'delfino: E le quote chi le calcola?\ngufo: L\'amministratore inserisce le spese dell\'anno: le quote si dividono in base ai millesimi e diventano rate.\nconiglio: Quindi niente più sorprese a fine anno!' } },
      { template: 'cover', params: { theme: 'light', kicker: 'La mia situazione', title: 'Prossima quota, scadenza e arretrati: sempre sotto controllo.', subtitle: 'Visibili solo a te e al tuo amministratore.' } },
      { template: 'mascot', params: { theme: 'light', pose: 'sleep', showLink: true, text: 'Tutto in pari: il Condor dorme sonni tranquilli. E anche tu.' } },
    ],
    caption: `"Ho pagato la rata di marzo?" 🤔 Se te lo sei chiesto almeno una volta, questo post è per te.

Su Condoreco, in Il mio condominio, la sezione La mia situazione ti mostra sempre:
• la prossima quota
• la scadenza
• gli eventuali arretrati

Puoi caricare la ricevuta del bonifico e l'amministratore la trova subito. La tua situazione la vedete solo tu e l'amministratore, non i vicini.

Il tuo amministratore non usa ancora Condoreco? Parlagliene: condoreco.com, link in bio.

${HASHTAGS} #ratecondominiali #spesecondominiali`,
  },
  {
    id: 'dl-sal',
    title: 'Ristrutturazione: cosa sono DL e SAL',
    description: 'Spiega Direttore dei Lavori e Stato Avanzamento Lavori. Copertina con il Condor al computer.',
    slides: [
      { template: 'imageCover', params: { image: 'condor-desk', layout: 'bottomLeft', kicker: 'Ristrutturazione', text: 'DL e SAL: cosa sono e perché ti riguardano' } },
      { template: 'tip', params: { theme: 'teal', number: 1, title: 'DL = Direttore dei Lavori', body: 'È il tecnico (ingegnere, architetto o geometra) che il condominio incarica di seguire il cantiere per conto dei condòmini.' } },
      { template: 'tip', params: { theme: 'orange', number: 2, title: 'Cosa fa il DL', body: 'Controlla che l\'impresa lavori secondo progetto e contratto, verifica materiali e misure, segnala i problemi e tiene la contabilità dei lavori.' } },
      { template: 'tip', params: { theme: 'teal', number: 3, title: 'SAL = Stato Avanzamento Lavori', body: 'È il documento con cui il DL certifica quanto lavoro è stato fatto fino a una certa data, e quanto vale.' } },
      { template: 'tip', params: { theme: 'orange', number: 4, title: 'A cosa serve il SAL', body: 'Sulla base dei SAL l\'impresa riceve gli acconti. Il saldo arriva a lavori finiti e verificati.' } },
      { template: 'chat', params: { lines: 'coniglio: Quindi paghiamo a rate mentre il cantiere va avanti?\ngufo: Sì, se il contratto prevede i pagamenti a SAL. Anche il fondo lavori si può raccogliere a rate, seguendo i SAL.\ngatto: E se i lavori sono fatti male?\ngufo: Il DL deve segnalarlo. Il condominio può contestare i difetti prima di pagare il SAL successivo.' } },
      { template: 'tip', params: { theme: 'orange', number: 5, title: 'Chiedi di vedere i SAL', body: 'Prima di ogni rata puoi chiedere all\'amministratore il SAL firmato dal DL: sai cosa stai pagando.' } },
      { template: 'mascot', params: { theme: 'teal', pose: 'determined', showLink: true, text: 'Com\'è andata la ristrutturazione nel tuo palazzo? Leggilo nelle recensioni su Condoreco.' } },
    ],
    caption: `Facciata, tetto, ascensore: se nel tuo condominio parte un cantiere sentirai parlare di DL e SAL. 🏗️

DL = Direttore dei Lavori: il tecnico che segue il cantiere per conto del condominio e controlla il lavoro dell'impresa.

SAL = Stato Avanzamento Lavori: il documento con cui il DL certifica quanto è stato fatto. Sulla base dei SAL si pagano gli acconti all'impresa.

Salva il post per il prossimo cantiere e chiedi sempre di vedere i SAL prima di pagare la rata.

Recensioni dei condomini e dei loro amministratori su condoreco.com, link in bio.

${HASHTAGS} #ristrutturazione #lavoricondominiali`,
  },
  {
    id: 'chiacchiere-spese',
    title: 'Gufo e Volpe: prima di firmare',
    description: 'Dialogo tra personaggi. Formato racconto, si legge fino in fondo.',
    slides: [
      { template: 'mascot', params: { theme: 'light', kicker: 'Chiacchiere di condominio', text: 'Oggi il Gufo aiuta la Volpe a non sbagliare casa. Seguili!' } },
      { template: 'chat', params: { theme: 'light', lines: 'volpe: Ho trovato una casa bellissima, firmo domani!\ngufo: Aspetta. Quanto sono le spese condominiali?\nvolpe: Mi hanno detto "normali"...\ngufo: Normali non è un numero. Chiedi la cifra degli ultimi 2 anni.' } },
      { template: 'chat', params: { theme: 'light', lines: 'volpe: E se ci sono lavori in arrivo?\ngufo: Leggi gli ultimi verbali di assemblea. Facciata o tetto già deliberati? Chiarisci chi paga.\nvolpe: E il supercondominio?\ngufo: Se c\'è, le sue spese si sommano a quelle del palazzo.' } },
      { template: 'speak', params: { theme: 'dark', character: 'volpe', text: 'Ok, prima di firmare leggo cosa dicono i residenti su Condoreco!' } },
      { template: 'mascot', params: { theme: 'orange', pose: 'determined', showLink: true, text: 'Prima di firmare, leggi cosa dicono i residenti. Ti aspetto su Condoreco!' } },
    ],
    caption: `La Volpe stava per firmare senza fare le domande giuste. Per fortuna c'era il Gufo. 🦉🦊

Prima di comprare o affittare chiedi sempre:
• quanto sono le spese condominiali (in cifre)
• quali lavori sono già stati deliberati
• se il palazzo fa parte di un supercondominio

E leggi le recensioni di chi ci vive su condoreco.com, link in bio.

${HASHTAGS}`,
  },
  {
    id: 'prima-di-comprare',
    title: 'Prima di comprare casa',
    description: 'Copertina, 6 consigli, chiusura. Il formato più salvato.',
    slides: [
      { template: 'mascot', params: { theme: 'light', kicker: 'Comprare casa', text: 'Prima di comprare casa, leggi il condominio. Ecco 6 cose da chiedere che nessuno ti dice in agenzia.' } },
      { template: 'tip', params: { number: 1, title: 'Gli ultimi 3 verbali di assemblea', body: 'Ti dicono quali lavori sono in arrivo e quanto vanno d\'accordo i condòmini.' } },
      { template: 'tip', params: { number: 2, title: 'Le spese straordinarie già deliberate', body: 'Facciata, tetto, ascensore: chiarisci per iscritto chi le paga, tu o chi vende.' } },
      { template: 'tip', params: { number: 3, title: 'Il bilancio e le morosità', body: 'Un condominio con molti morosi chiede più soldi a chi paga regolarmente.' } },
      { template: 'tip', params: { number: 4, title: 'Il regolamento condominiale', body: 'Animali, affitti brevi, uso del cortile: meglio saperlo prima del rogito.' } },
      { template: 'tip', params: { number: 5, title: 'Fa parte di un supercondominio?', body: 'Parco, piscina, portineria o centrale termica in comune: le spese del supercondominio si sommano a quelle del palazzo.' } },
      { template: 'tip', params: { number: 6, title: 'Cosa dicono i residenti', body: 'Rumore, amministratore, manutenzione. Leggi le recensioni di chi ci vive davvero.' } },
      { template: 'mascot', params: { theme: 'orange', pose: 'determined', showLink: true, text: 'Cerca il tuo indirizzo e leggi le recensioni di chi ci vive.' } },
    ],
    caption: `Prima del rogito, il condominio conta quanto la casa. 🏠

Salva questo post e usalo come checklist alla prossima visita.

1. Gli ultimi 3 verbali di assemblea
2. Le spese straordinarie già deliberate
3. Bilancio e morosità
4. Il regolamento condominiale
5. Fa parte di un supercondominio?
6. Cosa dicono i residenti

Cerca l'indirizzo su condoreco.com (link in bio) e leggi le recensioni di chi ci vive.

${HASHTAGS}`,
  },
  {
    id: 'amministratore',
    title: 'Il tuo amministratore lavora bene?',
    description: '5 segnali di un buon amministratore. Spinge le recensioni agli admin.',
    slides: [
      { template: 'mascot', params: { theme: 'light', kicker: 'Amministratore', text: 'Il tuo amministratore lavora bene? 5 segnali per capirlo in 2 minuti.' } },
      { template: 'tip', params: { number: 1, title: 'Risponde in tempi ragionevoli', body: 'Una mail o una chiamata non dovrebbero restare senza risposta per settimane.' } },
      { template: 'tip', params: { number: 2, title: 'Il rendiconto è chiaro', body: 'Voci leggibili, giustificativi disponibili, niente sorprese a fine anno.' } },
      { template: 'tip', params: { number: 3, title: 'Convoca l\'assemblea nei tempi', body: 'E manda il verbale a tutti, anche a chi non c\'era.' } },
      { template: 'tip', params: { number: 4, title: 'Porta più preventivi', body: 'Per i lavori importanti i condòmini devono poter confrontare.' } },
      { template: 'tip', params: { number: 5, title: 'Usa un conto dedicato', body: 'I soldi del condominio stanno su un conto intestato al condominio.' } },
      { template: 'mascot', params: { theme: 'orange', pose: 'determined', showLink: true, text: 'Dai un voto al tuo amministratore: recensione anonima, 2 minuti.' } },
    ],
    caption: `Quanti di questi 5 segnali ritrovi nel tuo condominio? 👇 Scrivilo nei commenti.

Su condoreco.com puoi lasciare una recensione anonima del tuo amministratore e leggere quelle degli altri. Link in bio.

${HASHTAGS}`,
  },
  {
    id: 'affitto',
    title: 'Affitto: cosa chiedere sul condominio',
    description: 'Per chi cerca casa in affitto. Target giovane, molto condivisibile.',
    slides: [
      { template: 'imageCover', params: { image: 'condor-flight', kicker: 'Affitto', text: 'Stai per firmare un affitto? Prima fai queste domande sul condominio.' } },
      { template: 'tip', params: { number: 1, title: 'Quanto sono le spese al mese?', body: 'Chiedi la cifra reale degli ultimi anni, non una stima.' } },
      { template: 'tip', params: { number: 2, title: 'Riscaldamento centralizzato o autonomo?', body: 'Cambia la bolletta e anche quanto puoi decidere tu la temperatura.' } },
      { template: 'tip', params: { number: 3, title: 'Ci sono lavori in arrivo?', body: 'Ponteggi e rumore per mesi meglio saperli prima.' } },
      { template: 'tip', params: { number: 4, title: 'Com\'è il palazzo di sera?', body: 'Passa anche dopo cena: rumore, luci, chi entra e chi esce.' } },
      { template: 'mascot', params: { theme: 'teal', pose: 'determined', showLink: true, text: 'Chiedi a chi ci vive: su Condoreco trovi le recensioni dei residenti, palazzo per palazzo.' } },
    ],
    caption: `Manda questo post a chi sta cercando casa in affitto. 📩

Le domande da fare sul condominio prima di firmare:
1. Quanto sono le spese al mese?
2. Riscaldamento centralizzato o autonomo?
3. Ci sono lavori in arrivo?
4. Com'è il palazzo di sera?

Recensioni dei residenti su condoreco.com, link in bio.

${HASHTAGS} #affittomilano`,
  },
  {
    id: 'ascensore-piano-terra',
    title: 'Chiacchiere di condominio: ascensore nuovo e il piano terra non vuole pagare',
    description: 'Installazione di un ascensore dove non c\'è: maggioranze, art. 1121 c.c., chi non paga e come rientra.',
    slides: [
      { template: 'mascot', params: { theme: 'light', pose: 'shy', kicker: 'Chiacchiere di condominio', text: 'Ascensore nuovo, ma il piano terra non vuole pagare. E adesso?' } },
      { template: 'chat', params: { expert: 'volpe', lines: 'rana: Sto al piano terra: perché dovrei pagare un ascensore che non userò mai?\nvolpe: Per approvarlo basta la maggioranza dei presenti con almeno 500 millesimi.\nrana: Quindi pago per forza?\nvolpe: No. Se la spesa è gravosa, chi è contrario può restarne fuori e non paga. La sua parte la dividono gli altri.' } },
      { template: 'chat', params: { expert: 'volpe', lines: 'rana: E se tra qualche anno mi serve?\nvolpe: Entri quando vuoi, pagando la tua parte di costruzione e manutenzione.\nkoala: E se l\'assemblea dice no?\nvolpe: Chi lo vuole può installarlo a sue spese, senza impedire agli altri di usare scale e cortile.' } },
      { template: 'cover', params: { theme: 'light', kicker: 'In breve', title: 'Il piano terra può non pagare, ma allora non usa l\'ascensore.', subtitle: 'Può sempre entrare dopo, pagando la sua quota.' } },
      { template: 'mascot', params: { theme: 'orange', pose: 'sigh', showLink: true, text: 'Prima di comprare, chiedi se nel palazzo c\'è l\'ascensore. O leggilo nelle recensioni su Condoreco.' } },
    ],
    caption: `Ascensore nuovo in condominio e il piano terra dice "io non pago". 🛗 Chi ha ragione?

In breve:
• Un ascensore che abbatte le barriere architettoniche si approva con la maggioranza dei presenti e almeno 500 millesimi.
• Se la spesa è gravosa e l'impianto è utilizzabile separatamente, chi è contrario può restare fuori e non paga (art. 1121 c.c.).
• Può entrare in qualsiasi momento, pagando la sua quota di costruzione e manutenzione.
• Se l'assemblea dice no, chi lo vuole può installarlo a sue spese senza impedire l'uso delle parti comuni agli altri.

Ogni caso dipende dal regolamento e dal progetto: chiedi al tuo amministratore.

Tagga il vicino del piano terra 👇
Recensioni dei condomini su condoreco.com, link in bio.

${HASHTAGS} #ascensore #barrierearchitettoniche`,
  },
  {
    id: 'spese-affitto',
    title: 'Affitto: le spese condominiali chi le paga?',
    description: 'Una delle domande più ricorrenti nel forum Affitto di idealista. Inquilino o proprietario?',
    slides: [
      { template: 'imageCover', params: { image: 'condor-canyon', layout: 'bottomLeft', kicker: 'Affitto', text: 'Spese di condominio in affitto: le paga l\'inquilino o il proprietario?' } },
      { template: 'tip', params: { theme: 'teal', kicker: 'Inquilino', title: 'Le spese ordinarie', body: 'Pulizia delle scale, luce delle parti comuni, acqua, riscaldamento, piccola manutenzione dell\'ascensore. Il portiere: il 90%.' } },
      { template: 'tip', params: { theme: 'orange', kicker: 'Proprietario', title: 'Le spese straordinarie', body: 'Facciata, tetto, caldaia o ascensore da sostituire: i lavori che conservano o migliorano l\'edificio.' } },
      { template: 'chat', params: { expert: 'leone', lines: 'coniglio: L\'amministratore può chiedere i soldi direttamente a me che sono in affitto?\nleone: No, la quota la chiede al proprietario. Poi il proprietario ti chiede la tua parte, come scritto nel contratto.\ncane: E se il proprietario non paga?\nleone: Il condominio agisce contro di lui, non contro di te.' } },
      { template: 'chat', params: { expert: 'leone', lines: 'gatto: Come faccio a sapere che la cifra è giusta?\nleone: Puoi chiedere il dettaglio delle spese e vedere i documenti: è un tuo diritto.\nkoala: Sono in affitto: posso andare in assemblea?\nleone: Sì. Voti al posto del proprietario su riscaldamento e aria condizionata. Sugli altri servizi comuni puoi intervenire, ma senza voto.' } },
      { template: 'tip', params: { theme: 'teal', kicker: 'Il consiglio', title: 'Mettilo nel contratto', body: 'Scrivete chi paga cosa e quanto è l\'acconto mensile. Così a fine anno il conguaglio non è una sorpresa.' } },
      { template: 'mascot', params: { theme: 'light', pose: 'cool', showLink: true, text: 'Prima di firmare, leggi cosa dicono i residenti del palazzo su Condoreco.' } },
    ],
    caption: `"Le spese di condominio le pago io o il proprietario?" È una delle domande più frequenti di chi va in affitto. 🏠

In breve:
🟢 Inquilino: spese ordinarie (pulizie, luce scale, acqua, riscaldamento, piccola manutenzione) e il 90% del portiere.
🟠 Proprietario: spese straordinarie (facciata, tetto, sostituzione di caldaia o ascensore).

L'amministratore chiede sempre al proprietario. Tu hai diritto a vedere il dettaglio delle spese e i documenti, e in assemblea voti al posto del proprietario su riscaldamento e aria condizionata.

Riferimenti: legge 392/1978, artt. 9 e 10. Il contratto può prevedere accordi diversi: leggilo bene.

Salva il post e mandalo a chi sta cercando casa. 📩
Recensioni dei condomini su condoreco.com, link in bio.

${HASHTAGS} #affitto #inquilini #spesecondominiali`,
  },
  {
    id: 'milano-verde',
    title: 'Milano: quanto è verde il tuo quartiere',
    description: 'Mappa dei NIL colorata con l\'indice di verde urbano del Comune (luglio 2024). Dati pubblici.',
    slides: [
      { template: 'imageCover', params: { image: 'condor-wings', layout: 'bottomLeft', kicker: 'Milano', text: 'Quanto è verde il tuo quartiere? Abbiamo colorato Milano, NIL per NIL.' } },
      { template: 'map', params: { image: 'map-milano-verde', ratio: 0.902, kicker: 'La mappa', title: 'Il verde di Milano, quartiere per quartiere', legend: [['teal', 'Più verde'], ['yellow', 'Nella media'], ['red', 'Meno verde']], source: 'Fonte: Comune di Milano, indice di verde urbano dei NIL, luglio 2024 (CC BY 4.0). Mappa © MapTiler © OpenStreetMap contributors' } },
      { template: 'nilList', params: { theme: 'teal', kicker: 'Più verde', title: 'I quartieri più verdi', rows: [
        { name: 'QT 8', value: '25,7', color: 'teal' },
        { name: 'Chiaravalle', value: '19,9', color: 'teal' },
        { name: 'Bovisasca', value: '15,9', color: 'teal' },
        { name: 'Cimiano, Rottole, Feltre', value: '15,4', color: 'teal' },
        { name: 'Bruzzano', value: '14,2', color: 'teal' },
      ], note: 'Esclusi i NIL che sono quasi solo parco: Parco Nord, Sempione, Giardini di Porta Venezia, Bosco in Città.' } },
      { template: 'nilList', params: { theme: 'orange', kicker: 'Meno verde', title: 'Dove il verde scarseggia', rows: [
        { name: 'Stazione Centrale, Ponte Seveso', value: '2,2', color: 'red' },
        { name: 'Duomo', value: '2,5', color: 'red' },
        { name: 'Buenos Aires, Porta Venezia', value: '2,5', color: 'red' },
        { name: 'Porta Garibaldi, Porta Nuova', value: '2,5', color: 'red' },
        { name: 'Città Studi', value: '2,7', color: 'red' },
      ], note: 'Zone centrali e dense: tanti servizi, pochi alberi. Un cortile verde qui vale doppio.' } },
      { template: 'tip', params: { theme: 'teal', kicker: 'Come leggere i dati', title: 'Il verde non è tutto', body: 'L\'indice misura il verde urbano di ogni NIL. Dice quanto è verde la zona, non com\'è il tuo palazzo.' } },
      { template: 'mascot', params: { theme: 'light', pose: 'wave', showLink: true, text: 'Per il palazzo chiedi a chi ci vive: su Condoreco trovi le recensioni dei residenti.' } },
    ],
    caption: `Quanto è verde il tuo quartiere? 🌳 Abbiamo colorato gli 88 NIL di Milano con l'indice di verde urbano del Comune.

🟢 Più verdi (esclusi i NIL parco): QT 8, Chiaravalle, Bovisasca, Cimiano-Rottole-Feltre, Bruzzano.
🔴 Meno verdi: Stazione Centrale-Ponte Seveso, Duomo, Buenos Aires-Porta Venezia, Porta Garibaldi-Porta Nuova, Città Studi.

Il tuo quartiere com'è colorato? Scrivilo nei commenti 👇

Fonte: Comune di Milano, indice di verde urbano dei NIL, luglio 2024 (CC BY 4.0). Mappa © MapTiler © OpenStreetMap contributors.

Recensioni dei condomini su condoreco.com, link in bio.

${HASHTAGS} #milano #verdeurbano #quartierimilano`,
  },
  {
    id: 'classifica-zona',
    title: 'Classifica di zona (dati Condoreco)',
    description: 'Usa i punteggi reali. Serve almeno 3 condomini recensiti nella zona.',
    needsData: true,
    slides: [
      { template: 'mascot', params: { theme: 'light', kicker: 'Classifica', text: 'Ecco i condomini più amati di Milano, secondo chi ci vive davvero.' } },
      { template: 'ranking', params: { city: 'Milano', limit: 5, minReviews: 1 } },
      { template: 'mascot', params: { theme: 'orange', pose: 'determined', showLink: true, text: 'Il tuo palazzo manca? Aggiungilo e lascia la prima recensione. È anonima.' } },
    ],
    caption: `La classifica dei condomini più amati di Milano, dalle recensioni dei residenti su Condoreco. 🏆

Il tuo palazzo non c'è? Aggiungilo su condoreco.com (link in bio) e fallo salire.

${HASHTAGS}`,
  },
]
