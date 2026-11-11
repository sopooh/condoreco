import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useSession } from '@/components/providers/SessionProvider'

const CHARGE_COLS = 'id, building_id, user_id, budget_id, code, title, amount, due_date, status, reported_at, paid_at, paid_amount, payment_method, payment_ref, created_at'

// Preventivo più recente "emesso" dell'anno (o dell'ultimo anno disponibile), con le voci
async function loadLatestBudget(supabase, buildingId) {
  const { data } = await supabase.from('condo_budgets')
    .select('id, year, title, installments, first_due, status, issued_at, condo_budget_items(id, category, label, amount, position)')
    .eq('building_id', buildingId).eq('status', 'issued')
    .order('year', { ascending: false }).order('issued_at', { ascending: false }).limit(1)
  return data?.[0] || null
}

// Rendicontazione del condomino: le sue rate, il preventivo del condominio, i dati per pagare
export function useMyAccount(buildingId) {
  const session = useSession()
  const userId = session?.user?.id
  const [state, setState] = useState({ loading: true, charges: [], budget: null, settings: null, error: null })

  const load = useCallback(async () => {
    if (!buildingId || !userId) return
    const supabase = createClient()
    const [{ data: charges, error }, budget, { data: settings }] = await Promise.all([
      supabase.from('condo_charges').select(CHARGE_COLS).eq('building_id', buildingId).eq('user_id', userId).neq('status', 'cancelled').order('due_date', { ascending: true }),
      loadLatestBudget(supabase, buildingId),
      supabase.from('condo_accounting_settings').select('iban, holder, bank_name, stripe_ready').eq('building_id', buildingId).maybeSingle(),
    ])
    setState({ loading: false, charges: charges || [], budget, settings: settings || null, error: error ? 'Non riesco a caricare la rendicontazione.' : null })
  }, [buildingId, userId])

  useEffect(() => { load() }, [load])

  const reportTransfer = useCallback(async (ids) => {
    const { error } = await createClient().rpc('report_bank_transfer', { p_charges: ids })
    if (error) return { error: 'Non riesco a segnalare il bonifico. Riprova.' }
    await load()
    return { error: null }
  }, [load])

  // Pagamento online (carta, PayPal, Apple/Google Pay) con Stripe Checkout
  const startCheckout = useCallback(async (ids) => {
    const { data, error } = await createClient().functions.invoke('stripe-checkout', {
      body: { chargeIds: ids, returnUrl: window.location.href.split('#')[0] },
    })
    if (error || !data?.url) return { error: data?.error || 'Il pagamento online non è disponibile in questo momento. Usa il bonifico.' }
    window.location.assign(data.url)
    return { error: null }
  }, [])

  return { ...state, userId, reload: load, reportTransfer, startCheckout }
}

// Area Contabilità dell'amministratore
export function useAccountingAdmin(buildingId) {
  const [state, setState] = useState({ loading: true, charges: [], budgets: [], members: [], settings: null, error: null })

  const load = useCallback(async () => {
    if (!buildingId) return
    const supabase = createClient()
    const [{ data: charges, error }, { data: budgets }, { data: members }, { data: settings }] = await Promise.all([
      supabase.from('condo_charges').select(CHARGE_COLS).eq('building_id', buildingId).order('due_date', { ascending: true }).limit(5000),
      supabase.from('condo_budgets').select('id, year, title, installments, first_due, status, issued_at, condo_budget_items(id, category, label, amount, position)').eq('building_id', buildingId).order('year', { ascending: false }).order('created_at', { ascending: false }),
      supabase.rpc('accounting_members', { p_building: buildingId }),
      supabase.from('condo_accounting_settings').select('*').eq('building_id', buildingId).maybeSingle(),
    ])
    setState({ loading: false, charges: charges || [], budgets: budgets || [], members: members || [], settings: settings || null, error: error ? 'Non riesco a caricare la contabilità.' : null })
  }, [buildingId])

  useEffect(() => { load() }, [load])

  const call = useCallback(async (fn, friendly) => {
    const { data, error } = await fn(createClient())
    if (error) return { error: friendly || error.message }
    await load()
    return { data, error: null }
  }, [load])

  return {
    ...state,
    reload: load,
    saveSettings: (v) => call((s) => s.from('condo_accounting_settings').upsert({ building_id: buildingId, ...v, updated_at: new Date().toISOString() }), 'Impostazioni non salvate: controlla l’IBAN.'),
    createBudget: (v) => call((s) => s.from('condo_budgets').insert({ building_id: buildingId, ...v }).select('id').single(), 'Esiste già un preventivo con questo nome per l’anno scelto.'),
    updateBudget: (id, v) => call((s) => s.from('condo_budgets').update(v).eq('id', id), 'Preventivo non salvato.'),
    deleteBudget: (id) => call((s) => s.from('condo_budgets').delete().eq('id', id), 'Non riesco a eliminare il preventivo.'),
    saveItem: (budgetId, item) => call((s) => (item.id
      ? s.from('condo_budget_items').update({ category: item.category, label: item.label, amount: item.amount }).eq('id', item.id)
      : s.from('condo_budget_items').insert({ budget_id: budgetId, category: item.category, label: item.label, amount: item.amount, position: item.position ?? 0 })), 'Voce non salvata.'),
    deleteItem: (id) => call((s) => s.from('condo_budget_items').delete().eq('id', id), 'Voce non eliminata.'),
    split: async (budgetId) => {
      const { data, error } = await createClient().rpc('budget_split', { p_budget: budgetId })
      return { rows: data || [], error: error ? 'Anteprima non disponibile.' : null }
    },
    issueBudget: (id) => call((s) => s.rpc('issue_budget', { p_budget: id })),
    addCharge: (v) => call((s) => s.rpc('add_charge', { p_building: buildingId, p_title: v.title, p_amount: v.amount, p_due: v.due, p_user: v.userId || null, p_split: !!v.split }), 'Spesa non aggiunta.'),
    markPaid: (ids, method = 'bonifico', paidOn = null) => call((s) => s.rpc('mark_charges_paid', { p_charges: ids, p_method: method, p_paid_on: paidOn, p_ref: null }), 'Pagamento non registrato.'),
    setStatus: (id, status) => call((s) => s.rpc('set_charge_status', { p_charge: id, p_status: status }), 'Operazione non riuscita.'),
    importMovements: (rows) => call((s) => s.rpc('import_bank_movements', { p_building: buildingId, p_rows: rows }), 'Import non riuscito.'),
    knownFingerprints: async (fps) => {
      const { data } = await createClient().rpc('known_movement_fingerprints', { p_building: buildingId, p_fingerprints: fps })
      return new Set(data || [])
    },
  }
}
