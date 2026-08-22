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
  // Format Booking Date
  // =====================================================

  const formatBookingDate = (date) => {
    if (!date) return ''

    const parsedDate = new Date(date)

    if (Number.isNaN(parsedDate.getTime())) {
      return date
    }

    return parsedDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  // =====================================================
  // Format Time
  // =====================================================

  const formatTime = (time) => {
    if (!time) return ''

    const parts = time.split(':')

    if (parts.length < 2) {
      return time
    }

    const hours = Number(parts[0])
    const minutes = Number(parts[1])

    if (Number.isNaN(hours) || Number.isNaN(minutes)) {
      return time
    }

    const date = new Date()

    date.setHours(hours)
    date.setMinutes(minutes)
    date.setSeconds(0)

    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  // Helper to get locally marked read notification IDs
  const getReadNotificationIds = () => {
    try {
      const raw = localStorage.getItem('spacebook_read_notifications')
      return raw ? JSON.parse(raw) : []
    } catch (e) {
      return []
    }
  }

  const saveReadNotificationIds = (ids) => {
    try {
      const existing = getReadNotificationIds()
      const merged = Array.from(new Set([...existing, ...ids]))
      localStorage.setItem('spacebook_read_notifications', JSON.stringify(merged))
    } catch (e) {
      // ignore
    }
  }

  // =====================================================
  // Fetch Notifications
  // =====================================================

  const fetchNotifications = async () => {
    try {
      setLoading(true)
      setError('')

      const token =
        localStorage.getItem('spacebook_token')

      if (!token || !user) {
        setNotifications([])
        return
      }

      const endpoint = isAdmin
        ? '/admin/notifications'
        : '/employee/notifications'

      const response = await client.get(endpoint)
      const rawList = Array.isArray(response.data)
        ? response.data
        : response.data?.notifications || []

      const readIds = new Set(getReadNotificationIds().map(String))

      const mapped = rawList.map((n, idx) => {
        const id = String(n.notificationId ?? n.id ?? n._id ?? idx)
        const isRead =
          n.isRead === true ||
          n.is_read === true ||
          n.read === true ||
          readIds.has(id)

        return {
          ...n,
          notificationId: id,
          isRead,
        }
      })

      setNotifications(mapped)
    } catch (err) {
      console.error(
        'Failed to fetch notifications:',
        err
      )

      setError(
        'Unable to load notifications.'
      )

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
      const token =
        localStorage.getItem('spacebook_token')

      if (!token || !user) {
        return
      }

      const endpoint = isAdmin
        ? '/admin/notifications/read-all'
        : '/employee/notifications/read-all'

      // Call backend
      try {
        await client.patch(endpoint, {})
      } catch (err) {
        try {
          await client.put(endpoint, {})
        } catch (e) {
          // ignore
        }
      }

      // Persist read IDs locally
      const currentIds = notifications.map((n, idx) =>
        String(n.notificationId ?? n.id ?? n._id ?? idx)
      )
      saveReadNotificationIds(currentIds)

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

            <div
              key={item.notificationId}
              className={`rounded-2xl border p-4 transition ${
                item.isRead
                  ? 'border-line bg-white'
                  : 'border-slate-200 bg-slate-50/70'
              }`}
            >

              {/* Top Row */}

              <div className="flex items-start justify-between gap-4">

                <div className="flex items-center gap-2">

                  <span className="text-sm font-bold text-ink">
                    {item.title}
                  </span>

                  {!item.isRead && (
                    <span className="rounded bg-amber-400 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                      NEW
                    </span>
                  )}

                </div>

                <span className="whitespace-nowrap font-mono text-[10px] uppercase text-slate">
                  {item.timeAgo}
                </span>

              </div>


              {/* Employee */}

              {item.employeeName && (
                <p className="mt-3 text-sm font-semibold text-ink">
                  {item.employeeName}
                </p>
              )}


              {/* Main Message */}

              <p className="mt-1 text-sm leading-relaxed text-slate">
                {item.message}
              </p>


              {/* Booking Information */}

              {(item.roomName ||
                item.bookingDate ||
                item.startTime ||
                item.endTime) && (

                <div className="mt-3 rounded-xl border border-line bg-white p-3">

                  {/* Room */}

                  {item.roomName && (
                    <div className="flex items-center gap-2 text-sm text-ink">

                      <span>
                        🏢
                      </span>

                      <span>
                        <span className="font-semibold">
                          Room:
                        </span>{' '}
                        {item.roomName}
                      </span>

                    </div>
                  )}


                  {/* Date and Time */}

                  {item.bookingDate && (
                    <div className="mt-2 flex items-center gap-2 text-sm text-slate">

                      <span>
                        📅
                      </span>

                      <span>
                        {formatBookingDate(
                          item.bookingDate
                        )}

                        {item.startTime &&
                          item.endTime && (
                            <>
                              {' · '}
                              {formatTime(
                                item.startTime
                              )}
                              {'–'}
                              {formatTime(
                                item.endTime
                              )}
                            </>
                          )}
                      </span>

                    </div>
                  )}

                </div>
              )}

            </div>

          ))}

        </div>
      )}

    </div>
  )
}