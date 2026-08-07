import client from "./client";

// ==========================================
// EMPLOYEE ROOM ENDPOINTS
// ==========================================

// Get room by ID (Employee-safe fallback using availability endpoint)
export async function getRoomById(id) {
  try {
    const { data } = await client.get("/employee/availability");
    const rooms = data.rooms || [];
    return rooms.find((room) => String(room.roomId) === String(id));
  } catch (error) {
    // Fallback to admin route
    const { data } = await client.get(`/admin/rooms/${id}`);
    return data;
  }
}

// Search rooms endpoint (Employee route)
export async function searchRooms(searchParams) {
  const { data } = await client.post("/employee/searchrooms", searchParams);
  return data;
}

// Get room availability (Employee route)
export async function getRoomAvailability(date, roomTypeId) {
  const params = {};
  if (date) params.date = date;
  if (roomTypeId) params.roomTypeId = roomTypeId;

  const { data } = await client.get("/employee/availability", { params });

  // Unwraps and returns the `rooms` array from { date: "...", rooms: [...] }
  return data.rooms || [];
}

// ==========================================
// ADMIN ROOM ENDPOINTS
// ==========================================

// GET /api/admin/rooms/dashboard
export async function getAdminRoomDashboard() {
  const { data } = await client.get("/admin/rooms/dashboard");
  return data;
}

// GET /api/admin/rooms
export async function getAdminRooms(params = {}) {
  const { data } = await client.get("/admin/rooms", { params });
  return data;
}

// POST /api/admin/rooms
export async function createAdminRoom(roomDto) {
  const { data } = await client.post("/admin/rooms", roomDto);
  return data;
}

// POST /api/admin/rooms/bulk
export async function createBulkAdminRooms(roomsArray) {
  const { data } = await client.post("/admin/rooms/bulk", roomsArray);
  return data;
}

// GET /api/admin/rooms/{id}
export async function getAdminRoomById(id) {
  const { data } = await client.get(`/admin/rooms/${id}`);
  return data;
}

// PUT /api/admin/rooms/{id}
export async function updateAdminRoom(id, roomDto) {
  const { data } = await client.put(`/admin/rooms/${id}`, roomDto);
  return data;
}

// DELETE /api/admin/rooms/{id}
export async function deleteAdminRoom(id) {
  const { data } = await client.delete(`/admin/rooms/${id}`);
  return data;
}

// PATCH /api/admin/rooms/{id}/status
export async function updateAdminRoomStatus(id, status) {
  const { data } = await client.patch(`/admin/rooms/${id}/status`, { status });
  return data;
}