import ReviewItem from './ReviewItem'

export default function ReviewList({ reviews, photos, onEdit }) {
  if (!reviews.length) {
    return (
      <div className="empty" style={{ padding: '40px 0' }}>
        <div className="empty-title">Ancora nessuna recensione</div>
        <p>Sii il primo a raccontare com'è vivere qui.</p>
      </div>
    )
  }
  return (
    <div>
      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-4)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 14 }}>
        {reviews.length} recensioni
      </div>
      {reviews.map((r) => <ReviewItem key={r.id} review={r} photos={photos} onEdit={onEdit} />)}
    </div>
  )
}
