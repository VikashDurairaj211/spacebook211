import client from "./client";

export async function getNotifications() {
  const role = localStorage.getItem("user_role") || "Admin"; // Fallback to Admin if not set
  const endpoint = role === "Admin" ? "/admin/notifications" : "/employee/notifications";

  try {
    const { data } = await client.get(endpoint);
    return data;
  } catch (error) {
    // Secondary fallback
    const { data } = await client.get("/notifications");
    return data;
  }
}

export async function markAllNotificationsAsRead() {
  const { data } = await client.patch("/notifications/read-all");
  return data;
}