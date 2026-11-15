import Link from 'next/link'
import {
  ArrowRight, BarChart3, Building2, CalendarDays, Calculator, FileText, MapPin, MessageCircle,
  MessagesSquare, Search, Settings, Users, Wrench, HousePlus, UserRound,
} from 'lucide-react'
import { createStaticClient } from '@/lib/supabase/static'
import SearchBar from '@/components/search/SearchBar'
import BuildingList from '@/components/buildings/BuildingList'
import HeroFacade from '@/components/home/HeroFacade'
import PhoneStack from '@/components/home/PhoneStack'

export const revalidate = 3600

const TOP_BUILDINGS_LIMIT = 6

async function getHomeData() {
  const supabase = createStaticClient()
  const { data } = await supabase.from('building_scores').select('*').order('review_count', { ascending: false }).limit(TOP_BUILDINGS_LIMIT)
  return { topBuildings: data || [] }
}

export default async function HomePage() {
  const { topBuildings } = await getHomeData()

  return (
    <div className="lp">
      {/* ── Hero ── */}
      <section className="lp-hero">
        <div className="lp-hero-txt">
          <h1 className="lp-title">Trasparenza condominiale <span>per davvero.</span></h1>
          <p className="lp-lead">Scopri, gestisci e vivi il tuo condominio in modo più semplice, chiaro e condiviso.</p>
          <SearchBar variant="landing" />
          <nav className="lp-quick" aria-label="Scorciatoie">
            <Link href="/cerca"><MapPin size={17} aria-hidden="true" />Esplora i condomini</Link>
            <Link href="/cerca"><MessageCircle size={17} aria-hidden="true" />Fai una domanda ai residenti</Link>
            <Link href="/profilo"><Building2 size={17} aria-hidden="true" />Gestisci il tuo condominio</Link>
            <Link href="/fornitori"><Wrench size={17} aria-hidden="true" />Contatta direttamente i fornitori per gli interventi</Link>
          </nav>
        </div>
        <div className="lp-hero-art">
          <HeroFacade />
          <div className="lp-float lp-float-1"><Users size={20} aria-hidden="true" /><span>È un condominio tranquillo?<br />C&apos;è molto rumore?</span></div>
          <div className="lp-float lp-float-2"><BarChart3 size={20} aria-hidden="true" /><span>Com&apos;è la gestione<br />delle spese?</span></div>
          <div className="lp-float lp-float-3"><Wrench size={20} aria-hidden="true" /><span>Sono previsti<br />lavori a breve?</span></div>
        </div>
      </section>

      {/* ── Due percorsi ── */}
      <section className="lp-paths">
        <article className="lp-path is-warm">
          <div className="lp-path-txt">
            <span className="lp-tag">Cerchi casa?</span>
            <h2>Fai domande ai residenti prima di scegliere.</h2>
            <p>Ricevi risposte reali da chi vive già nel condominio: gestione, spese, manutenzione, servizi e qualità della vita.</p>
            <Link href="/come-funziona" className="lp-btn">Scopri come funziona<ArrowRight size={17} aria-hidden="true" /></Link>
          </div>
          <div className="lp-chatcard" aria-hidden="true">
            <div className="lp-chatcard-head"><HousePlus size={18} /><b>Possibili nuovi vicini<small>Residenti verificati</small></b></div>
            <div className="lp-cc-row">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/brand/volpe.png" alt="" className="lp-cc-av is-fox" />
              <div><span className="lp-cc-name is-fox">Volpe</span><p className="lp-cc-q">Com&apos;è la gestione del riscaldamento?</p></div>
            </div>
            <div className="lp-cc-row is-right">
              <div><span className="lp-cc-name">Condor</span><p className="lp-cc-a">Molto efficiente, spese in linea e nessun problema.</p></div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/brand/condor-white.png" alt="" className="lp-cc-av" />
            </div>
          </div>
        </article>
        <article className="lp-path is-sage">
          <div className="lp-path-txt">
            <span className="lp-tag">Sei già residente?</span>
            <h2>Gestisci il tuo condominio online.</h2>
            <p>Comunicazioni, documenti, spese, interventi e fornitori, tutto in un&apos;unica piattaforma condivisa.</p>
            <Link href="/profilo" className="lp-btn">Scopri la gestione<ArrowRight size={17} aria-hidden="true" /></Link>
          </div>
          <ul className="lp-features" aria-label="Cosa trovi nell'area condominio">
            <li><MessageCircle size={17} aria-hidden="true" />Chat condominiale<em>3</em></li>
            <li><CalendarDays size={17} aria-hidden="true" />Interventi e segnalazioni</li>
            <li><FileText size={17} aria-hidden="true" />Documenti</li>
            <li><Calculator size={17} aria-hidden="true" />Contabilità</li>
            <li><BarChart3 size={17} aria-hidden="true" />Sondaggi e assemblee</li>
          </ul>
        </article>
      </section>

      {/* ── Una piattaforma ── */}
      <section className="lp-platform">
        <PhoneStack />
        <div className="lp-platform-txt">
          <span className="lp-eyebrow">Un&apos;unica piattaforma, tutto il condominio</span>
          <h2>Dalla scelta alla gestione quotidiana.</h2>
          <p>Condoreco ti accompagna in ogni fase: valuta un condominio, confronta le esperienze reali, entra nella community e gestisci tutto in modo trasparente e collaborativo.</p>
          <ul className="lp-steps">
            <li><span><Search size={24} aria-hidden="true" /></span>Scopri<br />e valuta</li>
            <li><span><MessagesSquare size={24} aria-hidden="true" /></span>Chiedi ai<br />residenti</li>
            <li><span><Settings size={24} aria-hidden="true" /></span>Gestisci<br />e organizza</li>
            <li><span><Users size={24} aria-hidden="true" /></span>Collabora<br />con tutti</li>
          </ul>
        </div>
      </section>

      {/* ── Per chi ── */}
      <section className="lp-audience">
        <Link href="/profilo"><Building2 size={26} aria-hidden="true" /><span><b>Per condomini e proprietari</b>Più controllo, comunicazione diretta e una gestione realmente condivisa.</span></Link>
        <Link href="/amministratori"><UserRound size={26} aria-hidden="true" /><span><b>Per amministratori</b>Uno strumento completo per lavorare in modo più semplice, digitale e trasparente.</span></Link>
        <Link href="/fornitori"><Wrench size={26} aria-hidden="true" /><span><b>Per fornitori</b>Interventi, preventivi e comunicazioni organizzate, senza perdite di tempo.</span></Link>
      </section>

      {/* ── I più recensiti ── */}
      {topBuildings.length > 0 && (
        <section className="lp-top">
          <div className="lp-top-head">
            <h2>Più recensiti questa settimana</h2>
            <Link href="/cerca">Vedi tutti<ArrowRight size={16} aria-hidden="true" /></Link>
          </div>
          <BuildingList buildings={topBuildings} />
        </section>
      )}

      {/* ── CTA ── */}
      <section className="lp-cta">
        <div className="lp-cta-art" aria-hidden="true"><HeroFacade /></div>
        <div className="lp-cta-txt">
          <h2>Crea il tuo condominio<br />su Condoreco.</h2>
          <p>Entra nella nuova generazione della vita condominiale.</p>
        </div>
        <Link href="/aggiungi-condominio" className="lp-cta-btn">Inizia ora<ArrowRight size={17} aria-hidden="true" /></Link>
      </section>
    </div>
  )
}
