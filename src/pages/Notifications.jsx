```jsx
import { useEffect, useState } from "react";
import NotificationCard from "../components/cards/NotificationCard";
import { useAuth } from "../context/AuthContext";
import client from "../api/client";

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const { user } = useAuth();

  // =====================================================
  // Determine user role
  // =====================================================

  const isAdmin =
    user?.role === "Admin" ||
    user?.role === "admin" ||
    user?.isAdmin === true;

  // =====================================================
  // Fetch notifications
  // =====================================================

  const fetchNotifications = async () => {
    if (!user) return;

    try {
      setLoading(true);

      const endpoint = isAdmin
        ? "/admin/notifications"
        : "/employee/notifications";

      const response = await client.get(endpoint);

      setNotifications(response.data || []);
    } catch (error) {
      console.error(
        "Failed to fetch notifications:",
        error
      );

      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // Mark all notifications as read
  // =====================================================

  const markAllAsRead = async () => {
    if (!user) return;

    try {
      const endpoint = isAdmin
        ? "/admin/notifications/read-all"
        : "/employee/notifications/read-all";

      await client.patch(endpoint);

      // Update current page immediately
      setNotifications((previous) =>
        previous.map((notification) => ({
          ...notification,
          isRead: true,
        }))
      );

      // Notify TopNav and other components
      window.dispatchEvent(
        new Event("notificationsRead")
      );
    } catch (error) {
      console.error(
        "Failed to mark notifications as read:",
        error
      );
    }
  };

  // =====================================================
  // Load notifications
  // =====================================================

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      setLoading(false);
      return;
    }

    fetchNotifications();

    const handleNotificationsRead = () => {
      fetchNotifications();
    };

    window.addEventListener(
      "notificationsRead",
      handleNotificationsRead
    );

    return () => {
      window.removeEventListener(
        "notificationsRead",
        handleNotificationsRead
      );
    };
  }, [user, isAdmin]);

  // =====================================================
  // Unread count
  // =====================================================

  const unreadCount = notifications.filter(
    (item) => !item.isRead
  ).length;

  // =====================================================
  // Render
  // =====================================================

  return (
    <div className="space-y-6">
      {/* =================================================
          PAGE HEADER
      ================================================= */}

      <div>
        <h1 className="text-2xl font-semibold text-ink">
          Notifications
        </h1>

        <p className="mt-1 text-sm text-slate-500">
          {isAdmin
            ? "System and booking request alerts for admin management."
            : "System and booking alerts for your account."}
        </p>
      </div>

      {/* =================================================
          UNREAD COUNT + MARK ALL READ
      ================================================= */}

      <div className="flex items-center justify-between rounded-2xl border border-line bg-white p-4">
        <div className="text-sm text-slate-600">
          <span className="font-semibold text-ink">
            {unreadCount}
          </span>{" "}
          unread notification
          {unreadCount === 1 ? "" : "s"}
        </div>

        {unreadCount > 0 && (
          <button
            type="button"
            onClick={markAllAsRead}
            className="rounded-lg border border-line px-4 py-2 text-sm font-medium text-ink transition hover:bg-slate-50"
          >
            Mark all as read
          </button>
        )}
      </div>

      {/* =================================================
          NOTIFICATION LIST
      ================================================= */}

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
              tone={
                item.isRead
                  ? "normal"
                  : "urgent"
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
```
