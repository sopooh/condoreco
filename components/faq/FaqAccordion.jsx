'use client'

import { useState } from 'react'
import Link from 'next/link'

const categories = [
  {
    title: 'CondoReco',
    items: [
      {
        question: 'Che cos\'è CondoReco?',
        answer: 'CondoReco è una community dove le persone possono condividere esperienze reali sulla vita condominiale, sugli edifici e sui quartieri. L\'obiettivo è aiutare gli utenti a scegliere casa con più consapevolezza, leggendo informazioni e opinioni basate su esperienze dirette.',
      },
      {
        question: 'CondoReco è una community?',
        answer: 'Sì. CondoReco è una community informativa dedicata alle esperienze abitative. Gli utenti possono contribuire con recensioni, valutazioni e segnalazioni utili, rispettando le regole della piattaforma e mantenendo un linguaggio civile, neutro e basato sui fatti.',
      },
      {
        question: 'CondoReco è una piattaforma di denuncia?',
        answer: 'No. CondoReco non è una piattaforma di denuncia, non sostituisce autorità, avvocati, amministratori o assemblee condominiali. Le recensioni devono raccontare esperienze personali in modo rispettoso e non devono contenere accuse, insulti o contenuti diffamatori.',
      },
      {
        question: 'Quali informazioni posso trovare su CondoReco?',
        answer: 'Puoi trovare recensioni e valutazioni su edifici, condomini, quartieri, qualità della vita, manutenzione, rumore, sicurezza percepita, spese condominiali, servizi e gestione dello stabile.',
      },
      {
        question: 'CondoReco verifica tutte le informazioni pubblicate?',
        answer: 'CondoReco può effettuare controlli, moderare contenuti e intervenire in caso di segnalazioni, ma le recensioni sono contenuti generati dagli utenti. Ogni utente è responsabile di ciò che pubblica.',
      },
    ],
  },
  {
    title: 'Recensioni',
    items: [
      {
        question: 'Chi può pubblicare una recensione?',
        answer: 'Può pubblicare una recensione chi ha avuto un\'esperienza reale con un edificio, un condominio o una zona: residenti, ex residenti, proprietari, inquilini o persone che conoscono direttamente lo stabile.',
      },
      {
        question: 'Cosa posso scrivere in una recensione?',
        answer: 'Puoi descrivere la tua esperienza abitativa, la qualità dello stabile, la manutenzione, il livello di rumore, la sicurezza percepita, la gestione delle spese, la comunicazione dell\'amministrazione e altri aspetti utili per chi sta valutando quell\'edificio o quella zona.',
      },
      {
        question: 'Che linguaggio devo usare?',
        answer: 'Usa un linguaggio rispettoso, neutro e basato sulla tua esperienza personale. Sono consigliate formule come "secondo la mia esperienza", "ho riscontrato", "mi è sembrato", "nel periodo in cui ho vissuto nello stabile".',
      },
      {
        question: 'Cosa non posso scrivere in una recensione?',
        answer: 'Non puoi pubblicare insulti, minacce, accuse non provate, dati personali di terzi, contenuti discriminatori, informazioni false o frasi che possano danneggiare ingiustamente la reputazione di persone, amministratori, società o condomini.',
      },
      {
        question: 'Posso nominare un vicino o una persona specifica?',
        answer: 'No. Non è consentito pubblicare nomi, cognomi, contatti, dettagli personali o informazioni che permettano di identificare persone private. È meglio usare formule generiche come "un vicino", "alcuni residenti" o "l\'amministrazione".',
      },
      {
        question: 'Posso parlare dell\'amministrazione condominiale?',
        answer: 'Sì, puoi raccontare la tua esperienza con l\'amministrazione condominiale, purché il linguaggio sia rispettoso e basato sui fatti. Puoi parlare di tempi di risposta, chiarezza delle comunicazioni, gestione delle assemblee e manutenzione. Non sono ammessi insulti o accuse personali.',
      },
      {
        question: 'Posso modificare o cancellare una recensione?',
        answer: 'Se la funzione è disponibile, puoi modificare o cancellare la tua recensione dal tuo profilo. In alternativa, puoi contattare CondoReco o usare la pagina di segnalazione per richiedere assistenza.',
      },
    ],
  },
  {
    title: 'Segnalazioni e moderazione',
    items: [
      {
        question: 'Come posso segnalare un contenuto?',
        answer: 'Puoi usare la pagina "Segnala un contenuto" indicando il link o il riferimento del contenuto, il motivo della segnalazione e una breve descrizione del problema. Il team valuterà la richiesta caso per caso.',
      },
      {
        question: 'Quali contenuti posso segnalare?',
        answer: 'Puoi segnalare recensioni, commenti, profili, immagini o messaggi che ritieni falsi, offensivi, diffamatori, lesivi della privacy, discriminatori, non pertinenti o contrari alle regole della community.',
      },
      {
        question: 'Cosa succede dopo una segnalazione?',
        answer: 'CondoReco valuta la segnalazione e può decidere di mantenere il contenuto online, limitarne la visibilità, chiedere chiarimenti, oscurarlo temporaneamente o rimuoverlo. L\'invio di una segnalazione non comporta automaticamente la rimozione del contenuto.',
      },
      {
        question: 'Le recensioni vengono moderate?',
        answer: 'Sì. CondoReco può moderare i contenuti prima o dopo la pubblicazione, anche tramite sistemi automatici, controlli manuali, filtri linguistici o segnalazioni degli utenti.',
      },
      {
        question: 'Perché una mia recensione è stata rimossa?',
        answer: 'Una recensione può essere rimossa o limitata se viola le regole della community, contiene insulti, accuse non provate, dati personali, contenuti non pertinenti o elementi che possono creare rischi per utenti, terzi o per la piattaforma.',
      },
      {
        question: 'Posso rispondere a una recensione che mi riguarda?',
        answer: 'I soggetti direttamente interessati possono richiedere una verifica del contenuto o inviare una replica, che dovrà essere rispettosa, pertinente e conforme alle regole della community.',
      },
    ],
  },
  {
    title: 'Privacy e sicurezza',
    items: [
      {
        question: 'Posso pubblicare documenti condominiali?',
        answer: 'Puoi pubblicare solo documenti che hai il diritto di condividere e che non contengono dati personali o informazioni riservate. Prima del caricamento, eventuali nomi, contatti, firme, codici fiscali e dettagli identificativi devono essere oscurati.',
      },
      {
        question: 'Posso caricare foto dello stabile?',
        answer: 'Puoi caricare immagini dello stabile o degli spazi comuni solo se non violano la privacy di terzi. Non sono ammesse foto di persone riconoscibili, interni di abitazioni altrui o dettagli privati non necessari.',
      },
      {
        question: 'I miei dati personali sono visibili agli altri utenti?',
        answer: 'CondoReco mostra agli altri utenti solo le informazioni necessarie al funzionamento della community. I dati personali vengono trattati secondo l\'informativa privacy della piattaforma.',
      },
      {
        question: 'Posso pubblicare una recensione anonima?',
        answer: 'Se la piattaforma lo consente, puoi pubblicare una recensione con nome utente o profilo non direttamente identificativo. Anche in caso di anonimato, resti responsabile del contenuto pubblicato.',
      },
      {
        question: 'Cosa devo fare se trovo dati personali pubblicati da altri?',
        answer: 'Usa subito la pagina "Segnala un contenuto" e indica dove si trova il dato personale. CondoReco valuterà la richiesta e potrà oscurare o rimuovere il contenuto.',
      },
    ],
  },
  {
    title: 'Punteggi e ranking',
    items: [
      {
        question: 'Come funzionano i punteggi?',
        answer: 'I punteggi si basano sulle valutazioni inserite dagli utenti e possono riguardare aspetti come rumore, manutenzione, sicurezza percepita, vicinato, spese e qualità generale dell\'esperienza abitativa.',
      },
      {
        question: 'Il ranking rappresenta una verità assoluta?',
        answer: 'No. Il ranking è una sintesi delle recensioni e delle valutazioni disponibili sulla piattaforma. Non rappresenta una certificazione ufficiale e deve essere considerato come uno strumento informativo, non come una valutazione definitiva.',
      },
      {
        question: 'Perché un edificio ha poche recensioni?',
        answer: 'Alcuni edifici potrebbero avere poche recensioni perché la community è ancora in crescita o perché pochi utenti hanno condiviso la propria esperienza. Il punteggio diventa più utile man mano che aumentano i contributi.',
      },
      {
        question: 'Posso recensire più volte lo stesso edificio?',
        answer: 'Di norma ogni utente dovrebbe pubblicare una sola recensione per edificio, aggiornandola se necessario. Recensioni duplicate o create per alterare il punteggio possono essere rimosse.',
      },
      {
        question: 'Le recensioni negative sono permesse?',
        answer: 'Sì, le recensioni negative sono permesse se sono basate su esperienze reali, scritte in modo rispettoso e prive di insulti, accuse non provate o dati personali di terzi.',
      },
    ],
  },
]

