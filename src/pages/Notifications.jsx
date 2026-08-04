import Card from '../components/common/Card'
import NotificationCard from '../components/cards/NotificationCard'
import { notifications } from '../services/mockData'

export default function Notifications() {
  const unreadCount = notifications.filter((item) => item.unread).length

  return (
    <div className="space-y-6">
      <div className="border border-line bg-white p-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-display text-xl font-700 text-ink">Notifications</h1>
            <p className="mt-2 text-sm text-slate">System and booking alerts for your account.</p>
          </div>
          <div className="rounded-full bg-portal-bg px-3 py-2 text-sm font-medium text-ink">
            {unreadCount} unread notification{unreadCount === 1 ? '' : 's'}
          </div>
        </div>
      </div>

      {notifications.length === 0 ? (
        <div className="rounded-2xl border border-line bg-white p-5 text-sm text-slate">
          No notifications available.
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((item) => (
            <NotificationCard key={item.id} title={item.title} message={item.message} time={item.time} tone={item.tone} />
          ))}
        </div>
      )}
    </div>
  )
}
