import roomsData from '../data/rooms.json'
import bookingsData from '../data/bookings.json'
import notificationsData from '../data/notifications.json'
import userData from '../data/user.json'
import meetingScheduleData from '../data/meetingSchedule.json'

export const rooms = roomsData
export const bookings = bookingsData
export const notifications = notificationsData
export const user = userData
export const meetingSchedule = meetingScheduleData

export function getRooms() {
  return rooms
}

export function getBookings() {
  return bookings
}

export function getNotifications() {
  return notifications
}

export function getUser() {
  return user
}

export function getMeetingSchedule() {
  return meetingSchedule
}
