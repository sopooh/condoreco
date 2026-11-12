// Area privata del condominio: riservata ai membri verificati, non deve
// finire nei risultati di ricerca (vale per tutte le sotto-pagine).
export const metadata = {
  robots: { index: false, follow: false },
}

export default function CondoAreaLayout({ children }) {
  return children
}
