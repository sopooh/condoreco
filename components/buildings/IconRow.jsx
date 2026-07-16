import IconBadge from '@/components/ui/IconBadge'

export default function IconRow({ b }) {
  return (
    <div style={{ display: 'flex', gap: 14, justifyContent: 'space-between' }}>
      <IconBadge type="admin" value={b.score_admin} title="Amministratore" />
      <IconBadge type="maintenance" value={b.score_maintenance} title="Manutenzione" />
      <IconBadge type="costs" value={b.score_costs} title="Spese" />
      <IconBadge type="noise" value={b.score_noise} title="Silenziosità" />
      <IconBadge type="safety" value={b.score_safety} title="Sicurezza" />
    </div>
  )
}
