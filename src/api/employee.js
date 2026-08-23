import client from "./client";

export async function getDashboard() {
  const { data } = await client.get("/employee/dashboard");
  return data;
}

export async function getMyBookings() {
  const { data } = await client.get("/employee/mybookings");
  return data;
}

export async function cancelBooking(id, payload = {}) {
  const { data } = await client.put(`/employee/bookings/${id}/cancel`, payload);
  return data;
}

export async function updateBooking(id, payload) {
  const { data } = await client.put(`/employee/bookings/${id}`, payload);
  return data;
}