import { useEffect, useRef, useState } from 'react'

export default function CheckboxDropdown({ options = [], values = {}, onChange = () => {}, disabled = false, placeholder = 'Select' }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    function onDoc(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  function toggle(key) {
    onChange(key, !values[key])
  }

  const selectedCount = options.filter((o) => values[o.key]).length

  return (
    <div className="relative" ref={ref}>
      <button type="button" disabled={disabled} onClick={() => setOpen((s) => !s)} className={`w-full flex items-center justify-between border border-line bg-white px-3 py-2 text-sm text-ink ${disabled ? 'opacity-60' : ''}`}>
        <span className="text-sm text-ink">{selectedCount > 0 ? `${selectedCount} selected` : placeholder}</span>
        <svg className={`h-4 w-4 text-slate transition-transform ${open ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M5 7l5 5 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
      </button>

      {open && (
        <div className="absolute z-20 mt-2 w-full rounded-lg border border-line bg-white shadow-lg">
          <div className="p-3">
            {options.map((opt) => (
              <label key={opt.key} className={`flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-portal-bg ${values[opt.key] ? 'bg-portal-bg' : ''}`}>
                <input type="checkbox" checked={!!values[opt.key]} onChange={() => toggle(opt.key)} className="h-4 w-4 rounded border-slate-300 text-brand-blue" />
                <span className="text-sm text-ink">{opt.label}</span>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
