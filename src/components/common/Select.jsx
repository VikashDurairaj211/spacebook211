export default function Select({ className = '', children, ...props }) {
  return (
    <select
      className={`w-full border border-line bg-white px-3 py-2 text-sm text-ink focus:border-ink focus:outline-none ${className}`}
      {...props}
    >
      {children}
    </select>
  )
}
