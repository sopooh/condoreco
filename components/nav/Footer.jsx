'use client'

import Link from 'next/link'

const platformLinks = [
  { label: 'Cerca condominio', to: '/cerca' },
  { label: 'Recensisci il tuo condominio', to: '/aggiungi-condominio' },
  { label: 'Condomini a Milano', to: '/cerca' },
  { label: 'Amministratori', to: '/amministratori' },
  { label: 'Come funziona', to: '/' },
]

const communityLinks = [
  { label: 'Regole recensioni', to: '/regole-recensioni' },
  { label: 'Linee guida community', to: '/linee-guida-community' },
  { label: 'Segnala un contenuto', to: '/segnala-contenuto' },
  { label: 'Esperienza con l\'amministrazione', to: '/esperienza-amministrazione' },
  { label: 'FAQ', to: '/faq' },
]

function openCookieModal() {
  window.dispatchEvent(new CustomEvent('condoreco:open-cookie-modal'))
}

const infoLinks = [
  { label: 'Privacy Policy', to: '/privacy-policy' },
  { label: 'Termini e Condizioni', to: '/termini-e-condizioni' },
  { label: 'Cookie Policy', to: '/cookie-policy' },
  { label: 'Preferenze cookie', onClick: openCookieModal },
  { label: 'Contatti', to: '/contatti' },
]

function FooterLinks({ title, links }) {
  return (
    <div className="site-footer-col">
      <h4 className="site-footer-title">{title}</h4>
      <ul className="site-footer-list">
        {links.map((item) => (
          <li key={item.label}>
            {item.onClick ? (
              <button
                className="site-footer-link site-footer-link-btn"
                onClick={item.onClick}
                type="button"
              >
                {item.label}
              </button>
            ) : (
              <Link className="site-footer-link" href={item.to}>{item.label}</Link>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}

export default function Footer() {
  return (
    <footer className="site-footer" aria-labelledby="site-footer-heading">
      <div className="wrap site-footer-wrap">
        <div className="site-footer-grid">
          <div className="site-footer-col site-footer-brand-col">
            <Link href="/" className="site-footer-brand" aria-label="Vai alla home di CondoReco">
              <img src="/condoreco_transparent.png" alt="Logo CondoReco" className="site-footer-logo" />
              <div>
                <h4 className="site-footer-brand-name" id="site-footer-heading">CondoReco</h4>
                <p className="site-footer-brand-tagline">Community condominiale</p>
              </div>
            </Link>

            <p className="site-footer-description">
              CondoReco aiuta proprietari, inquilini e acquirenti a condividere esperienze sulla vita condominiale,
              sulla gestione degli edifici e sulla qualita abitativa.
            </p>

            <p className="site-footer-copy">© 2026 CondoReco. Tutti i diritti riservati.</p>
          </div>

          <FooterLinks title="Piattaforma" links={platformLinks} />
          <FooterLinks title="Community" links={communityLinks} />
          <FooterLinks title="Informazioni" links={infoLinks} />
        </div>

        <p className="site-footer-disclaimer">
          Le recensioni pubblicate su CondoReco riflettono opinioni ed esperienze personali degli utenti.
          CondoReco non garantisce l'esattezza assoluta dei contenuti pubblicati e puo rimuovere recensioni che
          violano le regole della community o contengono dati personali, linguaggio offensivo o contenuti
          potenzialmente diffamatori.
        </p>
      </div>
    </footer>
  )
}
