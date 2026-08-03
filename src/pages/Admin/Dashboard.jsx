import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import Card from '../../components/common/Card'
import Button from '../../components/common/Button'
import DashboardCard from '../../components/cards/DashboardCard'
import NotificationCard from '../../components/cards/NotificationCard'
import StatusTag from '../../components/common/StatusTag'
import { rooms as ROOMS, bookings as BOOKINGS, notifications as NOTIFS } from '../../services/mockData'

export default function AdminDashboard() {
  const rooms = useMemo(() => ROOMS, [])
  const bookings = useMemo(() => BOOKINGS, [])
  const notifications = useMemo(() => NOTIFS, [])

  const today = new Date().toISOString().slice(0, 10)
  const todayBookings = bookings.filter((b) => b.date === today)
  const pendingApprovals = bookings.filter((b) => String(b.status).toLowerCase() === 'pending')
  const confirmedToday = bookings.filter((b) => b.date === today && b.status === 'Confirmed').length
  const utilization = Math.round((bookings.length / Math.max(rooms.length * 2, 1)) * 100)

  return (
    <div className="space-y-6">
      <div className="border border-ink bg-white p-5">
        <h1 className="font-display text-xl font-700 text-ink">Admin Dashboard</h1>
        <p className="mt-2 text-sm text-slate">Operational overview for room management and approval workloads.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <DashboardCard title="Total Rooms" value={rooms.length} description="Active room inventory" />
        <DashboardCard title="Today's Bookings" value={todayBookings.length} tone="warning" description="Bookings scheduled for today" />
        <DashboardCard title="Pending Approvals" value={pendingApprovals.length} tone="accent" description="Pending requests awaiting review" />
        <DashboardCard title="Utilization" value={`${utilization}%`} description="Approximate occupancy" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-sm font-700 text-ink">Pending Approvals</h2>
              <p className="text-xs text-slate">Review the latest pending room requests.</p>
            </div>
            <Link to="/admin/booking-management" className="text-xs text-portal-accent underline">Manage all</Link>
          </div>

          {pendingApprovals.length === 0 ? (
            <p className="mt-4 text-sm text-slate">No pending bookings at the moment.</p>
          ) : (
            <div className="mt-4 space-y-3">
              {pendingApprovals.slice(0, 4).map((booking) => (
                <div key={booking.id} className="rounded-xl border border-line bg-portal-bg p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium text-sm">{booking.roomName}</p>
                      <p className="text-xs text-slate">{booking.date} • {booking.startTime}–{booking.endTime}</p>
                    </div>
                    <StatusTag status={booking.status} />
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
            <Link to="/admin/reports" className="text-xs text-portal-accent underline">View reports</Link>
          </div>

          <div className="mt-4 space-y-3">
            {bookings.slice(0, 4).map((booking) => (
              <div key={booking.id} className="rounded-xl border border-line bg-portal-bg p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium text-sm">{booking.roomName}</p>
                    <p className="text-xs text-slate">{booking.date} • {booking.startTime}–{booking.endTime}</p>
                  </div>
                  <StatusTag status={booking.status} />
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-sm font-700 text-ink">Admin Actions</h2>
              <p className="text-xs text-slate">Jump to core admin tools.</p>
            </div>
          </div>

          <div className="mt-4 grid gap-2">
            <Link to="/admin/room-management"><Button variant="ghost">Room Management</Button></Link>
            <Link to="/admin/booking-management"><Button variant="ghost">Booking Management</Button></Link>
            <Link to="/admin/reports"><Button variant="ghost">Reports</Button></Link>
            <Link to="/admin/settings"><Button variant="ghost">Settings</Button></Link>
          </div>
        </Card>
      </div>

      <Card>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-sm font-700 text-ink">System Notifications</h2>
            <p className="text-xs text-slate">Important operational alerts and messages.</p>
          </div>
          <Link to="/notifications" className="text-xs text-portal-accent underline">View all</Link>
        </div>

        <div className="mt-4 space-y-3">
          {notifications.slice(0, 3).map((notification) => (
            <NotificationCard
              key={notification.id}
              title={notification.title}
              message={notification.message}
              time={notification.time}
              tone={notification.tone}
            />
          ))}
        </div>
      </Card>
    </div>
  )
}
