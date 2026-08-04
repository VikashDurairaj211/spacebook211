import Card from '../../components/common/Card'

export default function RecentActivityTable({ recentBookings, mostBookedRooms, leastUsedRooms }) {
  return (
    <div className="grid gap-4 xl:grid-cols-3">
      <Card className="rounded-[24px] border border-line bg-white p-5 shadow-sm">
        <h3 className="font-display text-sm font-700 text-ink">Most Booked Rooms</h3>
        <p className="text-sm text-slate">Top rooms by booking volume.</p>
        <div className="mt-4 space-y-3">
          <div className="grid grid-cols-[1.5fr_1fr_1fr_1fr] gap-3 border-b border-line pb-3 text-xs uppercase tracking-[0.2em] text-slate">
            <span>Room Name</span>
            <span>Module</span>
            <span>Total Bookings</span>
            <span>Utilization</span>
          </div>
          {mostBookedRooms.map((room) => (
            <div key={room.roomName} className="grid grid-cols-[1.5fr_1fr_1fr_1fr] gap-3 py-3 text-sm text-ink">
              <span>{room.roomName}</span>
              <span>{room.module}</span>
              <span>{room.totalBookings}</span>
              <span>{room.utilization}%</span>
            </div>
          ))}
        </div>
      </Card>

      <Card className="rounded-[24px] border border-line bg-white p-5 shadow-sm">
        <h3 className="font-display text-sm font-700 text-ink">Least Used Rooms</h3>
        <p className="text-sm text-slate">Rooms with the lowest booking frequency.</p>
        <div className="mt-4 space-y-3">
          <div className="grid grid-cols-[1.5fr_1fr_1fr] gap-3 border-b border-line pb-3 text-xs uppercase tracking-[0.2em] text-slate">
            <span>Room Name</span>
            <span>Module</span>
            <span>Total Bookings</span>
          </div>
          {leastUsedRooms.map((room) => (
            <div key={room.roomName} className="grid grid-cols-[1.5fr_1fr_1fr] gap-3 py-3 text-sm text-ink">
              <span>{room.roomName}</span>
              <span>{room.module}</span>
              <span>{room.totalBookings}</span>
            </div>
          ))}
        </div>
      </Card>

      <Card className="rounded-[24px] border border-line bg-white p-5 shadow-sm">
        <h3 className="font-display text-sm font-700 text-ink">Recent Booking Activity</h3>
        <p className="text-sm text-slate">Latest reservation actions and statuses.</p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[420px] text-left text-sm">
            <thead>
              <tr className="border-b border-line text-xs uppercase tracking-[0.2em] text-slate">
                <th className="px-3 py-2">Booking ID</th>
                <th className="px-3 py-2">Employee</th>
                <th className="px-3 py-2">Room</th>
                <th className="px-3 py-2">Date</th>
                <th className="px-3 py-2">Duration</th>
                <th className="px-3 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {recentBookings.map((booking) => (
                <tr key={booking.bookingId} className="border-b border-line text-sm text-ink last:border-0">
                  <td className="px-3 py-3">{booking.bookingId}</td>
                  <td className="px-3 py-3">{booking.employee}</td>
                  <td className="px-3 py-3">{booking.room}</td>
                  <td className="px-3 py-3">{booking.date}</td>
                  <td className="px-3 py-3">{booking.duration}</td>
                  <td className="px-3 py-3 text-slate">{booking.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
