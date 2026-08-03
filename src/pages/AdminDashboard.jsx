import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import DashboardCard from '../components/cards/DashboardCard'
import NotificationCard from '../components/cards/NotificationCard'
import Card from '../components/common/Card'
import Button from '../components/common/Button'
import StatusTag from '../components/common/StatusTag'
import { rooms as ROOMS, bookings as BOOKINGS, notifications as NOTIFS } from '../services/mockData'

export default function AdminDashboard() {
  const rooms = useMemo(() => ROOMS, [])
  const bookings = useMemo(() => BOOKINGS, [])
  const notifications = useMemo(() => NOTIFS, [])

  const today = new Date().toISOString().slice(0, 10)
  const bookingsToday = bookings.filter((b) => b.date === today)
  const pending = bookings.filter((b) => String(b.status).toLowerCase() === 'pending')

  return (
    <div className="space-y-6">
      <div className="border border-ink bg-white p-5">
        <h1 className="font-display text-xl font-700 text-ink">Admin Dashboard</h1>
        <p className="mt-1 text-sm text-slate">Overview of system metrics and pending actions</p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <DashboardCard title="Total Rooms" value={rooms.length} />
        <DashboardCard title="Available" value={rooms.filter((r) => r.status === 'Available').length} tone="success" />
        <DashboardCard title="Total Bookings" value={bookings.length} />
        <DashboardCard title="Bookings Today" value={bookingsToday.length} tone="warning" />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <h2 className="mb-3 font-display text-sm font-700">Pending Approvals</h2>
          {pending.length === 0 ? (
            <p className="text-sm text-slate">No bookings pending approval.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left font-mono text-[11px] uppercase tracking-wider text-slate">
                  <th className="px-3 py-2">Room</th>
                  <th className="px-3 py-2">Date</th>
                  <th className="px-3 py-2">Requested By</th>
                  <th className="px-3 py-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {pending.slice(0,6).map((p) => (
                  <tr key={p.id} className="border-b border-line">
                    <td className="px-3 py-2">{p.roomName}</td>
                    <td className="px-3 py-2 font-mono text-xs">{p.date}</td>
                    <td className="px-3 py-2 text-sm">{p.requestedBy || p.requester || '—'}</td>
                    <td className="px-3 py-2"><Button size="sm">Review</Button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>

        <Card>
          <h2 className="mb-3 font-display text-sm font-700">Recent Activity</h2>
          <div className="space-y-2">
            {bookings.slice(0,4).map((b) => (
              <div key={b.id} className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">{b.roomName}</p>
                  <p className="text-xs text-slate">{b.date} • {b.startTime}–{b.endTime}</p>
                </div>
                <StatusTag status={b.status} />
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <h2 className="mb-3 font-display text-sm font-700">Admin Links</h2>
          <div className="flex flex-col gap-2">
            <Link to="/admin/rooms"><Button variant="ghost">Manage Rooms</Button></Link>
            <Link to="/admin/bookings"><Button variant="ghost">Manage Bookings</Button></Link>
            <Link to="/admin/users"><Button variant="ghost">Manage Users</Button></Link>
          </div>
        </Card>
      </div>

      <Card>
        <h2 className="mb-3 font-display text-sm font-700">System Notifications</h2>
        <div className="space-y-2">
          {notifications.slice(0,5).map((n) => (
            <NotificationCard key={n.id} title={n.title} message={n.message} time={n.time} tone={n.tone} />
          ))}
        </div>
      </Card>
    </div>
  )
}
