import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'

import Card from '../../components/common/Card'
import DashboardCard from '../../components/cards/DashboardCard'

// Status Badge Component matching the design system
function CustomStatusTag({ status }) {
  const normalized = status?.toUpperCase()

  let bgClass = 'bg-[#5c7a60] text-white' // Green (Confirmed / Approved)

  if (normalized === 'PENDING') {
    bgClass = 'bg-[#e5a038] text-white' // Yellow/Orange
  } else if (
    normalized === 'BOOKED' ||
    normalized === 'MAINTENANCE' ||
    normalized === 'CANCELLED' ||
    normalized === 'REJECTED'
  ) {
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

export default function AdminDashboard() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('spacebook_token')
      const response = await axios.get('http://localhost:5263/api/admin/dashboard', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })
      setData(response.data)
    } catch (err) {
      console.error('Error loading dashboard data:', err)
      setError('Unable to load dashboard metrics.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDashboardData()
  }, [])

  if (loading) {
    return (
      <div className="rounded-2xl border border-ink bg-white p-6 text-sm text-slate">
        Loading admin dashboard data...
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="rounded-2xl border border-red-300 bg-red-50 p-6 text-sm text-red-700">
        {error || 'Failed to display dashboard overview.'}
      </div>
    )
  }

  const {
    totalRooms = 0,
    todayBookings = 0,
    pendingApprovals = 0,
    utilization = 0,
    pendingApprovalList = [],
    recentBookings = []
  } = data

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-ink bg-white p-5">
        <h1 className="font-display text-xl font-700 text-ink">Admin Dashboard</h1>
        <p className="mt-2 text-sm text-slate">Operational overview for room management and approval workloads.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <DashboardCard title="Total Rooms" value={totalRooms} description="Active room inventory" />
        <DashboardCard title="Today's Bookings" value={todayBookings} tone="warning" description="Bookings scheduled for today" />
        <DashboardCard title="Pending Approvals" value={pendingApprovals} tone="accent" description="Pending requests awaiting review" to="/admin/booking-management" />
        <DashboardCard title="Utilization" value={`${utilization}%`} description="Approximate occupancy" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-sm font-700 text-ink">Pending Approvals</h2>
              <p className="text-xs text-slate">Review the latest pending room requests.</p>
            </div>
            <Link to="/admin/booking-management" className="text-xs text-brand-blue underline hover:opacity-80">
              Manage all
            </Link>
          </div>

          {pendingApprovalList.length === 0 ? (
            <p className="mt-4 text-sm text-slate">No pending bookings at the moment.</p>
          ) : (
            <div className="mt-4 space-y-3">
              {pendingApprovalList.map((booking) => (
                <div key={booking.bookingId} className="rounded-xl border border-line bg-portal-bg p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium text-sm text-ink">{booking.roomName}</p>
                      <p className="text-xs text-slate">
                        {booking.bookingDate} • {booking.startTime?.substring(0, 5)}–{booking.endTime?.substring(0, 5)}
                      </p>
                    </div>
                    <CustomStatusTag status="PENDING" />
                  </div>
                  <p className="mt-2 text-xs text-slate">
                    Requested by {booking.requestedBy || 'Team member'}
                  </p>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-sm font-700 text-ink">Recent Activity</h2>
              <p className="text-xs text-slate">Latest room bookings and status changes.</p>
            </div>
            <Link to="/admin/reports" className="text-xs text-brand-blue underline hover:opacity-80">
              View reports
            </Link>
          </div>

          {recentBookings.length === 0 ? (
            <p className="mt-4 text-sm text-slate">No recent activity at the moment.</p>
          ) : (
            <div className="mt-4 space-y-3">
              {recentBookings.map((booking, idx) => (
                <div key={idx} className="rounded-xl border border-line bg-portal-bg p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium text-sm text-ink">{booking.roomName}</p>
                      <p className="text-xs text-slate">
                        {booking.bookingDate} • {booking.startTime?.substring(0, 5)}–{booking.endTime?.substring(0, 5)}
                      </p>
                    </div>
                    <CustomStatusTag status={booking.status} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}