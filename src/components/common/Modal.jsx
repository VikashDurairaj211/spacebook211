export default function Modal({ open, title, children, footer }) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 px-4">
      <div className="w-full max-w-lg border border-line bg-white p-5 shadow-lg">
        {title ? <h3 className="font-display text-lg font-700 text-ink">{title}</h3> : null}
        <div className="mt-4 text-sm text-slate">{children}</div>
        {footer ? <div className="mt-5 flex justify-end gap-2">{footer}</div> : null}
      </div>
    </div>
  )
}
