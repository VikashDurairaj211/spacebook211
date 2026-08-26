import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  getNotifications,
  markAllNotificationsAsRead,
  clearAllNotifications,
  clearNotification,
} from '../api/notifications'

export default function NotificationDropdown({ onClose }) {
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)

  const navigate = useNavigate()
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
    const val = String(time).trim()
    const timePart = val.includes('T') ? val.split('T')[1] || '' : val
    const parts = timePart.split(':')
    if (parts.length >= 2) {
      const hours = String(parts[0]).padStart(2, '0')
      const minutes = String(parts[1]).padStart(2, '0')
      return `${hours}:${minutes}`
    }
    return timePart.substring(0, 5)
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

  // Helper to get locally cleared/dismissed notification IDs
  const getClearedNotificationIds = () => {
    try {
      const raw = localStorage.getItem('spacebook_cleared_notifications')
      return raw ? JSON.parse(raw) : []
    } catch (e) {
      return []
    }
  }

  const saveClearedNotificationIds = (ids) => {
    try {
      const existing = getClearedNotificationIds()
      const merged = Array.from(new Set([...existing, ...ids]))
      localStorage.setItem('spacebook_cleared_notifications', JSON.stringify(merged))
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

      const responseData = await getNotifications()
      const rawList = Array.isArray(responseData)
        ? responseData
        : responseData?.notifications || []

      const readIds = new Set(getReadNotificationIds().map(String))
      const clearedIds = new Set(getClearedNotificationIds().map(String))

      const mapped = rawList
        .map((n, idx) => {
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
        .filter((n) => !clearedIds.has(String(n.notificationId)))

      setNotifications(mapped)
    } catch (error) {
      console.error('Failed to load notifications:', error)
      setNotifications([])
    } finally {
      setLoading(false)
    }
  }

  // =====================================================
  // Mark All Notifications As Read
  // =====================================================

  const handleMarkAllAsRead = async () => {
    try {
      try {
        await markAllNotificationsAsRead()
      } catch (err) {
        // ignore
      }

      const currentIds = notifications.map((n, idx) =>
        String(n.notificationId ?? n.id ?? n._id ?? idx)
      )
      saveReadNotificationIds(currentIds)

      setNotifications((prev) =>
        prev.map((item) => ({
          ...item,
          isRead: true,
        }))
      )

      window.dispatchEvent(new Event('notificationsRead'))
    } catch (error) {
      console.error(
        'Failed to mark notifications as read:',
        error
      )
    }
  }

  // =====================================================
  // Clear All Notifications
  // =====================================================

  const handleClearAll = async () => {
    try {
      const currentIds = notifications.map((n, idx) =>
        String(n.notificationId ?? n.id ?? n._id ?? idx)
      )
      saveClearedNotificationIds(currentIds)
      saveReadNotificationIds(currentIds)
      setNotifications([])

      try {
        await clearAllNotifications()
      } catch (e) {
        // ignore
      }

      window.dispatchEvent(new Event('notificationsRead'))
    } catch (error) {
      console.error('Failed to clear notifications:', error)
    }
  }

  const handleClearSingle = async (e, notificationId) => {
    e.stopPropagation()
    const idStr = String(notificationId)
    saveClearedNotificationIds([idStr])
    setNotifications((prev) =>
      prev.filter((n) => String(n.notificationId ?? n.id) !== idStr)
    )

    try {
      await clearNotification(notificationId)
    } catch (e) {
      // ignore
    }

    window.dispatchEvent(new Event('notificationsRead'))
  }

  // =====================================================
  // Load Notifications
  // =====================================================

  useEffect(() => {
    if (!user) {
      setNotifications([])
      setLoading(false)
      return
    }

    fetchNotifications()

    const handleNotificationsRead = () => {
      fetchNotifications()
    }

    window.addEventListener(
      'notificationsRead',
      handleNotificationsRead
    )

    return () => {
      window.removeEventListener(
        'notificationsRead',
        handleNotificationsRead
      )
    }
  }, [user, isAdmin])

  // =====================================================
  // Render
  // =====================================================

  const hasUnread = notifications.some((item) => !item.isRead)

  return (
    <div className="absolute right-0 top-full z-50 mt-2 w-[420px] max-w-[calc(100vw-2rem)] rounded-2xl border border-slate-200 bg-white p-4 shadow-xl">

      {/* Header */}

      <div className="mb-3 flex items-center justify-between">
        <div>
          <h3 className="font-display text-sm font-bold text-slate-900">
            Notifications
          </h3>

          <p className="mt-1 text-xs text-slate-500">
            {isAdmin
              ? 'System and booking alerts for admin.'
              : 'Recent alerts for your account.'}
          </p>
        </div>

        <div>
          {notifications.length > 0 && (
            <button
              type="button"
              onClick={handleClearAll}
              className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
            >
              Clear all
            </button>
          )}
        </div>
      </div>

      {/* Notifications List */}

      <div className="max-h-[380px] space-y-3 overflow-y-auto pr-1">

        {loading ? (
          <p className="py-6 text-center text-sm text-slate-400">
            Loading alerts...
          </p>
        ) : notifications.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-400">
            No recent notifications
          </p>
        ) : (
          notifications.map((item) => (
            <div
              key={item.notificationId}
              className={`rounded-xl border p-3.5 transition ${
                !item.isRead
                  ? 'border-slate-200 bg-slate-50/70'
                  : 'border-slate-100 bg-white'
              }`}
            >

              {/* Header */}

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-slate-900">
                    {item.title}
                  </span>

                  {!item.isRead && (
                    <span className="rounded bg-amber-400 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                      NEW
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <span className="whitespace-nowrap font-mono text-[10px] uppercase text-slate-400">
                    {item.timeAgo}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => handleClearSingle(e, item.notificationId)}
                    className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
                    title="Dismiss notification"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Employee */}

              {item.employeeName && (
                <p className="mt-2 text-sm font-semibold text-slate-900">
                  {item.employeeName}
                </p>
              )}

              {/* Message */}

              <p className="mt-1 text-xs leading-relaxed text-slate-600">
                {item.message}
              </p>

              {/* Booking Details */}

              {(item.roomName ||
                item.bookingDate ||
                item.startTime ||
                item.endTime) && (
                <div className="mt-3 rounded-lg bg-white p-2.5">

                  {item.roomName && (
                    <p className="text-xs text-slate-700">
                      <span className="font-semibold">
                        Room:
                      </span>{' '}
                      {item.roomName}
                    </p>
                  )}

                  {item.bookingDate && (
                    <p className="mt-1 text-xs text-slate-600">
                      <span className="font-semibold">
                        📅
                      </span>{' '}
                      {formatBookingDate(item.bookingDate)}
                      {item.startTime && item.endTime && (
                        <>
                          {' · '}
                          {formatTime(item.startTime)}
                          {'–'}
                          {formatTime(item.endTime)}
                        </>
                      )}
                    </p>
                  )}

                </div>
              )}

            </div>
          ))
        )}

      </div>

      {/* Footer */}

      <div className="mt-3 border-t border-slate-100 pt-3 text-center">
        <button
          type="button"
          onClick={() => {
            if (onClose) {
              onClose()
            }

            navigate('/notifications')
          }}
          className="block w-full rounded-full border border-slate-200 py-2.5 font-serif text-sm font-semibold text-slate-900 transition hover:bg-slate-50"
        >
          View all notifications
        </button>
      </div>

    </div>
  )
}