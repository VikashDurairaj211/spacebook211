import client from "./client";

export async function createBooking(booking) {
  const { data } = await client.post("/employee/bookings", booking);
  return data;
}

export async function getMyBookings() {
  const { data } = await client.get("/employee/mybookings");
  return data;
}

export async function cancelBooking(id, payload) {
  const { data } = await client.put(`/employee/bookings/${id}/cancel`, payload);
  return data;
}

export async function updateBooking(id, booking) {
  const { data } = await client.put(
    `/employee/bookings/${id}`,
    booking
  );
  return data;
}

export async function checkInRoomBooking(id) {
  const { data } = await client.post(`/employee/bookings/${id}/checkin`);
  return data;
}