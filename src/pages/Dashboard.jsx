import { useMemo } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Card from '../components/common/Card'
import StatusTag from '../components/common/StatusTag'
import Button from '../components/common/Button'
import DashboardCard from '../components/cards/DashboardCard'
import { rooms as ROOMS, bookings as BOOKINGS } from '../services/mockData'

export default function Dashboard() {
  const { user } = useAuth()

  if (user?.role === 'Admin') {
    return <Navigate to="/admin/dashboard" replace />
  }

  const rooms = useMemo(() => ROOMS, [])
  const bookings = useMemo(() => BOOKINGS, [])
  const today = new Date().toISOString().slice(0, 10)
  const todaysMeetings = bookings.filter((b) => b.date === today && b.status !== 'Cancelled')
  const upcoming = bookings.filter((b) => b.status !== 'Cancelled').slice(0, 5)

  const moduleCounts = rooms.reduce((acc, room) => {
    acc[room.module] = (acc[room.module] || 0) + 1
    return acc
  }, {})
  const availableCount = rooms.filter((r) => r.status === 'Available').length

  return (
    <div className="space-y-6">
      {/* Welcome banner */}
      <div className="border border-ink bg-white p-5">
        <p className="font-mono text-[11px] uppercase tracking-wider text-slate">
          {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </p>
        <h1 className="mt-1 font-display text-xl font-700 text-ink">
          Welcome, {user?.name || 'there'}
        </h1>
        <p className="mt-2 text-sm text-slate">Find and reserve a workspace for your next meeting.</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <DashboardCard title="Bookings Today" value={bookings.filter((b) => b.date === today).length} tone="warning" />
        <DashboardCard title="Upcoming" value={upcoming.length} />
      </div>

      {/* Upcoming bookings table */}
      <Card className="p-0">
        <div className="border-b border-line px-4 py-3 flex items-center justify-between">
          <h2 className="font-display text-sm font-700">Recent Reservations</h2>
          <Link to="/my-bookings" className="text-xs text-slate underline">View all</Link>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left font-mono text-[11px] uppercase tracking-wider text-slate">
              <th className="px-4 py-2 font-medium">Room</th>
              <th className="px-4 py-2 font-medium">Date</th>
              <th className="px-4 py-2 font-medium">Time</th>
              <th className="px-4 py-2 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {upcoming.length === 0 && (
              <tr><td colSpan={4} className="px-4 py-6 text-slate">No upcoming bookings yet.</td></tr>
            )}
            {upcoming.map((b) => (
              <tr key={b.id} className="border-b border-line last:border-0">
                <td className="px-4 py-2.5">{b.roomName}</td>
                <td className="px-4 py-2.5 font-mono text-xs">{b.date}</td>
                <td className="px-4 py-2.5 font-mono text-xs">{b.startTime}–{b.endTime}</td>
                <td className="px-4 py-2.5"><StatusTag status={b.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <div className="grid gap-4 md:grid-cols-1">
        <Card>
          <h2 className="mb-3 font-display text-sm font-700">Today's Meetings</h2>
          {todaysMeetings.length === 0 ? (
            <p className="text-sm text-slate">Nothing on your calendar today.</p>
          ) : (
            <ul className="space-y-2">
              {todaysMeetings.map((m) => (
                <li key={m.id} className="flex justify-between text-sm">
                  <span>{m.title}</span>
                  <span className="font-mono text-xs text-slate">{m.startTime}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  )
}
