import { useEffect, useState } from 'react'
import NotificationCard from '../components/cards/NotificationCard'
import { useAuth } from '../context/AuthContext'
import client from '../api/client'

export default function Notifications() {
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const { user } = useAuth()

  const isAdmin =
    user?.role === 'Admin' ||
    user?.role === 'admin' ||
    user?.isAdmin === true

  // =====================================================
  // Fetch Notifications
  // =====================================================

  const fetchNotifications = async () => {
    try {
      setLoading(true)
      setError('')

      const token = localStorage.getItem('spacebook_token')

      if (!token || !user) {
        setNotifications([])
        return
      }

      const endpoint = isAdmin
        ? '/admin/notifications'
        : '/employee/notifications'

      const response = await client.get(endpoint)

      setNotifications(response.data || [])
    } catch (err) {
      console.error(
        'Failed to fetch notifications:',
        err
      )

      setError('Unable to load notifications.')
      setNotifications([])
    } finally {
      setLoading(false)
    }
  }

  // =====================================================
  // Mark All As Read
  // =====================================================

  const markAllAsRead = async () => {
    try {
      const token = localStorage.getItem('spacebook_token')

      if (!token || !user) {
        return
      }

      const endpoint = isAdmin
        ? '/admin/notifications/read-all'
        : '/employee/notifications/read-all'

      await client.patch(endpoint, {})

      setNotifications((previous) =>
        previous.map((notification) => ({
          ...notification,
          isRead: true,
        }))
      )

      window.dispatchEvent(
        new Event('notificationsRead')
      )
    } catch (err) {
      console.error(
        'Failed to mark notifications as read:',
        err
      )
    }
  }

  // =====================================================
  // Load Notifications
  // =====================================================

  useEffect(() => {
    if (!user) {
      setLoading(false)
      return
    }

    fetchNotifications()

    const handleNotificationRefresh = () => {
      fetchNotifications()
    }

    window.addEventListener(
      'notificationsRead',
      handleNotificationRefresh
    )

    return () => {
      window.removeEventListener(
        'notificationsRead',
        handleNotificationRefresh
      )
    }
  }, [user, isAdmin])

  // =====================================================
  // Unread Count
  // =====================================================

  const unreadCount = notifications.filter(
    (notification) => !notification.isRead
  ).length

  // =====================================================
  // Render
  // =====================================================

  return (
    <div className="space-y-5">
      {/* Header */}

      <div>
        <h1 className="font-display text-xl font-bold text-ink">
          Notifications
        </h1>

        <p className="mt-1 text-sm text-slate">
          {isAdmin
            ? 'System and booking request alerts for admin management.'
            : 'System and booking alerts for your account.'}
        </p>
      </div>

      {/* Unread Count */}

      <div className="flex items-center justify-between rounded-2xl border border-line bg-white p-4">
        <div>
          <p className="text-sm font-medium text-ink">
            Notification status
          </p>

          <p className="mt-1 text-xs text-slate">
            {unreadCount} unread notification
            {unreadCount === 1 ? '' : 's'}
          </p>
        </div>

        {unreadCount > 0 && (
          <button
            type="button"
            onClick={markAllAsRead}
            className="rounded-xl bg-[#17324D] px-4 py-2 text-xs font-semibold text-white transition hover:opacity-90"
          >
            Mark all as read
          </button>
        )}
      </div>

      {/* Error */}

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Notification List */}

      {loading ? (
        <div className="rounded-2xl border border-line bg-white p-5 text-sm text-slate">
          Loading notifications...
        </div>
      ) : notifications.length === 0 ? (
        <div className="rounded-2xl border border-line bg-white p-5 text-sm text-slate">
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
              tone={
                item.isRead
                  ? 'normal'
                  : 'urgent'
              }
            />
          ))}
        </div>
      )}
    </div>
  )
}
