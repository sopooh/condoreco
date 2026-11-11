'use client'

import { useParamNav } from './useParamNav'

// Scorciatoie in cima alla lista (parametro "tab").
export default function QuickTabs({ tabs }) {
  const { searchParams, setParams } = useParamNav()
  const tab = searchParams.get('tab') || ''
  return (
    <div className="dir-tabs" role="tablist">
      <div className="dir-tabs-inner">
        {tabs.map((t) => (
          <button key={t.id} type="button" role="tab" aria-selected={tab === t.id}
            className={tab === t.id ? 'is-on' : ''}
            onClick={() => setParams({ tab: t.id || null, sort: null })}>
            {t.label}
          </button>
        ))}
      </div>
    </div>
  )
}
