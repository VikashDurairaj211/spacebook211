import { useState } from 'react'
import { Link } from 'react-router-dom'
import { getRooms } from '../api/rooms'
import { MOCK_ROOMS, MODULES, ROOM_TYPES } from '../data/mockRooms'
import { Field, Input, Select } from '../components/common/Input'
import Button from '../components/common/Button'
import Card from '../components/common/Card'
import StatusTag from '../components/common/StatusTag'

const FACILITY_OPTIONS = [
  { key: 'whiteboard', label: 'Whiteboard & Marker', value: 'Whiteboard & Marker' },
  { key: 'tv', label: 'TV & Remote', value: 'TV & Remote' },
  { key: 'camera', label: 'Camera', value: 'Camera' },
  { key: 'mic', label: 'Mic', value: 'Mic' },
]

export default function SearchRooms() {
  const [filters, setFilters] = useState({
    module: '',
    type: '',
    capacity: '',
    date: '',
    startTime: '',
    endTime: '',
    whiteboard: false,
    tv: false,
    camera: false,
    mic: false,
  })
  const [results, setResults] = useState(MOCK_ROOMS)
  const [searched, setSearched] = useState(false)

  function updateFilter(key, value) {
    setFilters((f) => ({ ...f, [key]: value }))
  }

  async function handleSearch(e) {
    e.preventDefault()
    const data = await getRooms(filters)
    setResults(data)
    setSearched(true)
  }

  return (
    <div className="space-y-6">
      <h1 className="font-display text-xl font-700">Search Rooms</h1>

      <form onSubmit={handleSearch} className="border border-line bg-white p-4">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
          <Field label="Office / Module">
            <Select value={filters.module} onChange={(e) => updateFilter('module', e.target.value)}>
              <option value="">Any</option>
              {MODULES.map((m) => <option key={m} value={m}>{m}</option>)}
            </Select>
          </Field>
          <Field label="Room Type">
            <Select value={filters.type} onChange={(e) => updateFilter('type', e.target.value)}>
              <option value="">Any</option>
              {ROOM_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </Select>
          </Field>
          <Field label="No. of attendees">
            <Input
              type="number"
              min="1"
              placeholder="e.g. 6"
              value={filters.capacity}
              onChange={(e) => updateFilter('capacity', e.target.value)}
            />
          </Field>
        </div>

        <details className="mt-4 rounded-lg border border-line bg-slate-50 p-3">
          <summary className="cursor-pointer mb-3 font-medium">Facilities (click to expand)</summary>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            {FACILITY_OPTIONS.map((facility) => (
              <label key={facility.key} className="inline-flex items-center gap-2 rounded-lg border border-line px-3 py-2 text-sm hover:border-brand-blue">
                <input
                  type="checkbox"
                  checked={filters[facility.key]}
                  onChange={(e) => updateFilter(facility.key, e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-brand-blue focus:ring-brand-blue"
                />
                <span>{facility.label}</span>
              </label>
            ))}

            <div className="md:col-span-2 lg:col-span-2 grid grid-cols-3 gap-3 items-end">
              <div>
                <label className="block text-sm text-slate">Date</label>
                <Input type="date" value={filters.date} onChange={(e) => updateFilter('date', e.target.value)} />
              </div>
              <div>
                <label className="block text-sm text-slate">Start Time</label>
                <Input type="time" value={filters.startTime} onChange={(e) => updateFilter('startTime', e.target.value)} />
              </div>
              <div>
                <label className="block text-sm text-slate">End Time</label>
                <Input type="time" value={filters.endTime} onChange={(e) => updateFilter('endTime', e.target.value)} />
              </div>
            </div>
          </div>
        </details>

        <Button type="submit" className="mt-4">Search</Button>
      </form>

      <div>
        <p className="mb-3 font-mono text-[11px] uppercase tracking-wider text-slate">
          {searched ? `${results.length} room(s) found` : `Showing all ${results.length} rooms`}
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {results.map((room) => (
            <Card key={room.id}>
              <div className="mb-2 flex items-start justify-between">
                <div>
                  <p className="font-display text-sm font-700">{room.name}</p>
                  <p className="font-mono text-[11px] text-slate">{room.code}</p>
                </div>
                <StatusTag status={room.status} />
              </div>
              <p className="text-sm text-slate">{room.module} · {room.type}</p>
              <p className="mb-2 text-sm text-slate">Capacity: {room.capacity}</p>
              <p className="mb-4 text-sm text-slate">Facilities: {room.facilities?.join(', ') || 'None'}</p>
              <Link to={`/book-room?roomId=${encodeURIComponent(room.id)}&date=${encodeURIComponent(filters.date||'')}&startTime=${encodeURIComponent(filters.startTime||'')}&endTime=${encodeURIComponent(filters.endTime||'')}&attendees=${encodeURIComponent(filters.capacity||'')}`}>
                <Button variant="secondary" className="w-full" disabled={room.status === 'Booked'}>
                  {room.status === 'Booked' ? 'Unavailable' : 'Book This Room'}
                </Button>
              </Link>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
