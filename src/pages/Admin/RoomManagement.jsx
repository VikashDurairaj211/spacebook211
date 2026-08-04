import { useMemo, useState } from 'react'
import Card from '../../components/common/Card'
import Button from '../../components/common/Button'
import Modal from '../../components/common/Modal'
import StatusTag from '../../components/common/StatusTag'
import { rooms as ROOMS } from '../../services/mockData'

const facilityOptions = ['TV', 'Whiteboard', 'Projector', 'Video Conferencing', 'Phone', 'Coffee Machine']

function getSuggestedRoomName(type, rooms) {
  const baseName = type.toLowerCase().includes('discussion')
    ? 'Discussion Room'
    : type.toLowerCase().includes('conference')
      ? 'Conference Room'
      : `${type} Room`

  const existingNumbers = rooms
    .filter((room) => room.type.toLowerCase() === type.toLowerCase())
    .map((room) => Number(room.name.match(/(\d+)$/)?.[1]))
    .filter((value) => Number.isFinite(value))

  const nextNumber = existingNumbers.length > 0 ? Math.max(...existingNumbers) + 1 : 1
  return `${baseName} ${nextNumber}`
}

function getSuggestedCode(moduleName, type, rooms) {
  const moduleNumber = moduleName.match(/\d+/)?.[0] || '1'
  const typeCode = type.slice(0, 2).toUpperCase()
  const existingForType = rooms.filter((room) => room.module === moduleName && room.type === type).length + 1
  return `M${moduleNumber}-${typeCode}${existingForType}`
}

function getEmptyFormData() {
  return {
    name: '',
    code: '',
    module: 'Module 1',
    type: 'Discussion',
    capacity: 4,
    status: 'Available',
    facilities: [],
  }
}

