export default function NotificationCard({ title, message, time, tone = 'default' }) {
  const tones = {
    default: 'border-line',
    success: 'border-moss',
    warning: 'border-signal',
    danger: 'border-clay',
  }

  return (
    <div className={`border bg-white p-4 ${tones[tone] || tones.default}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-display text-sm font-700 text-ink">{title}</p>
          <p className="mt-1 text-sm text-slate">{message}</p>
        </div>
        <span className="font-mono text-[11px] uppercase tracking-wider text-slate">{time}</span>
      </div>
    </div>
  )
}
