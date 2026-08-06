import { useEffect, useState } from 'react'
import { getMyBookings, cancelBooking, updateBooking } from '../api/bookings'
import Card from '../components/common/Card'
import StatusTag from '../components/common/StatusTag'
import Button from '../components/common/Button'
import Modal from '../components/common/Modal'
import { Field, Input } from '../components/common/Input'
import { useToast } from '../components/common/ToastProvider'

export default function MyBookings() {
  const [bookings, setBookings] = useState([])
  const [selected, setSelected] = useState(null)
  const [mode, setMode] = useState(null)
  const toast = useToast()

  const load = () => getMyBookings().then(setBookings).catch(() => setBookings([]))

  useEffect(() => {
    load()
  }, [])

  const isUpcomingBooking = (booking) => {
    if (booking.status === 'Cancelled') return false
    const today = new Date().toISOString().slice(0, 10)
    // consider bookings on or after today as upcoming
    return booking.date >= today
  }

  async function cancel() {
    if (!selected) return
    try {
      await cancelBooking(selected.id)
      setMode(null)
      toast.addToast({ type: 'success', title: 'Booking cancelled successfully.' })
      load()
    } catch (err) {
      toast.addToast({ type: 'error', title: err.message || 'Unable to cancel this booking.' })
    }
  }

  async function save(e) {
    e.preventDefault()
    if (!selected) return

    if (selected.startTime >= selected.endTime) {
      toast.addToast({ type: 'error', title: 'End time must be after start time.' })
      return
    }

    try {
      await updateBooking(selected.id, selected)
      setMode(null)
      toast.addToast({ type: 'success', title: 'Booking successfully rescheduled.' })
      load()
    } catch (err) {
      toast.addToast({ type: 'error', title: err.message || 'Selected room is unavailable. Please choose another available slot.' })
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-xl font-700">My Bookings</h1>
        <p className="text-sm text-slate">View, reschedule or cancel your workspace reservations.</p>
      </div>

      <Card className="overflow-x-auto p-0">
        <table className="w-full min-w-[760px] text-sm">
          <thead>
            <tr className="border-b border-line text-left font-mono text-[11px] uppercase tracking-wider text-slate">
              <th className="px-4 py-3">Booking ID</th>
              <th className="px-4 py-3">Room</th>
              <th className="px-4 py-3">Module</th>
              <th className="px-4 py-3">Room Type</th>
              <th className="px-4 py-3">Date / Time</th>
              <th className="px-4 py-3">Duration</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {bookings.map((b) => (
              <tr key={b.id} className="border-b border-line last:border-0">
                <td className="px-4 py-3 font-mono text-xs">{b.id}</td>
                <td className="px-4 py-3"><b>{b.roomName}</b><div className="text-xs text-slate">{b.title}</div></td>
                <td className="px-4 py-3">{b.module || '—'}</td>
                <td className="px-4 py-3">{b.roomType || '—'}</td>
                <td className="px-4 py-3">{b.date}<div className="text-xs text-slate">{b.startTime}–{b.endTime}</div></td>
                <td className="px-4 py-3">{b.startTime && b.endTime ? `${(new Date(`2000-01-01T${b.endTime}`) - new Date(`2000-01-01T${b.startTime}`)) / 3600000}h` : '—'}</td>
                <td className="px-4 py-3"><StatusTag status={b.status} /></td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <button onClick={() => { setSelected(b); setMode('view') }} className="mr-3 text-xs text-brand-blue hover:underline">View</button>
                  {isUpcomingBooking(b) && (
                    <>
                      <button onClick={() => { setSelected({ ...b }); setMode('edit') }} className="mr-3 text-xs text-brand-blue hover:underline">Edit</button>
                      <button onClick={() => { setSelected(b); setMode('cancel') }} className="text-xs text-clay hover:underline">Cancel</button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Modal open={mode === 'view'} title="Booking Details" footer={<Button onClick={() => setMode(null)}>Back</Button>}>
        {selected && (
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <dt>Booking ID</dt>
            <dd>{selected.id}</dd>
            <dt>Room / Building</dt>
            <dd>{selected.roomName} / SpaceBook Office</dd>
            <dt>Module / Floor</dt>
            <dd>{selected.module || '—'} / 1</dd>
            <dt>Date & Time</dt>
            <dd>{selected.date}, {selected.startTime}–{selected.endTime}</dd>
            <dt>Attendees</dt>
            <dd>{selected.attendees || '—'}</dd>
            <dt>Facilities</dt>
            <dd>{selected.facilities?.join(', ') || '—'}</dd>
            <dt>Organizer</dt>
            <dd>You</dd>
            <dt>Created / Updated</dt>
            <dd>{selected.createdDate || '—'} / {selected.updatedDate || '—'}</dd>
          </dl>
        )}
      </Modal>

      <Modal open={mode === 'cancel'} title="Cancel Booking" footer={<><Button variant="secondary" onClick={() => setMode(null)}>No</Button><Button onClick={cancel}>Yes</Button></>}>
        Are you sure you want to cancel this booking?
      </Modal>

      <Modal open={mode === 'edit'} title="Edit / Reschedule Booking" footer={null}>
        {selected && (
          <form onSubmit={save} className="space-y-3">
            <p className="text-xs text-slate">Booking ID: {selected.id} · Room: {selected.roomName} · Module: {selected.module}</p>
            <div className="grid grid-cols-3 gap-2">
              <Field label="Date"><Input type="date" value={selected.date} onChange={(e) => setSelected({ ...selected, date: e.target.value })} /></Field>
              <Field label="Start"><Input type="time" value={selected.startTime} onChange={(e) => setSelected({ ...selected, startTime: e.target.value })} /></Field>
              <Field label="End"><Input type="time" value={selected.endTime} onChange={(e) => setSelected({ ...selected, endTime: e.target.value })} /></Field>
            </div>
            <Field label="Attendees"><Input type="number" value={selected.attendees || ''} onChange={(e) => setSelected({ ...selected, attendees: e.target.value })} /></Field>
            {/* Facilities editing removed per request */}
            <div className="flex justify-end gap-2">
              <Button variant="secondary" type="button" onClick={() => setMode(null)}>Cancel</Button>
              <Button type="submit">Save changes</Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  )
}
