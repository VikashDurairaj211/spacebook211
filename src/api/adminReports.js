import client from "./client";

// POST /api/admin/reports/bookingtrend
export async function getBookingTrendReport(filterDto = {}) {
  const { data } = await client.post("/admin/reports/bookingtrend", filterDto);
  return data;
}

// POST /api/admin/reports/bookingstatus
export async function getBookingStatusReport(filterDto = {}) {
  const { data } = await client.post("/admin/reports/bookingstatus", filterDto);
  return data;
}

// POST /api/admin/reports/roomusage
export async function getRoomUsageReport(filterDto = {}) {
  const { data } = await client.post("/admin/reports/roomusage", filterDto);
  return data;
}