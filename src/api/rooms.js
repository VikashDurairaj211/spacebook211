import client from './client'
import { MOCK_ROOMS } from '../data/mockRooms'

// Expected .NET endpoint: GET /api/rooms?module=&type=&capacity=&date=&startTime=&endTime=
// Response: Room[]  -> { id, name, code, module, type, capacity, status }
export async function getRooms(filters = {}) {
  try {
    const { data } = await client.get('/rooms', { params: filters })
    return data
  } catch (err) {
    console.warn('[rooms.getRooms] API unavailable, using mock data:', err.message)
    return filterMockRooms(filters)
  }
}

// Expected .NET endpoint: GET /api/rooms/{id}
export async function getRoomById(id) {
  try {
    const { data } = await client.get(`/rooms/${id}`)
    return data
  } catch (err) {
    console.warn('[rooms.getRoomById] API unavailable, using mock data:', err.message)
    return MOCK_ROOMS.find((r) => r.id === id)
  }
}

// Expected .NET endpoint: GET /api/rooms/{id}/availability?date=
export async function getRoomAvailability(id, date) {
  try {
    const { data } = await client.get(`/rooms/${id}/availability`, { params: { date } })
    return data
  } catch (err) {
    console.warn('[rooms.getRoomAvailability] API unavailable:', err.message)
    return []
  }
}

function filterMockRooms(filters) {
  const requiredFacilities = []
  if (filters.whiteboard) requiredFacilities.push('Whiteboard & Marker')
  if (filters.tv) requiredFacilities.push('TV & Remote')
  if (filters.camera) requiredFacilities.push('Camera')
  if (filters.mic) requiredFacilities.push('Mic')

  return MOCK_ROOMS.filter((room) => {
    if (filters.module && room.module !== filters.module) return false
    if (filters.type && room.type !== filters.type) return false
    if (filters.capacity && room.capacity < Number(filters.capacity)) return false
    if (requiredFacilities.length > 0) {
      const roomFacilities = room.facilities || []
      for (const facility of requiredFacilities) {
        if (!roomFacilities.includes(facility)) return false
      }
    }
    return true
  })
}
