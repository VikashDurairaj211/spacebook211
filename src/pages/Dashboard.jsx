import { useMemo } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Card from '../components/common/Card'
import StatusTag from '../components/common/StatusTag'
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

  return (
    <div className="space-y-6 font-serif">
      {/* Welcome banner */}
      <div className="border border-slate-200/80 bg-white p-5 rounded-2xl shadow-sm">
        <p className="font-serif text-[11px] uppercase tracking-wider text-slate-500">
          {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </p>
        <h1 className="mt-1 font-serif text-xl font-bold text-slate-900">
          Welcome, {user?.name || 'there'}
        </h1>
        <p className="mt-2 text-sm text-slate-600 font-serif">
          Find and reserve a workspace for your next meeting.
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <DashboardCard title="Bookings Today" value={bookings.filter((b) => b.date === today).length} tone="warning" />
        <DashboardCard title="Upcoming" value={upcoming.length} />
        <DashboardCard title="Today's Meetings" value={todaysMeetings.length} />
      </div>

      {/* Recent Reservations Table */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm font-serif">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-serif text-base font-semibold text-slate-800">Recent Reservations</h2>
          <Link to="/my-bookings" className="text-xs text-slate-500 hover:underline font-serif">
            View all
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm font-serif">
            <thead>
              <tr className="border-b border-slate-200 text-[11px] font-bold uppercase tracking-widest text-slate-500 font-serif">
                <th className="py-3 px-4 font-semibold">ROOM</th>
                <th className="py-3 px-4 font-semibold">DATE</th>
                <th className="py-3 px-4 font-semibold">TIME</th>
                <th className="py-3 px-4 font-semibold">STATUS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {upcoming.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-6 px-4 text-slate-500 font-serif">
                    No upcoming bookings yet.
                  </td>
                </tr>
              )}
              {upcoming.map((b) => (
                <tr key={b.id} className="hover:bg-slate-50/50">
                  <td className="py-3.5 px-4 text-slate-700 font-serif">{b.roomName}</td>
                  
                  {/* Clean standard numbers for date */}
                  <td className="py-3.5 px-4 text-slate-700 font-sans text-xs tracking-normal tabular-nums">
                    {b.date}
                  </td>
                  
                  {/* Clean standard numbers for time */}
                  <td className="py-3.5 px-4 text-slate-700 font-sans text-xs tracking-normal tabular-nums">
                    {b.startTime}–{b.endTime}
                  </td>
                  
                  <td className="py-3.5 px-4">
                    <StatusTag status={b.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}