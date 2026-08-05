import { useEffect, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import Card from '../components/common/Card'
import Button from '../components/common/Button'
import AvailabilityGrid from '../components/calendar/AvailabilityGrid'
import roomsData from '../data/rooms.json'
import bookingsData from '../data/bookings.json'
import { getRooms } from '../api/rooms'
import { getMyBookings } from '../api/bookings'
import { formatDate } from '../utils/formatters'

export default function AvailabilityCalendar() {
  const today = new Date().toISOString().slice(0, 10)
  const [selectedDate, setSelectedDate] = useState(today)
  const [rooms, setRooms] = useState(roomsData)
  const [bookings, setBookings] = useState(bookingsData)

  useEffect(() => {
    getRooms().then(setRooms).catch(() => setRooms(roomsData))
    getMyBookings().then(setBookings).catch(() => setBookings(bookingsData))
  }, [])

  const bookingsForDate = useMemo(() => bookings.filter((b) => b.date === selectedDate), [bookings, selectedDate])

  function changeDays(delta) {
    const d = new Date(selectedDate)
    d.setDate(d.getDate() + delta)
    setSelectedDate(d.toISOString().slice(0, 10))
  }

  return (
    <div className="space-y-6">
      <div className="mb-2">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-xl font-700">Availability Calendar</h1>
            <p className="mt-1 text-sm text-slate">Browse room availability for a chosen date.</p>
          </div>

          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={() => changeDays(-1)}><ChevronLeft size={16} /></Button>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="border border-line bg-white px-3 py-2 text-sm text-ink"
            />
            <Button variant="ghost" onClick={() => changeDays(1)}><ChevronRight size={16} /></Button>
            <div className="ml-4 font-mono text-sm text-slate">{formatDate(selectedDate)}</div>
          </div>
        </div>
      </div>

      <Card>
        <AvailabilityGrid rooms={rooms} bookings={bookingsForDate} date={selectedDate} />
      </Card>
    </div>
  )
}
