const STYLES = {
  Available: 'plaque plaque-available',
  Confirmed: 'plaque plaque-available',
  Booked: 'plaque plaque-booked',
  Completed: 'plaque plaque-booked',
  Cancelled: 'plaque plaque-booked',
  Pending: 'plaque plaque-pending',
}

export default function StatusTag({ status }) {
  return <span className={STYLES[status] || 'plaque'}>{status}</span>
}
