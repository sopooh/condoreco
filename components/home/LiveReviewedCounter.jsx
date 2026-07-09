'use client'

import { useEffect, useState } from 'react'

export default function LiveReviewedCounter({ value }) {
  const [displayValue, setDisplayValue] = useState(0)

  useEffect(() => {
    const startValue = displayValue
    const nextValue = value
    const startedAt = performance.now()
    const duration = 500
    let frameId = 0

    function tick(now) {
      const progress = Math.min((now - startedAt) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      const current = Math.round(startValue + (nextValue - startValue) * eased)
      setDisplayValue(current)
      if (progress < 1) frameId = requestAnimationFrame(tick)
    }

    frameId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frameId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  return (
    <div style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 10,
      color: 'rgba(255,255,255,0.82)',
      fontSize: 13,
      fontWeight: 500,
      lineHeight: 1.3,
    }}>
      <span style={{
        width: 10,
        height: 10,
        borderRadius: '50%',
        background: '#34D399',
        boxShadow: '0 0 0 4px rgba(52, 211, 153, 0.12)',
        flexShrink: 0,
      }} />
      <span>
        <span style={{ color: '#FFFFFF', fontWeight: 700 }}>
          {new Intl.NumberFormat('it-IT').format(displayValue)}
        </span>{' '}
        condomini gia recensiti
      </span>
    </div>
  )
}
