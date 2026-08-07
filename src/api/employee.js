import client from "./client";

export async function getDashboard() {
  const { data } = await client.get("/employee/dashboard");
  return data;
}

export async function getMyBookings() {
  const { data } = await client.get("/employee/mybookings");
  return data;
}

export async function cancelBooking(id) {
  const { data } = await client.put(`/employee/cancelbooking/${id}`);
  return data;
}

export async function updateBooking(id, payload) {
  const { data } = await client.put(`/employee/updatebooking/${id}`, payload);
  return data;
}