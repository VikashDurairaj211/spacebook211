import React from 'react'
import { Link } from 'react-router-dom'
import Card from '../common/Card'
import StatusTag from '../common/StatusTag'

const TIME_SLOTS = [
  { label: '08:00–09:00', start: '08:00', end: '09:00' },
  { label: '09:00–10:00', start: '09:00', end: '10:00' },
  { label: '10:00–11:00', start: '10:00', end: '11:00' },
  { label: '11:00–12:00', start: '11:00', end: '12:00' },
  { label: '12:00–13:00', start: '12:00', end: '13:00' },
  { label: '13:00–14:00', start: '13:00', end: '14:00' },
  { label: '14:00–15:00', start: '14:00', end: '15:00' },
  { label: '15:00–16:00', start: '15:00', end: '16:00' },
  { label: '16:00–17:00', start: '16:00', end: '17:00' },
  { label: '17:00–18:00', start: '17:00', end: '18:00' },
]

function timeToMinutes(value) {
  const [hours, minutes] = value.split(':').map(Number)
  return hours * 60 + minutes
}

function overlaps(slot, booking) {
  const slotStart = timeToMinutes(slot.start)
  const slotEnd = timeToMinutes(slot.end)
  const bookingStart = timeToMinutes(booking.startTime)
  const bookingEnd = timeToMinutes(booking.endTime)
  return slotStart < bookingEnd && bookingStart < slotEnd
}

function RoomCard({ room, bookings = [] }) {
  const hasBooking = bookings.length > 0
  const availableSlots = TIME_SLOTS.filter((slot) => !bookings.some((booking) => overlaps(slot, booking)))

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-display text-sm font-700 text-ink">{room.name}</p>
          <p className="font-mono text-[11px] text-slate">{room.module} · {room.type}</p>
          <p className="mt-2 text-sm text-slate">Capacity: {room.capacity}</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <StatusTag status={hasBooking ? 'Booked' : 'Available'} />
        </div>
      </div>

      <div className="mt-3 rounded-xl border border-line bg-portal-bg px-3 py-2">
        <div className="flex items-center justify-between">
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-slate">Availability</p>
          <span className="text-xs text-slate">{availableSlots.length} open slots</span>
        </div>

        {availableSlots.length > 0 ? (
          <div className="mt-3 space-y-2">
            {availableSlots.slice(0, 3).map((slot) => (
              <div key={slot.label} className="flex items-center justify-between rounded-lg border border-line bg-white px-3 py-2">
                <div>
                  <p className="text-sm font-medium text-ink">{slot.label}</p>
                  <p className="text-xs text-slate">Open for booking</p>
                </div>
                <Link to="/book-room" className="rounded-lg border border-ink px-2 py-1 text-xs text-ink hover:bg-ink hover:text-paper">
                  Book
                </Link>
              </div>
            ))}
            {availableSlots.length > 3 && <p className="text-xs text-slate">More slots available later in the day.</p>}
          </div>
        ) : (
          <p className="mt-3 text-sm text-slate">No open time slots for this room today.</p>
        )}
      </div>

      {hasBooking && (
        <div className="mt-3 space-y-2">
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-slate">Booked today</p>
          {bookings.map((b) => (
            <div key={b.id} className="rounded-lg border border-line px-3 py-2 text-sm">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-700 text-sm text-ink">{b.title}</div>
                  <div className="font-mono text-xs text-slate">{b.startTime} – {b.endTime}</div>
                </div>
                <div className="font-mono text-xs text-slate">{b.status}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}

export default function AvailabilityGrid({ rooms = [], bookings = [] }) {
  const bookingsByRoom = bookings.reduce((acc, booking) => {
    const roomKey = booking.roomId || booking.roomName
    acc[roomKey] = acc[roomKey] || []
    acc[roomKey].push(booking)
    return acc
  }, {})

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {rooms.map((room) => (
        <RoomCard
          key={room.id}
          room={room}
          bookings={bookingsByRoom[room.id] || bookingsByRoom[room.name] || []}
        />
      ))}
    </div>
  )
}
