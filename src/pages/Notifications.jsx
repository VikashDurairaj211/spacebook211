import Card from '../components/common/Card'
import NotificationCard from '../components/cards/NotificationCard'
import { notifications } from '../services/mockData'

export default function Notifications() {
  return (
    <div className="space-y-6">
      <div className="border border-line bg-white p-5">
        <h1 className="font-display text-xl font-700 text-ink">Notifications</h1>
        <p className="mt-2 text-sm text-slate">Placeholder view for system and booking alerts.</p>
      </div>

      <div className="space-y-3">
        {notifications.map((item) => (
          <NotificationCard key={item.id} title={item.title} message={item.message} time={item.time} tone={item.tone} />
        ))}
      </div>
    </div>
  )
}
