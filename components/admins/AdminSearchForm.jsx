'use client'

import { useState } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'

export default function AdminSearchForm() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [value, setValue] = useState(searchParams.get('q') || '')

  function handleSubmit(e) {
    e.preventDefault()
    const params = new URLSearchParams(searchParams.toString())
    if (value.trim()) params.set('q', value.trim())
    else params.delete('q')
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        display: 'flex', border: '1.5px solid var(--border)', borderRadius: 8,
        overflow: 'hidden', background: 'var(--white)', boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
        maxWidth: 420, flex: 1,
      }}
    >
      <input
        value={value}
        onChange={e => {
          setValue(e.target.value)
          if (!e.target.value) {
            const params = new URLSearchParams(searchParams.toString())
            params.delete('q')
            router.push(`${pathname}?${params.toString()}`)
          }
        }}
        placeholder="Cerca amministratore o studio..."
        style={{ flex: 1, border: 'none', outline: 'none', padding: '11px 14px', fontSize: 14 }}
      />
      <button type="submit" className="btn btn-primary" style={{ borderRadius: 0, padding: '0 20px' }}>
        Cerca
      </button>
    </form>
  )
}
