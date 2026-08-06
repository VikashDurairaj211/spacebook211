export default function Card({ children, className = '', ...props }) {
  return (
    <div className={`rounded-2xl border border-line bg-white p-4 transition-all duration-200 hover:-translate-y-1 hover:shadow-md ${className}`} {...props}>
      {children}
    </div>
  )
}