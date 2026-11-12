'use client'

import { useCondoRole } from '@/hooks/useCondoRole'
import AdminCondoOverview from '@/components/condo/admin/AdminCondoOverview'
import ResidentCondoOverview from '@/components/condo/ResidentCondoOverview'

// Home dell'area condominio: l'amministratore vede il riepilogo di gestione,
// il condomino la pagina "Il mio condominio".
export default function CondoDashboard({ building }) {
  const { isCondoAdmin, loading } = useCondoRole(building.id)
  if (loading) return <div className="aco"><p className="aco-muted">Caricamento…</p></div>
  return isCondoAdmin ? <AdminCondoOverview building={building} /> : <ResidentCondoOverview building={building} />
}
