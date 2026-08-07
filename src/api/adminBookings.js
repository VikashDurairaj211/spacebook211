import client from "./client";

// GET Dashboard Overview
export async function getAdminBookingDashboard() {
  const { data } = await client.get("/admin/bookings/dashboard");
  return data;
}

// GET All Bookings
export async function getAdminBookings(params = {}) {
  const { data } = await client.get("/admin/bookings", { params });
  return data;
}

// GET Single Booking Details
export async function getAdminBookingById(id) {
  const { data } = await client.get(`/admin/bookings/${id}`);
  return data;
}

// PATCH Approve Booking
export async function approveBooking(id) {
  const { data } = await client.patch(`/admin/bookings/${id}/approve`);
  return data;
}

// PATCH Reject Booking
export async function rejectBooking(id) {
  const { data } = await client.patch(`/admin/bookings/${id}/reject`);
  return data;
}