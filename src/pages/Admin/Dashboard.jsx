import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

import client from '../../api/client'

import Card from '../../components/common/Card'
import DashboardCard from '../../components/cards/DashboardCard'
import { formatTime24, formatDateWithZeros } from '../../utils/timeUtils'

// =====================================================
// Status Badge
// =====================================================

function CustomStatusTag({ status }) {
  const normalized = status?.toUpperCase()

  let bgClass = 'bg-[#5c7a60] text-white'

  if (normalized === 'PENDING') {
    bgClass = 'bg-[#e5a038] text-white'
  } else if (
    normalized === 'BOOKED' ||
    normalized === 'MAINTENANCE' ||
    normalized === 'CANCELLED' ||
    normalized === 'REJECTED'
  ) {
    bgClass = 'bg-[#be534d] text-white'
  }

  return (
    <span
      className={`inline-flex items-center justify-center min-w-[74px] rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wider text-center ${bgClass}`}
    >
      {normalized || 'UNKNOWN'}
    </span>
  )
}

// =====================================================
// Admin Dashboard
// =====================================================

export default function AdminDashboard() {
  const [data, setData] = useState(null)
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // =====================================================
  // Fetch Dashboard Data
  // =====================================================

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      setError('')

      const token = localStorage.getItem('spacebook_token')

      if (!token) {
        setError('You are not logged in.')
        return
      }

      console.log('Fetching admin dashboard and bookings from Render API...')

      const [dashRes, bookingsRes] = await Promise.allSettled([
        client.get('/admin/dashboard'),
        client.get('/admin/bookings'),
      ])

      if (dashRes.status === 'fulfilled') {
        setData(dashRes.value.data)
      } else {
        throw dashRes.reason
      }

      if (bookingsRes.status === 'fulfilled') {
        const raw = Array.isArray(bookingsRes.value.data)
          ? bookingsRes.value.data
          : bookingsRes.value.data?.data ||
            bookingsRes.value.data?.bookings ||
            []
        setBookings(raw)
      }

    } catch (err) {
      console.error(
        'Error loading dashboard data:',
        err
      )

      if (err.response?.status === 401) {
        setError(
          'Your session has expired. Please login again.'
        )
      } else if (err.response?.status === 403) {
        setError(
          'You do not have permission to access the admin dashboard.'
        )
      } else {
        setError(
          err.response?.data?.message ||
          'Unable to load dashboard metrics.'
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
    fetchDashboardData()
  }, [])

  // =====================================================
  // Loading
  // =====================================================

  if (loading) {
    return (
      <div className="flex min-h-[300px] items-center justify-center">
        <p className="text-sm text-slate">
          Loading admin dashboard data...
        </p>
      </div>
    )
  }

  // =====================================================
  // Error
  // =====================================================

  if (error || !data) {
    return (
      <div className="rounded-2xl border border-line bg-white p-6">
        <p className="text-sm text-red-600">
          {error ||
            'Failed to display dashboard overview.'}
        </p>
      </div>
    )
  }

  // =====================================================
  // API Data
  // =====================================================

  const {
    totalRooms = 0,
    todayBookings = 0,
    utilization = 0,
    recentBookings = [],
  } = data

  const today = new Date().toISOString().split('T')[0]

  const isInactiveStatus = (status) => {
    const s = String(status || '').toUpperCase()
    return [
      'CANCELLED',
      'CANCELED',
      'REJECTED',
      'EXPIRED',
      'RELEASED',
    ].includes(s)
  }

  const allLiveBookings =
    bookings.length > 0
      ? bookings.map((b) => ({
          bookingId: b.bookingId || b.id,
          roomName:
            b.roomName ||
            b.room?.name ||
            `Room ${b.roomId || ''}`,
          bookingDate: b.bookingDate || b.date || '',
          startTime: b.startTime
            ? String(b.startTime).substring(0, 5)
            : '',
          endTime: b.endTime
            ? String(b.endTime).substring(0, 5)
            : '',
          status: b.status || 'CONFIRMED',
        }))
      : recentBookings.map((b) => ({
          bookingId: b.bookingId || b.id,
          roomName:
            b.roomName ||
            `Room ${b.roomId || ''}`,
          bookingDate: b.bookingDate || b.date || '',
          startTime: b.startTime
            ? String(b.startTime).substring(0, 5)
            : '',
          endTime: b.endTime
            ? String(b.endTime).substring(0, 5)
            : '',
          status: b.status || 'CONFIRMED',
        }))

  const activeAndEarlyBookings = allLiveBookings
    .filter((booking) => {
      if (isInactiveStatus(booking.status)) {
        return false
      }
      const bookingDateStr = String(
        booking.bookingDate || ''
      ).substring(0, 10)
      if (!bookingDateStr || bookingDateStr < today) {
        return false
      }
      return true
    })
    .sort((a, b) => {
      const timeA = a.startTime || ''
      const timeB = b.startTime || ''
      return timeA.localeCompare(timeB)
    })

  // Dynamic utilization fallback if backend sends 0
  let displayUtilization = utilization
  if ((!displayUtilization || Number(displayUtilization) === 0) && allLiveBookings.length > 0) {
    const activeRooms = Math.max(1, totalRooms || 10)
    let totalMins = 0
    allLiveBookings.forEach((b) => {
      if (!isInactiveStatus(b.status)) {
        let mins = 60
        if (b.startTime && b.endTime) {
          const [sh, sm] = String(b.startTime).split(':').map(Number)
          const [eh, em] = String(b.endTime).split(':').map(Number)
          if (!isNaN(sh) && !isNaN(eh)) {
            const startMins = sh * 60 + (sm || 0)
            const endMins = eh * 60 + (em || 0)
            if (endMins > startMins) mins = endMins - startMins
          }
        }
        totalMins += mins
      }
    })
    const dateSet = new Set(
      allLiveBookings
        .map((b) => String(b.bookingDate || '').substring(0, 10))
        .filter(Boolean)
    )
    const days = Math.max(1, dateSet.size)
    const availableMins = activeRooms * days * 10 * 60
    if (availableMins > 0) {
      displayUtilization = Math.min(
        100,
        Math.max(0, (totalMins / availableMins) * 100)
      ).toFixed(1)
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
        <h1 className="font-display text-3xl font-bold">
          Admin Dashboard
        </h1>

        <p className="mt-1 text-sm text-slate">
          Operational overview for workspace administration
          and booking operations.
        </p>
      </div>

      {/* =================================================
          Dashboard Metrics
      ================================================= */}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">

        <DashboardCard
          title="Total Active Bookings"
          value={activeAndEarlyBookings.length}
          description="Confirmed upcoming bookings"
          to="/admin/reports"
        />

        <DashboardCard
          title="Today's Bookings"
          value={todayBookings}
          tone="warning"
          description="Bookings scheduled for today"
        />

        <DashboardCard
          title="Utilization"
          value={`${displayUtilization}%`}
          description="Approximate occupancy"
        />

      </div>

      {/* =================================================
          Active & Upcoming Reservations
      ================================================= */}

      <div>

        <Card>

          <div className="flex items-center justify-between">

            <div>
              <h2 className="font-display text-sm font-700 text-ink">
                Active & Upcoming Reservations
              </h2>

              <p className="text-xs text-slate">
                Scheduled workspace reservations in chronological order.
              </p>
            </div>

            <Link
              to="/admin/reports"
              className="text-xs text-brand-blue underline hover:opacity-80"
            >
              Manage all
            </Link>

          </div>

          {activeAndEarlyBookings.length === 0 ? (

            <p className="mt-4 text-sm text-slate">
              No active or upcoming reservations found.
            </p>

          ) : (

            <div className="mt-4 space-y-3">

              {activeAndEarlyBookings.map(
                (booking, idx) => (

                  <div
                    key={
                      booking.bookingId ||
                      booking.id ||
                      idx
                    }
                    className="rounded-xl border border-line bg-portal-bg p-3"
                  >

                    <div className="flex items-center justify-between gap-3">

                      <div>

                        <p className="font-medium text-sm text-ink">
                          {booking.roomName}
                        </p>

                        <p className="text-xs text-slate">
                          {formatDateWithZeros(booking.bookingDate)}
                          {' • '}
                          {formatTime24(booking.startTime || '')}
                          {' – '}
                          {formatTime24(booking.endTime || '')}
                        </p>

                      </div>

                      <CustomStatusTag
                        status={booking.status}
                      />

                    </div>

                  </div>

                )
              )}

            </div>

          )}

        </Card>

      </div>

    </div>
  )
}