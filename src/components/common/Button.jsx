export default function Button({ children, variant = 'primary', size = 'md', className = '', ...props }) {
  const base = 'inline-flex items-center justify-center rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
  const sizes = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-5 py-3 text-sm',
  }
  const variants = {
    primary: 'bg-ink text-paper hover:bg-ink/90',
    secondary: 'border border-ink text-ink hover:bg-ink hover:text-paper',
    ghost: 'text-slate hover:text-ink underline underline-offset-2',
    danger: 'border border-clay text-clay hover:bg-clay hover:text-paper',
  }
  return (
    <button className={`${base} ${sizes[size] || sizes.md} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  )
}
