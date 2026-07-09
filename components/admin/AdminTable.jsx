'use client'

import { useState } from 'react'

export default function AdminTable({
  columns,
  rows,
  loading,
  total,
  page,
  limit = 50,
  onPageChange,
  emptyText = 'Nessun dato',
  rowActions,
}) {
  const [sortCol, setSortCol] = useState(null)
  const [sortAsc, setSortAsc] = useState(false)

  function handleSort(col) {
    if (!col.sortable) return
    if (sortCol === col.key) setSortAsc(a => !a)
    else { setSortCol(col.key); setSortAsc(true) }
  }

  let displayed = [...rows]
  if (sortCol) {
    displayed.sort((a, b) => {
      const av = a[sortCol] ?? ''
      const bv = b[sortCol] ?? ''
      const cmp = String(av).localeCompare(String(bv), 'it', { numeric: true })
      return sortAsc ? cmp : -cmp
    })
  }

  const totalPages = total != null ? Math.ceil(total / limit) : null

  return (
    <div>
      <div style={{ overflowX: 'auto', borderRadius: 10, border: '1px solid var(--border)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', background: 'var(--white)', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg)' }}>
              {columns.map(col => (
                <th
                  key={col.key}
                  onClick={() => handleSort(col)}
                  style={{
                    padding: '10px 14px', textAlign: 'left', fontWeight: 600,
                    color: 'var(--text-3)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.04em',
                    cursor: col.sortable ? 'pointer' : 'default',
                    userSelect: 'none', whiteSpace: 'nowrap',
                  }}
                >
                  {col.label}
                  {col.sortable && sortCol === col.key && (
                    <span style={{ marginLeft: 4 }}>{sortAsc ? '↑' : '↓'}</span>
                  )}
                </th>
              ))}
              {rowActions && <th style={{ padding: '10px 14px', fontWeight: 600, color: 'var(--text-3)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Azioni</th>}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={columns.length + (rowActions ? 1 : 0)}
                    style={{ padding: 40, textAlign: 'center', color: 'var(--text-4)' }}>
                  Caricamento...
                </td>
              </tr>
            ) : displayed.length === 0 ? (
              <tr>
                <td colSpan={columns.length + (rowActions ? 1 : 0)}
                    style={{ padding: 40, textAlign: 'center', color: 'var(--text-4)' }}>
                  {emptyText}
                </td>
              </tr>
            ) : displayed.map((row, i) => (
              <tr key={row.id || i} style={{ borderBottom: '1px solid var(--border-2)' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg)'}
                  onMouseLeave={e => e.currentTarget.style.background = ''}>
                {columns.map(col => (
                  <td key={col.key} style={{ padding: '10px 14px', color: 'var(--text)', verticalAlign: 'middle', ...col.style }}>
                    {col.render ? col.render(row[col.key], row) : (row[col.key] ?? '—')}
                  </td>
                ))}
                {rowActions && (
                  <td style={{ padding: '10px 14px', verticalAlign: 'middle' }}>
                    {rowActions(row)}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages != null && totalPages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 14, fontSize: 13 }}>
          <span style={{ color: 'var(--text-3)' }}>
            {total} totali · pagina {page + 1} di {totalPages}
          </span>
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              disabled={page === 0}
              onClick={() => onPageChange(page - 1)}
              style={{
                padding: '6px 14px', borderRadius: 6, border: '1px solid var(--border)',
                background: 'var(--white)', cursor: page === 0 ? 'not-allowed' : 'pointer',
                color: page === 0 ? 'var(--text-4)' : 'var(--text-2)', fontWeight: 600, fontSize: 12,
              }}
            >← Prev</button>
            <button
              disabled={page + 1 >= totalPages}
              onClick={() => onPageChange(page + 1)}
              style={{
                padding: '6px 14px', borderRadius: 6, border: '1px solid var(--border)',
                background: 'var(--white)', cursor: page + 1 >= totalPages ? 'not-allowed' : 'pointer',
                color: page + 1 >= totalPages ? 'var(--text-4)' : 'var(--text-2)', fontWeight: 600, fontSize: 12,
              }}
            >Next →</button>
          </div>
        </div>
      )}
    </div>
  )
}
