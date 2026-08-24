import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

import client from '../api/client'
import DashboardCard from '../components/cards/DashboardCard'
import NotificationCard from '../components/cards/NotificationCard'
import Card from '../components/common/Card'
import Button from '../components/common/Button'
import StatusTag from '../components/common/StatusTag'

export default function AdminDashboard() {
  const [data, setData] = useState(null)
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      setError('')

      const token = localStorage.getItem('spacebook_token')

      if (!token) {
        setError('Authentication token not found. Please login again.')
        return
      }

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
      console.error('Error loading admin dashboard:', err)

      if (err.response) {
        console.error('Status:', err.response.status)
        console.error('Response:', err.response.data)

        if (err.response.status === 401) {
          setError('Unauthorized. Please login again.')
        } else if (err.response.status === 403) {
          setError('You do not have permission to access the admin dashboard.')
        } else {
          setError(
            err.response.data?.message ||
              'Unable to load admin dashboard data.'
          )
        }
      } else {
        setError(
          'Unable to connect to the backend. Please check the deployed API.'
        )
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDashboardData()
  }, [])

  if (loading) {
    return (
      <div className="space-y-4">
        <h1 className="font-display text-xl font-700 text-ink">
          Admin Dashboard
        </h1>

        <Card>
          <p className="text-sm text-slate">
            Loading admin dashboard data...
          </p>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-4">
        <h1 className="font-display text-xl font-700 text-ink">
          Admin Dashboard
        </h1>

        <Card>
          <div className="rounded-xl border border-red-200 bg-red-50 p-4">
            <p className="font-medium text-red-700">
              Failed to load dashboard
            </p>

            <p className="mt-1 text-sm text-red-600">
              {error}
            </p>

            <Button
              size="sm"
              className="mt-4"
              onClick={fetchDashboardData}
            >
              Try Again
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="space-y-4">
        <h1 className="font-display text-xl font-700 text-ink">
          Admin Dashboard
        </h1>

        <Card>
          <p className="text-sm text-slate">
            No dashboard data available.
          </p>
        </Card>
      </div>
    )
  }

  const totalRooms = data.totalRooms ?? 0
  const todayBookings = data.todayBookings ?? 0
  const utilization = data.utilization ?? 0
  const recentBookings = Array.isArray(data.recentBookings)
    ? data.recentBookings
    : []

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
          status: b.status || 'Confirmed',
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
          status: b.status || 'Confirmed',
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
      const dateA = String(a.bookingDate || '').substring(0, 10)
      const dateB = String(b.bookingDate || '').substring(0, 10)
      const dateCompare = dateA.localeCompare(dateB)
      if (dateCompare !== 0) return dateCompare

      const timeA = a.startTime || ''
      const timeB = b.startTime || ''
      return timeA.localeCompare(timeB)
    })

  return (
    <div className="space-y-4">

      {/* =====================================================
          PAGE HEADER
      ====================================================== */}

      <div>
        <h1 className="font-display text-xl font-700 text-ink">
          Admin Dashboard
        </h1>

        <p className="mt-1 text-sm text-slate">
          Operational overview for workspace administration and booking activity.
        </p>
      </div>

      {/* =====================================================
          KPI CARDS
      ====================================================== */}

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
          value={`${utilization}%`}
          description="Approximate room occupancy"
        />

      </div>

      {/* =====================================================
          MAIN CONTENT
      ====================================================== */}

      <div>

        {/* ===================================================
            ACTIVE & UPCOMING RESERVATIONS
        ==================================================== */}

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

              {activeAndEarlyBookings.slice(0, 10).map((booking, index) => (

                <div
                  key={booking.bookingId || booking.id || index}
                  className="rounded-xl border border-line bg-portal-bg p-3"
                >

                  <div className="flex items-center justify-between gap-3">

                    <div>

                      <p className="font-medium text-sm text-ink">
                        {booking.roomName ||
                          `Room ${booking.roomId || ''}`}
                      </p>

                      <p className="text-xs text-slate">

                        {booking.bookingDate ||
                          booking.date ||
                          '—'}

                        {' • '}

                        {booking.startTime
                          ? booking.startTime.substring(0, 5)
                          : ''}

                        {'–'}

                        {booking.endTime
                          ? booking.endTime.substring(0, 5)
                          : ''}

                      </p>

                    </div>

                    <StatusTag
                      status={booking.status || 'Confirmed'}
                    />

                  </div>

                </div>

              ))}

            </div>

          )}

        </Card>

      </div>

      {/* =====================================================
          ADMIN LINKS
      ====================================================== */}

      <Card>

        <h2 className="mb-3 font-display text-sm font-700 text-ink">
          Admin Management
        </h2>

        <div className="grid gap-2 sm:grid-cols-3">

          <Link to="/admin/rooms">
            <Button
              variant="ghost"
              className="w-full"
            >
              Manage Rooms
            </Button>
          </Link>

          <Link to="/admin/reports">
            <Button
              variant="ghost"
              className="w-full"
            >
              View Reports & Bookings
            </Button>
          </Link>

        </div>

      </Card>

    </div>
  )
}
