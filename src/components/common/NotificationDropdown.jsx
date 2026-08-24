import { useEffect, useRef, useState } from "react";
import Button from "./Button";
import { getNotifications } from "../../api/notifications";

export default function NotificationDropdown({
  open,
  buttonRef,
  notifications: initialNotifications,
  onClose,
  onMarkAllRead,
  onViewAll,
}) {
  const panelRef = useRef(null);
  const [notifications, setNotifications] = useState(initialNotifications || []);
  const [loading, setLoading] = useState(false);

  // Helper to get locally marked read notification IDs
  const getReadNotificationIds = () => {
    try {
      const raw = localStorage.getItem('spacebook_read_notifications')
      return raw ? JSON.parse(raw) : []
    } catch (e) {
      return []
    }
  }

  // Fetch API data when dropdown opens
  useEffect(() => {
    if (!open) return;

    // If initialNotifications was already provided by TopNav, use it
    if (initialNotifications && initialNotifications.length > 0) {
      const readIds = new Set(getReadNotificationIds().map(String));
      setNotifications(
        initialNotifications.map((n) => ({
          ...n,
          isRead: n.isRead === true || readIds.has(String(n.notificationId || n.id)),
        }))
      );
      return;
    }

    const fetchAlerts = async () => {
      setLoading(true);
      try {
        const data = await getNotifications();
        const rawList = Array.isArray(data) ? data : data.notifications || [];
        const readIds = new Set(getReadNotificationIds().map(String));
        const mapped = rawList.map((n, idx) => {
          const id = String(n.notificationId ?? n.id ?? idx);
          return {
            ...n,
            notificationId: id,
            isRead: n.isRead === true || n.is_read === true || readIds.has(id),
          };
        });
        setNotifications(mapped);
      } catch (err) {
        console.error("Failed to fetch notifications in dropdown:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchAlerts();
  }, [open, initialNotifications]);

  // Click outside and escape listeners
  useEffect(() => {
    if (!open) return;

    function handleClickOutside(event) {
      if (
        panelRef.current &&
        !panelRef.current.contains(event.target) &&
        buttonRef?.current &&
        !buttonRef.current.contains(event.target)
      ) {
        onClose();
      }
    }

    function handleEscape(event) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open, buttonRef, onClose]);

  if (!open) return null;

  const unreadCount = notifications.filter((n) =>
    n.isRead !== undefined ? !n.isRead : n.unread
  ).length;

  return (
    <div
      ref={panelRef}
      className="absolute right-0 top-full z-50 mt-2 w-[22rem] max-w-[calc(100vw-1rem)] overflow-hidden rounded-2xl border border-slate-200 bg-white text-ink shadow-lg font-sans"
      style={{ minWidth: "18rem" }}
    >
      {/* Header */}
      <div className="border-b border-line px-4 py-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="font-display text-sm font-bold text-ink">Notifications</p>
            <p className="mt-1 text-xs text-slate">Recent alerts for your account.</p>
          </div>
          <Button
            type="button"
            variant="secondary"
            className="text-xs px-3 py-1.5"
            onClick={async () => {
              if (onMarkAllRead) await onMarkAllRead();
              setNotifications((prev) =>
                prev.map((n) => ({ ...n, isRead: true, unread: false }))
              );
            }}
            disabled={unreadCount === 0 || loading}
          >
            Mark all as read
          </Button>
        </div>
      </div>

      {/* Body */}
      <div className="max-h-80 space-y-3 overflow-auto px-4 py-4">
        {loading ? (
          <div className="p-4 text-center text-xs text-slate">Loading notifications...</div>
        ) : notifications.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-portal-bg p-4 text-sm text-slate">
            No notifications available.
          </div>
        ) : (
          notifications.map((n, index) => {
            const id = n.notificationId || n.id || index;
            const title = n.title || "Notification";
            const message = n.message || "";
            const time = n.timeAgo && !n.timeAgo.includes("0001") ? n.timeAgo : "Just now";
            const isUnread = n.isRead !== undefined ? !n.isRead : n.unread;

            return (
              <div
                key={id}
                className={`rounded-2xl border border-slate-200 p-3 transition ${
                  isUnread ? "bg-amber-50/40 border-amber-200" : "bg-portal-bg"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-display text-sm font-bold text-ink truncate">
                        {title}
                      </p>
                      {isUnread && (
                        <span className="rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-white shrink-0">
                          New
                        </span>
                      )}
                    </div>
                    {message && (
                      <p className="mt-1 text-sm text-slate">{message}</p>
                    )}
                  </div>
                  <span className="font-mono text-[11px] uppercase tracking-wider text-slate shrink-0">
                    {time}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-line px-4 py-3">
        <button
          type="button"
          onClick={() => {
            if (onViewAll) onViewAll();
            if (onClose) onClose();
          }}
          className="w-full rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-ink transition hover:bg-slate-50"
        >
          View all notifications
        </button>
      </div>
    </div>
  );
}