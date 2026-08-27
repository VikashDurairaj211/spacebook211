import { Link } from 'react-router-dom'

export default function DashboardCard({ title, value, description, tone = 'default', to = null }) {
  const toneStyles = {
    default: 'border-line bg-white text-ink',
    accent: 'border-ink bg-ink text-paper',
    success: 'border-moss bg-moss/10 text-ink',
    warning: 'border-signal bg-signal/10 text-ink',
  }

  const sharedClasses = `rounded-2xl border px-4 py-2.5 shadow-xs ${toneStyles[tone] || toneStyles.default}`
  
  const content = (
    <>
      <p className="font-mono text-[10px] uppercase tracking-wider opacity-70">{title}</p>
      <p className="mt-0.5 font-display text-xl font-bold">{value ?? 0}</p>
      {description ? <p className="mt-0.5 text-xs opacity-80">{description}</p> : null}
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