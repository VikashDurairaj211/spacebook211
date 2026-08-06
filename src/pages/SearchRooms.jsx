import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getRooms } from '../api/rooms'
import { MODULES, ROOM_TYPES } from '../data/mockRooms'
import { Field, Input, Select } from '../components/common/Input'
import CheckboxDropdown from '../components/common/CheckboxDropdown'
import Button from '../components/common/Button'
import Card from '../components/common/Card'
import Loader from '../components/common/Loader'
import StatusTag from '../components/common/StatusTag'
import Modal from '../components/common/Modal'
import { getMyBookings } from '../api/bookings'
import { filterRoomsByCriteria, isRoomAvailable } from '../utils/availabilityChecker'

const FACILITY_OPTIONS = [
  { key: 'whiteboard', label: 'Whiteboard & Marker' },
  { key: 'tv', label: 'TV & Remote' },
  { key: 'camera', label: 'Camera' },
  { key: 'mic', label: 'Mic' },
]

const INITIAL_FILTERS = { module: '', type: '', capacity: '', date: '', startTime: '', endTime: '', whiteboard: false, tv: false, camera: false, mic: false }

export default function SearchRooms() {
  const [filters, setFilters] = useState(INITIAL_FILTERS)
  const [results, setResults] = useState([])
  const [searched, setSearched] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [bookings, setBookings] = useState([])
  const [resultsOpen, setResultsOpen] = useState(false)

  useEffect(() => {
    getMyBookings().then(setBookings).catch(() => setBookings([]))
  }, [])

  const canChooseType = Boolean(filters.module)
  const canChooseFacilities = canChooseType && Boolean(filters.type)
  const canSearch = canChooseFacilities && filters.date && filters.startTime && filters.endTime && Number(filters.capacity) > 0

  function updateFilter(key, value) {
    setFilters((currentFilters) => {
      const nextFilters = { ...currentFilters, [key]: value }
      if (key === 'module') Object.assign(nextFilters, { type: '', whiteboard: false, tv: false, camera: false, mic: false })
      if (key === 'type') Object.assign(nextFilters, { whiteboard: false, tv: false, camera: false, mic: false })
      return nextFilters
    })
    setError('')
  }

  async function handleSearch(event) {
    event.preventDefault()
    if (!canSearch) return setError('Complete each search field to view available rooms.')
    if (filters.startTime >= filters.endTime) return setError('End time must be after start time.')

    setLoading(true)
    setError('')
    try {
      const latestBookings = await getMyBookings()
      setBookings(latestBookings)
      const rooms = await getRooms(filters)
      const availableRooms = filterRoomsByCriteria(rooms, latestBookings, filters)
      setResults(availableRooms)
      setSearched(false)
      setResultsOpen(true)
    } catch {
      setError('Rooms could not be loaded. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  function roomDetailsLink(roomId) {
    const parameters = new URLSearchParams({ roomId, date: filters.date, startTime: filters.startTime, endTime: filters.endTime, attendees: filters.capacity })
    return `/room-details?${parameters.toString()}`
  }

  function bookRoomLink(roomId) {
    const parameters = new URLSearchParams({ roomId, date: filters.date, startTime: filters.startTime, endTime: filters.endTime, attendees: filters.capacity })
    return `/book-room?${parameters.toString()}`
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-xl font-700">Search Rooms</h1>
        <p className="mt-1 text-sm text-slate">Set your meeting requirements to find available rooms.</p>
      </div>

      <Card>
        <form onSubmit={handleSearch} className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Field label="1. Select Module"><Select value={filters.module} onChange={(event) => updateFilter('module', event.target.value)}><option value="">Select module</option>{MODULES.map((module) => <option key={module} value={module}>{module}</option>)}</Select></Field>
            <Field label="2. Select Room Type"><Select disabled={!canChooseType} value={filters.type} onChange={(event) => updateFilter('type', event.target.value)}><option value="">{canChooseType ? 'Select room type' : 'Choose a module first'}</option>{ROOM_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}</Select></Field>
            <Field label="3. Number of Attendees"><Input disabled={!canChooseFacilities} type="number" min="1" value={filters.capacity} onChange={(event) => updateFilter('capacity', event.target.value)} placeholder={canChooseFacilities ? 'e.g. 6' : 'Choose a room type first'} /></Field>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Field label="4. Select Facilities">
              <CheckboxDropdown
                options={FACILITY_OPTIONS}
                values={filters}
                onChange={(key, value) => updateFilter(key, value)}
                disabled={!canChooseFacilities}
                placeholder="Choose facilities"
              />
            </Field>
            <Field label="5. Select Date"><Input disabled={!canChooseFacilities} min={new Date().toISOString().slice(0, 10)} type="date" value={filters.date} onChange={(event) => updateFilter('date', event.target.value)} className="rounded-[8px] border border-slate-200 px-3 py-3 text-sm" /></Field>
            <Field label="6. Select Start Time"><Input disabled={!filters.date} type="time" value={filters.startTime} onChange={(event) => updateFilter('startTime', event.target.value)} className="rounded-[8px] border border-slate-200 px-3 py-3 text-sm" /></Field>
            <Field label="7. Select End Time"><Input disabled={!filters.startTime} type="time" value={filters.endTime} onChange={(event) => updateFilter('endTime', event.target.value)} className="rounded-[8px] border border-slate-200 px-3 py-3 text-sm" /></Field>
          </div>

          {error && <p role="alert" className="rounded-lg border border-clay bg-red-50 px-3 py-2 text-sm text-clay">{error}</p>}
          <Button type="submit" disabled={!canSearch || loading}>{loading ? 'Searching...' : 'Search Available Rooms'}</Button>
        </form>
      </Card>

      <Card className="overflow-hidden p-0">
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <div><h2 className="font-display text-lg font-700">My Bookings</h2><p className="text-sm text-slate">Your upcoming workspace reservations.</p></div>
          <Link to="/my-bookings" className="text-sm font-semibold text-brand-blue hover:underline">View all</Link>
        </div>
        {bookings.length === 0 ? <p className="px-4 py-5 text-sm text-slate">You do not have any bookings yet.</p> : <div className="divide-y divide-line">{bookings.filter((booking) => booking.status !== 'Cancelled').slice(0, 3).map((booking) => <div key={booking.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"><div><p className="font-semibold text-ink">{booking.roomName}</p><p className="text-sm text-slate">{booking.title || 'Room booking'} · {booking.date} · {booking.startTime}–{booking.endTime}</p></div><StatusTag status={booking.status} /></div>)}</div>}
      </Card>

      {loading && <Loader label="Finding rooms that match your requirements..." />}
      <Modal open={resultsOpen && !loading} title="Available rooms" footer={<Button variant="secondary" onClick={() => setResultsOpen(false)}>Close</Button>}>
        <p className="mb-4">{results.length} room{results.length === 1 ? '' : 's'} available for your selected time.</p>
        {results.length === 0 ? <p>Try another time, room type, or a smaller attendee count.</p> : <div className="max-h-[55vh] space-y-3 overflow-y-auto pr-1">{results.map((room) => {
          const available = isRoomAvailable(room.id, filters.date, filters.startTime, filters.endTime, bookings) && room.status !== 'Booked'
          return <div key={room.id} className="border border-line p-3"><div className="flex items-start justify-between gap-3"><div><p className="font-display font-700 text-ink">{room.name}</p><p className="font-mono text-[11px] text-slate">{room.code}, {room.module}, {room.type}</p></div><StatusTag status={available ? 'Available' : 'Booked'} /></div><p className="mt-2 text-sm">Capacity: {room.capacity}. Facilities: {room.facilities?.join(', ') || 'None'}</p>{available && <Link to={bookRoomLink(room.id)} onClick={() => setResultsOpen(false)}><Button className="mt-3 w-full">Book this room</Button></Link>}</div>
        })}</div>}
      </Modal>
      {searched && !loading && <div><p className="mb-3 font-mono text-[11px] uppercase tracking-wider text-slate">{results.length} available room{results.length === 1 ? '' : 's'} found</p>{results.length === 0 ? <Card><p className="font-medium text-ink">No rooms match these requirements.</p><p className="mt-1 text-sm text-slate">Try another time, room type, or a smaller attendee count.</p></Card> : <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{results.map((room) => { const available = isRoomAvailable(room.id, filters.date, filters.startTime, filters.endTime, bookings) && room.status !== 'Booked'; return (<Card key={room.id}><div className="mb-2 flex items-start justify-between"><div><p className="font-display text-sm font-700">{room.name}</p><p className="font-mono text-[11px] text-slate">{room.code}</p></div><StatusTag status={available ? 'Available' : 'Booked'} /></div><p className="text-sm text-slate">{room.module} · {room.type}</p><p className="mb-2 text-sm text-slate">Capacity: {room.capacity}</p><p className="mb-4 text-sm text-slate">Facilities: {room.facilities?.join(', ') || 'None'}</p><Link to={available ? bookRoomLink(room.id) : roomDetailsLink(room.id)}><Button variant={available ? 'primary' : 'secondary'} className="w-full" disabled={!available}>{available ? 'Book Now' : 'View Room Details'}</Button></Link></Card>) })}</div>}</div>}
    </div>
  )
}
