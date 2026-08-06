import { useMemo, useState } from 'react'
import Card from '../../components/common/Card'
import Button from '../../components/common/Button'
import Modal from '../../components/common/Modal'
import { bookings as BOOKINGS } from '../../services/mockData'

// Equal-width Status Badge Component matching the design
function CustomStatusTag({ status }) {
  const normalized = status?.toUpperCase()

  let bgClass = 'bg-[#5c7a60] text-white' // Green (Confirmed / Approved)

  if (normalized === 'PENDING') {
    bgClass = 'bg-[#e5a038] text-white' // Yellow/Orange
  } else if (normalized === 'CANCELLED' || normalized === 'REJECTED') {
    bgClass = 'bg-[#be534d] text-white' // Red/Terracotta
  }

  return (
    <span
      className={`inline-flex items-center justify-center min-w-[110px] rounded-full px-3 py-1 text-[11px] font-semibold tracking-wider text-center ${bgClass}`}
    >
      {normalized}
    </span>
  )
}

export default function BookingManagement() {
  const [bookings, setBookings] = useState(() => BOOKINGS)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [selectedBooking, setSelectedBooking] = useState(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

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

  function openViewModal(booking) {
    setSelectedBooking(booking)
    setIsModalOpen(true)
  }

  function closeModal() {
    setIsModalOpen(false)
    setSelectedBooking(null)
  }

  function handleApprove(bookingId) {
    setBookings((previous) =>
      previous.map((booking) =>
        booking.id === bookingId ? { ...booking, status: 'Confirmed' } : booking
      )
    )
    setSelectedBooking((prev) => prev && { ...prev, status: 'Confirmed' })
  }

  function handleReject(bookingId) {
    setBookings((previous) =>
      previous.map((booking) =>
        booking.id === bookingId ? { ...booking, status: 'Cancelled' } : booking
      )
    )
    setSelectedBooking((prev) => prev && { ...prev, status: 'Cancelled' })
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-ink bg-white p-5">
        <h1 className="font-display text-xl font-700 text-ink">Booking Management</h1>
        <p className="mt-2 text-sm text-slate">Review, filter, and take action on room bookings for the workplace.</p>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <Card>
          <p className="font-mono text-[11px] uppercase tracking-wider text-slate">Pending Requests</p>
          <p className="mt-2 text-3xl font-700 text-[#e5a038]">{statusCounts.Pending}</p>
          <p className="mt-1 text-sm text-slate">Awaiting admin approval</p>
        </Card>
        <Card>
          <p className="font-mono text-[11px] uppercase tracking-wider text-slate">Confirmed</p>
          <p className="mt-2 text-3xl font-700 text-[#5c7a60]">{statusCounts.Confirmed}</p>
          <p className="mt-1 text-sm text-slate">Approved and scheduled bookings</p>
        </Card>
        <Card>
          <p className="font-mono text-[11px] uppercase tracking-wider text-slate">Cancelled</p>
          <p className="mt-2 text-3xl font-700 text-[#be534d]">{statusCounts.Cancelled}</p>
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
              className="rounded-xl border border-line bg-portal-bg px-3 py-2 text-sm text-ink outline-none focus:border-portal-accent"
            />
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="rounded-xl border border-line bg-white px-3 py-2 text-sm text-ink outline-none"
            >
              {statuses.map((status) => (
                <option key={status}>{status}</option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      <Card className="overflow-x-auto">
        <table className="w-full min-w-[920px] text-left text-sm">
          <thead>
            <tr className="border-b border-line text-[11px] font-bold uppercase tracking-wider text-slate">
              <th className="px-4 py-3">Booking Name</th>
              <th className="px-4 py-3">Room</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Time</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {filteredBookings.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-slate">No booking requests match the current filters.</td>
              </tr>
            ) : (
              filteredBookings.map((booking) => (
                <tr key={booking.id} className="transition-colors duration-200 hover:bg-portal-bg/70">
                  <td className="px-4 py-3.5 font-medium text-ink whitespace-nowrap">{booking.title}</td>
                  <td className="px-4 py-3.5 text-slate whitespace-nowrap">{booking.roomName}</td>
                  <td className="px-4 py-3.5 text-slate whitespace-nowrap">{booking.date}</td>
                  <td className="px-4 py-3.5 text-slate whitespace-nowrap">{booking.startTime}–{booking.endTime}</td>
                  <td className="px-4 py-3.5 whitespace-nowrap">
                    <CustomStatusTag status={booking.status} />
                  </td>
                  <td className="px-4 py-3.5 whitespace-nowrap">
                    <div className="flex items-center gap-3 font-serif text-sm">
                      <button
                        onClick={() => openViewModal(booking)}
                        className="text-ink hover:underline"
                      >
                        View
                      </button>
                      {booking.status === 'Pending' && (
                        <>
                          <button
                            onClick={() => handleApprove(booking.id)}
                            className="text-[#5c7a60] hover:underline font-medium"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleReject(booking.id)}
                            className="text-[#be534d] hover:underline"
                          >
                            Reject
                          </button>
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

      {selectedBooking && (
        <Modal
          open={isModalOpen}
          onClose={closeModal}
          title="Booking Details"
          footer={
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="secondary" onClick={closeModal}>Close</Button>
              {selectedBooking.status === 'Pending' && (
                <>
                  <Button size="sm" onClick={() => handleApprove(selectedBooking.id)}>Approve</Button>
                  <Button size="sm" variant="danger" onClick={() => handleReject(selectedBooking.id)}>Reject</Button>
                </>
              )}
            </div>
          }
        >
          <div className="space-y-3 text-sm text-slate">
            <div>
              <h3 className="font-medium text-ink">{selectedBooking.title}</h3>
              <p className="text-xs uppercase tracking-[0.2em] text-slate">Booking Name</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <p className="font-medium text-ink">Room</p>
                <p>{selectedBooking.roomName}</p>
              </div>
              <div>
                <p className="font-medium text-ink">Date</p>
                <p>{selectedBooking.date}</p>
              </div>
              <div>
                <p className="font-medium text-ink">Time</p>
                <p>{selectedBooking.startTime}–{selectedBooking.endTime}</p>
              </div>
              <div>
                <p className="font-medium text-ink">Status</p>
                <CustomStatusTag status={selectedBooking.status} />
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}