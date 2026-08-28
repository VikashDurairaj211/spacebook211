import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import NotificationCard from '../components/cards/NotificationCard'
import { useAuth } from '../context/AuthContext'
import {
  getNotifications,
  markAllNotificationsAsRead,
  clearAllNotifications as clearAllNotificationsApi,
  clearNotification as clearNotificationApi,
} from '../api/notifications'

export default function Notifications() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const highlightParam = searchParams.get('highlight') || searchParams.get('id') || ''

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

  const fetchNotifications = async (isSilent = false) => {
    try {
      if (!isSilent) {
        setLoading(true)
        setError('')
      }

      const token =
        localStorage.getItem('spacebook_token')

      if (!token || !user) {
        setNotifications((prev) => (prev.length === 0 ? prev : []))
        return
      }

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

      // Zero-flicker: Only update state if data actually changed
      setNotifications((prev) => {
        if (prev.length === mapped.length) {
          const isIdentical = prev.every((item, idx) => {
            const m = mapped[idx]
            return (
              item.notificationId === m.notificationId &&
              item.isRead === m.isRead &&
              item.title === m.title &&
              item.message === m.message
            )
          })
          if (isIdentical) return prev
        }
        return mapped
      })
    } catch (err) {
      console.error(
        'Failed to fetch notifications:',
        err
      )

      if (!isSilent) {
        setError(
          'Unable to load notifications.'
        )
        setNotifications([])
      }
    } finally {
      if (!isSilent) {
        setLoading(false)
      }
    }
  }

  // =====================================================
  // Mark All As Read
  // =====================================================

  const markAllAsRead = async () => {
    try {
      const currentIds = notifications.map((n, idx) =>
        String(n.notificationId ?? n.id ?? n._id ?? idx)
      )
      saveReadNotificationIds(currentIds)

      setNotifications((prev) =>
        prev.map((n) => ({ ...n, isRead: true }))
      )

      try {
        await markAllNotificationsAsRead()
      } catch (err) {
        // ignore
      }

      window.dispatchEvent(new Event('notificationsRead'))
    } catch (err) {
      console.error('Failed to mark all as read:', err)
    }
  }

  // =====================================================
  // Load Notifications (With Auto-Polling & Live Refresh)
  // =====================================================

  useEffect(() => {
    if (!user) {
      setLoading(false)
      return
    }

    fetchNotifications(false)

    // 1. Silent auto-polling every 5 seconds without layout shifts
    const pollInterval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchNotifications(true)
      }
    }, 5000)

    // 2. Fetch on tab focus / visibility change
    const handleFocus = () => {
      if (document.visibilityState === 'visible') {
        fetchNotifications(true)
      }
    }

    const handleNotificationRefresh = () => {
      fetchNotifications(true)
    }

    window.addEventListener('notificationsRead', handleNotificationRefresh)
    window.addEventListener('notificationRefresh', handleNotificationRefresh)
    window.addEventListener('bookingCreated', handleNotificationRefresh)
    window.addEventListener('bookingCancelled', handleNotificationRefresh)
    window.addEventListener('focus', handleFocus)
    document.addEventListener('visibilitychange', handleFocus)

    return () => {
      clearInterval(pollInterval)
      window.removeEventListener('notificationsRead', handleNotificationRefresh)
      window.removeEventListener('notificationRefresh', handleNotificationRefresh)
      window.removeEventListener('bookingCreated', handleNotificationRefresh)
      window.removeEventListener('bookingCancelled', handleNotificationRefresh)
      window.removeEventListener('focus', handleFocus)
      document.removeEventListener('visibilitychange', handleFocus)
    }
  }, [user, isAdmin])

  const clearAllNotifications = async () => {
    const currentIds = notifications.map((n, idx) =>
      String(n.notificationId ?? n.id ?? n._id ?? idx)
    )
    saveClearedNotificationIds(currentIds)
    saveReadNotificationIds(currentIds)
    setNotifications([])

    try {
      await clearAllNotificationsApi()
    } catch (e) {
      // ignore
    }

    window.dispatchEvent(new Event('notificationsRead'))
  }

  const clearNotification = async (notificationId) => {
    const idStr = String(notificationId)
    saveClearedNotificationIds([idStr])
    setNotifications((prev) => prev.filter((item) => String(item.notificationId) !== idStr))

    try {
      await clearNotificationApi(notificationId)
    } catch (e) {
      // ignore
    }

    window.dispatchEvent(new Event('notificationsRead'))
  }

  // =====================================================
  // Unread Count
  // =====================================================

  const unreadCount = notifications.filter(
    (notification) => !notification.isRead
  ).length

  // Auto-scroll to highlighted notification
  useEffect(() => {
    if (highlightParam && !loading && notifications.length > 0) {
      const timer = setTimeout(() => {
        const el = document.getElementById(`notification-card-${highlightParam}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 250);
      return () => clearTimeout(timer);
    }
  }, [highlightParam, loading, notifications]);

  const handleSelectNotification = (n) => {
    const id = String(n.notificationId ?? n.id ?? '')
    if (id) {
      saveReadNotificationIds([id])
      setNotifications((prev) =>
        prev.map((item) =>
          String(item.notificationId ?? item.id) === id
            ? { ...item, isRead: true }
            : item
        )
      )
      window.dispatchEvent(new Event('notificationsRead'))
    }

    if (isAdmin) {
      navigate(`/admin/notifications?highlight=${encodeURIComponent(id)}`)
      return
    }

    const bookingId =
      n.bookingId ??
      n.booking_id ??
      n.BookingId ??
      n.hotseatBookingId ??
      n.hotseat_booking_id ??
      n.seatBookingId ??
      n.seat_booking_id ??
      n.booking?.id ??
      n.booking?.bookingId ??
      String(n.message || '').match(/#(\d+)/)?.[1] ??
      ''

    // Extract clean room name from object or message
    const rawMsg = String(n.message || '')
    const rawTitle = String(n.title || '')
    const combined = `${rawTitle} ${rawMsg}`

    const extractedRoom =
      n.roomName ??
      n.room_name ??
      n.RoomName ??
      n.booking?.roomName ??
      n.booking?.room_name ??
      combined.match(/(Conference Room \d+|Meeting Room \d+|Discussion Room \d+|Board Room \d+|Training Room \d+|Room \d+)/i)?.[0] ??
      ''

    const extractedSeat =
      n.seatNumber ??
      n.seat_number ??
      n.SeatNumber ??
      n.seat ??
      n.booking?.seatNumber ??
      n.booking?.seat ??
      combined.match(/(WS-[\w-]+|Hot\s*Seat\s*[\w-]+|Seat\s*[\w-]+)/i)?.[0] ??
      ''

    let bookingDate =
      n.bookingDate ??
      n.booking_date ??
      n.BookingDate ??
      n.date ??
      n.booking?.bookingDate ??
      n.booking?.date ??
      ''

    if (!bookingDate) {
      const isoDateMatch = combined.match(/\b(\d{4}-\d{2}-\d{2})\b/)
      if (isoDateMatch) {
        bookingDate = isoDateMatch[1]
      }
    }

    const quoteMatch = combined.match(/'([^']+)'|"([^"]+)"/)
    const extractedTitle = quoteMatch ? (quoteMatch[1] || quoteMatch[2]) : ''

    const params = new URLSearchParams()
    if (bookingId) params.set('highlight', String(bookingId).replace(/^#/, ''))
    if (extractedRoom) params.set('room', extractedRoom)
    if (extractedSeat) params.set('seat', extractedSeat)
    if (bookingDate) params.set('date', bookingDate)
    if (extractedTitle) params.set('title', extractedTitle)

    navigate(`/my-bookings?${params.toString()}`)
  }

  // =====================================================
  // Render
  // =====================================================

  return (
    <div className="space-y-5">

      {/* Header */}

      <div>
        <h1 className="font-display text-3xl font-bold">
          Notifications
        </h1>

        <p className="mt-1 text-sm text-slate">
          {isAdmin
            ? 'System and booking request alerts for admin management.'
            : 'System and booking alerts for your account.'}
        </p>
      </div>


      {/* Notification Status Banner */}

      <div className="flex items-center justify-between rounded-2xl border border-line bg-white p-4">

        <div>
          <p className="text-sm font-medium text-ink">
            Notification status
          </p>

          <p className="mt-1 text-xs text-slate">
            {notifications.length === 0
              ? 'No notifications'
              : `${notifications.length} notification${notifications.length === 1 ? '' : 's'}`}
          </p>
        </div>

        <div>
          {notifications.length > 0 && (
            <button
              type="button"
              onClick={clearAllNotifications}
              className="rounded-xl bg-[#17324D] px-4 py-2 text-xs font-semibold text-white transition hover:opacity-90"
            >
              Clear all
            </button>
          )}
        </div>

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

          {notifications.map((item) => {
            const isHighlighted = Boolean(
              highlightParam &&
              (String(highlightParam).toLowerCase() === String(item.notificationId).toLowerCase() ||
               String(highlightParam).toLowerCase() === String(item.id).toLowerCase())
            )

            return (
              <div
                key={item.notificationId}
                id={`notification-card-${item.notificationId}`}
                role="button"
                tabIndex={0}
                onClick={() => handleSelectNotification(item)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    handleSelectNotification(item)
                  }
                }}
                className={`rounded-2xl border p-4 cursor-pointer transition-all duration-300 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-sky-400 ${
                  isHighlighted
                    ? 'border-sky-500 bg-sky-50 shadow-md ring-2 ring-sky-300 font-semibold'
                    : item.isRead
                    ? 'border-line bg-white hover:bg-sky-50/20'
                    : 'border-amber-200 bg-amber-50/50 hover:bg-amber-50/80'
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

                <div className="flex items-center gap-3">
                  <span className="whitespace-nowrap text-[10px] font-medium uppercase text-slate">
                    {item.timeAgo}
                  </span>
                  <button
                    type="button"
                    onClick={() => clearNotification(item.notificationId)}
                    className="rounded-lg p-1 text-slate hover:bg-slate-100 hover:text-ink transition"
                    title="Dismiss notification"
                  >
                    ✕
                  </button>
                </div>

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
          )
        })}

        </div>
      )}

    </div>
  )
}