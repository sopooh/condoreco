'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

// Lavoro del Recofixer per il profilo: interventi e fatture (con pagamenti).
export function useSupplierWork(enabled) {
  const [state, setState] = useState({ loading: true, items: [], invoices: [] })
  useEffect(() => {
    if (!enabled) return
    let off = false
    ;(async () => {
      const c = createClient()
      const { data: items, error } = await c.rpc('supplier_interventions')
      if (error) console.error('[useSupplierWork]', error)
      const ids = (items || []).map((i) => i.id)
      let invoices = []
      if (ids.length) {
        const { data } = await c.from('condo_intervention_files').select('id, intervention_id, amount_cents, paid_cents')
          .in('intervention_id', ids).eq('kind', 'invoice')
        invoices = data || []
      }
      if (!off) setState({ loading: false, items: items || [], invoices })
    })()
    return () => { off = true }
  }, [enabled])
  return state
}

export function workStats(items, invoices) {
  const billedIds = new Set(invoices.map((f) => f.intervention_id))
  const due = (list) => list.reduce((n, f) => n + Math.max(0, (f.amount_cents || 0) - (f.paid_cents || 0)), 0)
  return {
    active: items.filter((i) => i.status === 'requested' || i.status === 'scheduled').length,
    toPlan: items.filter((i) => i.status === 'requested' && !i.proposed_date).length,
    waiting: items.filter((i) => i.status === 'requested' && i.proposed_date).length,
    toBill: items.filter((i) => i.status === 'done' && !billedIds.has(i.id) && i.invoice_cents == null).length,
    due: due(invoices),
    dueFor: (ids) => due(invoices.filter((f) => ids.has(f.intervention_id))),
  }
}
