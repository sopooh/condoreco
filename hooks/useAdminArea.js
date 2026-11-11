import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useSession } from '@/components/providers/SessionProvider'
import { todayISO } from '@/lib/accounting'
import { useViewAs } from '@/hooks/useViewAs'

const isFinal = (p) => p.status === 'approved' && (p.phase2_status === 'none' || p.phase2_status === 'closed')

/* ───────────── Home amministratore: tutti i condomini + cose da fare ───────────── */

export function useAdminOverview() {
  const session = useSession()
  const userId = session?.user?.id
  const [state, setState] = useState({ loading: true, buildings: [], inbox: [], error: null })

  const load = useCallback(async () => {
    if (!userId) return
    const supabase = createClient()
    const { data: buildings, error } = await supabase.rpc('admin_buildings_overview')
    if (error) { setState({ loading: false, buildings: [], inbox: [], error: 'Non riesco a caricare i tuoi condomini.' }); return }
    const ids = (buildings || []).map((b) => b.building_id)
    if (!ids.length) { setState({ loading: false, buildings: [], inbox: [], error: null }); return }
    const addr = Object.fromEntries(buildings.map((b) => [b.building_id, `${b.address}${b.street_number ? `, ${b.street_number}` : ''}`]))

    const [{ data: events }, { data: receipts }, { data: polls }, { data: practices }, { data: quotes }, { data: geo }] = await Promise.all([
      supabase.from('events').select('id, building_id, title, event_date, time_start, event_type, location').in('building_id', ids).eq('approved', false).gte('event_date', todayISO()).order('event_date'),
      supabase.from('condo_payment_receipts').select('id, building_id, user_id, amount, paid_on, file_name, created_at').in('building_id', ids).eq('status', 'pending').order('created_at'),
      supabase.from('polls').select('id, building_id, question, status, phase2_status, closes_at, phase2_closes_at').in('building_id', ids).eq('status', 'approved'),
      supabase.from('condo_practices').select('id, poll_id').in('building_id', ids),
      supabase.from('condo_practice_quotes').select('id, supplier_name, amount, received_at, practice:condo_practices!inner(id, title, building_id, status)').eq('status', 'received').eq('practice.status', 'open').in('practice.building_id', ids),
      supabase.from('buildings').select('id, lat, lng, photo_url, osm_id').in('id', ids),
    ])
    const geoById = Object.fromEntries((geo || []).map((g) => [g.id, g]))
    const rows = buildings.map((b) => {
      const g = geoById[b.building_id] || {}
      const todo = b.receipts_pending + b.transfers_pending + b.events_pending + b.polls_to_take + b.quotes_received
      return { ...b, id: b.building_id, lat: g.lat, lng: g.lng, photo_url: b.photo_url || g.photo_url, osm_id: g.osm_id, todo }
    })
    const taken = new Set((practices || []).map((p) => p.poll_id).filter(Boolean))
    const inbox = [
      ...(polls || []).filter((p) => isFinal(p) && !taken.has(p.id)).map((p) => ({
        type: 'poll', id: p.id, buildingId: p.building_id, address: addr[p.building_id], title: p.question,
        date: p.phase2_closes_at || p.closes_at,
      })),
      ...(receipts || []).map((r) => ({
        type: 'receipt', id: r.id, buildingId: r.building_id, address: addr[r.building_id],
        title: `Contabile${r.amount ? ` di € ${Number(r.amount).toLocaleString('it-IT', { minimumFractionDigits: 2 })}` : ''}`, date: r.created_at,
      })),
      ...(events || []).map((e) => ({
        type: 'event', id: e.id, buildingId: e.building_id, address: addr[e.building_id], title: e.title,
        date: e.event_date, time: e.time_start, location: e.location,
      })),
      ...(quotes || []).map((q) => ({
        type: 'quote', id: q.id, buildingId: q.practice.building_id, address: addr[q.practice.building_id],
        title: `${q.supplier_name}: preventivo per «${q.practice.title}»`, practiceId: q.practice.id, amount: q.amount, date: q.received_at,
      })),
    ]
    // bonifici segnalati senza contabile: una voce per condominio
    for (const b of buildings) {
      if (b.transfers_pending > 0) inbox.push({ type: 'transfer', id: `tr-${b.building_id}`, buildingId: b.building_id, address: addr[b.building_id], title: `${b.transfers_pending} ${b.transfers_pending === 1 ? 'bonifico segnalato' : 'bonifici segnalati'} senza contabile`, count: b.transfers_pending })
    }
    setState({ loading: false, buildings: rows, inbox, error: null })
  }, [userId])

  useEffect(() => { load() }, [load])

  const approveEvent = useCallback(async (id) => {
    const { error } = await createClient().from('events').update({ approved: true }).eq('id', id)
    if (!error) await load()
    return { error: error ? 'Appuntamento non approvato. Riprova.' : null }
  }, [load])
  const rejectEvent = useCallback(async (id) => {
    const { error } = await createClient().from('events').delete().eq('id', id)
    if (!error) await load()
    return { error: error ? 'Operazione non riuscita. Riprova.' : null }
  }, [load])
  const takeCharge = useCallback(async (pollId) => {
    const { data, error } = await createClient().rpc('take_charge_poll', { p_poll: pollId })
    return { id: data || null, error: error ? 'Non riesco a prendere in carico la decisione.' : null }
  }, [])

  const { viewAs } = useViewAs()
  if (viewAs === 'recoer' || viewAs === 'recofixer') {
    return { ...state, loading: false, buildings: [], inbox: [], isAdmin: false, reload: load, approveEvent, rejectEvent, takeCharge }
  }
  return { ...state, isAdmin: state.buildings.length > 0, reload: load, approveEvent, rejectEvent, takeCharge }
}

