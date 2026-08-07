import { useEffect, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import Button from '../components/common/Button'
import Modal from '../components/common/Modal'
import AvailabilityGrid from '../components/calendar/AvailabilityGrid'
import { getRoomAvailability } from '../api/rooms'
import { Select } from '../components/common/Input'

const ROOM_TYPE_OPTIONS = ['All Rooms', 'Conference', 'Discussion', 'Training']

function localDate(value = new Date()) {
  const offset = value.getTimezoneOffset() * 60000
  return new Date(value.getTime() - offset).toISOString().slice(0, 10)
}

export default function AvailabilityCalendar() {
  const today = localDate()
  const [selectedDate, setSelectedDate] = useState(today)
  const [rooms, setRooms] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [filters, setFilters] = useState({ type: 'All Rooms', capacity: '', startTime: '', endTime: '' })
  const [selectedSlot, setSelectedSlot] = useState(null)

  // Fetch live availability from backend when selectedDate changes
  useEffect(() => {
    let isMounted = true
    setLoading(true)
    setError(null)

    getRoomAvailability(selectedDate)
      .then((data) => {
        if (!isMounted) return
        
        // Map backend schema to front-end expected properties for AvailabilityGrid
        const mappedRooms = (data || []).map((room) => ({
          ...room,
          id: room.roomId,
          name: room.roomName,
          type: room.roomType,
          facilities: room.facilities || [],
        }))
        
        setRooms(mappedRooms)
      })
      .catch((err) => {
        if (isMounted) setError('Failed to load room availability.')
        console.error('Availability fetch error:', err)
      })
      .finally(() => {
        if (isMounted) setLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [selectedDate])

  const now = new Date()
  const nowMinutes = now.getHours() * 60 + now.getMinutes()

  const filteredRooms = useMemo(() => {
    return rooms.filter((room) => {
      if (filters.type !== 'All Rooms' && room.type !== filters.type) return false
      if (filters.capacity && room.capacity < Number(filters.capacity)) return false
      return true
    })
  }, [filters, rooms])

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
    const params = new URLSearchParams({
      roomId: slot.room.id,
      date: selectedDate,
      startTime: slot.slot.start,
      endTime: slot.slot.end,
      attendees: String(filters.capacity || 1)
    })
    return `/book-room?${params.toString()}`
  }

  const modalTitle = selectedSlot?.status === 'Available'
    ? 'Book this room'
    : selectedSlot?.status === 'Pending'
    ? 'Pending approval'
    : selectedSlot?.status === 'Completed'
    ? 'Booking history'
    : 'Booking details'

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="font-display text-2xl font-700 text-ink">Room Availability</h1>
          <p className="mt-1 text-sm text-slate">Find the right workspace and book an available time slot.</p>
        </div>
        
        <div className="flex flex-nowrap items-center gap-3">
          <Button variant="secondary" onClick={() => changeDays(-1)} disabled={selectedDate <= today} aria-label="Previous day">
            <ChevronLeft size={16} />
          </Button>
          <input
            type="date"
            min={today}
            value={selectedDate}
            onChange={(event) => handleDateChange(event.target.value)}
            className="min-w-[170px] rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink"
          />
          <Button variant="secondary" onClick={() => changeDays(1)} aria-label="Next day">
            <ChevronRight size={16} />
          </Button>
          <Select
            value={filters.type}
            onChange={(event) => updateFilter('type', event.target.value)}
            className="w-auto min-w-[170px] max-w-[220px] rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink"
          >
            {ROOM_TYPE_OPTIONS.map((type) => (
              <option key={type} value={type}>{type}</option>
            ))}
          </Select>
        </div>
      </div>

      {loading && <div className="p-8 text-center text-sm text-slate">Loading calendar schedule...</div>}
      {error && <div className="p-8 text-center text-sm text-red-500">{error}</div>}

      {!loading && !error && (
        <AvailabilityGrid
          rooms={filteredRooms}
          bookings={[]}
          date={selectedDate}
          isToday={selectedDateIsToday}
          nowMinutes={nowMinutes}
          onSelectSlot={setSelectedSlot}
        />
      )}

      <Modal
        open={Boolean(selectedSlot)}
        title={modalTitle}
        footer={
          <>
            <Button variant="secondary" onClick={() => setSelectedSlot(null)}>Close</Button>
            {selectedSlot?.status === 'Available' && (
              <Link to={bookingLink(selectedSlot)}>
                <Button onClick={() => setSelectedSlot(null)}>Continue to booking</Button>
              </Link>
            )}
          </>
        }
      >
        {selectedSlot && (
          <div className="space-y-2">
            <p className="font-display text-base font-700 text-ink">{selectedSlot.room.name}</p>
            <p>{selectedSlot.room.type} · Capacity {selectedSlot.room.capacity}</p>
            <p>{selectedDate}, {selectedSlot.slot.start} - {selectedSlot.slot.end}</p>
            <p>Facilities: {selectedSlot.room.facilities?.join(', ') || 'None'}</p>
            <p>Status: <strong>{selectedSlot.status}</strong></p>
            {selectedSlot.booking && <p>Booking: {selectedSlot.booking.title || 'Reserved workspace'}</p>}
          </div>
        )}
      </Modal>
    </div>
  )
}