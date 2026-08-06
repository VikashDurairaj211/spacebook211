import { useEffect, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import Button from '../components/common/Button'
import Modal from '../components/common/Modal'
import AvailabilityGrid from '../components/calendar/AvailabilityGrid'
import roomsData from '../data/rooms.json'
import bookingsData from '../data/bookings.json'
import { getRooms } from '../api/rooms'
import { getMyBookings } from '../api/bookings'
import { Field, Input, Select } from '../components/common/Input'

const ROOM_TYPE_OPTIONS = ['All Rooms', 'Conference', 'Discussion', 'Training']
// facility filters removed — facilities remain a read-only room attribute

function localDate(value = new Date()) {
  const offset = value.getTimezoneOffset() * 60000
  return new Date(value.getTime() - offset).toISOString().slice(0, 10)
}

export default function AvailabilityCalendar() {
  const today = localDate()
  const [selectedDate, setSelectedDate] = useState(today)
  const [rooms, setRooms] = useState(roomsData)
  const [bookings, setBookings] = useState(bookingsData)
  const [filters, setFilters] = useState({ type: 'All Rooms', capacity: '', startTime: '', endTime: '' })
  const [selectedSlot, setSelectedSlot] = useState(null)

  useEffect(() => {
    getRooms().then(setRooms).catch(() => setRooms(roomsData))
    getMyBookings().then(setBookings).catch(() => setBookings(bookingsData))
  }, [])

  const now = new Date()
  const nowMinutes = now.getHours() * 60 + now.getMinutes()
  const filteredRooms = useMemo(() => {
    return rooms.filter((room) => {
      if (filters.type !== 'All Rooms' && room.type !== filters.type) return false
      if (filters.capacity && room.capacity < Number(filters.capacity)) return false
      return true
    })
  }, [filters, rooms])

  const bookingsForDate = useMemo(() => bookings.filter((booking) => booking.date === selectedDate), [bookings, selectedDate])
  const selectedDateIsToday = selectedDate === today

  function updateFilter(key, value) {
    setFilters((current) => ({ ...current, [key]: value }))
  }

  function changeDays(delta) {
    const next = new Date(`${selectedDate}T12:00:00`)
    next.setDate(next.getDate() + delta)
    const nextDate = localDate(next)
    if (nextDate >= today) setSelectedDate(nextDate)
  }

  function handleDateChange(value) {
    if (value >= today) setSelectedDate(value)
  }

  function bookingLink(slot) {
    const params = new URLSearchParams({ roomId: slot.room.id, date: selectedDate, startTime: slot.slot.start, endTime: slot.slot.end, attendees: String(filters.capacity || 1) })
    return `/book-room?${params.toString()}`
  }

  const modalTitle = selectedSlot?.status === 'Available' ? 'Book this room' : selectedSlot?.status === 'Pending' ? 'Pending approval' : selectedSlot?.status === 'Completed' ? 'Booking history' : 'Booking details'

  return <div className="space-y-6">
    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      <div><h1 className="font-display text-2xl font-700 text-ink">Room Availability</h1><p className="mt-1 text-sm text-slate">Find the right workspace and book an available time slot.</p></div>
      <div className="flex flex-nowrap items-center gap-3">
        <Button variant="secondary" onClick={() => changeDays(-1)} disabled={selectedDate <= today} aria-label="Previous day"><ChevronLeft size={16} /></Button>
        <input type="date" min={today} value={selectedDate} onChange={(event) => handleDateChange(event.target.value)} className="min-w-[170px] rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink" />
        <Button variant="secondary" onClick={() => changeDays(1)} aria-label="Next day"><ChevronRight size={16} /></Button>
        <Select value={filters.type} onChange={(event) => updateFilter('type', event.target.value)} className="w-auto min-w-[170px] max-w-[220px] rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink">
          {ROOM_TYPE_OPTIONS.map((type) => <option key={type} value={type}>{type}</option>)}
        </Select>
      </div>
    </div>

    <AvailabilityGrid rooms={filteredRooms} bookings={bookingsForDate} date={selectedDate} isToday={selectedDateIsToday} nowMinutes={nowMinutes} onSelectSlot={setSelectedSlot} />

    <Modal open={Boolean(selectedSlot)} title={modalTitle} footer={<><Button variant="secondary" onClick={() => setSelectedSlot(null)}>Close</Button>{selectedSlot?.status === 'Available' && <Link to={bookingLink(selectedSlot)}><Button onClick={() => setSelectedSlot(null)}>Continue to booking</Button></Link>}</>}>
      {selectedSlot && <div className="space-y-2"><p className="font-display text-base font-700 text-ink">{selectedSlot.room.name}</p><p>{selectedSlot.room.type} · Capacity {selectedSlot.room.capacity}</p><p>{selectedDate}, {selectedSlot.slot.start} - {selectedSlot.slot.end}</p><p>Facilities: {selectedSlot.room.facilities?.join(', ') || 'None'}</p><p>Status: <strong>{selectedSlot.status}</strong></p>{selectedSlot.booking && <p>Booking: {selectedSlot.booking.title || 'Reserved workspace'}</p>}</div>}
    </Modal>
  </div>
}
