import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useSession } from '@/components/providers/SessionProvider'
import { uploadDocument } from '@/hooks/useDocuments'

// Fornitori del condominio (rubrica condo_maintainers) con contratti,
// DURC, polizze e scadenze. Solo amministratori (RLS).
export function useSupplierRegistry(buildingId) {
  const session = useSession()
  const userId = session?.user?.id ?? null
  const [state, setState] = useState({ loading: true, error: null, suppliers: [], contracts: [], documents: [], deadlines: [] })

  const load = useCallback(async () => {
    if (!buildingId || !userId) return
    const s = createClient()
    const [m, c, d, dl] = await Promise.all([
      s.from('condo_maintainers').select('id, name, company, category, phone, email, supplier_user_id').eq('building_id', buildingId).order('name'),
      s.from('condo_supplier_contracts').select('*').eq('building_id', buildingId).order('end_date', { ascending: true, nullsFirst: false }),
      s.from('condo_supplier_documents').select('*').eq('building_id', buildingId).order('expires_on', { ascending: false, nullsFirst: false }),
      s.rpc('supplier_deadlines', { p_building: buildingId, p_days: 60 }),
    ])
    const firstErr = [m, c, d, dl].find((r) => r.error)?.error
    if (firstErr) console.error('[useSupplierRegistry] load failed', firstErr)
    setState({
      loading: false,
      error: firstErr ? 'Non riesco a caricare i fornitori.' : null,
      suppliers: m.data || [], contracts: c.data || [], documents: d.data || [], deadlines: dl.data || [],
    })
  }, [buildingId, userId])

  useEffect(() => { load() }, [load])

  // Carica il file nell'archivio come documento riservato e restituisce l'id.
  async function attach(file, title, category = 'contracts') {
    if (!file) return { id: null, error: null }
    const r = await uploadDocument({ buildingId, userId, file, title, category, docDate: null, visibility: 'restricted' })
    return r
  }

  const run = async (label, q) => {
    const { error } = await q
    if (error) { console.error(`[useSupplierRegistry] ${label} failed`, error); return { error: 'Salvataggio non riuscito. Riprova.' } }
    await load()
    return { error: null }
  }

  async function saveContract(v, file) {
    const up = await attach(file, `Contratto ${v.title}`)
    if (up.error) return up
    const row = {
      building_id: buildingId, maintainer_id: v.maintainer_id, title: v.title.trim(), service_category: v.service_category || null,
      start_date: v.start_date || null, end_date: v.end_date || null, auto_renew: !!v.auto_renew,
      renewal_months: v.auto_renew ? Number(v.renewal_months) || 12 : null, notice_days: v.notice_days === '' || v.notice_days == null ? null : Number(v.notice_days),
      amount_cents: v.amount === '' || v.amount == null ? null : Math.round(Number(v.amount) * 100), amount_period: v.amount_period || null,
      status: v.status || 'active', notes: v.notes?.trim() || null,
      ...(up.id ? { document_id: up.id } : {}),
    }
    return v.id ? run('update contract', createClient().from('condo_supplier_contracts').update(row).eq('id', v.id))
      : run('insert contract', createClient().from('condo_supplier_contracts').insert(row))
  }
  const deleteContract = (id) => run('delete contract', createClient().from('condo_supplier_contracts').delete().eq('id', id))

  async function saveDocument(v, file, supplierName) {
    const up = await attach(file, `${docKindLabel(v.kind)} ${supplierName}`, v.kind.startsWith('insurance') ? 'contracts' : 'other')
    if (up.error) return up
    const row = {
      building_id: buildingId, maintainer_id: v.maintainer_id, kind: v.kind, issued_on: v.issued_on || null, expires_on: v.expires_on || null,
      insurer: v.insurer?.trim() || null, policy_number: v.policy_number?.trim() || null,
      coverage_cents: v.coverage === '' || v.coverage == null ? null : Math.round(Number(v.coverage) * 100), notes: v.notes?.trim() || null,
      ...(up.id ? { document_id: up.id } : {}),
    }
    return v.id ? run('update document', createClient().from('condo_supplier_documents').update(row).eq('id', v.id))
      : run('insert document', createClient().from('condo_supplier_documents').insert(row))
  }
  const deleteDocument = (id) => run('delete document', createClient().from('condo_supplier_documents').delete().eq('id', id))

  async function openFile(documentId) {
    const s = createClient()
    const { data: doc, error } = await s.from('condo_documents').select('file_path, file_name').eq('id', documentId).maybeSingle()
    if (error || !doc) return null
    const { data } = await s.storage.from('condo-documents').createSignedUrl(doc.file_path, 300)
    return data?.signedUrl || null
  }

  return { ...state, reload: load, saveContract, deleteContract, saveDocument, deleteDocument, openFile }
}

export const SUPPLIER_DOC_KINDS = [
  { value: 'durc', label: 'DURC', hint: 'Valido 120 giorni dal rilascio' },
  { value: 'insurance_rc', label: 'Polizza RC', hint: 'Responsabilità civile verso terzi' },
  { value: 'insurance_other', label: 'Altra polizza' },
  { value: 'visura', label: 'Visura camerale' },
  { value: 'soa', label: 'Attestazione SOA' },
  { value: 'certification', label: 'Abilitazione o certificazione', hint: 'Es. DM 37/08, F-gas' },
  { value: 'other', label: 'Altro' },
]
export const docKindLabel = (v) => SUPPLIER_DOC_KINDS.find((k) => k.value === v)?.label || v

export const AMOUNT_PERIODS = [
  { value: 'one_off', label: 'una tantum' },
  { value: 'monthly', label: 'al mese' },
  { value: 'quarterly', label: 'a trimestre' },
  { value: 'half_yearly', label: 'a semestre' },
  { value: 'yearly', label: 'all\'anno' },
]

export const DEADLINE_LABELS = {
  contract_notice: 'Ultimo giorno per la disdetta',
  contract_end: 'Scadenza contratto',
}
export const deadlineLabel = (kind) => DEADLINE_LABELS[kind] || `Scadenza ${docKindLabel(kind.replace(/^document_/, ''))}`
