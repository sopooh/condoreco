import './globals.css'
import { SessionProvider } from '@/components/providers/SessionProvider'
import Navbar from '@/components/nav/Navbar'
import Footer from '@/components/nav/Footer'

export const metadata = {
  title: {
    default: "CondoReco — Scopri com'è vivere davvero qui",
    template: '%s | CondoReco',
  },
  description: 'Recensioni ed esperienze reali sulla vita condominiale: edifici, amministratori e quartieri raccontati da chi ci vive.',
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
        <SessionProvider>
          <Navbar />
          <main>{children}</main>
          <Footer />
        </SessionProvider>
      </body>
    </html>
  )
}
