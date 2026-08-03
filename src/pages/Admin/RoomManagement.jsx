import { useMemo, useState } from 'react'
import Card from '../../components/common/Card'
import Button from '../../components/common/Button'
import StatusTag from '../../components/common/StatusTag'
import { rooms as ROOMS } from '../../services/mockData'

export default function RoomManagement() {
  const rooms = useMemo(() => ROOMS, [])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [moduleFilter, setModuleFilter] = useState('All')

  const modules = useMemo(
    () => ['All', ...new Set(rooms.map((room) => room.module))],
    [rooms]
  )

  const filteredRooms = useMemo(() => {
    return rooms.filter((room) => {
      const matchesSearch = [room.name, room.code, room.type, room.module]
        .join(' ')
        .toLowerCase()
        .includes(search.toLowerCase())
      const matchesStatus = statusFilter === 'All' || room.status === statusFilter
      const matchesModule = moduleFilter === 'All' || room.module === moduleFilter
      return matchesSearch && matchesStatus && matchesModule
    })
  }, [rooms, search, statusFilter, moduleFilter])

  const statusCounts = useMemo(() => {
    return rooms.reduce(
      (acc, room) => {
        acc[room.status] = (acc[room.status] || 0) + 1
        return acc
      },
      { Available: 0, Booked: 0 }
    )
  }, [rooms])

  return (
    <div className="space-y-6">
      <div className="border border-ink bg-white p-5">
        <h1 className="font-display text-xl font-700 text-ink">Room Management</h1>
        <p className="mt-2 text-sm text-slate">Manage room inventory, capacity, and availability for your workspace.</p>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <Card>
          <p className="font-mono text-[11px] uppercase tracking-wider text-slate">Total Rooms</p>
          <p className="mt-2 text-3xl font-700 text-ink">{rooms.length}</p>
          <p className="mt-1 text-sm text-slate">All rooms in the system</p>
        </Card>
        <Card>
          <p className="font-mono text-[11px] uppercase tracking-wider text-slate">Available</p>
          <p className="mt-2 text-3xl font-700 text-moss">{statusCounts.Available}</p>
          <p className="mt-1 text-sm text-slate">Rooms ready to reserve</p>
        </Card>
        <Card>
          <p className="font-mono text-[11px] uppercase tracking-wider text-slate">Booked</p>
          <p className="mt-2 text-3xl font-700 text-clay">{statusCounts.Booked}</p>
          <p className="mt-1 text-sm text-slate">Rooms currently reserved</p>
        </Card>
      </div>

      <Card>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="font-display text-sm font-700 text-ink">Room Inventory</h2>
            <p className="text-sm text-slate">Search and filter room details for admin operations.</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search rooms, codes, types..."
              className="rounded-sm border border-line bg-portal-bg px-3 py-2 text-sm text-ink outline-none focus:border-portal-accent"
            />
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="rounded-sm border border-line bg-white px-3 py-2 text-sm text-ink outline-none"
            >
              <option>All</option>
              <option>Available</option>
              <option>Booked</option>
            </select>
            <select
              value={moduleFilter}
              onChange={(event) => setModuleFilter(event.target.value)}
              className="rounded-sm border border-line bg-white px-3 py-2 text-sm text-ink outline-none"
            >
              {modules.map((module) => (
                <option key={module}>{module}</option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      <Card className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead>
            <tr className="border-b border-line text-[11px] uppercase tracking-[0.2em] text-slate">
              <th className="px-4 py-3">Room</th>
              <th className="px-4 py-3">Code</th>
              <th className="px-4 py-3">Module</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Capacity</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredRooms.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-slate">No rooms match your filters.</td>
              </tr>
            ) : (
              filteredRooms.map((room) => (
                <tr key={room.id} className="border-b border-line last:border-0">
                  <td className="px-4 py-3 font-medium text-ink">{room.name}</td>
                  <td className="px-4 py-3 text-slate">{room.code}</td>
                  <td className="px-4 py-3 text-slate">{room.module}</td>
                  <td className="px-4 py-3 text-slate">{room.type}</td>
                  <td className="px-4 py-3 text-slate">{room.capacity}</td>
                  <td className="px-4 py-3">
                    <StatusTag status={room.status} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" variant="secondary">Edit</Button>
                      <Button size="sm">View</Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </Card>
    </div>
  )
}
