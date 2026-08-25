import client from "./client";

// ==========================================
// EMPLOYEE ROOM ENDPOINTS
// ==========================================

// Fallback constants
export const DEFAULT_MODULES = [
  "Module 1 - Elcot Park - CMB",
  "Module 2 - Elcot Park - CMB",
  "Module 1 - Tidel Park - CMB",
];

export const DEFAULT_ROOM_TYPES = [
  { id: 1, name: "Conference" },
  { id: 2, name: "Training" },
  { id: 3, name: "Discussion" },
];

export const DEFAULT_FACILITIES = [
  { id: 1, name: "Projector" },
  { id: 2, name: "TV" },
  { id: 3, name: "Whiteboard" },
  { id: 4, name: "Camera" },
  { id: 5, name: "Mic" },
];

/**
 * Normalizes any module response into a clean list of module string names
 */
export function normalizeModules(data) {
  if (!data) return DEFAULT_MODULES;
  const rawList = Array.isArray(data)
    ? data
    : data.modules || data.data || data.result || [];

  if (!Array.isArray(rawList) || rawList.length === 0) {
    return DEFAULT_MODULES;
  }

  const normalized = rawList
    .map((item) => {
      if (typeof item === "string") return item.trim();
      if (item && typeof item === "object") {
        return (
          item.name ||
          item.moduleName ||
          item.module ||
          item.title ||
          item.location ||
          ""
        ).trim();
      }
      return String(item || "").trim();
    })
    .filter(Boolean);

  return normalized.length > 0 ? [...new Set(normalized)] : DEFAULT_MODULES;
}

/**
 * Normalizes any room type response into an array of { id, name }
 */
export function normalizeRoomTypes(data) {
  if (!data) return DEFAULT_ROOM_TYPES;
  const rawList = Array.isArray(data)
    ? data
    : data.roomTypes || data.data || data.result || [];

  if (!Array.isArray(rawList) || rawList.length === 0) {
    return DEFAULT_ROOM_TYPES;
  }

  const normalized = rawList
    .map((item, idx) => {
      if (typeof item === "string") {
        const lower = item.toLowerCase();
        let id = idx + 1;
        if (lower.includes("conf")) id = 1;
        else if (lower.includes("train")) id = 2;
        else if (lower.includes("disc")) id = 3;
        return { id, name: item.trim() };
      }

      if (item && typeof item === "object") {
        const id = Number(
          item.id ??
            item.roomTypeId ??
            item.RoomTypeId ??
            item.typeId ??
            idx + 1
        );
        const name = (
          item.name ??
          item.roomTypeName ??
          item.RoomTypeName ??
          item.typeName ??
          item.title ??
          `Room Type ${id}`
        ).trim();
        return { id, name };
      }

      return null;
    })
    .filter(Boolean);

  return normalized.length > 0 ? normalized : DEFAULT_ROOM_TYPES;
}

/**
 * Normalizes facilities into an array of { id, name }
 */
export function normalizeFacilities(data) {
  if (!data) return DEFAULT_FACILITIES;
  const rawList = Array.isArray(data)
    ? data
    : data.facilities || data.data || data.result || [];

  if (!Array.isArray(rawList) || rawList.length === 0) {
    return DEFAULT_FACILITIES;
  }

  const normalized = rawList
    .map((item, idx) => {
      if (typeof item === "string") {
        return { id: idx + 1, name: item.trim() };
      }
      if (item && typeof item === "object") {
        const id = Number(
          item.id ?? item.facilityId ?? item.FacilityId ?? idx + 1
        );
        const name = (
          item.name ??
          item.facilityName ??
          item.FacilityName ??
          `Facility ${id}`
        ).trim();
        return { id, name };
      }
      return null;
    })
    .filter(Boolean);

  return normalized.length > 0 ? normalized : DEFAULT_FACILITIES;
}

// GET /api/employee/modules
export async function getModules() {
  try {
    const { data } = await client.get("/employee/modules");
    return normalizeModules(data);
  } catch (error) {
    console.warn("Failed to fetch modules from /api/employee/modules, using fallback:", error);
    return DEFAULT_MODULES;
  }
}

// GET /api/employee/room-types
export async function getRoomTypes(params = {}) {
  try {
    const queryParams = {};
    if (params.module) queryParams.module = params.module;
    if (params.moduleId) queryParams.moduleId = params.moduleId;

    const { data } = await client.get("/employee/room-types", {
      params: queryParams,
    });
    return normalizeRoomTypes(data);
  } catch (error) {
    console.warn("Failed to fetch room types from /api/employee/room-types, using fallback:", error);
    return DEFAULT_ROOM_TYPES;
  }
}

// GET /api/employee/rooms
export async function getEmployeeRooms(params = {}) {
  try {
    const queryParams = {};
    if (params.module) queryParams.module = params.module;

    const { data } = await client.get("/employee/rooms", {
      params: queryParams,
    });
    return Array.isArray(data) ? data : data?.rooms || data?.data || [];
  } catch (error) {
    console.warn("Failed to fetch rooms from /api/employee/rooms:", error);
    return [];
  }
}

// GET /api/admin/facilities
export async function getFacilities() {
  try {
    const { data } = await client.get("/admin/facilities");
    return normalizeFacilities(data);
  } catch (error) {
    console.warn("Failed to fetch facilities from /admin/facilities, using fallback:", error);
    return DEFAULT_FACILITIES;
  }
}

// Get room by ID (Employee-safe fallback using availability endpoint)
export async function getRoomById(id) {
  try {
    const { data } = await client.get("/employee/availability");
    const rooms = data.rooms || [];
    const found = rooms.find((room) => String(room.roomId) === String(id));
    if (found) return found;
    
    // If not found in availability, try direct employee room endpoint
    const fallbackRes = await client.get(`/employee/rooms/${id}`);
    return fallbackRes.data;
  } catch (error) {
    // Final fallback to admin route if employee route fails or lacks permission
    try {
      const { data } = await client.get(`/admin/rooms/${id}`);
      return data;
    } catch (adminError) {
      console.error("Failed to fetch room by ID from all sources:", adminError);
      throw adminError;
    }
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
export async function updateAdminRoomStatus(id, isBlocked) {
  const isBlockedBool =
    typeof isBlocked === "boolean"
      ? isBlocked
      : typeof isBlocked === "object" && isBlocked !== null
      ? Boolean(isBlocked.isBlocked ?? isBlocked.IsBlocked)
      : String(isBlocked).toLowerCase() === "maintenance" ||
        String(isBlocked).toLowerCase() === "blocked" ||
        String(isBlocked).toLowerCase() === "true";

  const { data } = await client.patch(`/admin/rooms/${id}/status`, {
    isBlocked: isBlockedBool,
  });
  return data;
}