import { useEffect, useMemo, useState } from 'react'
import client from '../../api/client'

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
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState('')

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')

  const [selectedBooking, setSelectedBooking] = useState(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  // =====================================================
  // Confirmation Dialog
  // =====================================================

  const [confirmAction, setConfirmAction] = useState(null)

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

      return matchesSearch && matchesStatus
    })
  }, [bookings, search, statusFilter])

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
    if (actionLoading) {
      return
    }

    setIsModalOpen(false)
    setSelectedBooking(null)
  }

  // =====================================================
  // Open Confirmation Dialog
  // =====================================================

  function requestAction(booking, action) {
    setConfirmAction({
      booking,
      action,
    })
  }

  // =====================================================
  // Close Confirmation Dialog
  // =====================================================

  function closeConfirmation() {
    if (actionLoading) {
      return
    }

    setConfirmAction(null)
  }

  // =====================================================
  // Confirm Selected Action
  // =====================================================

  async function confirmActionHandler() {
    if (!confirmAction) {
      return
    }

    const {
      booking,
      action,
    } = confirmAction

    if (action === 'approve') {
      await handleApprove(booking.bookingId)
    } else if (action === 'reject') {
      await handleReject(booking.bookingId)
    }

    setConfirmAction(null)
  }

  // =====================================================
  // Approve Booking
  // =====================================================

  async function handleApprove(bookingId) {
    try {
      setActionLoading(true)

      console.log(
        'Approving booking:',
        bookingId
      )

      await client.patch(
        `/admin/bookings/${bookingId}/approve`
      )

      await fetchBookingData()

      // Update selected booking if modal is open
      if (
        selectedBooking &&
        selectedBooking.bookingId === bookingId
      ) {
        setSelectedBooking((prev) =>
          prev
            ? {
                ...prev,
                status: 'Confirmed',
              }
            : null
        )
      }

    } catch (err) {
      console.error(
        'Failed to approve booking:',
        err
      )

      alert(
        err.response?.data?.message ||
        'Failed to approve booking.'
      )
    } finally {
      setActionLoading(false)
    }
  }

  // =====================================================
  // Reject Booking
  // =====================================================

  async function handleReject(bookingId) {
    try {
      setActionLoading(true)

      console.log(
        'Rejecting booking:',
        bookingId
      )

      await client.patch(
        `/admin/bookings/${bookingId}/reject`
      )

      await fetchBookingData()

      // Update selected booking if modal is open
      if (
        selectedBooking &&
        selectedBooking.bookingId === bookingId
      ) {
        setSelectedBooking((prev) =>
          prev
            ? {
                ...prev,
                status: 'Cancelled',
              }
            : null
        )
      }

    } catch (err) {
      console.error(
        'Failed to reject booking:',
        err
      )

      alert(
        err.response?.data?.message ||
        'Failed to reject booking.'
      )
    } finally {
      setActionLoading(false)
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

      <div className="grid gap-3 md:grid-cols-3">

        <Card>
          <p className="font-mono text-[11px] uppercase tracking-wider text-slate">
            Pending Requests
          </p>

          <p className="mt-2 text-3xl font-700 text-[#E09F3E]">
            {statusCounts.Pending}
          </p>

          <p className="mt-1 text-sm text-slate">
            Awaiting admin approval
          </p>
        </Card>

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
              Filter requests to approve, reject,
              or inspect booking details.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">

            <input
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Search ID, title, room, module, creator..."
              className="w-full sm:w-80 rounded-xl border border-line bg-portal-bg px-3 py-1.5 text-xs text-ink outline-none focus:border-portal-accent"
            />

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

          </div>

        </div>
      </Card>

      {/* =================================================
          Booking Table
      ================================================= */}

      <Card className="overflow-x-auto p-4">

        {/*
          IMPORTANT:
          No min-w-[1200px]
          No min-w-full
          No table-fixed

          w-max makes the table use only the width
          required by the content.
        */}

        <table className="w-max text-left text-xs">

          {/* =================================================
              Table Header
          ================================================= */}

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

          {/* =================================================
              Table Body
          ================================================= */}

          <tbody className="divide-y divide-line">

            {/* Loading */}

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

              /* Error */

              <tr>
                <td
                  colSpan={9}
                  className="px-2 py-6 text-center text-red-600"
                >
                  {error}
                </td>
              </tr>

            ) : filteredBookings.length === 0 ? (

              /* Empty */

              <tr>
                <td
                  colSpan={9}
                  className="px-2 py-6 text-center text-slate"
                >
                  No booking requests match the
                  current filters.
                </td>
              </tr>

            ) : (

              /* Booking Rows */

              filteredBookings.map((booking) => (

                <tr
                  key={booking.bookingId}
                  className="transition-colors duration-200 hover:bg-portal-bg/70"
                >

                  {/* =================================================
                      Booking ID
                  ================================================= */}

                  <td className="px-2 py-3 font-semibold text-ink whitespace-nowrap">
                    {booking.bookingId}
                  </td>

                  {/* =================================================
                      Meeting Title
                  ================================================= */}

                  <td className="px-2 py-3 font-medium text-ink whitespace-nowrap">
                    {booking.title}
                  </td>

                  {/* =================================================
                      Room
                  ================================================= */}

                  <td className="px-2 py-3 text-slate whitespace-nowrap">
                    {booking.roomName}
                  </td>

                  {/* =================================================
                      Module
                  ================================================= */}

                  <td className="px-2 py-3 text-slate whitespace-nowrap">
                    {booking.module}
                  </td>

                  {/* =================================================
                      Date
                  ================================================= */}

                  <td className="px-2 py-3 text-slate whitespace-nowrap">
                    {booking.date}
                  </td>

                  {/* =================================================
                      Time
                  ================================================= */}

                  <td className="px-2 py-3 text-slate whitespace-nowrap">
                    {booking.startTime}
                    {' – '}
                    {booking.endTime}
                  </td>

                  {/* =================================================
                      Created By
                  ================================================= */}

                  <td className="px-2 py-3 text-slate whitespace-nowrap">
                    {booking.createdBy}
                  </td>

                  {/* =================================================
                      Status
                  ================================================= */}

                  <td className="px-2 py-3 text-center whitespace-nowrap">
                    <CustomStatusTag
                      status={booking.status}
                    />
                  </td>

                  {/* =================================================
                      Actions
                  ================================================= */}

                  <td className="px-2 py-3 text-center whitespace-nowrap">

                    <div className="inline-flex items-center gap-2 font-sans text-sm">

                      {/* View */}

                      <button
                        onClick={() =>
                          openViewModal(booking)
                        }
                        className="text-sky-600 hover:text-sky-800 font-bold text-sm hover:underline"
                      >
                        View
                      </button>

                      {/* Approve / Reject */}

                      {booking.status?.toLowerCase() ===
                      'pending' && (
                        <>

                          {/* Approve */}

                          <button
                            disabled={actionLoading}
                            onClick={() =>
                              requestAction(
                                booking,
                                'approve'
                              )
                            }
                            className="text-emerald-600 hover:text-emerald-800 font-bold text-sm hover:underline disabled:opacity-50"
                          >
                            Approve
                          </button>

                          {/* Reject */}

                          <button
                            disabled={actionLoading}
                            onClick={() =>
                              requestAction(
                                booking,
                                'reject'
                              )
                            }
                            className="text-red-600 hover:text-red-800 font-bold text-sm hover:underline disabled:opacity-50"
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

      {/* =====================================================
          Booking Details Modal
      ===================================================== */}

      {selectedBooking && (

        <Modal
          open={isModalOpen}
          onClose={closeModal}
          title="Booking Details"
          footer={
            <div className="flex flex-wrap gap-2">

              {/* Close */}

              <Button
                size="sm"
                variant="secondary"
                onClick={closeModal}
                disabled={actionLoading}
              >
                Close
              </Button>

              {/* Pending Actions */}

              {selectedBooking.status?.toLowerCase() ===
                'pending' && (
                <>

                  {/* Approve */}

                  <Button
                    size="sm"
                    onClick={() =>
                      requestAction(
                        selectedBooking,
                        'approve'
                      )
                    }
                    disabled={actionLoading}
                  >
                    Approve
                  </Button>

                  {/* Reject */}

                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() =>
                      requestAction(
                        selectedBooking,
                        'reject'
                      )
                    }
                    disabled={actionLoading}
                  >
                    Reject
                  </Button>

                </>
              )}

            </div>
          }
        >

          <div className="space-y-3 text-sm text-slate">

            {/* Booking ID */}

            <div>
              <p className="font-medium text-ink">
                {selectedBooking.bookingId}
              </p>

              <p className="text-xs uppercase tracking-[0.2em] text-slate">
                Booking ID
              </p>
            </div>

            {/* Meeting Title */}

            <div>
              <h3 className="font-medium text-ink">
                {selectedBooking.title}
              </h3>

              <p className="text-xs uppercase tracking-[0.2em] text-slate">
                Meeting Title
              </p>
            </div>

            {/* Booking Information */}

            <div className="grid gap-3 sm:grid-cols-2">

              {/* Room */}

              <div>
                <p className="font-medium text-ink">
                  Room
                </p>

                <p>
                  {selectedBooking.roomName}
                </p>
              </div>

              {/* Module */}

              <div>
                <p className="font-medium text-ink">
                  Module
                </p>

                <p>
                  {selectedBooking.module}
                </p>
              </div>

              {/* Created By */}

              <div>
                <p className="font-medium text-ink">
                  Created By
                </p>

                <p>
                  {selectedBooking.createdBy}
                </p>
              </div>

              {/* Date */}

              <div>
                <p className="font-medium text-ink">
                  Date
                </p>

                <p>
                  {selectedBooking.date}
                </p>
              </div>

              {/* Time */}

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

              {/* Status */}

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

      {/* =====================================================
          Approve / Reject Confirmation Modal
      ===================================================== */}

      {confirmAction && (

        <Modal
          open={true}
          onClose={closeConfirmation}
          title={
            confirmAction.action === 'approve'
              ? 'Approve Booking'
              : 'Reject Booking'
          }
          footer={
            <div className="flex justify-end gap-2">

              {/* No */}

              <Button
                size="sm"
                variant="secondary"
                onClick={closeConfirmation}
                disabled={actionLoading}
              >
                No
              </Button>

              {/* Yes */}

              <Button
                size="sm"
                variant={
                  confirmAction.action === 'approve'
                    ? undefined
                    : 'danger'
                }
                onClick={confirmActionHandler}
                disabled={actionLoading}
              >
                {actionLoading
                  ? 'Processing...'
                  : 'Yes'}
              </Button>

            </div>
          }
        >

          <div className="space-y-4 py-2">

            {/* Confirmation Message */}

            <p className="text-sm text-slate">
              Are you sure you want to{' '}
              <span className="font-semibold text-ink">
                {confirmAction.action === 'approve'
                  ? 'approve'
                  : 'reject'}
              </span>{' '}
              this booking?
            </p>

            {/* Booking Information */}

            <div className="rounded-xl bg-portal-bg p-3">

              <div className="grid gap-2 text-sm">

                {/* Booking ID */}

                <div className="flex items-center justify-between gap-4">
                  <span className="text-slate">
                    Booking ID
                  </span>

                  <span className="font-semibold text-ink">
                    {confirmAction.booking.bookingId}
                  </span>
                </div>

                {/* Meeting */}

                <div className="flex items-center justify-between gap-4">
                  <span className="text-slate">
                    Meeting
                  </span>

                  <span className="font-semibold text-ink text-right">
                    {confirmAction.booking.title}
                  </span>
                </div>

                {/* Room */}

                <div className="flex items-center justify-between gap-4">
                  <span className="text-slate">
                    Room
                  </span>

                  <span className="font-semibold text-ink text-right">
                    {confirmAction.booking.roomName}
                  </span>
                </div>

                {/* Module */}

                <div className="flex items-center justify-between gap-4">
                  <span className="text-slate">
                    Module
                  </span>

                  <span className="font-semibold text-ink text-right">
                    {confirmAction.booking.module}
                  </span>
                </div>

                {/* Date */}

                <div className="flex items-center justify-between gap-4">
                  <span className="text-slate">
                    Date
                  </span>

                  <span className="font-semibold text-ink">
                    {confirmAction.booking.date}
                  </span>
                </div>

                {/* Time */}

                <div className="flex items-center justify-between gap-4">
                  <span className="text-slate">
                    Time
                  </span>

                  <span className="font-semibold text-ink">
                    {confirmAction.booking.startTime}
                    {' – '}
                    {confirmAction.booking.endTime}
                  </span>
                </div>

              </div>

            </div>

          </div>

        </Modal>

      )}

    </div>
  )
}