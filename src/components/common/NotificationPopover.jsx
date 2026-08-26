import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getNotifications, markAllNotificationsAsRead } from "../../api/notifications";

export default function NotificationPopover({ onClose }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const data = await getNotifications();
      const list = Array.isArray(data) ? data : data.notifications || [];
      setNotifications(list);
    } catch (err) {
      console.error("Failed to load notifications:", err);
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsAsRead();
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, isRead: true }))
      );
    } catch (err) {
      console.error("Failed to mark notifications as read:", err);
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, isRead: true }))
      );
    }
  };

  const hasUnread = notifications.some((n) => !n.isRead);

  return (
    <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl border border-line bg-white shadow-xl z-50 overflow-hidden font-sans">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-line bg-white">
        <div>
          <h3 className="font-display font-bold text-base text-ink">Notifications</h3>
          <p className="text-xs text-slate mt-0.5">Recent alerts for your account.</p>
        </div>

        <button
          type="button"
          onClick={handleMarkAllRead}
          disabled={!hasUnread || loading}
          className="rounded-xl border border-line px-3 py-1.5 text-xs text-slate hover:text-ink focus:outline-none focus:ring-2 focus:ring-sky-500 disabled:opacity-40 disabled:cursor-not-allowed transition"
        >
          Mark all as read
        </button>
      </div>

      {/* Notification Items List */}
      <div className="max-h-80 overflow-y-auto divide-y divide-line p-2">
        {loading ? (
          <div className="p-6 text-center text-xs text-slate">Loading alerts...</div>
        ) : notifications.length === 0 ? (
          <div className="rounded-xl bg-portal-bg p-6 text-center text-xs text-slate">
            No notifications available.
          </div>
        ) : (
          notifications.map((item, index) => {
            const isUnread = !item.isRead;
            const notificationId = item.notificationId || item.id || index;

            return (
              <div
                key={notificationId}
                className={`p-3 rounded-xl transition ${
                  isUnread ? "bg-amber-50/40 font-medium" : "hover:bg-portal-bg"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    {/* DTO Title */}
                    <p className="text-xs font-bold text-slate-900">
                      {item.title || "Notification"}
                    </p>
                    {/* DTO Message */}
                    {item.message && (
                      <p className="text-xs text-slate-600 mt-1">
                        {item.message}
                      </p>
                    )}
                  </div>

                  {isUnread && (
                    <span className="h-2 w-2 rounded-full bg-amber-500 shrink-0 mt-1" />
                  )}
                </div>

                {/* DTO TimeAgo / CreatedOn */}
                <p className="mt-1.5 text-[10px] text-slate-400 font-mono">
                  {item.timeAgo || item.createdOn || "Just now"}
                </p>
              </div>
            );
          })
        )}
      </div>

      {/* Footer Link */}
      <div className="p-3 border-t border-line bg-white text-center">
        <Link
          to="/notifications"
          onClick={onClose}
          className="block w-full rounded-xl border border-line py-2 text-xs font-bold text-ink hover:bg-portal-bg transition"
        >
          View all notifications
        </Link>
      </div>
    </div>
  );
}