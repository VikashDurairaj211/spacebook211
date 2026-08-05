import client from './client'
import { MOCK_ROOMS } from '../data/mockRooms'

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

// Expected .NET endpoint: POST /api/bookings
// Body: { title, purpose, roomId, date, startTime, endTime, attendees, notes }
export async function createBooking(payload) {
  const room = MOCK_ROOMS.find((item) => item.id === payload.roomId)
  const bookings = await getMyBookings()
  const overlaps = bookings.some((booking) => booking.roomId === payload.roomId && booking.date === payload.date && booking.status !== 'Cancelled' && payload.startTime < booking.endTime && payload.endTime > booking.startTime)
  if (overlaps) throw new Error('Selected room is unavailable. Please choose another available slot.')
  const booking = { ...payload, id: `BK-${Date.now()}`, roomName: room?.name || 'Room', roomType: room?.type || '', facilities: room?.facilities || [], status: 'Confirmed', createdDate: new Date().toLocaleDateString(), updatedDate: new Date().toLocaleDateString() }
  localStorage.setItem('spacebook_bookings', JSON.stringify([...bookings, booking]))
  return booking
}

// Expected .NET endpoint: PUT /api/bookings/{id}
export async function updateBooking(id, payload) {
  const bookings = await getMyBookings(); const existing = bookings.find((item) => item.id === id)
  const overlaps = bookings.some((booking) => booking.id !== id && booking.roomId === existing?.roomId && booking.date === payload.date && booking.status !== 'Cancelled' && payload.startTime < booking.endTime && payload.endTime > booking.startTime)
  if (overlaps) throw new Error('Selected room is unavailable. Please choose another available slot.')
  const next = bookings.map((booking) => booking.id === id ? { ...booking, ...payload, updatedDate: new Date().toLocaleDateString() } : booking); localStorage.setItem('spacebook_bookings', JSON.stringify(next)); return next.find((booking) => booking.id === id)
}

// Expected .NET endpoint: DELETE /api/bookings/{id}  (or PATCH status=Cancelled)
export async function cancelBooking(id) {
  const bookings = await getMyBookings(); const next = bookings.map((booking) => booking.id === id ? { ...booking, status: 'Cancelled' } : booking); localStorage.setItem('spacebook_bookings', JSON.stringify(next)); return true
}

// Fallback data so the UI is demoable before the backend is wired up.
const MOCK_BOOKINGS = [
  { id: 'b1', roomId: 'r1', roomName: 'Conference Room 1', module: 'Module 1', title: 'Sprint Planning', date: '2026-08-05', startTime: '10:00', endTime: '11:00', status: 'Confirmed' },
  { id: 'b2', roomId: 'r6', roomName: 'Discussion Room 2', module: 'Module 2', title: '1:1 with Manager', date: '2026-08-06', startTime: '14:00', endTime: '15:00', status: 'Pending' },
  { id: 'b3', roomId: 'r9', roomName: 'Training Room 1', module: 'Module 2', title: 'Onboarding Session', date: '2026-08-01', startTime: '09:00', endTime: '10:00', status: 'Cancelled' },
]
