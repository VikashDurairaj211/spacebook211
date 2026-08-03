import { useMemo, useState } from 'react'
import Card from '../../components/common/Card'
import Button from '../../components/common/Button'
import StatusTag from '../../components/common/StatusTag'
import { bookings as BOOKINGS } from '../../services/mockData'

export default function BookingManagement() {
  const bookings = useMemo(() => BOOKINGS, [])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')

  const statuses = useMemo(
    () => ['All', ...new Set(bookings.map((booking) => booking.status))],
    [bookings]
  )

  const filteredBookings = useMemo(() => {
    return bookings.filter((booking) => {
      const text = [booking.roomName, booking.title, booking.date, booking.status]
        .join(' ')
        .toLowerCase()
      const matchesSearch = text.includes(search.toLowerCase())
      const matchesStatus = statusFilter === 'All' || booking.status === statusFilter
      return matchesSearch && matchesStatus
    })
  }, [bookings, search, statusFilter])

  const statusCounts = useMemo(
    () => bookings.reduce((acc, booking) => {
      acc[booking.status] = (acc[booking.status] || 0) + 1
      return acc
    }, { Pending: 0, Confirmed: 0, Cancelled: 0 }),
    [bookings]
  )

  return (
    <div className="space-y-6">
      <div className="border border-ink bg-white p-5">
        <h1 className="font-display text-xl font-700 text-ink">Booking Management</h1>
        <p className="mt-2 text-sm text-slate">Review, filter, and take action on room bookings for the workplace.</p>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <Card>
          <p className="font-mono text-[11px] uppercase tracking-wider text-slate">Pending Requests</p>
          <p className="mt-2 text-3xl font-700 text-clay">{statusCounts.Pending}</p>
          <p className="mt-1 text-sm text-slate">Awaiting admin approval</p>
        </Card>
        <Card>
          <p className="font-mono text-[11px] uppercase tracking-wider text-slate">Confirmed</p>
          <p className="mt-2 text-3xl font-700 text-moss">{statusCounts.Confirmed}</p>
          <p className="mt-1 text-sm text-slate">Approved and scheduled bookings</p>
        </Card>
        <Card>
          <p className="font-mono text-[11px] uppercase tracking-wider text-slate">Cancelled</p>
          <p className="mt-2 text-3xl font-700 text-slate">{statusCounts.Cancelled}</p>
          <p className="mt-1 text-sm text-slate">Bookings that were cancelled</p>
        </Card>
      </div>

      <Card>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="font-display text-sm font-700 text-ink">Booking Requests</h2>
            <p className="text-sm text-slate">Filter requests to approve, reject, or inspect booking details.</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by room, title, or date"
              className="rounded-sm border border-line bg-portal-bg px-3 py-2 text-sm text-ink outline-none focus:border-portal-accent"
            />
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="rounded-sm border border-line bg-white px-3 py-2 text-sm text-ink outline-none"
            >
              {statuses.map((status) => (
                <option key={status}>{status}</option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      <Card className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead>
            <tr className="border-b border-line text-[11px] uppercase tracking-[0.2em] text-slate">
              <th className="px-4 py-3">Booking</th>
              <th className="px-4 py-3">Room</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Time</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredBookings.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-slate">No booking requests match the current filters.</td>
              </tr>
            ) : (
              filteredBookings.map((booking) => (
                <tr key={booking.id} className="border-b border-line last:border-0">
                  <td className="px-4 py-3 font-medium text-ink">{booking.title}</td>
                  <td className="px-4 py-3 text-slate">{booking.roomName}</td>
                  <td className="px-4 py-3 text-slate">{booking.date}</td>
                  <td className="px-4 py-3 text-slate">{booking.startTime}–{booking.endTime}</td>
                  <td className="px-4 py-3"><StatusTag status={booking.status} /></td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" variant="secondary">View</Button>
                      {booking.status === 'Pending' && (
                        <>
                          <Button size="sm">Approve</Button>
                          <Button size="sm" variant="danger">Reject</Button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </Card>
    </div>
  )
}
