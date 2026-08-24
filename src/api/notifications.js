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

  const { data } = await client.patch(endpoint, {});
  return data;
}