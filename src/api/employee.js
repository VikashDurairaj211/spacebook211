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

export async function getModules() {
  const { data } = await client.get("/employee/modules");
  return data;
}

export async function getRoomTypes(params = {}) {
  const { data } = await client.get("/employee/room-types", { params });
  return data;
}

export async function getEmployeeRooms(params = {}) {
  const { data } = await client.get("/employee/rooms", { params });
  return data;
}