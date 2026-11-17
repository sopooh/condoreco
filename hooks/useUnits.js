import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useCondoRole } from '@/hooks/useCondoRole'

// Anagrafe del condominio: unità, persone, tabelle millesimali e valori.
// RLS: l'amministratore vede tutto; il residente vede l'elenco delle unità e
// delle tabelle, ma persone e millesimi solo della propria unità.
export function useUnits(buildingId) {
  const { isCondoAdmin, loading: roleLoading } = useCondoRole(buildingId)
  const [state, setState] = useState({ loading: true, error: null, units: [], people: [], tables: [], values: [], check: [], members: [] })

  const load = useCallback(async () => {
    if (!buildingId || roleLoading) return
    const s = createClient()
    const [u, p, t, v] = await Promise.all([
      s.from('condo_units').select('id, code, kind, floor, staircase, cadastral_ref, notes').eq('building_id', buildingId).order('code'),
      s.from('condo_unit_people').select('id, unit_id, user_id, full_name, role, share, email, phone, since, until').eq('building_id', buildingId).order('full_name'),
      s.from('condo_millesimi_tables').select('id, code, name, kind, total, document_id, notes').eq('building_id', buildingId).order('code'),
      s.from('condo_unit_millesimi').select('table_id, unit_id, value').eq('building_id', buildingId),
    ])
    const firstErr = [u, p, t, v].find((r) => r.error)?.error
    if (firstErr) console.error('[useUnits] load failed', firstErr)
    let check = [], members = []
    if (isCondoAdmin) {
      const [c, m] = await Promise.all([
        s.rpc('millesimi_check', { p_building: buildingId }),
        s.rpc('condo_members_for_linking', { p_building: buildingId }),
      ])
      if (c.error) console.error('[useUnits] millesimi_check failed', c.error)
      if (m.error) console.error('[useUnits] members failed', m.error)
      check = c.data || []
      members = m.data || []
    }
    setState({
      loading: false,
      error: firstErr ? 'Non riesco a caricare unità e millesimi.' : null,
      units: u.data || [], people: p.data || [], tables: t.data || [], values: v.data || [], check, members,
    })
  }, [buildingId, isCondoAdmin, roleLoading])

  useEffect(() => { load() }, [load])

  const run = async (label, q) => {
    const { error } = await q
    if (error) {
      console.error(`[useUnits] ${label} failed`, error)
      if (error.code === '23505') return { error: 'Esiste già un elemento con questo codice.' }
      if (error.code === '23514' && /member/.test(error.message)) return { error: 'Questa persona non è iscritta al condominio.' }
      return { error: 'Salvataggio non riuscito. Riprova.' }
    }
    await load()
    return { error: null }
  }
  const s = () => createClient()

  const saveUnit = (unit) => {
    const row = {
      building_id: buildingId, code: unit.code.trim(), kind: unit.kind, floor: unit.floor?.trim() || null,
      staircase: unit.staircase?.trim() || null, cadastral_ref: unit.cadastral_ref?.trim() || null, notes: unit.notes?.trim() || null,
    }
    return unit.id ? run('update unit', s().from('condo_units').update(row).eq('id', unit.id))
      : run('insert unit', s().from('condo_units').insert(row))
  }
  const deleteUnit = (id) => run('delete unit', s().from('condo_units').delete().eq('id', id))

  const savePerson = (person) => {
    const row = {
      building_id: buildingId, unit_id: person.unit_id, user_id: person.user_id || null, full_name: person.full_name.trim(),
      role: person.role, share: Number(person.share) || 100, email: person.email?.trim() || null, phone: person.phone?.trim() || null,
      since: person.since || null, until: person.until || null,
    }
    return person.id ? run('update person', s().from('condo_unit_people').update(row).eq('id', person.id))
      : run('insert person', s().from('condo_unit_people').insert(row))
  }
  const deletePerson = (id) => run('delete person', s().from('condo_unit_people').delete().eq('id', id))

  const saveTable = (table) => {
    const row = { building_id: buildingId, code: table.code.trim().toUpperCase(), name: table.name.trim(), kind: table.kind, total: Number(table.total) || 1000, notes: table.notes?.trim() || null }
    return table.id ? run('update table', s().from('condo_millesimi_tables').update(row).eq('id', table.id))
      : run('insert table', s().from('condo_millesimi_tables').insert(row))
  }
  const deleteTable = (id) => run('delete table', s().from('condo_millesimi_tables').delete().eq('id', id))

  // values: { [unit_id]: number | '' } per una tabella; le celle vuote vengono tolte
  const saveValues = async (tableId, values) => {
    const rows = Object.entries(values).filter(([, v]) => v !== '' && v != null && Number.isFinite(Number(v)))
      .map(([unit_id, v]) => ({ building_id: buildingId, table_id: tableId, unit_id, value: Number(v) }))
    const empty = Object.entries(values).filter(([, v]) => v === '' || v == null).map(([id]) => id)
    if (rows.length) {
      const r = await run('upsert values', s().from('condo_unit_millesimi').upsert(rows, { onConflict: 'table_id,unit_id' }))
      if (r.error) return r
    }
    if (empty.length) return run('clear values', s().from('condo_unit_millesimi').delete().eq('table_id', tableId).in('unit_id', empty))
    await load()
    return { error: null }
  }

  return { ...state, isCondoAdmin, reload: load, saveUnit, deleteUnit, savePerson, deletePerson, saveTable, deleteTable, saveValues }
}

export const UNIT_KINDS = [
  { value: 'apartment', label: 'Appartamento' },
  { value: 'shop', label: 'Negozio' },
  { value: 'office', label: 'Ufficio' },
  { value: 'garage', label: 'Box o posto auto' },
  { value: 'cellar', label: 'Cantina' },
  { value: 'attic', label: 'Soffitta' },
  { value: 'other', label: 'Altro' },
]
export const PERSON_ROLES = [
  { value: 'owner', label: 'Proprietario' },
  { value: 'tenant', label: 'Inquilino' },
  { value: 'usufructuary', label: 'Usufruttuario' },
  { value: 'bare_owner', label: 'Nudo proprietario' },
]
export const TABLE_KINDS = [
  { value: 'ownership', label: 'Proprietà generale', code: 'A' },
  { value: 'stairs', label: 'Scale', code: 'B' },
  { value: 'lift', label: 'Ascensore', code: 'C' },
  { value: 'heating', label: 'Riscaldamento', code: 'D' },
  { value: 'water', label: 'Acqua', code: 'E' },
  { value: 'other', label: 'Altra tabella', code: '' },
]
export const labelOf = (list, v) => list.find((x) => x.value === v)?.label || v
