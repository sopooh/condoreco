// Piani a pagamento di Condoreco per ruolo. Il pagamento va a Condoreco
// (cassa dell'app), non all'amministratore del condominio.
export const PLANS = {
  resident: {
    title: 'Piani per condomini',
    lead: 'Scegli il livello più adatto a te e vivi il tuo condominio con più strumenti, ordine e trasparenza.',
    plans: [
      { id: 'resident_base', name: 'Base', tagline: 'Tutto l\'essenziale, sempre gratis.', price: 'Gratis', free: true,
        features: ['Recensioni verificate', 'Chat del condominio', 'Sondaggi e votazioni', 'Bacheca e avvisi', 'Contabilità personale'] },
      { id: 'resident_pro', name: 'Pro', badge: 'Più completo', tagline: 'Più controllo, meno pensieri con Condor AI.', price: '1,99 €/mese', amount: 1.99, period: 'mese',
        note: 'Gratis se il tuo amministratore è Pro.',
        features: [{ ai: true, text: 'Condor AI', sub: 'riassunti chat e domande' }, 'Notifiche WhatsApp', 'Storico interventi esportabile', 'Tutte le funzioni del piano Base'] },
    ],
  },
  admin: {
    title: 'Piani per amministratori',
    lead: 'Gestisci uno o più condomini con tutti gli strumenti per semplificare il lavoro, aumentare la trasparenza e coinvolgere i residenti.',
    plans: [
      { id: 'admin_starter', name: 'Starter', tagline: 'Ideale per iniziare.', price: 'Gratis', free: true,
        features: ['1 condominio', 'Gestione residenti', 'Bacheca e avvisi', 'Contabilità di base', 'Senza Condor AI'] },
      { id: 'admin_pro', name: 'Pro', badge: 'Più scelto', tagline: 'Tutto per una gestione completa, con Condor AI.', price: '5 €/condominio al mese', amount: 5, period: 'condominio al mese',
        note: 'Minimo 29 €/mese', minimum: 29,
        features: ['Tutte le funzioni Starter', { ai: true, text: 'Condor AI', sub: 'per tutti i residenti' }, 'Gestione interventi e fornitori', 'Contabilità avanzata', 'Report ed export'] },
      { id: 'admin_studio', name: 'Studio', tagline: 'Per studi di amministrazione.', price: '199 €/mese', amount: 199, period: 'mese',
        note: 'Fino a 60 condomini',
        features: ['Tutte le funzioni Pro', 'Fino a 60 condomini', 'Utenti dello studio', 'Supporto prioritario', 'Onboarding dedicato'] },
    ],
  },
  supplier: {
    title: 'Piani per Fornitori',
    lead: 'Entra nella rete Condoreco, ricevi richieste verificate dai residenti e fai crescere la tua attività.',
    plans: [
      { id: 'supplier_base', name: 'Base', tagline: 'Per iniziare, senza costi fissi.', price: 'Gratis', free: true,
        note: '+ 5% sugli interventi confermati in app',
        features: ['Profilo professionale', 'Richieste dai residenti', 'Pagamento sicuro (Stripe)', 'Recensione verificata'] },
      { id: 'supplier_pro', name: 'Pro', badge: 'Più visibilità', tagline: 'Per aumentare le richieste e distinguerti nella tua zona.', price: '39 €/mese', amount: 39, period: 'mese',
        note: '+ 2% sugli interventi confermati in app',
        features: ['Tutto il piano Base', 'Badge verificato', 'Priorità nelle richieste della tua zona', 'Statistiche e performance del profilo', 'Maggiore visibilità in piattaforma'] },
    ],
  },
}

export function findPlan(id) {
  for (const [role, group] of Object.entries(PLANS)) {
    const p = group.plans.find((x) => x.id === id)
    if (p) return { ...p, role, groupTitle: group.title }
  }
  return null
}

const KEY = (role, uid) => `condoreco:plans-seen:${role}:${uid || 'anon'}`
export function plansSeen(role, uid) {
  try { return localStorage.getItem(KEY(role, uid)) === '1' } catch { return true }
}
export function markPlansSeen(role, uid) {
  try { localStorage.setItem(KEY(role, uid), '1') } catch { /* storage non disponibile */ }
}
