export default function DashboardCard({ title, value, description, tone = 'default' }) {
  const toneStyles = {
    default: 'border-line bg-white text-ink',
    accent: 'border-ink bg-ink text-paper',
    success: 'border-moss bg-moss/10 text-ink',
    warning: 'border-signal bg-signal/10 text-ink',
  }

  return (
    <div className={`rounded-sm border p-4 ${toneStyles[tone] || toneStyles.default}`}>
      <p className="font-mono text-[11px] uppercase tracking-wider opacity-70">{title}</p>
      <p className="mt-2 font-display text-2xl font-700">{value}</p>
      {description ? <p className="mt-1 text-sm opacity-80">{description}</p> : null}
    </div>
  )
}
