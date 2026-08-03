import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { createBooking } from '../api/bookings'
import { MOCK_ROOMS, MODULES } from '../data/mockRooms'
import { Field, Input, Select, Textarea } from '../components/common/Input'
import Button from '../components/common/Button'
import Card from '../components/common/Card'

export default function BookRoom() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const preselectedRoom = MOCK_ROOMS.find((r) => r.id === searchParams.get('roomId'))

  const [form, setForm] = useState({
    title: '',
    purpose: '',
    module: preselectedRoom?.module || '',
    roomId: preselectedRoom?.id || '',
    date: '',
    startTime: '',
    endTime: '',
    attendees: '',
    notes: '',
  })
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)

  const roomsInModule = useMemo(
    () => MOCK_ROOMS.filter((r) => r.module === form.module),
    [form.module]
  )

  function update(key, value) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  function handleModuleChange(module) {
    setForm((f) => ({ ...f, module, roomId: '' }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)

    if (!form.roomId) return setError('Please select a room.')
    if (form.startTime && form.endTime && form.startTime >= form.endTime) {
      return setError('End time must be after start time.')
    }

    setSubmitting(true)
    try {
      await createBooking(form)
      setSuccess(true)
      setTimeout(() => navigate('/my-bookings'), 900)
    } catch (err) {
      setError(err.response?.data?.message || 'Could not create booking. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="font-display text-xl font-700">Book a Room</h1>

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
              <Select required value={form.module} onChange={(e) => handleModuleChange(e.target.value)}>
                <option value="">Select module</option>
                {MODULES.map((m) => <option key={m} value={m}>{m}</option>)}
              </Select>
            </Field>
            <Field label="Room">
              <Select required value={form.roomId} onChange={(e) => update('roomId', e.target.value)} disabled={!form.module}>
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

          <Field label="Notes">
            <Textarea rows={3} value={form.notes} onChange={(e) => update('notes', e.target.value)} placeholder="Anything the room admin should know" />
          </Field>

          {error && <p className="border border-clay px-3 py-2 text-sm text-clay">{error}</p>}
          {success && <p className="border border-moss px-3 py-2 text-sm text-moss">Booking confirmed — redirecting to My Bookings...</p>}

          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? 'Confirming...' : 'Confirm Booking'}
          </Button>
        </form>
      </Card>
    </div>
  )
}
