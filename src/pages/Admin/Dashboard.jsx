import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import Card from '../../components/common/Card'
import DashboardCard from '../../components/cards/DashboardCard'
import { rooms as ROOMS, bookings as BOOKINGS } from '../../services/mockData'

// Status Badge Component matching the updated design system
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
      className={`inline-block rounded-full px-3 py-1 text-[11px] font-semibold tracking-wider ${bgClass}`}
    >
      {normalized}
    </span>
  )
}

export default function AdminDashboard() {
  const rooms = useMemo(() => ROOMS, [])
  const bookings = useMemo(() => BOOKINGS, [])

  const today = new Date().toISOString().slice(0, 10)
  const todayBookings = bookings.filter((b) => b.date === today)
  const pendingApprovals = bookings.filter((b) => String(b.status).toLowerCase() === 'pending')
  const utilization = Math.round((bookings.length / Math.max(rooms.length * 2, 1)) * 100)

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-ink bg-white p-5">
        <h1 className="font-display text-xl font-700 text-ink">Admin Dashboard</h1>
        <p className="mt-2 text-sm text-slate">Operational overview for room management and approval workloads.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <DashboardCard title="Total Rooms" value={rooms.length} description="Active room inventory" />
        <DashboardCard title="Today's Bookings" value={todayBookings.length} tone="warning" description="Bookings scheduled for today" />
        <DashboardCard title="Pending Approvals" value={pendingApprovals.length} tone="accent" description="Pending requests awaiting review" to="/admin/booking-management" />
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

          {pendingApprovals.length === 0 ? (
            <p className="mt-4 text-sm text-slate">No pending bookings at the moment.</p>
          ) : (
            <div className="mt-4 space-y-3">
              {pendingApprovals.slice(0, 4).map((booking) => (
                <div key={booking.id} className="rounded-xl border border-line bg-portal-bg p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium text-sm text-ink">{booking.roomName}</p>
                      <p className="text-xs text-slate">{booking.date} • {booking.startTime}–{booking.endTime}</p>
                    </div>
                    <CustomStatusTag status={booking.status} />
                  </div>
                  <p className="mt-2 text-xs text-slate">Requested by {booking.requestedBy || booking.requester || 'Team member'}</p>
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

          <div className="mt-4 space-y-3">
            {bookings.slice(0, 4).map((booking) => (
              <div key={booking.id} className="rounded-xl border border-line bg-portal-bg p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium text-sm text-ink">{booking.roomName}</p>
                    <p className="text-xs text-slate">{booking.date} • {booking.startTime}–{booking.endTime}</p>
                  </div>
                  <CustomStatusTag status={booking.status} />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}