// Ricette di carosello pronte: un clic genera tutte le slide + la didascalia.
// Formati pensati per il salvataggio e la condivisione (consigli pratici)
// che portano a condoreco.com senza sembrare pubblicità.

export const HASHTAGS = '#condominio #comprarecasa #casa #affitto #amministratorecondominio #vivereacasa #milano #condoreco'

export function utmLink(campaign) {
  return `condoreco.com/?utm_source=instagram&utm_medium=organic&utm_campaign=${campaign}`
}

export const RECIPES = [
  {
    id: 'dl-sal',
    title: 'Ristrutturazione: cosa sono DL e SAL',
    description: 'Spiega Direttore dei Lavori e Stato Avanzamento Lavori. Copertina con il Condor al computer.',
    slides: [
      { template: 'imageCover', params: { image: 'condor-desk', layout: 'top', kicker: 'Ristrutturazione', text: 'DL e SAL: cosa sono e perché ti riguardano' } },
      { template: 'tip', params: { number: 1, title: 'DL = Direttore dei Lavori', body: 'È il tecnico (ingegnere, architetto o geometra) che il condominio incarica di seguire il cantiere per conto dei condòmini.' } },
      { template: 'tip', params: { number: 2, title: 'Cosa fa il DL', body: 'Controlla che l\'impresa lavori secondo progetto e contratto, verifica materiali e misure, segnala i problemi e tiene la contabilità dei lavori.' } },
      { template: 'tip', params: { number: 3, title: 'SAL = Stato Avanzamento Lavori', body: 'È il documento con cui il DL certifica quanto lavoro è stato fatto fino a una certa data, e quanto vale.' } },
      { template: 'tip', params: { number: 4, title: 'A cosa serve il SAL', body: 'Sulla base dei SAL l\'impresa riceve gli acconti. Il saldo arriva a lavori finiti e verificati.' } },
      { template: 'chat', params: { theme: 'light', lines: 'volpe: Quindi paghiamo a rate mentre il cantiere va avanti?\ngufo: Sì, se il contratto prevede i pagamenti a SAL. Anche il fondo lavori si può raccogliere a rate, seguendo i SAL.\nvolpe: E se i lavori sono fatti male?\ngufo: Il DL deve segnalarlo. Il condominio può contestare i difetti prima di pagare il SAL successivo.' } },
      { template: 'tip', params: { number: 5, title: 'Chiedi di vedere i SAL', body: 'Prima di ogni rata puoi chiedere all\'amministratore il SAL firmato dal DL: sai cosa stai pagando.' } },
      { template: 'mascot', params: { theme: 'orange', pose: 'determined', showLink: true, text: 'Com\'è andata la ristrutturazione nel tuo palazzo? Leggilo nelle recensioni su Condoreco.' } },
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
