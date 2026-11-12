import './globals.css'
import { SessionProvider } from '@/components/providers/SessionProvider'
import Navbar from '@/components/nav/Navbar'
import Footer from '@/components/nav/Footer'
import JsonLd from '@/components/seo/JsonLd'
import { SITE_URL, SITE_NAME } from '@/lib/site'

const DEFAULT_DESCRIPTION = "Recensioni reali di residenti su condomini e amministratori: spese, manutenzione, rumore e qualità della vita. Scopri com'è vivere in un edificio prima di comprare o affittare."

// Niente alternates.canonical qui: verrebbe ereditato da tutte le pagine.
// Ogni pagina indicizzabile dichiara il proprio canonical.
export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'CondoReco | Recensioni di condomini e amministratori',
    template: '%s | CondoReco',
  },
  description: DEFAULT_DESCRIPTION,
  applicationName: SITE_NAME,
  openGraph: {
    type: 'website',
    siteName: SITE_NAME,
    locale: 'it_IT',
    description: DEFAULT_DESCRIPTION,
  },
}

const organizationJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: SITE_NAME,
  url: SITE_URL,
  logo: `${SITE_URL}/condoreco_transparent.png`,
  email: 'info@condoreco.com',
  sameAs: ['https://www.instagram.com/condoreco/'],
}

// Nessun fetch di sessione qui: leggere i cookie lato server (anche solo per
// l'auth) forza l'intero albero delle route a dynamic rendering, vanificando
// revalidate/generateStaticParams sulle pagine sotto. La sessione viene letta
// client-side da SessionProvider (onAuthStateChange emette subito INITIAL_SESSION).
export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="it">
      <body>
        <JsonLd data={organizationJsonLd} />
        <SessionProvider>
          <Navbar />
          <main>{children}</main>
          <Footer />
        </SessionProvider>
      </body>
    </html>
  )
}
