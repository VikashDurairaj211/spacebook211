import client from "./client";

// Get notifications for the logged-in user
export async function getNotifications() {
  const role = localStorage.getItem("user_role");

  const endpoint =
    role === "Admin"
      ? "/admin/notifications"
      : "/employee/notifications";

  const { data } = await client.get(endpoint);

  return data || [];
}

// Mark all notifications as read
export async function markAllNotificationsAsRead() {
  const role = localStorage.getItem("user_role");

  const endpoint =
    role === "Admin"
      ? "/admin/notifications/read-all"
      : "/employee/notifications/read-all";

  const { data } = await client.patch(endpoint, {});

  return data;

}