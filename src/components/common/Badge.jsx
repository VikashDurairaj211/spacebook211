export default function Badge({ children, tone = 'default' }) {
  const tones = {
    default: 'border-line bg-paper text-ink',
    success: 'border-moss bg-moss/10 text-moss',
    warning: 'border-signal bg-signal/10 text-ink',
    danger: 'border-clay bg-clay/10 text-clay',
  }

  return <span className={`inline-flex items-center border px-2 py-1 text-[11px] uppercase tracking-wider ${tones[tone] || tones.default}`}>{children}</span>
}
