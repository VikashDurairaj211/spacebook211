import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { createBooking } from '../api/bookings'
import { getRoomAvailability } from '../api/rooms'
import { Field, Input, Select } from '../components/common/Input'
import { useToast } from '../components/common/ToastProvider'
import Button from '../components/common/Button'
import Card from '../components/common/Card'
import Modal from '../components/common/Modal'

export default function BookRoom() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const roomIdParam = searchParams.get('roomId')

  const prefillDate = searchParams.get('date') || new Date().toISOString().slice(0, 10)
  const prefillStart = searchParams.get('startTime') || ''
  const prefillEnd = searchParams.get('endTime') || ''
  const prefillAttendees = searchParams.get('attendees') || '1'

  const [availableRooms, setAvailableRooms] = useState([])
  const [loadingRooms, setLoadingRooms] = useState(false)
  const [form, setForm] = useState({
    title: '',
    module: '',
    roomId: roomIdParam || '',
    date: prefillDate,
    startTime: prefillStart,
    endTime: prefillEnd,
    attendees: prefillAttendees,
  })
  const [submitting, setSubmitting] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const toast = useToast()

  // Load real rooms from backend API
  useEffect(() => {
    let active = true
    setLoadingRooms(true)
    getRoomAvailability(form.date)
      .then((rooms) => {
        if (!active) return
        setAvailableRooms(rooms || [])

        if (roomIdParam) {
          const matchedRoom = (rooms || []).find(
            (r) => String(r.roomId) === String(roomIdParam)
          )
          if (matchedRoom) {
            setForm((f) => ({
              ...f,
              module: matchedRoom.module || f.module,
              roomId: String(matchedRoom.roomId),
            }))
          }
        }
      })
      .catch((err) => console.error('Failed to load rooms:', err))
      .finally(() => {
        if (active) setLoadingRooms(false)
      })

    return () => {
      active = false
    }
  }, [form.date, roomIdParam])

  // Extract unique modules dynamically from actual DB rooms
  const modules = useMemo(() => {
    const list = availableRooms.map((r) => r.module).filter(Boolean)
    return [...new Set(list)]
  }, [availableRooms])

  // Get rooms belonging to the selected module
  const roomsInModule = useMemo(() => {
    if (!form.module) return []
    return availableRooms.filter((r) => r.module === form.module)
  }, [availableRooms, form.module])

  const selectedRoomDetails = useMemo(() => {
    return availableRooms.find((r) => String(r.roomId) === String(form.roomId))
  }, [availableRooms, form.roomId])

  function update(key, value) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  function handleModuleChange(module) {
    setForm((f) => ({ ...f, module, roomId: '' }))
  }

  async function handleSubmit(e) {
    e.preventDefault()

    if (!form.module) {
      toast.addToast({ type: 'error', title: 'Please select a module.' })
      return
    }
    if (!form.roomId) {
      toast.addToast({ type: 'error', title: 'Please select a room.' })
      return
    }
    if (!form.title.trim()) {
      toast.addToast({ type: 'error', title: 'Meeting title is required.' })
      return
    }
    if (!form.date || !form.startTime || !form.endTime || !form.attendees) {
      toast.addToast({ type: 'error', title: 'Complete all date, time, and attendee details.' })
      return
    }

    if (
    selectedRoomDetails &&
    Number(form.attendees) > Number(selectedRoomDetails.capacity)
  ) {
    toast.addToast({
      type: 'error',
      title: `This room can accommodate only ${selectedRoomDetails.capacity} participants.`,
      message: `You entered ${form.attendees} participants. Please select another room or reduce the number of attendees.`
    })
    return
  }

    if (form.startTime >= form.endTime) {
      toast.addToast({ type: 'error', title: 'End time must be after start time.' })
      return
    }
    const OFFICE_START_TIME = '09:00'
    const OFFICE_END_TIME = '18:00'

    if (form.startTime < OFFICE_START_TIME) {
      toast.addToast({
        type: 'error',
        title: 'Bookings are allowed only between 09:00 AM and 06:00 PM.'
      })
      return
    }

    if (form.endTime > OFFICE_END_TIME) {
      toast.addToast({
        type: 'error',
        title: 'Bookings are allowed only between 09:00 AM and 06:00 PM.'
      })
      return
    }

    setConfirming(true)
  }

  async function confirmBooking() {
    setConfirming(false)
    setSubmitting(true)
    try {
      const payload = {
        roomId: Number(form.roomId),
        bookingDate: form.date,
        startTime: form.startTime.length === 5 ? `${form.startTime}:00` : form.startTime,
        endTime: form.endTime.length === 5 ? `${form.endTime}:00` : form.endTime,
        purpose: form.title.trim(), // Connects Meeting Title input to API Purpose field
        participantCount: Number(form.attendees),
        facilityIds: [],
      }

      await createBooking(payload)
      toast.addToast({
        type: 'success',
        title: 'Booking confirmed',
        message: 'Redirecting to My Bookings…',
      })
      setTimeout(() => navigate('/my-bookings'), 900)
    } catch (err) {
      let errorMessage = 'Could not create booking. Please try again.'
      const responseData = err.response?.data

      if (responseData?.errors) {
        errorMessage = Object.values(responseData.errors).flat().join(' ')
      } else if (responseData?.message || responseData?.title) {
        errorMessage = responseData.message || responseData.title
      }

      toast.addToast({ type: 'error', title: errorMessage })
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
            <Input
              required
              value={form.title}
              onChange={(e) => update('title', e.target.value)}
              placeholder="e.g. sprint"
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Module">
              <Select
                required
                value={form.module}
                onChange={(e) => handleModuleChange(e.target.value)}
                disabled={loadingRooms}
              >
                <option value="">
                  {loadingRooms ? 'Loading modules...' : 'Select module'}
                </option>
                {modules.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Room">
              <Select
                required
                value={form.roomId}
                onChange={(e) => update('roomId', e.target.value)}
                disabled={!form.module || loadingRooms}
              >
                <option value="">
                  {form.module ? 'Select room' : 'Choose a module first'}
                </option>
                {roomsInModule.map((r, index) => (
                  <option key={r.roomId} value={r.roomId}>
                    {r.roomName || `Room ${index + 1}`} (Cap: {r.capacity})
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <Field label="Date">
              <Input
                type="date"
                required
                value={form.date}
                onChange={(e) => update('date', e.target.value)}
              />
            </Field>
            <Field label="Start Time">
              <Input
                type="time"
                required
                value={form.startTime}
                onChange={(e) => update('startTime', e.target.value)}
              />
            </Field>
            <Field label="End Time">
              <Input
                type="time"
                required
                value={form.endTime}
                onChange={(e) => update('endTime', e.target.value)}
              />
            </Field>
          </div>

          <Field label="Number of Attendees">
            <Input
              type="number"
              min="1"
              max={selectedRoomDetails?.capacity}
              className="w-32"
              value={form.attendees}
              onChange={(e) => update('attendees', e.target.value)}
            />
            {selectedRoomDetails && (
              <p className="mt-1 text-sm text-slate-500">
                Maximum capacity for this room:{" "}
                <span className="font-semibold">
                  {selectedRoomDetails.capacity}
                </span>{" "}
                participants
              </p>
            )}

            {selectedRoomDetails &&
              Number(form.attendees) > Number(selectedRoomDetails.capacity) && (
                <p className="mt-1 text-sm font-medium text-red-600">
                  ⚠ Number of participants cannot exceed the room capacity of{" "}
                  {selectedRoomDetails.capacity}.
                </p>
              )}
          </Field>

          <Button type="submit" className="w-full" disabled={submitting ||
            (selectedRoomDetails && Number(form.attendees) > Number(selectedRoomDetails.capacity))
          }
          >
            {submitting ? 'Confirming...' : 'Confirm Booking'}
          </Button>
        </form>
      </Card>

      {/* Confirmation Modal */}
      <Modal
        open={confirming}
        title="Confirm booking"
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirming(false)}>
              Back
            </Button>
            <Button onClick={confirmBooking}>Confirm Booking</Button>
          </>
        }
      >
        <div className="space-y-1">
          <p>
            <strong>Meeting Title:</strong> {form.title}
          </p>
          <p>
            <strong>Room:</strong> {selectedRoomDetails?.roomName || 'Selected room'}
          </p>
          <p>
            <strong>Module:</strong> {form.module}
          </p>
          <p>
            <strong>Date & time:</strong> {form.date} · {form.startTime}–{form.endTime}
          </p>
          <p>
            <strong>Attendees:</strong> {form.attendees}
          </p>
        </div>
      </Modal>
    </div>
  )
}