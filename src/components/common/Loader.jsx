export default function Loader({ label = 'Loading...' }) {
  return (
    <div className="flex items-center gap-2 border border-line bg-white px-4 py-3 text-sm text-slate">
      <span className="h-3 w-3 animate-pulse rounded-full bg-ink" />
      {label}
    </div>
  )
}
