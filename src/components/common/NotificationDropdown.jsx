import { useEffect, useRef } from 'react'
import Button from './Button'

const sampleNotifications = [
  {
    id: 'plugin-1',
    title: 'Booking confirmed',
    message: 'Conference Room 1 is reserved for your leadership sync.',
    time: '10m ago',
    unread: true,
  },
  {
    id: 'plugin-2',
    title: 'Reminder',
    message: 'Your design review starts in 30 minutes.',
    time: '30m ago',
    unread: true,
  },
  {
    id: 'plugin-3',
    title: 'Policy update',
    message: 'New workspace standards are now available for review.',
    time: '1h ago',
    unread: false,
  },
]

export default function NotificationDropdown({
  open,
  buttonRef,
  notifications = sampleNotifications,
  onClose,
  onMarkAllRead,
  onViewAll,
}) {
  const panelRef = useRef(null)
  const unreadCount = notifications.filter((notification) => notification.unread).length

  useEffect(() => {
    if (!open) return

    function handleClickOutside(event) {
      if (
        panelRef.current &&
        !panelRef.current.contains(event.target) &&
        buttonRef?.current &&
        !buttonRef.current.contains(event.target)
      ) {
        onClose()
      }
    }

    function handleEscape(event) {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [open, buttonRef, onClose])

  if (!open) {
    return null
  }

  return (
    <div
      ref={panelRef}
      className="absolute right-0 top-full z-50 mt-2 w-[22rem] max-w-[calc(100vw-1rem)] overflow-hidden rounded-2xl border border-slate-200 bg-white text-ink shadow-lg transition-all duration-200 ease-out"
      style={{ minWidth: '18rem' }}
    >
      <div className="border-b border-line px-4 py-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="font-display text-sm font-700 text-ink">Notifications</p>
            <p className="mt-1 text-xs text-slate">Recent alerts for your account.</p>
          </div>
          <Button
            type="button"
            variant="secondary"
            className="text-xs px-3 py-1.5"
            onClick={onMarkAllRead}
            disabled={unreadCount === 0}
          >
            Mark all as read
          </Button>
        </div>
      </div>

      <div className="max-h-80 space-y-3 overflow-auto px-4 py-4">
        {notifications.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-portal-bg p-4 text-sm text-slate">
            No notifications available.
          </div>
        ) : (
          notifications.map((notification) => (
            <div
              key={notification.id}
              className="rounded-2xl border border-slate-200 bg-portal-bg p-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-display text-sm font-700 text-ink truncate">{notification.title}</p>
                    {notification.unread && (
                      <span className="rounded-full bg-amber-400 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-white">
                        New
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-slate">{notification.message}</p>
                </div>
                <span className="font-mono text-[11px] uppercase tracking-wider text-slate">
                  {notification.time}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="border-t border-line px-4 py-3">
        <button
          type="button"
          onClick={onViewAll}
          className="w-full rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-ink transition hover:bg-slate-50"
        >
          View all notifications
        </button>
      </div>
    </div>
  )
}
