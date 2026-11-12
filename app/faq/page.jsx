import FaqAccordion from '@/components/faq/FaqAccordion'

export const metadata = {
  alternates: { canonical: '/faq' },
  title: 'Domande frequenti',
  description: 'Le risposte alle domande più frequenti su CondoReco, le recensioni e il funzionamento della community.',
}

export default function FAQ() {
  return <FaqAccordion />
}
