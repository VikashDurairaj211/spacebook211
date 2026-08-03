import { useMemo } from 'react'
import Card from '../../components/common/Card'
import DashboardCard from '../../components/cards/DashboardCard'
import StatusTag from '../../components/common/StatusTag'
import { rooms as ROOMS, bookings as BOOKINGS } from '../../services/mockData'

export default function Reports() {
  const rooms = useMemo(() => ROOMS, [])
  const bookings = useMemo(() => BOOKINGS, [])

  const pendingCount = bookings.filter((booking) => booking.status === 'Pending').length
  const confirmedCount = bookings.filter((booking) => booking.status === 'Confirmed').length
  const cancelledCount = bookings.filter((booking) => booking.status === 'Cancelled').length

  const moduleSummary = useMemo(() => {
    return rooms.reduce((acc, room) => {
      acc[room.module] = acc[room.module] || { total: 0, available: 0, booked: 0 }
      acc[room.module].total += 1
      if (room.status === 'Available') acc[room.module].available += 1
      if (room.status === 'Booked') acc[room.module].booked += 1
      return acc
    }, {})
  }, [rooms])

  return (
    <div className="space-y-6">
      <div className="border border-ink bg-white p-5">
        <h1 className="font-display text-xl font-700 text-ink">Reports</h1>
        <p className="mt-2 text-sm text-slate">Room and booking trends to support admin decisions.</p>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <DashboardCard title="Total Bookings" value={bookings.length} description="All requests logged" />
        <DashboardCard title="Pending" value={pendingCount} tone="warning" description="Awaiting approval" />
        <DashboardCard title="Confirmed" value={confirmedCount} tone="success" description="Scheduled bookings" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-sm font-700 text-ink">Booking Status Summary</h2>
              <p className="text-sm text-slate">Current distribution of booking states.</p>
            </div>
            <span className="font-mono text-xs uppercase tracking-[0.2em] text-slate">{new Date().toLocaleDateString()}</span>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <div className="rounded-sm border border-line bg-portal-bg p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate">Pending</p>
              <p className="mt-2 text-2xl font-700 text-clay">{pendingCount}</p>
            </div>
            <div className="rounded-sm border border-line bg-portal-bg p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate">Confirmed</p>
              <p className="mt-2 text-2xl font-700 text-moss">{confirmedCount}</p>
            </div>
            <div className="rounded-sm border border-line bg-portal-bg p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate">Cancelled</p>
              <p className="mt-2 text-2xl font-700 text-slate">{cancelledCount}</p>
            </div>
          </div>
        </Card>

        <Card>
          <h2 className="font-display text-sm font-700 text-ink">Module Utilization</h2>
          <p className="text-sm text-slate">Room status breakdown per module.</p>

          <div className="mt-5 space-y-3">
            {Object.entries(moduleSummary).map(([module, values]) => (
              <div key={module} className="rounded-xl border border-line bg-portal-bg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm text-ink">{module}</p>
                    <p className="text-xs text-slate">{values.total} rooms total</p>
                  </div>
                  <span className="font-mono text-xs uppercase tracking-[0.2em] text-slate">{Math.round((values.booked / values.total) * 100)}% booked</span>
                </div>
                <div className="mt-4 grid gap-2 sm:grid-cols-3">
                  <div className="rounded-sm bg-white p-3 text-center">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate">Available</p>
                    <p className="mt-2 text-xl font-700 text-moss">{values.available}</p>
                  </div>
                  <div className="rounded-sm bg-white p-3 text-center">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate">Booked</p>
                    <p className="mt-2 text-xl font-700 text-clay">{values.booked}</p>
                  </div>
                  <div className="rounded-sm bg-white p-3 text-center">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate">Total</p>
                    <p className="mt-2 text-xl font-700 text-ink">{values.total}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-sm font-700 text-ink">Key insights</h2>
            <p className="text-sm text-slate">Operational observations from current room usage.</p>
          </div>
        </div>

        <ul className="mt-5 space-y-3 text-sm text-slate">
          <li className="rounded-xl border border-line bg-portal-bg px-4 py-3">Most bookings are coming from Module 2 this week.</li>
          <li className="rounded-xl border border-line bg-portal-bg px-4 py-3">Pending approvals remain low, so the booking pipeline is healthy.</li>
          <li className="rounded-xl border border-line bg-portal-bg px-4 py-3">Room utilization suggests there is available capacity for new training sessions.</li>
        </ul>
      </Card>
    </div>
  )
}
