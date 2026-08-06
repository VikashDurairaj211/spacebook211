import { CalendarDays, Clock3, MapPin, Users } from 'lucide-react'
import StatusTag from '../common/StatusTag'
import Button from '../common/Button'

export const TIME_SLOTS = [
  { start: '08:00', end: '09:00' }, { start: '09:00', end: '10:00' },
  { start: '10:00', end: '11:00' }, { start: '11:00', end: '12:00' },
  { start: '12:00', end: '13:00' }, { start: '13:00', end: '14:00' },
  { start: '14:00', end: '15:00' }, { start: '15:00', end: '16:00' },
  { start: '16:00', end: '17:00' }, { start: '17:00', end: '18:00' },
]

const toMinutes = (time) => {
  const [hours, minutes] = time.split(':').map(Number)
  return hours * 60 + minutes
}

const overlaps = (slot, booking) => toMinutes(slot.start) < toMinutes(booking.endTime) && toMinutes(booking.startTime) < toMinutes(slot.end)

function slotStatus(slot, room, bookings) {
  const booking = bookings.find((item) => (item.roomId === room.id || item.roomName === room.name) && item.status !== 'Cancelled' && overlaps(slot, item))
  if (!booking) return { status: 'Available', booking: null }
  if (booking.status === 'Pending') return { status: 'Pending', booking }
  if (booking.status === 'Completed') return { status: 'Completed', booking }
  return { status: 'Booked', booking }
}

function formatTime(time) {
  const [hour, minute] = time.split(':').map(Number)
  const suffix = hour >= 12 ? 'PM' : 'AM'
  return `${hour % 12 || 12}:${String(minute).padStart(2, '0')} ${suffix}`
}

function formatDate(date) {
  return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(`${date}T12:00:00`))
}

function floor(room) {
  const match = room.module?.match(/\d+/)
  return `Floor ${match?.[0] || '1'}`
}

export default function AvailabilityGrid({ rooms, bookings, date, isToday, nowMinutes, onSelectSlot }) {
  const cards = rooms.flatMap((room) => TIME_SLOTS
    .filter((slot) => !isToday || toMinutes(slot.end) > nowMinutes)
    .map((slot) => ({ room, slot, ...slotStatus(slot, room, bookings) })))
    .sort((a, b) => toMinutes(a.slot.start) - toMinutes(b.slot.start) || a.room.name.localeCompare(b.room.name) || a.status.localeCompare(b.status))

  if (!cards.length) return <div className="rounded-2xl border border-dashed border-line bg-white p-10 text-center"><p className="font-display text-lg font-700 text-ink">No rooms available for the selected criteria.</p><p className="mt-2 text-sm text-slate">Try changing the date, room type, capacity, time, or facilities.</p></div>

  return <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
    {cards.map(({ room, slot, status, booking }) => <article key={`${room.id}-${slot.start}`} className="group flex min-h-[350px] flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-lg">
      <div className="flex items-start justify-between gap-3"><div><h2 className="font-display text-base font-700 text-ink">{room.name}</h2><p className="mt-1 text-sm text-slate">{room.type} · {room.code}</p></div><StatusTag status={status} /></div>
      <div className="mt-5 space-y-3 border-y border-slate-100 py-4 text-sm text-slate">
        <p className="flex items-center gap-2"><CalendarDays size={16} className="text-brand-blue" />{formatDate(date)}</p>
        <p className="flex items-center gap-2"><Clock3 size={16} className="text-brand-blue" />{formatTime(slot.start)} - {formatTime(slot.end)}</p>
        <p className="flex items-center gap-2"><Users size={16} className="text-brand-blue" />Capacity: {room.capacity}</p>
        <p className="flex items-center gap-2"><MapPin size={16} className="text-brand-blue" />{floor(room)}</p>
      </div>
      <div className="mt-4 flex-1"><p className="font-mono text-[11px] uppercase tracking-wider text-slate">Facilities</p><ul className="mt-2 space-y-1 text-sm text-ink">{(room.facilities || []).map((facility) => <li key={facility}>• {facility}</li>)}</ul></div>
      <Button className="mt-5 w-full" variant={status === 'Available' ? 'primary' : 'secondary'} onClick={() => onSelectSlot({ room, slot, status, booking })}>{status === 'Available' ? 'Book Now' : status === 'Pending' ? 'Pending Approval' : status === 'Completed' ? 'View History' : 'View Details'}</Button>
    </article>)}
  </div>
}
