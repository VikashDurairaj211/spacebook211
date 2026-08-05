import { timeToMinutes } from './timeUtils'

export function overlaps(startA, endA, startB, endB) {
  return timeToMinutes(startA) < timeToMinutes(endB) && timeToMinutes(startB) < timeToMinutes(endA)
}

export function roomHasConflict(roomId, date, startTime, endTime, bookings = [], ignoreBookingId) {
  return bookings.find((booking) => {
    if (booking.id === ignoreBookingId) return false
    if (booking.roomId !== roomId && booking.roomName !== roomId) return false
    if (booking.date !== date) return false
    if (booking.status === 'Cancelled') return false
    return overlaps(startTime, endTime, booking.startTime, booking.endTime)
  })
}

export function isRoomAvailable(roomId, date, startTime, endTime, bookings = [], ignoreBookingId) {
  return !roomHasConflict(roomId, date, startTime, endTime, bookings, ignoreBookingId)
}

export function filterRoomsByCriteria(rooms = [], bookings = [], filters = {}) {
  const requiredFacilities = []
  if (filters.whiteboard) requiredFacilities.push('Whiteboard & Marker')
  if (filters.tv) requiredFacilities.push('TV & Remote')
  if (filters.camera) requiredFacilities.push('Camera')
  if (filters.mic) requiredFacilities.push('Mic')

  return rooms.filter((room) => {
    if (room.status === 'Booked') return false
    if (filters.module && room.module !== filters.module) return false
    if (filters.type && room.type !== filters.type) return false
    if (filters.capacity && room.capacity < Number(filters.capacity)) return false
    if (requiredFacilities.length > 0) {
      const roomFacilities = room.facilities || []
      if (!requiredFacilities.every((facility) => roomFacilities.includes(facility))) return false
    }
    if (filters.date && filters.startTime && filters.endTime) {
      if (!isRoomAvailable(room.id, filters.date, filters.startTime, filters.endTime, bookings)) return false
    }
    return true
  })
}
