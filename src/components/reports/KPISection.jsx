export default function KPISection({ metrics }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {metrics.map((metric) => (
        <div key={metric.label} className="rounded-[24px] border border-line bg-white p-6 shadow-sm">
          <p className="text-xs uppercase tracking-[0.25em] text-slate">{metric.label}</p>
          <p className="mt-4 text-3xl font-700 text-ink">{metric.value}</p>
          {metric.description ? <p className="mt-2 text-sm text-slate">{metric.description}</p> : null}
        </div>
      ))}
    </div>
  )
}