export default function RoomManagement() {
  const [rooms, setRooms] = useState(() => ROOMS.map((room) => ({ ...room, facilities: room.facilities ?? [] })))
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [moduleFilter, setModuleFilter] = useState('All')
  const [modalOpen, setModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState('add')
  const [selectedRoomId, setSelectedRoomId] = useState(null)
  const [formData, setFormData] = useState(getEmptyFormData())

  const modules = useMemo(
    () => ['All', ...new Set(rooms.map((room) => room.module))],
    [rooms]
  )

  const filteredRooms = useMemo(() => {
    return rooms.filter((room) => {
      const matchesSearch = [room.name, room.code, room.type, room.module, (room.facilities || []).join(' ')]
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

  const openAddModal = () => {
    setFormData({
      ...getEmptyFormData(),
      name: getSuggestedRoomName('Discussion', rooms),
      code: getSuggestedCode('Module 1', 'Discussion', rooms),
    })
    setModalMode('add')
    setSelectedRoomId(null)
    setModalOpen(true)
  }

  const openEditModal = (room) => {
    setFormData({
      ...room,
      facilities: [...(room.facilities || [])],
    })
    setModalMode('edit')
    setSelectedRoomId(room.id)
    setModalOpen(true)
  }

  const openViewModal = (room) => {
    setFormData({
      ...room,
      facilities: [...(room.facilities || [])],
    })
    setModalMode('view')
    setSelectedRoomId(room.id)
    setModalOpen(true)
  }

  const closeModal = () => {
    setModalOpen(false)
    setSelectedRoomId(null)
  }

  const handleFieldChange = (event) => {
    const { name, value } = event.target
    setFormData((previous) => ({ ...previous, [name]: value }))
  }

  const handleFacilityToggle = (facility) => {
    setFormData((previous) => {
      const facilities = previous.facilities.includes(facility)
        ? previous.facilities.filter((item) => item !== facility)
        : [...previous.facilities, facility]
      return { ...previous, facilities }
    })
  }

  const handleSubmit = (event) => {
    event.preventDefault()

    const nextRoom = {
      ...formData,
      id: selectedRoomId || `room-${Date.now()}`,
      name: formData.name || getSuggestedRoomName(formData.type, rooms),
      code: formData.code || getSuggestedCode(formData.module, formData.type, rooms),
      capacity: Number(formData.capacity) || 4,
      facilities: formData.facilities || [],
    }

    if (modalMode === 'edit' && selectedRoomId) {
      setRooms((previous) => previous.map((room) => (room.id === selectedRoomId ? nextRoom : room)))
    } else {
      setRooms((previous) => [...previous, nextRoom])
    }

    closeModal()
  }

  const handleDelete = (roomId) => {
    setRooms((previous) => previous.filter((room) => room.id !== roomId))
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-ink bg-white p-5">
        <h1 className="font-display text-xl font-700 text-ink">Room Management</h1>
        <p className="mt-2 text-sm text-slate">Manage room inventory, capacity, availability, and facilities for your workspace.</p>
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

      <Card className="hover:shadow-none hover:-translate-y-0">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <h2 className="font-display text-sm font-700 text-ink">Room Inventory</h2>
            <p className="text-sm text-slate">Search, filter, and manage room details for admin operations.</p>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-3 lg:flex-nowrap">
            <Button className="shrink-0 min-w-[96px] justify-center px-3 py-2" onClick={openAddModal}>Add Room</Button>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search rooms, codes, types..."
              className="min-w-[220px] flex-1 rounded-xl border border-line bg-portal-bg px-3 py-2 text-sm text-ink outline-none focus:border-portal-accent"
            />
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="shrink-0 min-w-[140px] rounded-xl border border-line bg-white px-3 py-2 text-sm text-ink outline-none"
            >
              <option>All</option>
              <option>Available</option>
              <option>Booked</option>
            </select>
            <select
              value={moduleFilter}
              onChange={(event) => setModuleFilter(event.target.value)}
              className="shrink-0 min-w-[140px] rounded-xl border border-line bg-white px-3 py-2 text-sm text-ink outline-none"
            >
              {modules.map((module) => (
                <option key={module}>{module}</option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      <Card className="overflow-x-auto">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead>
            <tr className="border-b border-line text-[11px] uppercase tracking-[0.2em] text-slate">
              <th className="px-4 py-3">Room</th>
              <th className="px-4 py-3">Code</th>
              <th className="px-4 py-3">Module</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Capacity</th>
              <th className="px-4 py-3">Facilities</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredRooms.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-6 text-center text-slate">No rooms match your filters.</td>
              </tr>
            ) : (
              filteredRooms.map((room) => (
                <tr key={room.id} className="border-b border-line transition-colors duration-200 hover:bg-portal-bg/70 last:border-0">
                  <td className="px-4 py-3 font-medium text-ink">{room.name}</td>
                  <td className="px-4 py-3 text-slate">{room.code}</td>
                  <td className="px-4 py-3 text-slate">{room.module}</td>
                  <td className="px-4 py-3 text-slate">{room.type}</td>
                  <td className="px-4 py-3 text-slate">{room.capacity}</td>
                  <td className="px-4 py-3 text-slate">
                    {(room.facilities || []).length > 0 ? (
                      <div
                        className="min-w-0 overflow-hidden text-ellipsis"
                        style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}
                      >
                        {(room.facilities || []).join(', ')}
                      </div>
                    ) : (
                      <span className="text-slate">None</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <StatusTag status={room.status} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-nowrap items-center gap-2">
                      <Button className="min-w-[70px]" size="sm" variant="secondary" onClick={() => openEditModal(room)}>Edit</Button>
                      <Button className="min-w-[78px]" size="sm" variant="danger" onClick={() => handleDelete(room.id)}>Delete</Button>
                      <Button className="min-w-[70px]" size="sm" onClick={() => openViewModal(room)}>View</Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </Card>

      <Modal
        open={modalOpen}
        title={modalMode === 'view' ? 'Room Details' : modalMode === 'edit' ? 'Edit Room' : 'Add Room'}
        footer={
          <>
            <Button variant="secondary" onClick={closeModal}>Cancel</Button>
            {modalMode !== 'view' ? (
              <Button onClick={handleSubmit}>{modalMode === 'edit' ? 'Save Changes' : 'Create Room'}</Button>
            ) : null}
          </>
        }
      >
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-1">
              <span className="text-xs uppercase tracking-[0.2em] text-slate">Room Name</span>
              <input
                name="name"
                value={formData.name}
                onChange={handleFieldChange}
                disabled={modalMode === 'view'}
                className="w-full rounded-xl border border-line bg-portal-bg px-3 py-2 text-sm text-ink outline-none focus:border-portal-accent disabled:cursor-not-allowed"
              />
            </label>
            <label className="space-y-1">
              <span className="text-xs uppercase tracking-[0.2em] text-slate">Code</span>
              <input
                name="code"
                value={formData.code}
                onChange={handleFieldChange}
                disabled={modalMode === 'view'}
                className="w-full rounded-xl border border-line bg-portal-bg px-3 py-2 text-sm text-ink outline-none focus:border-portal-accent disabled:cursor-not-allowed"
              />
            </label>
            <label className="space-y-1">
              <span className="text-xs uppercase tracking-[0.2em] text-slate">Module</span>
              <select
                name="module"
                value={formData.module}
                onChange={handleFieldChange}
                disabled={modalMode === 'view'}
                className="w-full rounded-xl border border-line bg-white px-3 py-2 text-sm text-ink outline-none disabled:cursor-not-allowed"
              >
                <option>Module 1</option>
                <option>Module 2</option>
                <option>Module 3</option>
              </select>
            </label>
            <label className="space-y-1">
              <span className="text-xs uppercase tracking-[0.2em] text-slate">Type</span>
              <select
                name="type"
                value={formData.type}
                onChange={handleFieldChange}
                disabled={modalMode === 'view'}
                className="w-full rounded-xl border border-line bg-white px-3 py-2 text-sm text-ink outline-none disabled:cursor-not-allowed"
              >
                <option>Discussion</option>
                <option>Conference</option>
                <option>Training</option>
                <option>Game</option>
              </select>
            </label>
            <label className="space-y-1">
              <span className="text-xs uppercase tracking-[0.2em] text-slate">Capacity</span>
              <input
                name="capacity"
                type="number"
                min="1"
                value={formData.capacity}
                onChange={handleFieldChange}
                disabled={modalMode === 'view'}
                className="w-full rounded-xl border border-line bg-portal-bg px-3 py-2 text-sm text-ink outline-none focus:border-portal-accent disabled:cursor-not-allowed"
              />
            </label>
            <label className="space-y-1">
              <span className="text-xs uppercase tracking-[0.2em] text-slate">Status</span>
              <select
                name="status"
                value={formData.status}
                onChange={handleFieldChange}
                disabled={modalMode === 'view'}
                className="w-full rounded-xl border border-line bg-white px-3 py-2 text-sm text-ink outline-none disabled:cursor-not-allowed"
              >
                <option>Available</option>
                <option>Booked</option>
              </select>
            </label>
          </div>

          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.2em] text-slate">Facilities</p>
            <div className="flex flex-wrap gap-2">
              {facilityOptions.map((facility) => {
                const checked = formData.facilities.includes(facility)
                return (
                  <label key={facility} className={`rounded-full border px-3 py-2 text-sm ${checked ? 'border-ink bg-ink text-paper' : 'border-line bg-portal-bg text-ink'}`}>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => handleFacilityToggle(facility)}
                      disabled={modalMode === 'view'}
                      className="mr-2"
                    />
                    {facility}
                  </label>
                )
              })}
            </div>
          </div>
        </form>
      </Modal>
    </div>
  )
}
