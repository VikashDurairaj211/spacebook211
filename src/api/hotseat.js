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

export async function checkInHotseatBooking(id) {
  const { data } = await client.post(`/Hotseat/${id}/check-in`);
  return data;
}

export async function getHotseatStats() {
  const { data } = await client.get("/Hotseat/stats");
  return data;
}

export async function getAdminHotseatBookings(params = {}) {
  try {
    const { data } = await client.get("/Hotseat/all", { params });
    return data;
  } catch (err) {
    // Fallback if /Hotseat/all is not exposed
    try {
      const { data } = await client.get("/Hotseat", { params });
      return data;
    } catch {
      return [];
    }
  }
}