import AdminReviewItem from './AdminReviewItem'

export default function AdminReviewList({ reviews }) {
  if (!reviews.length) {
    return (
      <div className="empty" style={{ padding: '40px 0' }}>
        <div className="empty-title">Ancora nessuna recensione</div>
        <p>Sii il primo a raccontare la tua esperienza con questo amministratore.</p>
      </div>
    )
  }
  return (
    <div>
      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-4)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 14 }}>
        {reviews.length} recensioni
      </div>
      {reviews.map((r) => <AdminReviewItem key={r.id} review={r} />)}
    </div>
  )
}
