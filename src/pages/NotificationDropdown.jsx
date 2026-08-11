import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import client from '../../api/client'
import { useAuth } from '../../context/AuthContext'

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

    // Handles "08:00:00"
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

  // =====================================================
  // Fetch Notifications
  // =====================================================

  const fetchNotifications = async () => {
    try {
      setLoading(true)

      const endpoint = isAdmin
        ? '/admin/notifications'
        : '/employee/notifications'

      const response = await client.get(endpoint)

      setNotifications(response.data || [])
    } catch (error) {
      console.error('Failed to load notifications:', error)

      if (error.response) {
        console.error('Status:', error.response.status)
        console.error('Response:', error.response.data)
      }
    } finally {
      setLoading(false)
    }
  }

  // =====================================================
  // Mark All Notifications As Read
  // =====================================================

  const handleMarkAllAsRead = async () => {
    try {
      const endpoint = isAdmin
        ? '/admin/notifications/read-all'
        : '/employee/notifications/read-all'

      await client.patch(endpoint, {})

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

        {notifications.some((item) => !item.isRead) && (
          <button
            type="button"
            onClick={handleMarkAllAsRead}
            className="text-xs font-semibold text-slate-700 underline hover:text-slate-900"
          >
            Mark all as read
          </button>
        )}
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

                <span className="whitespace-nowrap font-mono text-[10px] uppercase text-slate-400">
                  {item.timeAgo}
                </span>
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