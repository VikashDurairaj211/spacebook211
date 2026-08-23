import { Link } from 'react-router-dom'

export default function DashboardCard({ title, value, description, tone = 'default', to = null }) {
  const toneStyles = {
    default: 'border-line bg-white text-ink',
    accent: 'border-ink bg-ink text-paper',
    success: 'border-moss bg-moss/10 text-ink',
    warning: 'border-signal bg-signal/10 text-ink',
  }

  const sharedClasses = `rounded-xl border p-4 shadow-sm ${toneStyles[tone] || toneStyles.default}`
  
  const content = (
    <>
      <p className="font-mono text-[11px] uppercase tracking-wider opacity-70">{title}</p>
      <p className="mt-2 font-display text-2xl font-700">{value}</p>
      {description ? <p className="mt-1 text-sm opacity-80">{description}</p> : null}
    </>
  )

  if (to) {
    return (
      <Link to={to} className={`${sharedClasses} block`}>
        {content}
      </Link>
    )
  }

  return <div className={sharedClasses}>{content}</div>
}