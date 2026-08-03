export function Field({ label, children, hint }) {
  return (
    <label className="block">
      <span className="mb-1 block font-mono text-[11px] uppercase tracking-wider text-slate">
        {label}
      </span>
      {children}
      {hint && <span className="mt-1 block text-xs text-slate">{hint}</span>}
    </label>
  )
}

export function Input({ className = '', ...props }) {
  return (
    <input
      className={`w-full border border-line bg-white px-3 py-2 text-sm text-ink placeholder:text-slate/60 focus:border-ink focus:outline-none ${className}`}
      {...props}
    />
  )
}

export function Textarea({ className = '', ...props }) {
  return (
    <textarea
      className={`w-full border border-line bg-white px-3 py-2 text-sm text-ink placeholder:text-slate/60 focus:border-ink focus:outline-none ${className}`}
      {...props}
    />
  )
}

export function Select({ className = '', children, ...props }) {
  return (
    <select
      className={`w-full border border-line bg-white px-3 py-2 text-sm text-ink focus:border-ink focus:outline-none ${className}`}
      {...props}
    >
      {children}
    </select>
  )
}
