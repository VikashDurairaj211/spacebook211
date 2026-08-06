export default function Card({ children, className = '', ...props }) {
  return (
    <div className={`rounded-[24px] border border-line bg-white p-4 ${className}`} {...props}>
      {children}
    </div>
  )
}
