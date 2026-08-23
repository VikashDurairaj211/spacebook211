import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import client from '../../api/client'
import { deleteAdminBooking } from '../../api/adminBookings'

import Card from '../../components/common/Card'
import Button from '../../components/common/Button'
import Modal from '../../components/common/Modal'

// =====================================================
// Status Badge
// =====================================================

function CustomStatusTag({ status }) {
  const normalized = status?.toUpperCase()

  let bgClass = 'bg-[#658362] text-white'

  if (normalized === 'PENDING') {
    bgClass = 'bg-[#E09F3E] text-white'
  } else if (
    normalized === 'CANCELLED' ||
    normalized === 'REJECTED'
  ) {
    bgClass = 'bg-[#B85450] text-white'
  }

  return (
    <span
      className={`inline-block w-28 py-1 rounded-full text-xs font-bold tracking-wider uppercase text-center ${bgClass}`}
    >
      {normalized || 'CONFIRMED'}
    </span>
  )
}

// =====================================================
// Booking Management
// =====================================================

export default function BookingManagement() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [search, setSearch] = useState('')

  useEffect(() => {
    const searchFromUrl = searchParams.get('search') || ''
    setSearch(searchFromUrl)
  }, [searchParams])

  const handleSearchChange = (val) => {
    setSearch(val)
    const newParams = new URLSearchParams(searchParams)
    if (val && val.trim()) {
      newParams.set('search', val)
    } else {
      newParams.delete('search')
    }
    setSearchParams(newParams, { replace: true })
  }

  const [statusFilter, setStatusFilter] = useState('All')
  const [dateFilter, setDateFilter] = useState('All')

  const [selectedBooking, setSelectedBooking] = useState(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  // =====================================================
  // Status Counts
  // =====================================================

  const [statusCounts, setStatusCounts] = useState({
    Pending: 0,
    Confirmed: 0,
    Cancelled: 0,
  })

  // =====================================================
  // Fetch Booking Data
  // =====================================================

  const fetchBookingData = async () => {
    try {
      setLoading(true)
      setError('')

      const token = localStorage.getItem('spacebook_token')

      if (!token) {
        setError('You are not logged in.')
        return
      }

      console.log(
        'Fetching admin booking data from Render API...'
      )

      const [statsRes, bookingsRes] = await Promise.all([
        client.get('/admin/bookings/dashboard'),
        client.get('/admin/bookings'),
      ])

      console.log(
        'Booking dashboard response:',
        statsRes.data
      )

      console.log(
        'Bookings response:',
        bookingsRes.data
      )

      // =====================================================
      // Dashboard Statistics
      // =====================================================

      if (statsRes.data) {
        setStatusCounts({
          Pending:
            statsRes.data.pendingRequests ??
            statsRes.data.pendingCount ??
            statsRes.data.Pending ??
            statsRes.data.pending ??
            0,

          Confirmed:
            statsRes.data.confirmed ??
            statsRes.data.confirmedCount ??
            statsRes.data.Confirmed ??
            statsRes.data.confirmedBookings ??
            0,

          Cancelled:
            statsRes.data.cancelled ??
            statsRes.data.cancelledCount ??
            statsRes.data.Cancelled ??
            statsRes.data.cancelledBookings ??
            0,
        })
      }

      // =====================================================
      // Booking List
      // =====================================================

      const bookingData = Array.isArray(bookingsRes.data)
        ? bookingsRes.data
        : bookingsRes.data?.data ||
          bookingsRes.data?.bookings ||
          []

      // =====================================================
      // Map Backend Response
      // =====================================================

      const mappedBookings = bookingData.map((b) => ({
        // Booking ID
        bookingId: b.bookingId ?? b.id,

        // Keep id for compatibility
        id: b.bookingId ?? b.id,

        // Meeting title
        title:
          b.title ??
          b.purpose ??
          b.meetingTitle ??
          'Reserved Workspace',

        // Room
        roomName:
          b.roomName ??
          b.room?.name ??
          `Room ${b.roomId ?? ''}`,

        // Module
        module:
          b.module ??
          b.moduleName ??
          b.room?.module ??
          'N/A',

        // Date
        date:
          b.bookingDate ??
          b.date ??
          '',

        // Start time
        startTime: b.startTime
          ? String(b.startTime).substring(0, 5)
          : '',

        // End time
        endTime: b.endTime
          ? String(b.endTime).substring(0, 5)
          : '',

        // Employee / creator
        createdBy:
          b.requestedBy ??
          b.createdBy ??
          b.requester ??
          b.employeeName ??
          b.employee?.name ??
          'Employee',

        // Status
        status:
          b.status ??
          'Pending',
      }))

      console.log(
        'Mapped bookings:',
        mappedBookings
      )

      setBookings(mappedBookings)

    } catch (err) {
      console.error(
        'Failed to load booking management data:',
        err
      )

      console.error(
        'Response:',
        err.response?.data
      )

      console.error(
        'Status:',
        err.response?.status
      )

      if (err.response?.status === 401) {
        setError(
          'Your session has expired. Please login again.'
        )
      } else if (err.response?.status === 403) {
        setError(
          'You do not have permission to access admin bookings.'
        )
      } else {
        setError(
          err.response?.data?.message ||
          'Unable to fetch live bookings.'
        )
      }
    } finally {
      setLoading(false)
    }
  }

  // =====================================================
  // Initial Load
  // =====================================================

  useEffect(() => {
    fetchBookingData()
  }, [])

  // =====================================================
  // Status Options
  // =====================================================

  const statuses = useMemo(() => {
    return [
      'All',
      ...new Set(
        bookings
          .map((booking) => booking.status)
          .filter(Boolean)
      ),
    ]
  }, [bookings])

  // =====================================================
  // Filter Bookings
  // =====================================================

  const filteredBookings = useMemo(() => {
    const searchValue = search.toLowerCase().trim()
    const todayStr = new Date().toISOString().split('T')[0] // YYYY-MM-DD comparison format

    return bookings.filter((booking) => {
      const creator =
        booking.createdBy ||
        booking.requestedBy ||
        booking.requester ||
        ''

      const text = [
        booking.bookingId,
        booking.roomName,
        booking.module,
        booking.title,
        booking.date,
        booking.status,
        creator,
      ]
        .join(' ')
        .toLowerCase()

      const matchesSearch =
        !searchValue ||
        text.includes(searchValue)

      const matchesStatus =
        statusFilter === 'All' ||
        booking.status?.toLowerCase() ===
          statusFilter.toLowerCase()

      // Date Filtering Logic
      let matchesDate = true
      if (booking.date) {
        const bookingDateOnly = booking.date.split('T')[0]
        if (dateFilter === 'Today') {
          matchesDate = bookingDateOnly === todayStr
        } else if (dateFilter === 'Upcoming') {
          matchesDate = bookingDateOnly > todayStr
        } else if (dateFilter === 'Past') {
          matchesDate = bookingDateOnly < todayStr
        }
      } else if (dateFilter !== 'All') {
        matchesDate = false
      }

      return matchesSearch && matchesStatus && matchesDate
    })
  }, [bookings, search, statusFilter, dateFilter])

  // =====================================================
  // Open View Modal
  // =====================================================

  function openViewModal(booking) {
    setSelectedBooking(booking)
    setIsModalOpen(true)
  }

  // =====================================================
  // Close View Modal
  // =====================================================

  function closeModal() {
    setIsModalOpen(false)
    setSelectedBooking(null)
  }

  // =====================================================
  // Delete / Cancel Booking (Admin Override)
  // =====================================================

  async function handleDeleteBooking(bookingId) {
    if (!bookingId) return
    const id = String(bookingId).replace(/^#/, '')
    if (!window.confirm(`Are you sure you want to cancel and remove booking #${id}?`)) {
      return
    }

    try {
      setLoading(true)
      await deleteAdminBooking(id)
      closeModal()
      await fetchBookingData()
    } catch (err) {
      console.error('Failed to delete booking:', err)
      alert(err.response?.data?.message || 'Failed to delete booking.')
    } finally {
      setLoading(false)
    }
  }

  // =====================================================
  // UI
  // =====================================================

  return (
    <div className="space-y-5">

      {/* =================================================
          Header
      ================================================= */}

      <div>
        <h1 className="font-display text-xl font-700 text-ink">
          Booking Management
        </h1>

        <p className="mt-1 text-sm text-slate">
          Review, filter, and take action on room
          bookings for the workplace.
        </p>
      </div>

      {/* =================================================
          Summary Cards
      ================================================= */}

      <div className="grid gap-3 sm:grid-cols-2">

        <Card>
          <p className="font-mono text-[11px] uppercase tracking-wider text-slate">
            Confirmed
          </p>

          <p className="mt-2 text-3xl font-700 text-[#658362]">
            {statusCounts.Confirmed}
          </p>

          <p className="mt-1 text-sm text-slate">
            Approved and scheduled bookings
          </p>
        </Card>

        <Card>
          <p className="font-mono text-[11px] uppercase tracking-wider text-slate">
            Cancelled
          </p>

          <p className="mt-2 text-3xl font-700 text-[#B85450]">
            {statusCounts.Cancelled}
          </p>

          <p className="mt-1 text-sm text-slate">
            Bookings that were cancelled
          </p>
        </Card>

      </div>

      {/* =================================================
          Search / Filter
      ================================================= */}

      <Card>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

          <div>
            <h2 className="font-display text-sm font-700 text-ink">
              Booking Requests
            </h2>

            <p className="text-sm text-slate">
              Filter and inspect workplace room bookings.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">

            {/* Search Input */}
            <div className="relative w-full sm:w-64">
              <input
                value={search}
                onChange={(event) =>
                  handleSearchChange(event.target.value)
                }
                placeholder="Search ID, title, room, module, creator..."
                className="w-full rounded-xl border border-line bg-portal-bg px-3 py-1.5 pr-7 text-xs text-ink outline-none focus:border-portal-accent"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => handleSearchChange('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-slate hover:bg-slate-200 hover:text-ink text-xs font-bold transition-colors"
                  aria-label="Clear search"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Status Filter Dropdown */}
            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value)
              }
              className="rounded-xl border border-line bg-white px-3 py-1.5 text-xs text-ink outline-none"
            >
              {statuses.map((status) => (
                <option key={status}>
                  {status}
                </option>
              ))}
            </select>

            {/* Date Filter Dropdown (Moved to the end) */}
            <select
              value={dateFilter}
              onChange={(event) =>
                setDateFilter(event.target.value)
              }
              className="rounded-xl border border-line bg-white px-3 py-1.5 text-xs text-ink outline-none"
            >
              <option value="All">All Dates</option>
              <option value="Today">Today</option>
              <option value="Upcoming">Upcoming</option>
              <option value="Past">Past</option>
            </select>

          </div>

        </div>
      </Card>

      {/* =================================================
          Booking Table
      ================================================= */}

      <Card className="overflow-x-auto p-4">

        <table className="w-max text-left text-xs">

          <thead>
            <tr className="border-b border-line font-mono text-[11px] font-extrabold uppercase tracking-wider text-black">

              <th className="px-2 py-2.5 whitespace-nowrap">
                Booking ID
              </th>

              <th className="px-2 py-2.5 whitespace-nowrap">
                Meeting Title
              </th>

              <th className="px-2 py-2.5 whitespace-nowrap">
                Room
              </th>

              <th className="px-2 py-2.5 whitespace-nowrap">
                Module
              </th>

              <th className="px-2 py-2.5 whitespace-nowrap">
                Date
              </th>

              <th className="px-2 py-2.5 whitespace-nowrap">
                Time
              </th>

              <th className="px-2 py-2.5 whitespace-nowrap">
                Created By
              </th>

              <th className="px-2 py-2.5 text-center whitespace-nowrap">
                Status
              </th>

              <th className="px-2 py-2.5 text-center whitespace-nowrap">
                Actions
              </th>

            </tr>
          </thead>

          <tbody className="divide-y divide-line">

            {loading ? (
              <tr>
                <td
                  colSpan={9}
                  className="px-2 py-6 text-center text-slate"
                >
                  Loading booking requests...
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td
                  colSpan={9}
                  className="px-2 py-6 text-center text-red-600"
                >
                  {error}
                </td>
              </tr>
            ) : filteredBookings.length === 0 ? (
              <tr>
                <td
                  colSpan={9}
                  className="px-2 py-6 text-center text-slate"
                >
                  <div>
                    <p className="font-medium text-ink">
                      No booking requests match the current filters.
                    </p>
                    {search && (
                      <p className="mt-1 text-xs text-slate">
                        No bookings found matching "{search}".
                        <button
                          type="button"
                          onClick={() => handleSearchChange('')}
                          className="ml-2 font-bold text-sky-600 hover:text-sky-800 underline"
                        >
                          Clear search
                        </button>
                      </p>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              filteredBookings.map((booking) => (
                <tr
                  key={booking.bookingId}
                  className="transition-colors duration-200 hover:bg-portal-bg/70"
                >
                  <td className="px-2 py-3 font-semibold text-ink whitespace-nowrap">
                    {booking.bookingId}
                  </td>

                  <td className="px-2 py-3 font-medium text-ink whitespace-nowrap">
                    {booking.title}
                  </td>

                  <td className="px-2 py-3 text-slate whitespace-nowrap">
                    {booking.roomName}
                  </td>

                  <td className="px-2 py-3 text-slate whitespace-nowrap">
                    {booking.module}
                  </td>

                  <td className="px-2 py-3 text-slate whitespace-nowrap">
                    {booking.date}
                  </td>

                  <td className="px-2 py-3 text-slate whitespace-nowrap">
                    {booking.startTime}
                    {' – '}
                    {booking.endTime}
                  </td>

                  <td className="px-2 py-3 text-slate whitespace-nowrap">
                    {booking.createdBy}
                  </td>

                  <td className="px-2 py-3 text-center whitespace-nowrap">
                    <CustomStatusTag
                      status={booking.status}
                    />
                  </td>

                  <td className="px-2 py-3 text-center whitespace-nowrap">
                    <div className="inline-flex items-center gap-2 font-sans text-sm">
                      <button
                        onClick={() =>
                          openViewModal(booking)
                        }
                        className="text-sky-600 hover:text-sky-800 font-bold text-sm hover:underline"
                      >
                        View
                      </button>
                      <button
                        onClick={() =>
                          handleDeleteBooking(booking.bookingId)
                        }
                        className="text-red-600 hover:text-red-800 font-bold text-sm hover:underline ml-1"
                      >
                        Cancel
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}

          </tbody>

        </table>

      </Card>

      {/* =====================================================
          Booking Details Modal
      ===================================================== */}

      {selectedBooking && (
        <Modal
          open={isModalOpen}
          onClose={closeModal}
          title="Booking Details"
          footer={
            <div className="flex w-full items-center justify-between">
              <Button
                size="sm"
                variant="danger"
                onClick={() => handleDeleteBooking(selectedBooking.bookingId)}
              >
                Cancel Booking
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={closeModal}
              >
                Close
              </Button>
            </div>
          }
        >
          <div className="space-y-3 text-sm text-slate">
            <div>
              <p className="font-medium text-ink">
                {selectedBooking.bookingId}
              </p>
              <p className="text-xs uppercase tracking-[0.2em] text-slate">
                Booking ID
              </p>
            </div>

            <div>
              <h3 className="font-medium text-ink">
                {selectedBooking.title}
              </h3>
              <p className="text-xs uppercase tracking-[0.2em] text-slate">
                Meeting Title
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <p className="font-medium text-ink">
                  Room
                </p>
                <p>
                  {selectedBooking.roomName}
                </p>
              </div>

              <div>
                <p className="font-medium text-ink">
                  Module
                </p>
                <p>
                  {selectedBooking.module}
                </p>
              </div>

              <div>
                <p className="font-medium text-ink">
                  Created By
                </p>
                <p>
                  {selectedBooking.createdBy}
                </p>
              </div>

              <div>
                <p className="font-medium text-ink">
                  Date
                </p>
                <p>
                  {selectedBooking.date}
                </p>
              </div>

              <div>
                <p className="font-medium text-ink">
                  Time
                </p>
                <p>
                  {selectedBooking.startTime}
                  {' – '}
                  {selectedBooking.endTime}
                </p>
              </div>

              <div>
                <p className="font-medium text-ink">
                  Status
                </p>
                <CustomStatusTag
                  status={selectedBooking.status}
                />
              </div>
            </div>
          </div>
        </Modal>
      )}

    </div>
  )
}