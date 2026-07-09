'use client'

export default function Card({ children, onClick, hover = true, style }) {
  return (
    <div
      onClick={onClick}
      style={{
        background: 'var(--white)', border: '1px solid var(--border)',
        borderRadius: 10, overflow: 'hidden',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'box-shadow 0.15s, border-color 0.15s',
        ...style,
      }}
      onMouseEnter={hover ? (e) => {
        e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.09)'
        e.currentTarget.style.borderColor = 'var(--teal-mid)'
      } : undefined}
      onMouseLeave={hover ? (e) => {
        e.currentTarget.style.boxShadow = 'none'
        e.currentTarget.style.borderColor = 'var(--border)'
      } : undefined}
    >
      {children}
    </div>
  )
}
