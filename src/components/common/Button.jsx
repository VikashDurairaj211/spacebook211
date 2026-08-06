export default function Button({ children, variant = 'primary', className = '', ...props }) {
  const base = 'rounded-2xl px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
  const variants = {
    primary: 'bg-ink text-paper hover:bg-ink/90',
    secondary: 'border border-ink text-ink hover:bg-ink hover:text-paper',
    ghost: 'text-slate hover:text-ink underline underline-offset-2',
    danger: 'border border-clay text-clay hover:bg-clay hover:text-paper',
  }
  return (
    <button className={`${base} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  )
}
