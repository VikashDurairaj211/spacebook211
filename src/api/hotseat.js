import client from "./client";

export async function getMyHotseatBookings() {
  const { data } = await client.get("/Hotseat/my-bookings");
  return data;
}

export async function getHotseatSeats(params = {}) {
  const { data } = await client.get("/Hotseat", {
    params,
  });
  return data;
}

export async function createHotseatBooking(booking) {
  const { data } = await client.post("/Hotseat", booking);
  return data;
}

export async function cancelHotseatBooking(id) {
  const { data } = await client.delete(`/Hotseat/${id}`);
  return data;
}

export async function updateHotseatBooking(id, booking) {
  const { data } = await client.put(`/Hotseat/${id}`, booking);
  return data;
}