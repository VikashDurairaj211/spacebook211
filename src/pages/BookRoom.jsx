import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { createBooking } from '../api/bookings'
import { getRoomById } from '../api/rooms'
import { MOCK_ROOMS, MODULES } from '../data/mockRooms'
import { Field, Input, Select } from '../components/common/Input'
import { useToast } from '../components/common/ToastProvider'
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
  const [form, setForm] = useState({
    title: '',
    purpose: '',
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
    if (!form.purpose.trim()) {
      toast.addToast({ type: 'error', title: 'Purpose is required.' })
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

      {selectedRoomDetails && (
        <Card>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="font-display text-sm font-700">{selectedRoomDetails.name}</p>
              <p className="text-sm text-slate">{selectedRoomDetails.code} · {selectedRoomDetails.module} · {selectedRoomDetails.type}</p>
            </div>
            <div className="space-y-2 rounded-xl border border-line bg-portal-bg p-4 text-sm">
              <div><strong>Capacity:</strong> {selectedRoomDetails.capacity}</div>
              <div><strong>Facilities:</strong> {selectedRoomDetails.facilities?.join(', ') || 'None'}</div>
              <div><strong>Selected date:</strong> {form.date || 'Not selected'}</div>
              <div><strong>Selected time:</strong> {form.startTime && form.endTime ? `${form.startTime}–${form.endTime}` : 'Not selected'}</div>
            </div>
          </div>
        </Card>
      )}

      <Card>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Meeting Title">
            <Input required value={form.title} onChange={(e) => update('title', e.target.value)} placeholder="e.g. Sprint Planning" />
          </Field>

          <Field label="Purpose">
            <Input value={form.purpose} onChange={(e) => update('purpose', e.target.value)} placeholder="Brief reason for the meeting" />
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
          <p><strong>Purpose:</strong> {form.purpose || 'Not provided'}</p>
          <p><strong>Attendees:</strong> {form.attendees}</p>
        </div>
      </Modal>
    </div>
  )
}
