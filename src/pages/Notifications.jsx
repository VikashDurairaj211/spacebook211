import { useEffect, useState } from 'react'
import axios from 'axios'
import NotificationCard from '../components/cards/NotificationCard'

export default function Notifications() {
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchNotifications = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('spacebook_token')
      const res = await axios.get('http://localhost:5263/api/employee/notifications', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })
      setNotifications(res.data || [])
    } catch (err) {
      console.error('Failed to fetch notifications:', err)
    } finally {
      setLoading(false)
    }
  }

  // 1. Automatically mark all as read when the page loads
  const markAllAsRead = async () => {
    try {
      const token = localStorage.getItem('spacebook_token')
      await axios.put('http://localhost:5263/api/employee/notifications/read-all', {}, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })
      // Dispatch custom event to notify other UI components (like badges/navbars)
      window.dispatchEvent(new Event('notificationsRead'))
    } catch (err) {
      console.error('Failed to mark notifications as read:', err)
    }
  }

  useEffect(() => {
    fetchNotifications()
    markAllAsRead() // <--- Triggers read update on mount

    window.addEventListener('notificationsRead', fetchNotifications)
    return () => window.removeEventListener('notificationsRead', fetchNotifications)
  }, [])

  const unreadCount = notifications.filter((item) => !item.isRead).length

  return (
    <div className="space-y-6 p-6">
      <div className="border border-line bg-white p-5 rounded-2xl">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-display text-xl font-bold text-ink">Notifications</h1>
            <p className="mt-1 text-sm text-slate-500">
              System and booking alerts for your account.
            </p>
          </div>
          <div className="rounded-full bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-700">
            {unreadCount} unread notification{unreadCount === 1 ? '' : 's'}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-line bg-white p-5 text-sm text-slate-500">
          Loading notifications...
        </div>
      ) : notifications.length === 0 ? (
        <div className="rounded-2xl border border-line bg-white p-5 text-sm text-slate-500">
          No notifications available.
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((item) => (
            <NotificationCard
              key={item.notificationId}
              title={item.title}
              message={item.message}
              time={item.timeAgo}
              tone={item.isRead ? 'normal' : 'urgent'}
            />
          ))}
        </div>
      )}
    </div>
  )
}