/* ───────────── Pratiche e preventivi di un condominio ───────────── */

const PRACTICE_COLS = 'id, ref_number, building_id, poll_id, title, description, category, kind, status, chosen_quote_id, created_at, updated_at, condo_practice_quotes(id, maintainer_id, intervention_id, supplier_name, status, amount, days, warranty_months, notes, requested_at, received_at)'

export function usePractices(buildingId) {
  const [state, setState] = useState({ loading: true, practices: [], toTake: [], maintainers: [], error: null })

  const load = useCallback(async () => {
    if (!buildingId) return
    const supabase = createClient()
    const [{ data: practices, error }, { data: polls }, { data: maintainers }] = await Promise.all([
      supabase.from('condo_practices').select(PRACTICE_COLS).eq('building_id', buildingId).order('created_at', { ascending: false }),
      supabase.from('polls').select('id, question, status, phase2_status, closes_at, phase2_closes_at, phase2_winner').eq('building_id', buildingId).eq('status', 'approved').order('created_at', { ascending: false }),
      supabase.from('condo_maintainers').select('id, name, company, category, phone, email, supplier_user_id').eq('building_id', buildingId).order('name'),
    ])
    const taken = new Set((practices || []).map((p) => p.poll_id).filter(Boolean))
    setState({
      loading: false,
      practices: practices || [],
      toTake: (polls || []).filter((p) => isFinal(p) && !taken.has(p.id)),
      maintainers: maintainers || [],
      error: error ? 'Non riesco a caricare le pratiche.' : null,
    })
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
    takeCharge: (pollId) => call((s) => s.rpc('take_charge_poll', { p_poll: pollId }), 'Non riesco a prendere in carico la decisione.'),
    createPractice: (v) => call((s) => s.from('condo_practices').insert({ building_id: buildingId, ...v }).select('id').single(), 'Pratica non creata.'),
    updatePractice: (id, v) => call((s) => s.from('condo_practices').update(v).eq('id', id), 'Pratica non aggiornata.'),
    requestQuote: (practiceId, maintainerId, message) => call((s) => s.rpc('request_practice_quote', { p_practice: practiceId, p_maintainer: maintainerId, p_message: message || null }), 'Richiesta non inviata.'),
    addSupplier: async (supplierId, category) => {
      const { data, error } = await createClient().rpc('add_supplier_to_condo', { p_building: buildingId, p_supplier: supplierId, p_category: category || null })
      if (!error) await load()
      return { id: data || null, error: error ? 'Non riesco ad aggiungere il fornitore.' : null }
    },
    searchSuppliers: async (category, city) => {
      const { data } = await createClient().rpc('search_suppliers', { p_category: category || null, p_city: city || null })
      return data || []
    },
    saveQuote: (practiceId, q) => call((s) => {
      const row = {
        supplier_name: q.supplier_name, amount: q.amount, days: q.days ?? null, warranty_months: q.warranty_months ?? null, notes: q.notes || null,
        status: q.amount ? 'received' : 'requested', received_at: q.amount ? new Date().toISOString() : null,
      }
      return q.id
        ? s.from('condo_practice_quotes').update(row).eq('id', q.id)
        : s.from('condo_practice_quotes').insert({ practice_id: practiceId, maintainer_id: q.maintainer_id || null, ...row })
    }, 'Preventivo non salvato.'),
    deleteQuote: (id) => call((s) => s.from('condo_practice_quotes').delete().eq('id', id), 'Preventivo non eliminato.'),
    chooseQuote: (id) => call((s) => s.rpc('choose_practice_quote', { p_quote: id }), 'Non riesco ad affidare il lavoro.'),
  }
}

/* ───────────── Bilancio: spese sostenute, quote, situazione per condomino ───────────── */

export function useBilancio(buildingId) {
  const [state, setState] = useState({ loading: true, expenses: [], balances: [], budgets: [], charges: [], error: null })

  const load = useCallback(async () => {
    if (!buildingId) return
    const supabase = createClient()
    const [{ data: expenses, error }, { data: balances }, { data: budgets }, { data: charges }] = await Promise.all([
      supabase.from('condo_expenses').select('id, spent_on, category, kind, description, supplier, amount, movement_id, practice_id, created_at').eq('building_id', buildingId).order('spent_on', { ascending: false }).limit(2000),
      supabase.rpc('admin_member_balances', { p_building: buildingId }),
      supabase.from('condo_budgets').select('id, year, title, kind, status, installments, condo_budget_items(id, category, label, amount)').eq('building_id', buildingId).order('year', { ascending: false }),
      supabase.from('condo_charges').select('id, user_id, amount, status, kind, due_date, paid_at, title').eq('building_id', buildingId).neq('status', 'cancelled').limit(10000),
    ])
    setState({ loading: false, expenses: expenses || [], balances: balances || [], budgets: budgets || [], charges: charges || [], error: error ? 'Non riesco a caricare il bilancio.' : null })
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
    saveExpense: (v) => call((s) => (v.id
      ? s.from('condo_expenses').update({ spent_on: v.spent_on, category: v.category, kind: v.kind, description: v.description, supplier: v.supplier || null, amount: v.amount }).eq('id', v.id)
      : s.from('condo_expenses').insert({ building_id: buildingId, spent_on: v.spent_on, category: v.category, kind: v.kind, description: v.description, supplier: v.supplier || null, amount: v.amount, practice_id: v.practice_id || null })), 'Spesa non salvata.'),
    deleteExpense: (id) => call((s) => s.from('condo_expenses').delete().eq('id', id), 'Spesa non eliminata.'),
    importExpenses: (rows) => call((s) => s.rpc('import_expenses', { p_building: buildingId, p_rows: rows }), 'Import non riuscito.'),
    knownFingerprints: async (fps) => {
      const { data } = await createClient().rpc('known_movement_fingerprints', { p_building: buildingId, p_fingerprints: fps })
      return new Set(data || [])
    },
  }
}
