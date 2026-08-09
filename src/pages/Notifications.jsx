import { useEffect, useState } from 'react'
import axios from 'axios'
import NotificationCard from '../components/cards/NotificationCard'
import { useAuth } from '../context/AuthContext' // Changed from '../../' to '../'

export default function Notifications() {
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)

  const { user } = useAuth()
  const isAdmin = user?.role === 'Admin' || user?.isAdmin === true

  const fetchNotifications = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('spacebook_token')
      if (!token) return

      const endpoint = isAdmin
        ? 'http://localhost:5263/api/admin/notifications'
        : 'http://localhost:5263/api/employee/notifications'

      const res = await axios.get(endpoint, {
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

  const markAllAsRead = async () => {
    try {
      const token = localStorage.getItem('spacebook_token')
      if (!token) return

      const endpoint = isAdmin
        ? 'http://localhost:5263/api/admin/notifications/read-all'
        : 'http://localhost:5263/api/employee/notifications/read-all'

      await axios.patch(endpoint, {}, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })
      window.dispatchEvent(new Event('notificationsRead'))
    } catch (err) {
      console.error('Failed to mark notifications as read:', err)
    }
  }

  useEffect(() => {
    if (user) {
      fetchNotifications()
      markAllAsRead()
    }

    window.addEventListener('notificationsRead', fetchNotifications)
    return () => window.removeEventListener('notificationsRead', fetchNotifications)
  }, [user, isAdmin])

  const unreadCount = notifications.filter((item) => !item.isRead).length

  return (
    <div className="space-y-6 p-6">
      <div className="border border-line bg-white p-5 rounded-2xl shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-display text-xl font-bold text-ink">Notifications</h1>
            <p className="mt-1 text-sm text-slate-500">
              {isAdmin ? 'System and booking request alerts for admin management.' : 'System and booking alerts for your account.'}
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