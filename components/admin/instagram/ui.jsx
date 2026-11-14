'use client'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL

export function thumbUrl(storagePath) {
  return `${SUPABASE_URL}/storage/v1/object/public/instagram/${storagePath}`
}

export const ui = {
  page: { maxWidth: 720, margin: '0 auto', padding: '20px 16px 120px' },
  card: { background: 'var(--white)', border: '1px solid var(--border)', borderRadius: 14, padding: 16, marginTop: 16 },
  h2: { fontSize: 15, fontWeight: 800, color: 'var(--text)', margin: '0 0 12px' },
  label: { display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-2)', margin: '10px 0 4px' },
  input: { width: '100%', padding: '11px 12px', fontSize: 16, border: '1px solid var(--border)', borderRadius: 10, background: 'var(--white)', color: 'var(--text)', boxSizing: 'border-box' },
  primaryBtn: { background: 'var(--teal)', color: '#fff', border: 'none', borderRadius: 10, padding: '11px 18px', fontSize: 14, fontWeight: 700, cursor: 'pointer' },
  orangeBtn: { background: '#E8651A', color: '#fff', border: 'none', borderRadius: 10, padding: '11px 18px', fontSize: 14, fontWeight: 700, cursor: 'pointer' },
  ghostBtn: { background: 'var(--white)', color: 'var(--text-2)', border: '1px solid var(--border)', borderRadius: 10, padding: '9px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  smallBtn: { background: 'var(--white)', color: 'var(--text-2)', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 10px', fontSize: 13, fontWeight: 600, cursor: 'pointer', minWidth: 36 },
  error: { background: 'var(--red-bg)', color: 'var(--red-tx)', padding: '10px 12px', borderRadius: 10, fontSize: 13, marginTop: 12 },
  ok: { background: 'var(--green-bg)', color: 'var(--green-tx)', padding: '10px 12px', borderRadius: 10, fontSize: 13, marginTop: 12 },
  muted: { fontSize: 13, color: 'var(--text-3)' },
  postRow: { display: 'flex', alignItems: 'center', gap: 12, background: 'var(--white)', border: '1px solid var(--border)', borderRadius: 14, padding: 10, cursor: 'pointer', width: '100%' },
  postThumb: { width: 56, height: 70, borderRadius: 8, background: 'var(--border-2)', overflow: 'hidden', flexShrink: 0 },
}

const STATUS = {
  draft: { label: 'Bozza', bg: 'var(--slate-bg)', tx: 'var(--slate-tx)' },
  publishing: { label: 'In pubblicazione', bg: 'var(--amber-bg)', tx: 'var(--amber-tx)' },
  published: { label: 'Pubblicato', bg: 'var(--green-bg)', tx: 'var(--green-tx)' },
  failed: { label: 'Errore', bg: 'var(--red-bg)', tx: 'var(--red-tx)' },
}

export function StatusPill({ status }) {
  const s = STATUS[status] || STATUS.draft
  return (
    <span style={{ background: s.bg, color: s.tx, fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 999, whiteSpace: 'nowrap' }}>
      {s.label}
    </span>
  )
}
