import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { createBooking, getMyBookings } from '../api/bookings'
import { getRoomById } from '../api/rooms'
import { MOCK_ROOMS, MODULES } from '../data/mockRooms'
import { Field, Input, Select } from '../components/common/Input'
import { useToast } from '../components/common/ToastProvider'
import { isRoomAvailable } from '../utils/availabilityChecker'
import Button from '../components/common/Button'
import Card from '../components/common/Card'
import Modal from '../components/common/Modal'

export default function BookRoom() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const roomIdParam = searchParams.get('roomId')

  const prefillDate = searchParams.get('date') || ''
  const prefillStart = searchParams.get('startTime') || ''
  const prefillEnd = searchParams.get('endTime') || ''
  const prefillAttendees = searchParams.get('attendees') || ''

  const [selectedRoom, setSelectedRoom] = useState(null)
  const [bookings, setBookings] = useState([])
  const [suggestions, setSuggestions] = useState([])
  const [form, setForm] = useState({
    title: '',
    module: '',
    roomId: '',
    date: prefillDate,
    startTime: prefillStart,
    endTime: prefillEnd,
    attendees: prefillAttendees,
    facilities: [],
  })
  const [submitting, setSubmitting] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const toast = useToast()

  useEffect(() => {
    let active = true
    if (roomIdParam) {
      getRoomById(roomIdParam)
        .then((room) => {
          if (active && room) {
            setSelectedRoom(room)
            setForm((current) => ({
              ...current,
              module: room.module || current.module,
              roomId: room.id,
              facilities: room.facilities || current.facilities,
            }))
          }
        })
        .catch(() => {})
    }
    return () => {
      active = false
    }
  }, [roomIdParam])

  useEffect(() => {
    getMyBookings().then(setBookings).catch(() => setBookings([]))
  }, [])

  const roomsInModule = useMemo(
    () => MOCK_ROOMS.filter((r) => r.module === form.module),
    [form.module]
  )

  const selectedRoomDetails = selectedRoom || MOCK_ROOMS.find((r) => r.id === form.roomId)

  function update(key, value) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  function handleModuleChange(module) {
    setForm((f) => ({ ...f, module, roomId: '', facilities: [] }))
    setSelectedRoom(null)
  }

  async function handleSubmit(e) {
    e.preventDefault()

    if (!form.roomId) {
      toast.addToast({ type: 'error', title: 'Please select a room.' })
      return
    }
    if (!form.title.trim()) {
      toast.addToast({ type: 'error', title: 'Meeting title is required.' })
      return
    }
    if (!form.date || !form.startTime || !form.endTime || !form.attendees) {
      toast.addToast({ type: 'error', title: 'Complete the date, time, and attendee details.' })
      return
    }
    if (form.startTime >= form.endTime) {
      toast.addToast({ type: 'error', title: 'End time must be after start time.' })
      return
    }

    const attendeeCount = Number(form.attendees)
    const roomCapacity = Number(selectedRoomDetails?.capacity || 0)
    if (attendeeCount > roomCapacity) {
      toast.addToast({
        type: 'error',
        title: `Selected room capacity is ${roomCapacity}. Entered attendees: ${attendeeCount}. Please choose a suitable room.`,
      })
      const recommended = MOCK_ROOMS.filter((room) =>
        room.capacity >= attendeeCount && room.id !== form.roomId &&
        isRoomAvailable(room.id, form.date, form.startTime, form.endTime, bookings)
      ).slice(0, 3)
      setSuggestions(recommended)
      return
    }

    setSuggestions([])
    setConfirming(true)
  }

  async function confirmBooking() {
    setConfirming(false)
    setSubmitting(true)
    try {
      await createBooking(form)
      toast.addToast({ type: 'success', title: 'Booking confirmed', message: 'Redirecting to My Bookings…' })
      setTimeout(() => navigate('/my-bookings'), 900)
    } catch (err) {
      toast.addToast({ type: 'error', title: err.message || 'Could not create booking. Please try again.' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="font-display text-xl font-700">Booking</h1>

      <Card>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Meeting Title">
            <Input required value={form.title} onChange={(e) => update('title', e.target.value)} placeholder="e.g. Sprint Planning" />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Module">
              <Select required value={form.module} onChange={(e) => handleModuleChange(e.target.value)} disabled={Boolean(selectedRoom)}>
                <option value="">Select module</option>
                {MODULES.map((m) => <option key={m} value={m}>{m}</option>)}
              </Select>
            </Field>
            <Field label="Room">
              <Select required value={form.roomId} onChange={(e) => update('roomId', e.target.value)} disabled={Boolean(selectedRoom) || !form.module}>
                <option value="">{form.module ? 'Select room' : 'Choose a module first'}</option>
                {roomsInModule.map((r) => (
                  <option key={r.id} value={r.id} disabled={r.status === 'Booked'}>
                    {r.name} ({r.code}) — cap {r.capacity} {r.status === 'Booked' ? '· Booked' : ''}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <Field label="Date">
              <Input type="date" required value={form.date} onChange={(e) => update('date', e.target.value)} />
            </Field>
            <Field label="Start Time">
              <Input type="time" required value={form.startTime} onChange={(e) => update('startTime', e.target.value)} />
            </Field>
            <Field label="End Time">
              <Input type="time" required value={form.endTime} onChange={(e) => update('endTime', e.target.value)} />
            </Field>
          </div>

          <Field label="Number of Attendees">
            <Input type="number" min="1" className="w-32" value={form.attendees} onChange={(e) => update('attendees', e.target.value)} />
          </Field>

          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? 'Confirming...' : 'Confirm Booking'}
          </Button>
        </form>
      </Card>

      {suggestions.length > 0 && (
        <Card>
          <div className="space-y-3">
            <p className="font-medium text-ink">Recommended Rooms</p>
            <p className="text-sm text-slate">Choose a room with enough capacity for your attendee count.</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {suggestions.map((room) => (
                <div key={room.id} className="rounded-2xl border border-line bg-white p-4">
                  <p className="font-semibold text-ink">{room.name}</p>
                  <p className="text-sm text-slate">{room.module} · {room.type}</p>
                  <p className="mt-2 text-sm text-slate">Capacity: {room.capacity}</p>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}

      <Modal
        open={confirming}
        title="Confirm booking"
        footer={<><Button variant="secondary" onClick={() => setConfirming(false)}>Back</Button><Button onClick={confirmBooking}>Confirm Booking</Button></>}
      >
        <div className="space-y-1">
          <p><strong>Room:</strong> {selectedRoomDetails?.name || 'Selected room'}</p>
          <p><strong>Module:</strong> {form.module}</p>
          <p><strong>Date & time:</strong> {form.date} · {form.startTime}–{form.endTime}</p>
          <p><strong>Duration:</strong> {form.startTime && form.endTime ? `${(new Date(`2000-01-01T${form.endTime}`) - new Date(`2000-01-01T${form.startTime}`)) / 3600000} hours` : ''}</p>
          <p><strong>Attendees:</strong> {form.attendees}</p>
        </div>
      </Modal>
    </div>
  )
}
