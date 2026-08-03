import client from './client'

// Expected .NET endpoint: GET /api/bookings/my
// Response: Booking[] -> { id, roomId, roomName, date, startTime, endTime, status, title }
export async function getMyBookings() {
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
  const { data } = await client.post('/bookings', payload)
  return data
}

// Expected .NET endpoint: PUT /api/bookings/{id}
export async function updateBooking(id, payload) {
  const { data } = await client.put(`/bookings/${id}`, payload)
  return data
}

// Expected .NET endpoint: DELETE /api/bookings/{id}  (or PATCH status=Cancelled)
export async function cancelBooking(id) {
  const { data } = await client.delete(`/bookings/${id}`)
  return data
}

// Fallback data so the UI is demoable before the backend is wired up.
const MOCK_BOOKINGS = [
  { id: 'b1', roomId: 'r1', roomName: 'Conference Room 1', module: 'Module 1', title: 'Sprint Planning', date: '2026-08-05', startTime: '10:00', endTime: '11:00', status: 'Confirmed' },
  { id: 'b2', roomId: 'r6', roomName: 'Discussion Room 2', module: 'Module 2', title: '1:1 with Manager', date: '2026-08-06', startTime: '14:00', endTime: '15:00', status: 'Pending' },
  { id: 'b3', roomId: 'r9', roomName: 'Training Room 1', module: 'Module 2', title: 'Onboarding Session', date: '2026-08-01', startTime: '09:00', endTime: '10:00', status: 'Cancelled' },
]
