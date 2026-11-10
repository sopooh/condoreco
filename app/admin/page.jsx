'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useSession } from '@/components/providers/SessionProvider'
import { useIsMobile } from '@/hooks/useIsMobile'
import AdminSidebar from '@/components/admin/AdminSidebar.jsx'
import OverviewSection from '@/components/admin/OverviewSection.jsx'
import UsersAdminTable from '@/components/admin/UsersAdminTable.jsx'
import BuildingsAdminTable from '@/components/admin/BuildingsAdminTable.jsx'
import ReviewsModeration from '@/components/admin/ReviewsModeration.jsx'
import ReportsSection from '@/components/admin/ReportsSection.jsx'
import FundingAnalytics from '@/components/admin/FundingAnalytics.jsx'
import ExportData from '@/components/admin/ExportData.jsx'
import AdminLogs from '@/components/admin/AdminLogs.jsx'
import PhotoModeration from '@/components/admin/PhotoModeration.jsx'
import { AdminIcon } from '@/components/admin/AdminIcons'

const SECTIONS = [
  { id: 'overview', label: 'Dashboard', icon: 'home' },
  { id: 'condomini', label: 'Abitazioni', icon: 'building' },
  { id: 'utenti', label: 'Utenti', icon: 'users' },
  { id: 'segnalazioni', label: 'Segnalazioni', icon: 'flag' },
  { id: 'analytics', label: 'Statistiche', icon: 'chart' },
  { id: 'recensioni', label: 'Recensioni', icon: 'star' },
  { id: 'foto', label: 'Foto', icon: 'camera' },
  { id: 'export', label: 'Export', icon: 'download' },
  { id: 'log', label: 'Log', icon: 'list' },
]
// barra in basso su mobile: le 5 sezioni principali; le altre si aprono
// dalla dashboard (riquadro strumenti)
const BOTTOM_NAV = SECTIONS.slice(0, 5)

function Unauthorized() {
  return (
    <div style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
      <div style={{ fontSize: 48, marginBottom: 20 }}>🔒</div>
      <h1 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)', marginBottom: 8 }}>Accesso non autorizzato</h1>
      <p style={{ fontSize: 14, color: 'var(--text-3)', marginBottom: 24, textAlign: 'center', maxWidth: 360 }}>
        Non hai i permessi per accedere a questa pagina.
        Solo gli amministratori di CondoReco possono aprire questa sezione.
      </p>
      <Link href="/" style={{ padding: '10px 22px', background: 'var(--teal)', color: '#fff', borderRadius: 8, fontWeight: 700, fontSize: 13 }}>
        Torna alla homepage
      </Link>
    </div>
  )
}

function Loading() {
  return (
    <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-4)', fontSize: 14 }}>
      Verifica accesso...
    </div>
  )
}

// Il gate server-side vero è in middleware.ts (redirect prima ancora che
// l'HTML raggiunga il browser). Questo controllo client-side resta come
// seconda linea di difesa e per gestire lo stato di caricamento della UI
// mentre il profilo viene recuperato — non è la protezione primaria.
export default function AdminDashboard() {
  const session = useSession()
  const [role, setRole] = useState(undefined)
  const [section, setSection] = useState('overview')
  const isMobile = useIsMobile()

  useEffect(() => {
    if (!session) return
    const supabase = createClient()
    supabase.from('profiles').select('role').eq('id', session.user.id).single()
      .then(({ data }) => setRole(data?.role ?? null))
      .catch(() => setRole(null))
  }, [session])

  // Come nel resto del progetto (es. /profilo), SessionProvider non
  // distingue "sessione non ancora determinata" da "utente sloggato": session
  // parte a null finché onAuthStateChange non risponde. Qui va bene lo
  // stesso trattamento — il gate reale è comunque il middleware server-side.
  if (!session) return <Unauthorized />
  if (role === undefined) return <Loading />
  if (role !== 'admin') return <Unauthorized />

  const adminId = session.user.id
  const go = (id) => { setSection(id); window.scrollTo(0, 0) }

  const content = (
    <>
      {section === 'overview' && <OverviewSection adminId={adminId} onNavigate={go} />}
      {section === 'utenti' && <UsersAdminTable adminId={adminId} />}
      {section === 'condomini' && <BuildingsAdminTable adminId={adminId} />}
      {section === 'recensioni' && <ReviewsModeration adminId={adminId} />}
      {section === 'foto' && <PhotoModeration />}
      {section === 'segnalazioni' && <ReportsSection adminId={adminId} />}
      {section === 'analytics' && <FundingAnalytics />}
      {section === 'export' && <ExportData />}
      {section === 'log' && <AdminLogs />}
    </>
  )

  if (isMobile) {
    const activeTab = BOTTOM_NAV.some(t => t.id === section) ? section : null
    return (
      <div style={{ minHeight: 'calc(100vh - 58px)', background: 'var(--bg)' }}>
        {section !== 'overview' && (
          <button type="button" className="adm-back" onClick={() => go('overview')}>
            <span style={{ display: 'inline-flex', transform: 'rotate(180deg)' }}><AdminIcon name="arrowRight" size={16} /></span>
            Dashboard
          </button>
        )}
        <main style={{ paddingBottom: 110 }}>{content}</main>
        <nav className="adm-bottom-nav" aria-label="Sezioni admin">
          {BOTTOM_NAV.map(t => (
            <button key={t.id} type="button" onClick={() => go(t.id)}
              className={activeTab === t.id ? 'is-active' : ''} aria-current={activeTab === t.id ? 'page' : undefined}>
              <AdminIcon name={t.icon} size={24} />
              <span>{t.label}</span>
            </button>
          ))}
        </nav>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 58px)', overflow: 'hidden' }}>
      <AdminSidebar sections={SECTIONS} active={section} onSelect={setSection} adminEmail={session.user.email} />
      <main style={{ flex: 1, overflowY: 'auto', background: 'var(--bg)' }}>{content}</main>
    </div>
  )
}
