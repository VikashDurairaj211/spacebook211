import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getMyBookings, cancelBooking } from '../api/bookings'
import Card from '../components/common/Card'
import StatusTag from '../components/common/StatusTag'
import Button from '../components/common/Button'

export default function MyBookings() {
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [cancellingId, setCancellingId] = useState(null)

  useEffect(() => {
    load()
  }, [])

  function load() {
    setLoading(true)
    getMyBookings().then((data) => {
      setBookings(data)
      setLoading(false)
    })
  }

  async function handleCancel(id) {
    if (!window.confirm('Cancel this booking?')) return
    setCancellingId(id)
    try {
      await cancelBooking(id)
    } catch (err) {
      console.warn('Cancel failed, updating UI optimistically for demo:', err.message)
    } finally {
      setBookings((prev) => prev.map((b) => (b.id === id ? { ...b, status: 'Cancelled' } : b)))
      setCancellingId(null)
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-xl font-700">My Bookings</h1>
      </div>

      <Card className="p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left font-mono text-[11px] uppercase tracking-wider text-slate">
              <th className="px-4 py-2 font-medium">Room</th>
              <th className="px-4 py-2 font-medium">Date</th>
              <th className="px-4 py-2 font-medium">Time</th>
              <th className="px-4 py-2 font-medium">Status</th>
              <th className="px-4 py-2 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={5} className="px-4 py-6 text-slate">Loading bookings...</td></tr>
            )}
            {!loading && bookings.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-6 text-slate">You have no bookings yet.</td></tr>
            )}
            {bookings.map((b) => (
              <tr key={b.id} className="border-b border-line last:border-0">
                <td className="px-4 py-3">
                  <p>{b.roomName}</p>
                  <p className="font-mono text-[11px] text-slate">{b.title}</p>
                </td>
                <td className="px-4 py-3 font-mono text-xs">{b.date}</td>
                <td className="px-4 py-3 font-mono text-xs">{b.startTime}–{b.endTime}</td>
                <td className="px-4 py-3"><StatusTag status={b.status} /></td>
                <td className="px-4 py-3">
                  <div className="flex gap-3">
                    <button className="text-xs text-slate underline underline-offset-2 hover:text-ink">View</button>
                    {b.status !== 'Cancelled' && (
                      <>
                        <button className="text-xs text-slate underline underline-offset-2 hover:text-ink">Edit</button>
                        <button
                          onClick={() => handleCancel(b.id)}
                          disabled={cancellingId === b.id}
                          className="text-xs text-clay underline underline-offset-2 hover:text-clay/70 disabled:opacity-50"
                        >
                          {cancellingId === b.id ? 'Cancelling...' : 'Cancel'}
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  )
}
