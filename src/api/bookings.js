import client from './client'
import { MOCK_ROOMS } from '../data/mockRooms'
import { validateBookingRequest } from '../utils/bookingValidator'
import { today, normalizeDate } from '../utils/dateUtils'

// Expected .NET endpoint: GET /api/bookings/my
// Response: Booking[] -> { id, roomId, roomName, date, startTime, endTime, status, title }
export async function getMyBookings() {
  const local = localStorage.getItem('spacebook_bookings')
  if (local) return JSON.parse(local)
  try {
    const { data } = await client.get('/bookings/my')
    return data
  } catch (err) {
    console.warn('[bookings.getMyBookings] API unavailable, using mock data:', err.message)
    return MOCK_BOOKINGS
  }
}

function persistBookings(bookings) {
  localStorage.setItem('spacebook_bookings', JSON.stringify(bookings))
}

function findRoom(roomId) {
  return MOCK_ROOMS.find((item) => item.id === roomId)
}

// Expected .NET endpoint: POST /api/bookings
// Body: { title, roomId, date, startTime, endTime, attendees, notes }
export async function createBooking(payload) {
  const bookings = await getMyBookings()
  const room = findRoom(payload.roomId)
  const validationError = validateBookingRequest(
    { room, date: normalizeDate(payload.date), startTime: payload.startTime, endTime: payload.endTime, attendees: payload.attendees },
    bookings
  )
  if (validationError) throw new Error(validationError)

  const booking = {
    ...payload,
    id: `BK-${Date.now()}`,
    roomName: room?.name || 'Room',
    roomType: room?.type || '',
    facilities: room?.facilities || [],
    status: 'Confirmed',
    createdDate: new Date().toLocaleDateString(),
    updatedDate: new Date().toLocaleDateString(),
  }

  const nextBookings = [...bookings, booking]
  persistBookings(nextBookings)
  return booking
}

// Expected .NET endpoint: PUT /api/bookings/{id}
export async function updateBooking(id, payload) {
  const bookings = await getMyBookings()
  const existing = bookings.find((item) => item.id === id)
  if (!existing) throw new Error('Booking not found.')
  const room = findRoom(payload.roomId || existing.roomId)
  const validationError = validateBookingRequest(
    { room, date: normalizeDate(payload.date || existing.date), startTime: payload.startTime || existing.startTime, endTime: payload.endTime || existing.endTime, attendees: payload.attendees ?? existing.attendees, purpose: payload.purpose || existing.purpose || existing.title },
    bookings,
    id
  )
  if (validationError) throw new Error(validationError)

  const next = bookings.map((booking) =>
    booking.id === id
      ? {
          ...booking,
          ...payload,
          roomName: room?.name || booking.roomName,
          roomType: room?.type || booking.roomType,
          facilities: room?.facilities || booking.facilities,
          updatedDate: new Date().toLocaleDateString(),
        }
      : booking
  )
  persistBookings(next)
  return next.find((booking) => booking.id === id)
}

// Expected .NET endpoint: DELETE /api/bookings/{id}  (or PATCH status=Cancelled)
export async function cancelBooking(id) {
  const bookings = await getMyBookings()
  const booking = bookings.find((item) => item.id === id)
  if (!booking) throw new Error('Booking not found.')

  const now = new Date()
  const bookingStart = new Date(`${normalizeDate(booking.date)}T${booking.startTime}`)
  if (bookingStart <= now) {
    throw new Error('Bookings that have already started cannot be cancelled.')
  }

  const next = bookings.map((item) => (item.id === id ? { ...item, status: 'Cancelled', updatedDate: new Date().toLocaleDateString() } : item))
  persistBookings(next)
  return true
}

// Fallback data so the UI is demoable before the backend is wired up.
const MOCK_BOOKINGS = [
  { id: 'b1', roomId: 'r1', roomName: 'Conference Room 1', roomType: 'Conference', module: 'Module 1', title: 'Sprint Planning', purpose: 'Team sync', date: today(), startTime: '10:00', endTime: '11:00', attendees: 8, facilities: ['Whiteboard & Marker', 'TV & Remote'], status: 'Confirmed', createdDate: today(), updatedDate: today() },
  { id: 'b2', roomId: 'r6', roomName: 'Discussion Room 2', roomType: 'Discussion', module: 'Module 2', title: '1:1 with Manager', purpose: 'Career discussion', date: today(), startTime: '14:00', endTime: '15:00', attendees: 2, facilities: ['Mic'], status: 'Pending', createdDate: today(), updatedDate: today() },
  { id: 'b3', roomId: 'r9', roomName: 'Training Room 1', roomType: 'Training', module: 'Module 2', title: 'Onboarding Session', purpose: 'New hire training', date: '2026-08-01', startTime: '09:00', endTime: '10:00', attendees: 12, facilities: ['Whiteboard & Marker', 'TV & Remote', 'Mic'], status: 'Cancelled', createdDate: '2026-07-28', updatedDate: '2026-08-01' },
]
