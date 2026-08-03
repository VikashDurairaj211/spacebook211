export default function SearchBar({ value, onChange, placeholder = 'Search...', className = '' }) {
  return (
    <div className={`flex items-center gap-2 border border-line bg-white px-3 py-2 ${className}`}>
      <svg viewBox="0 0 24 24" className="h-4 w-4 text-slate" fill="none" stroke="currentColor" strokeWidth="1.8">
        <circle cx="11" cy="11" r="6" />
        <path d="m20 20-4.2-4.2" />
      </svg>
      <input
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full bg-transparent text-sm outline-none placeholder:text-slate/70"
      />
    </div>
  )
}
