export const metadata = {
  title: 'Come funziona',
  description: 'Come funziona CondoReco: cerca un condominio o un amministratore, leggi le recensioni e racconta la tua esperienza.',
}

export default function ComeFunziona() {
  return (
    <div className="legal-page">
      <div className="wrap legal-wrap">
        <div className="legal-hero">
          <div className="legal-eyebrow">Guida</div>
          <h1 className="legal-title">Come funziona CondoReco</h1>
          <p className="legal-intro">
            CondoReco aiuta a valutare un condominio o un amministratore prima di affittare, comprare o firmare un incarico, basandosi su recensioni reali di chi ci vive o ci ha avuto a che fare. Non è un canale per denunce, ma uno strumento informativo.
          </p>
        </div>

        <div className="legal-card">

          <section className="legal-section">
            <h2 className="legal-section-title">1. Cerca un condominio o un amministratore</h2>
            <p className="legal-paragraph">
              Su <a href="/cerca" className="legal-link">Cerca</a> puoi trovare un condominio per indirizzo, quartiere o città, e filtrare per servizi disponibili (ascensore, portineria, palestra, garage e altri) o per fascia di spese condominiali. Su <a href="/amministratori" className="legal-link">Amministratori</a> puoi cercare uno studio o un amministratore per nome, filtrare per città e per spesa media, e consultare l'elenco degli edifici che gestisce.
            </p>
          </section>

          <section className="legal-section">
            <h2 className="legal-section-title">2. Consulta punteggi e recensioni</h2>
            <p className="legal-paragraph">
              Il punteggio complessivo è una media pesata delle recensioni: pesa di più chi dichiara di abitare nell'edificio rispetto a chi sta solo valutando un acquisto o a un agente immobiliare, e pesa di più un profilo verificato. Oltre al punteggio generale trovi punteggi separati per categoria — Amministratore, Manutenzione, Spese, Qualità vita, Silenziosità, Sicurezza — con una scala di colori che aiuta a leggerli a colpo d'occhio, ed eventuali badge automatici come "Silenzioso" o "Admin reattivo" quando una categoria si distingue chiaramente. Le spese condominiali sono mostrate per fascia, non come cifra esatta, a tutela della privacy.
            </p>
          </section>

          <section className="legal-section">
            <h2 className="legal-section-title">3. Racconta la tua esperienza</h2>
            <p className="legal-paragraph">
              Per pubblicare una recensione serve un account. Indichi il tuo rapporto con l'edificio (residente, ex residente, proprietario non residente, inquilino, in valutazione o agente), assegni un voto complessivo e un voto per ciascuna delle sei categorie, puoi segnalare eventuali problemi ricorrenti e aggiungere un testo libero e fino a cinque foto. Prima di pubblicare confermi di scrivere in buona fede, in base a un'esperienza reale, senza inserire dati personali di terzi o accuse non verificabili. La recensione è visibile da subito ma resta comunque soggetta a moderazione, e se la modifichi torna temporaneamente in verifica.
            </p>
          </section>

          <section className="legal-section">
            <h2 className="legal-section-title">4. Moderazione e verifica dei contenuti</h2>
            <p className="legal-paragraph">
              I contenuti passano attraverso controlli manuali, un rilevamento automatico di termini a rischio e le segnalazioni degli utenti tramite <a href="/segnala-contenuto" className="legal-link">Segnala un contenuto</a>. In base a quanto emerge, un contenuto può essere approvato, nascosto, rifiutato, rimandato in revisione o eliminato. Come spiegato nelle <a href="/regole-recensioni" className="legal-link">Regole delle recensioni</a>, CondoReco non è un canale per denunce, non ha potere di accertamento e non sostituisce amministratori, assemblee o autorità competenti: può intervenire anche in via prudenziale, senza che questo implichi che un contenuto sia falso.
            </p>
          </section>

          <section className="legal-section">
            <h2 className="legal-section-title">5. Perche fidarsi di CondoReco</h2>
            <p className="legal-paragraph">
              Di default una recensione compare come "Anonimo", salvo che l'utente scelga un nome pubblico, ma il rapporto dichiarato con l'edificio è sempre visibile (ad esempio "Residente dichiarato"), con un badge rafforzato "Residente verificato" per i profili con documento verificato. Insieme alla moderazione attiva, alle <a href="/regole-recensioni" className="legal-link">Regole delle recensioni</a> e alle <a href="/linee-guida-community" className="legal-link">Linee guida della community</a>, questo sistema serve a mantenere i contenuti pertinenti, proporzionati e utili: un aiuto per orientarsi, non uno strumento per attacchi personali.
            </p>
          </section>

        </div>
      </div>
    </div>
  )
}
