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

      /*
       * Your shared axios client already has:
       *
       * baseURL =
       * https://spacebook-505h.onrender.com/api
       *
       * and automatically sends the JWT token.
       */

      const response = await client.get('/admin/dashboard')

      console.log('ADMIN DASHBOARD RESPONSE:', response.data)

      setData(response.data)
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

  /*
   * Backend response fields
   *
   * Expected from:
   * GET /api/admin/dashboard
   *
   * {
   *   totalRooms,
   *   todayBookings,
   *   pendingApprovals,
   *   utilization,
   *   pendingApprovalList,
   *   recentBookings
   * }
   */

  const totalRooms = data.totalRooms ?? 0
  const todayBookings = data.todayBookings ?? 0
  const pendingApprovals = data.pendingApprovals ?? 0
  const utilization = data.utilization ?? 0

  const pendingApprovalList = Array.isArray(data.pendingApprovalList)
    ? data.pendingApprovalList
    : []

  const recentBookings = Array.isArray(data.recentBookings)
    ? data.recentBookings
    : []

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
          Operational overview for room management and approval workloads.
        </p>
      </div>

      {/* =====================================================
          KPI CARDS
      ====================================================== */}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">

        <DashboardCard
          title="Total Rooms"
          value={totalRooms}
          description="Active room inventory"
        />

        <DashboardCard
          title="Today's Bookings"
          value={todayBookings}
          tone="warning"
          description="Bookings scheduled for today"
        />

        <DashboardCard
          title="Pending Approvals"
          value={pendingApprovals}
          tone="accent"
          description="Requests awaiting review"
          to="/admin/booking-management"
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

      <div className="grid gap-4 lg:grid-cols-2">

        {/* ===================================================
            PENDING APPROVALS
        ==================================================== */}

        <Card>

          <div className="flex items-center justify-between">

            <div>
              <h2 className="font-display text-sm font-700 text-ink">
                Pending Approvals
              </h2>

              <p className="text-xs text-slate">
                Review the latest pending room requests.
              </p>
            </div>

            <Link
              to="/admin/booking-management"
              className="text-xs text-brand-blue underline hover:opacity-80"
            >
              Manage all
            </Link>

          </div>

          {pendingApprovalList.length === 0 ? (

            <p className="mt-4 text-sm text-slate">
              No pending bookings at the moment.
            </p>

          ) : (

            <div className="mt-4 space-y-3">

              {pendingApprovalList.slice(0, 6).map((booking) => (

                <div
                  key={booking.bookingId || booking.id}
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

                    <StatusTag status="Pending" />

                  </div>

                  <p className="mt-2 text-xs text-slate">
                    Requested by{' '}
                    {booking.requestedBy ||
                      booking.createdBy ||
                      booking.requester ||
                      'Team member'}
                  </p>

                </div>

              ))}

            </div>

          )}

        </Card>

        {/* ===================================================
            RECENT ACTIVITY
        ==================================================== */}

        <Card>

          <div className="flex items-center justify-between">

            <div>

              <h2 className="font-display text-sm font-700 text-ink">
                Recent Activity
              </h2>

              <p className="text-xs text-slate">
                Latest room bookings and status changes.
              </p>

            </div>

            <Link
              to="/admin/reports"
              className="text-xs text-brand-blue underline hover:opacity-80"
            >
              View reports
            </Link>

          </div>

          {recentBookings.length === 0 ? (

            <p className="mt-4 text-sm text-slate">
              No recent activity at the moment.
            </p>

          ) : (

            <div className="mt-4 space-y-3">

              {recentBookings.slice(0, 6).map((booking, index) => (

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

          <Link to="/admin/booking-management">
            <Button
              variant="ghost"
              className="w-full"
            >
              Manage Bookings
            </Button>
          </Link>

          <Link to="/admin/reports">
            <Button
              variant="ghost"
              className="w-full"
            >
              View Reports
            </Button>
          </Link>

        </div>

      </Card>

    </div>
  )
}