function AccordionItem({ question, answer, isOpen, onToggle }) {
  return (
    <div className="faq-item">
      <button
        className="faq-question"
        onClick={onToggle}
        aria-expanded={isOpen}
      >
        <span>{question}</span>
        <span className="faq-icon" aria-hidden="true">{isOpen ? '−' : '+'}</span>
      </button>
      {isOpen && (
        <div className="faq-answer">
          <p>{answer}</p>
        </div>
      )}
    </div>
  )
}

export default function FaqAccordion() {
  const [openKey, setOpenKey] = useState(null)

  function toggle(key) {
    setOpenKey((prev) => (prev === key ? null : key))
  }

  return (
    <div className="faq-page">
      <div className="wrap faq-wrap">
        <div className="faq-hero">
          <div className="legal-eyebrow">Supporto</div>
          <h1 className="faq-title">Domande frequenti</h1>
          <p className="faq-subtitle">
            Tutto quello che devi sapere su CondoReco, le recensioni e come funziona la community.
          </p>
        </div>

        <div className="faq-categories">
          {categories.map((cat, ci) => (
            <section key={cat.title} className="faq-category">
              <h2 className="faq-category-title">{cat.title}</h2>
              <div className="faq-card">
                {cat.items.map((item, ii) => {
                  const key = `${ci}-${ii}`
                  return (
                    <AccordionItem
                      key={key}
                      question={item.question}
                      answer={item.answer}
                      isOpen={openKey === key}
                      onToggle={() => toggle(key)}
                    />
                  )
                })}
              </div>
            </section>
          ))}
        </div>

        <div className="faq-cta">
          <h2 className="faq-cta-title">Non hai trovato la risposta?</h2>
          <p className="faq-cta-text">
            Se hai bisogno di assistenza o vuoi segnalare un problema, puoi contattarci o usare la pagina Segnala un contenuto.
          </p>
          <Link href="/segnala-contenuto" className="btn btn-primary faq-cta-btn">
            Segnala un contenuto
          </Link>
        </div>
      </div>
    </div>
  )
}
