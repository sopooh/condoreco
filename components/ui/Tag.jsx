export default function Tag({ label, tone = 'slate' }) {
  return <span className={`tag ${tone}`}>{label}</span>
}
