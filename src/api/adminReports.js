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

// GET or POST /api/admin/reports/analytics
export async function getAnalyticsReport(params = {}) {
  const { data } = await client.get("/admin/reports/analytics", { params });
  return data;
}

// GET /api/admin/reports/export-csv
export async function exportBookingsCsv(params = {}) {
  const response = await client.get("/admin/reports/export-csv", {
    params,
    responseType: "blob",
  });
  return response.data;
}