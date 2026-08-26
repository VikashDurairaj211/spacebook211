import client from "./client";

function getIsAdmin() {
  try {
    const raw = localStorage.getItem("spacebook_user");
    if (!raw) return false;
    const user = JSON.parse(raw);
    return (
      user?.role === "Admin" ||
      user?.role === "admin" ||
      user?.isAdmin === true
    );
  } catch (e) {
    return false;
  }
}

// Get notifications for the logged-in user (Admin or Employee)
export async function getNotifications() {
  const isAdmin = getIsAdmin();
  const endpoint = isAdmin
    ? "/admin/notifications"
    : "/employee/notifications";

  const { data } = await client.get(endpoint);
  return data || [];
}

// Mark all notifications as read (Admin or Employee)
export async function markAllNotificationsAsRead() {
  const isAdmin = getIsAdmin();
  const endpoint = isAdmin
    ? "/admin/notifications/read-all"
    : "/employee/notifications/read-all";

  try {
    const { data } = await client.patch(endpoint, {});
    return data;
  } catch (err) {
    try {
      const { data } = await client.put(endpoint, {});
      return data;
    } catch (e) {
      return null;
    }
  }
}

// Mark a single notification as read (Admin or Employee)
export async function markNotificationAsRead(id) {
  if (!id && id !== 0) return null;
  const isAdmin = getIsAdmin();
  const endpoint = isAdmin
    ? `/admin/notifications/${id}/read`
    : `/employee/notifications/${id}/read`;

  try {
    const { data } = await client.patch(endpoint, {});
    return data;
  } catch (err) {
    try {
      const { data } = await client.put(endpoint, {});
      return data;
    } catch (e) {
      return null;
    }
  }
}

// Clear all notifications (Admin or Employee)
export async function clearAllNotifications() {
  const isAdmin = getIsAdmin();
  const endpoints = isAdmin
    ? [
        { method: "delete", url: "/admin/notifications/clear" },
        { method: "delete", url: "/admin/notifications" },
        { method: "post", url: "/admin/notifications/clear" },
        { method: "delete", url: "/notifications/clear" },
      ]
    : [
        { method: "delete", url: "/employee/notifications/clear" },
        { method: "delete", url: "/employee/notifications" },
        { method: "post", url: "/employee/notifications/clear" },
        { method: "delete", url: "/notifications/clear" },
      ];

  let lastError = null;
  for (const { method, url } of endpoints) {
    try {
      const response = await client[method](url);
      return response.data;
    } catch (err) {
      lastError = err;
      if (err.response && (err.response.status === 404 || err.response.status === 405)) {
        continue;
      }
    }
  }
  if (lastError) {
    console.warn("Unable to clear notifications on backend:", lastError);
  }
  return null;
}

// Clear / Delete single notification by ID (Admin or Employee)
export async function clearNotification(id) {
  if (!id && id !== 0) return null;
  const isAdmin = getIsAdmin();
  const endpoints = isAdmin
    ? [
        { method: "delete", url: `/admin/notifications/${id}` },
        { method: "delete", url: `/admin/notifications/clear/${id}` },
        { method: "delete", url: `/notifications/${id}` },
      ]
    : [
        { method: "delete", url: `/employee/notifications/${id}` },
        { method: "delete", url: `/employee/notifications/clear/${id}` },
        { method: "delete", url: `/notifications/${id}` },
      ];

  let lastError = null;
  for (const { method, url } of endpoints) {
    try {
      const response = await client[method](url);
      return response.data;
    } catch (err) {
      lastError = err;
      if (err.response && (err.response.status === 404 || err.response.status === 405)) {
        continue;
      }
    }
  }
  if (lastError) {
    console.warn(`Unable to clear notification ${id} on backend:`, lastError);
  }
  return null;
}

// Alias for clearNotification
export const deleteNotification = clearNotification;