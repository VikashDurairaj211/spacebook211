import client from "./client";

export async function createBooking(booking) {
  const { data } = await client.post("/employee/bookings", booking);
  return data;
}

export async function getMyBookings() {
  const { data } = await client.get("/employee/mybookings");
  return data;
}

export async function cancelBooking(id) {
  await client.put(`/employee/bookings/${id}/cancel`);
}

export async function updateBooking(id, booking) {
  const { data } = await client.put(
    `/employee/bookings/${id}`,
    booking
  );
  return data;
}