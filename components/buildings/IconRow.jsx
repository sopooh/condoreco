import IconBadge from '@/components/ui/IconBadge'

export default function IconRow({ b, showLabels = false }) {
  return (
    <div className="icon-row" style={{ display: 'flex', gap: 14, justifyContent: 'space-between', flexWrap: 'wrap', minWidth: 0, maxWidth: '100%' }}>
      <IconBadge type="admin" value={b.score_admin} title="Amministratore" showLabel={showLabels} />
      <IconBadge type="maintenance" value={b.score_maintenance} title="Manutenzione" showLabel={showLabels} />
      <IconBadge type="costs" value={b.score_costs} title="Spese" showLabel={showLabels} />
      <IconBadge type="noise" value={b.score_noise} title="Silenziosità" showLabel={showLabels} />
      <IconBadge type="safety" value={b.score_safety} title="Sicurezza" showLabel={showLabels} />
    </div>
  )
}
