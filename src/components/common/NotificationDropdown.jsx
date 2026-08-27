import { useEffect, useRef, useState } from "react";
import Button from "./Button";
import {
  getNotifications,
  markAllNotificationsAsRead,
  clearAllNotifications,
  clearNotification,
} from "../../api/notifications";

export default function NotificationDropdown({
  open,
  buttonRef,
  notifications: initialNotifications,
  onClose,
  onMarkAllRead,
  onClearAll,
  onClearOne,
  onViewAll,
}) {
  const panelRef = useRef(null);
  const [notifications, setNotifications] = useState(initialNotifications || []);
  const [loading, setLoading] = useState(false);

  // Helper to get locally marked read notification IDs
  const getReadNotificationIds = () => {
    try {
      const raw = localStorage.getItem('spacebook_read_notifications');
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  };

  // Helper to get locally cleared/dismissed notification IDs
  const getClearedNotificationIds = () => {
    try {
      const raw = localStorage.getItem('spacebook_cleared_notifications');
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  };

  const saveClearedNotificationIds = (ids) => {
    try {
      const existing = getClearedNotificationIds();
      const merged = Array.from(new Set([...existing, ...ids]));
      localStorage.setItem('spacebook_cleared_notifications', JSON.stringify(merged));
    } catch (e) {
      // ignore
    }
  };

  // Sync initialNotifications prop whenever it changes
  useEffect(() => {
    if (!initialNotifications) return;
    const clearedIds = new Set(getClearedNotificationIds().map(String));
    const active = initialNotifications.filter(
      (n) => !clearedIds.has(String(n.notificationId || n.id))
    );
    setNotifications(active);
  }, [initialNotifications]);

  // Fetch API data when dropdown opens
  useEffect(() => {
    if (!open) return;

    const readIds = new Set(getReadNotificationIds().map(String));
    const clearedIds = new Set(getClearedNotificationIds().map(String));

    // If initialNotifications was already provided by TopNav, use it
    if (initialNotifications && initialNotifications.length > 0) {
      const active = initialNotifications.filter(
        (n) => !clearedIds.has(String(n.notificationId || n.id))
      );
      setNotifications(active);
      return;
    }

    const fetchAlerts = async () => {
      setLoading(true);
      try {
        const data = await getNotifications();
        const rawList = Array.isArray(data) ? data : data.notifications || [];
        const mapped = rawList
          .map((n, idx) => {
            const id = String(n.notificationId ?? n.id ?? idx);
            return {
              ...n,
              notificationId: id,
              isRead: n.isRead === true || n.is_read === true || readIds.has(id),
            };
          })
          .filter((n) => !clearedIds.has(String(n.notificationId)));
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

  const handleMarkAll = async () => {
    if (onMarkAllRead) {
      await onMarkAllRead();
    } else {
      try {
        await markAllNotificationsAsRead();
      } catch (e) {
        // ignore
      }
      window.dispatchEvent(new Event("notificationsRead"));
    }
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  const handleClearAll = async () => {
    const currentIds = notifications.map((n, idx) =>
      String(n.notificationId ?? n.id ?? idx)
    );
    saveClearedNotificationIds(currentIds);
    setNotifications([]);

    if (onClearAll) {
      await onClearAll();
    } else {
      try {
        await clearAllNotifications();
      } catch (e) {
        // ignore
      }
      window.dispatchEvent(new Event("notificationsRead"));
    }
  };

  const handleClearSingle = async (e, id) => {
    e.stopPropagation();
    const idStr = String(id);
    saveClearedNotificationIds([idStr]);
    setNotifications((prev) =>
      prev.filter((item) => String(item.notificationId ?? item.id) !== idStr)
    );

    if (onClearOne) {
      await onClearOne(id);
    } else {
      try {
        await clearNotification(id);
      } catch (e) {
        // ignore
      }
      window.dispatchEvent(new Event("notificationsRead"));
    }
  };

  if (!open) return null;

  const hasUnread = notifications.some((n) => !n.isRead && !n.read && n.unread !== false);

  return (
    <div
      ref={panelRef}
      className="absolute right-0 top-full z-50 mt-2 w-[22rem] max-w-[calc(100vw-1rem)] overflow-hidden rounded-2xl border border-slate-200 bg-white text-ink shadow-xl font-sans"
      style={{ minWidth: "18rem" }}
    >
      {/* Header */}
      <div className="border-b border-line px-4 py-3.5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="font-display text-sm font-bold text-ink">Notifications</p>
            <p className="mt-0.5 text-xs text-slate">Recent alerts for your account.</p>
          </div>
          <div>
            {notifications.length > 0 && (
              <button
                type="button"
                onClick={handleClearAll}
                disabled={loading}
                className="rounded-lg border border-line bg-white px-2.5 py-1 text-xs font-semibold text-ink hover:bg-portal-bg transition"
              >
                Clear all
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="max-h-80 space-y-2.5 overflow-auto px-4 py-3">
        {loading ? (
          <div className="p-4 text-center text-xs text-slate">Loading notifications...</div>
        ) : notifications.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-portal-bg p-4 text-center text-sm text-slate">
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
                className={`group relative rounded-2xl border p-3 transition ${
                  isUnread
                    ? "border-amber-200 bg-amber-50/40"
                    : "border-slate-200 bg-portal-bg/60"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-display text-xs font-bold text-ink truncate">
                        {title}
                      </p>
                      {isUnread && (
                        <span className="rounded-full bg-amber-500 px-1.5 py-0.2 text-[9px] font-semibold uppercase tracking-wider text-white shrink-0">
                          New
                        </span>
                      )}
                    </div>
                    {message && (
                      <p className="mt-1 text-xs text-slate line-clamp-2">{message}</p>
                    )}
                    <span className="mt-1.5 inline-block font-mono text-[10px] uppercase tracking-wider text-slate/80">
                      {time}
                    </span>
                  </div>

                  {/* Dismiss Single Notification Button */}
                  <button
                    type="button"
                    onClick={(e) => handleClearSingle(e, id)}
                    className="shrink-0 rounded-md p-1 text-slate/60 hover:bg-slate-200 hover:text-ink transition"
                    title="Dismiss notification"
                  >
                    ✕
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-line px-4 py-2.5 bg-slate-50/50">
        <button
          type="button"
          onClick={() => {
            if (onViewAll) onViewAll();
            if (onClose) onClose();
          }}
          className="w-full rounded-xl border border-slate-200 bg-white py-2 text-xs font-semibold text-ink transition hover:bg-slate-100"
        >
          View all notifications
        </button>
      </div>
    </div>
  );
}