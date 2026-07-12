import ReviewCard from './ReviewCard'

export default function ReviewList({ reviews, categories, table, photos = [], onEdit, emptyTitle, emptyText }) {
  if (!reviews.length) {
    return (
      <div className="empty" style={{ padding: '40px 0' }}>
        <div className="empty-title">{emptyTitle}</div>
        <p>{emptyText}</p>
      </div>
    )
  }
  return (
    <div>
      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-4)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 14 }}>
        {reviews.length} recensioni
      </div>
      {reviews.map((r) => (
        <ReviewCard key={r.id} review={r} categories={categories} table={table} photos={photos} onEdit={onEdit} />
      ))}
    </div>
  )
}
