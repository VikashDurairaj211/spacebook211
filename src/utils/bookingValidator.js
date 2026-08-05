import { isPastDate } from './dateUtils'
import { isValidTimeRange, durationInMinutes, isWithinWorkingHours } from './timeUtils'
import { roomHasConflict } from './availabilityChecker'

export function validateBookingRequest({ room, date, startTime, endTime, attendees, purpose }, bookings = [], ignoreBookingId) {
  if (!room) return 'Select a room before confirming the booking.'
  if (!date || !startTime || !endTime) return 'Date and time must be selected.'
  if (!purpose?.trim()) return 'Purpose is required.'
  if (!attendees || Number(attendees) <= 0) return 'Attendee count must be greater than zero.'
  if (room.capacity && Number(attendees) > Number(room.capacity)) return `Attendees cannot exceed room capacity of ${room.capacity}.`
  if (isPastDate(date)) return 'Bookings cannot be created in the past.'
  if (!isValidTimeRange(startTime, endTime)) return 'Start time must be before end time.'
  if (!isWithinWorkingHours(startTime, endTime)) return 'Bookings are allowed only between 08:00 and 18:00.'
  const duration = durationInMinutes(startTime, endTime)
  if (duration < 30) return 'Bookings must be at least 30 minutes long.'
  if (duration > 240) return 'Bookings cannot exceed 4 hours.'
  if (roomHasConflict(room.id, date, startTime, endTime, bookings, ignoreBookingId)) {
    return 'This room is already booked during the selected time.'
  }
  return null
}
