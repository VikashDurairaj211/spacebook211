import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'

import client from '../../api/client'

import Card from '../../components/common/Card'
import Button from '../../components/common/Button'
import Modal from '../../components/common/Modal'

// =====================================================
// ROOM TYPE IDS
// Must match SpaceBook backend RoomType table
// =====================================================

const ROOM_TYPE_IDS = {
  discussion: 1,
  conference: 2,
  training: 3,
}

// =====================================================
// STATUS BADGE
// =====================================================

function CustomStatusTag({ status }) {
  const normalized = String(status || 'Available').toUpperCase()

  let bgClass = 'bg-[#658362] text-white'

  if (normalized === 'PENDING' || normalized === 'MAINTENANCE') {
    bgClass = 'bg-[#E09F3E] text-white'
  } else if (
    normalized === 'BOOKED' ||
    normalized === 'CANCELLED' ||
    normalized === 'UNAVAILABLE' ||
    normalized === 'REJECTED'
  ) {
    bgClass = 'bg-[#B85450] text-white'
  }

  return (
    <span
      className={`inline-block w-28 rounded-full py-1 text-center text-xs font-bold uppercase tracking-wider ${bgClass}`}
    >
      {normalized}
    </span>
  )
}

// =====================================================
// GET ROOM TYPE ID
// =====================================================

function getRoomTypeId(type) {
  const lower = String(type || '').toLowerCase().trim()

  if (lower.includes('discussion')) {
    return ROOM_TYPE_IDS.discussion
  }

  if (lower.includes('conference')) {
    return ROOM_TYPE_IDS.conference
  }

  if (lower.includes('training')) {
    return ROOM_TYPE_IDS.training
  }

  return ROOM_TYPE_IDS.conference
}

// =====================================================
// GET ROOM TYPE NAME
// =====================================================

function getRoomTypeName(room) {
  if (typeof room.roomType === 'string') {
    return room.roomType
  }

  if (room.roomType?.name) {
    return room.roomType.name
  }

  if (room.type) {
    return room.type
  }

  const roomTypeId = room.roomTypeId ?? room.RoomTypeId

  if (Number(roomTypeId) === ROOM_TYPE_IDS.discussion) {
    return 'Discussion'
  }

  if (Number(roomTypeId) === ROOM_TYPE_IDS.training) {
    return 'Training'
  }

  if (Number(roomTypeId) === ROOM_TYPE_IDS.conference) {
    return 'Conference'
  }

  return 'Conference'
}

// =====================================================
// NORMALIZE FACILITIES (Handles Backend String Array format)
// =====================================================

function normalizeFacilities(facilities, masterFacilities = []) {
  if (!Array.isArray(facilities)) {
    return []
  }

  return facilities
    .map((item, index) => {
      if (typeof item === 'string') {
        const trimmed = item.trim()
        const master = masterFacilities.find(
          (mf) => mf.name.toLowerCase() === trimmed.toLowerCase()
        )
        return {
          id: master ? master.id : index + 1,
          name: trimmed,
        }
      }

      if (item && typeof item === 'object') {
        const id = item.id ?? item.facilityId ?? index + 1
        const name = item.name ?? item.facilityName ?? 'Facility'
        return { id: Number(id), name: String(name).trim() }
      }

      return null
    })
    .filter(Boolean)
}

function normalizeFacilityList(data) {
  let list = []
  if (Array.isArray(data)) {
    list = data
  } else if (Array.isArray(data?.data)) {
    list = data.data
  } else if (Array.isArray(data?.facilities)) {
    list = data.facilities
  }

  return list
    .map((facility, index) => {
      const id = facility?.facilityId ?? facility?.id ?? index + 1
      const name = facility?.facilityName ?? facility?.name ?? String(facility)
      return {
        id: Number(id),
        name: String(name).trim(),
      }
    })
    .filter((f) => f.id && f.name)
}

function getFacilityNames(facilities) {
  if (!Array.isArray(facilities)) {
    return []
  }

  return facilities
    .map((facility) => {
      if (typeof facility === 'string') {
        return facility
      }
      return facility?.name || facility?.facilityName || ''
    })
    .filter(Boolean)
}

function getEmptyFormData() {
  return {
    roomName: '',
    roomNumber: '',
    module: 'Module 1 - Elcot Park - CMB',
    roomType: 'Conference',
    capacity: 4,
    status: 'Available',
    facilities: [],
  }
}

// =====================================================
// API HELPERS
// =====================================================

async function fetchAdminRooms() {
  const response = await client.get('/admin/rooms')
  const data = response.data

  if (Array.isArray(data)) return data
  if (Array.isArray(data?.data)) return data.data
  if (Array.isArray(data?.rooms)) return data.rooms

  return []
}

async function fetchAdminRoomDashboard() {
  try {
    const response = await client.get('/admin/rooms/dashboard')
    return response.data || {}
  } catch {
    return {}
  }
}

async function fetchAdminFacilities() {
  try {
    const response = await client.get('/admin/facilities')
    return normalizeFacilityList(response.data)
  } catch {
    // Fallback default facilities matching your data payload if route is missing
    return [
      { id: 1, name: 'Projector' },
      { id: 2, name: 'TV' },
      { id: 3, name: 'Whiteboard' },
    ]
  }
}

async function createAdminRoom(room) {
  const response = await client.post('/admin/rooms', room)
  return response.data
}

async function updateAdminRoom(roomId, room) {
  const response = await client.put(`/admin/rooms/${roomId}`, room)
  return response.data
}

async function deleteAdminRoom(roomId) {
  const response = await client.delete(`/admin/rooms/${roomId}`)
  return response.data
}

// =====================================================
// ROOM MANAGEMENT COMPONENT
// =====================================================

export default function RoomManagement() {
  const [searchParams, setSearchParams] = useSearchParams()

  const [rooms, setRooms] = useState([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  const [facilities, setFacilities] = useState([])
  const [facilitiesLoading, setFacilitiesLoading] = useState(false)

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [moduleFilter, setModuleFilter] = useState('All')

  const [dashboardStats, setDashboardStats] = useState({
    totalRooms: 0,
    availableRooms: 0,
    bookedRooms: 0,
  })

  const [modalOpen, setModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState('add')
  const [selectedRoomId, setSelectedRoomId] = useState(null)
  const [formData, setFormData] = useState(getEmptyFormData())

  useEffect(() => {
    const searchFromUrl = searchParams.get('search') || ''
    setSearch(searchFromUrl)
  }, [searchParams])

  const handleSearchChange = (val) => {
    setSearch(val)
    const newParams = new URLSearchParams(searchParams)
    if (val && val.trim()) {
      newParams.set('search', val)
    } else {
      newParams.delete('search')
    }
    setSearchParams(newParams, { replace: true })
  }

  const loadInitialData = async () => {
    try {
      setLoading(true)
      setFacilitiesLoading(true)
      setError('')

      const [facData, statsResponse, roomsResponse] = await Promise.all([
        fetchAdminFacilities(),
        fetchAdminRoomDashboard(),
        fetchAdminRooms(),
      ])

      setFacilities(facData)

      setDashboardStats({
        totalRooms: statsResponse?.totalRooms ?? roomsResponse.length,
        availableRooms:
          statsResponse?.availableRooms ??
          roomsResponse.filter((r) => String(r.status).toLowerCase() === 'available').length,
        bookedRooms:
          statsResponse?.bookedRooms ??
          roomsResponse.filter((r) => String(r.status).toLowerCase() === 'booked').length,
      })

      const mappedRooms = roomsResponse.map((room) => {
        const roomType = getRoomTypeName(room)
        const roomFacilities = normalizeFacilities(room.facilities, facData)

        return {
          id: room.roomId ?? room.id,
          roomName: room.roomName ?? room.name ?? 'Unnamed Room',
          roomNumber: room.roomNumber ?? room.roomCode ?? room.code ?? '-',
          module: room.module ?? 'Module 1',
          roomType: roomType,
          capacity: room.capacity ?? 4,
          status: room.status ?? 'Available',
          facilities: roomFacilities,
        }
      })

      setRooms(mappedRooms)
    } catch (err) {
      setError('Unable to fetch live room inventory from the server.')
    } finally {
      setLoading(false)
      setFacilitiesLoading(false)
    }
  }

  useEffect(() => {
    loadInitialData()
  }, [])

  const modules = useMemo(() => {
    return ['All', ...new Set(rooms.map((room) => room.module).filter(Boolean))]
  }, [rooms])

  const filteredRooms = useMemo(() => {
    const searchValue = search.toLowerCase().trim()

    return rooms.filter((room) => {
      const facilitiesText = getFacilityNames(room.facilities).join(' ')
      const searchableText = [
        room.roomName,
        room.roomNumber,
        room.module,
        room.roomType,
        room.status,
        facilitiesText,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()

      const matchesSearch = !searchValue || searchableText.includes(searchValue)
      const matchesStatus =
        statusFilter === 'All' || String(room.status).toLowerCase() === statusFilter.toLowerCase()
      const matchesModule = moduleFilter === 'All' || room.module === moduleFilter

      return matchesSearch && matchesStatus && matchesModule
    })
  }, [rooms, search, statusFilter, moduleFilter])

  const statusCounts = useMemo(() => {
    return rooms.reduce(
      (acc, room) => {
        const status = String(room.status || 'Available').toLowerCase()
        if (status === 'available') acc.Available += 1
        else if (status === 'booked') acc.Booked += 1
        else if (status === 'maintenance') acc.Maintenance += 1
        return acc
      },
      { Available: 0, Booked: 0, Maintenance: 0 }
    )
  }, [rooms])

  const openAddModal = () => {
    setFormData(getEmptyFormData())
    setModalMode('add')
    setSelectedRoomId(null)
    setError('')
    setSuccessMessage('')
    setModalOpen(true)
  }

  const openEditModal = (room) => {
    setFormData({
      roomName: room.roomName,
      roomNumber: room.roomNumber,
      module: room.module,
      roomType: room.roomType,
      capacity: room.capacity,
      status: room.status,
      facilities: [...room.facilities],
    })
    setModalMode('edit')
    setSelectedRoomId(room.id)
    setError('')
    setSuccessMessage('')
    setModalOpen(true)
  }

  const openViewModal = (room) => {
    openEditModal(room)
    setModalMode('view')
  }

  const closeModal = () => {
    if (submitting) return
    setModalOpen(false)
    setSelectedRoomId(null)
    setFormData(getEmptyFormData())
  }

  const handleSubmit = async (event) => {
    if (event) event.preventDefault()
    if (submitting) return

    setSubmitting(true)
    setError('')
    setSuccessMessage('')

    try {
      const payload = {
        roomName: String(formData.roomName).trim(),
        roomNumber: String(formData.roomNumber).trim(),
        module: String(formData.module).trim(),
        roomTypeId: getRoomTypeId(formData.roomType),
        capacity: Number(formData.capacity) || 4,
        status: formData.status || 'Available',
        facilities: formData.facilities.map((f) => f.name), // Matches your backend array format string expectation
      }

      if (modalMode === 'add') {
        await createAdminRoom(payload)
        setSuccessMessage('Room created successfully.')
      } else if (modalMode === 'edit') {
        if (!selectedRoomId) throw new Error('Room ID is missing.')
        await updateAdminRoom(selectedRoomId, payload)
        setSuccessMessage('Room updated successfully.')
      }

      setModalOpen(false)
      await loadInitialData()
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Room operation failed.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (roomId) => {
    if (!roomId) return
    if (!window.confirm('Are you sure you want to delete this room?')) return

    try {
      setError('')
      setSuccessMessage('')
      await deleteAdminRoom(roomId)
      await loadInitialData()
      setSuccessMessage('Room deleted successfully.')
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete room.')
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-xl font-700 text-ink">
          Room Management
        </h1>
        <p className="mt-1 text-sm text-slate">
          Manage room inventory, capacity, availability, and facilities dynamically.
        </p>
      </div>

      {successMessage && (
        <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
          {successMessage}
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </div>
      )}

      {/* SUMMARY CARDS */}
      <div className="grid gap-3 md:grid-cols-4">
        <Card>
          <p className="font-mono text-[11px] uppercase tracking-wider text-slate">Total Rooms</p>
          <p className="mt-2 text-3xl font-bold text-ink">{dashboardStats.totalRooms}</p>
          <p className="mt-1 text-sm text-slate">All rooms in the system</p>
        </Card>
        <Card>
          <p className="font-mono text-[11px] uppercase tracking-wider text-slate">Available</p>
          <p className="mt-2 text-3xl font-bold text-[#658362]">{dashboardStats.availableRooms}</p>
          <p className="mt-1 text-sm text-slate">Rooms ready to reserve</p>
        </Card>
        <Card>
          <p className="font-mono text-[11px] uppercase tracking-wider text-slate">Booked</p>
          <p className="mt-2 text-3xl font-bold text-[#B85450]">{dashboardStats.bookedRooms}</p>
          <p className="mt-1 text-sm text-slate">Rooms currently reserved</p>
        </Card>
        <Card>
          <p className="font-mono text-[11px] uppercase tracking-wider text-slate">Maintenance</p>
          <p className="mt-2 text-3xl font-bold text-[#E09F3E]">{statusCounts.Maintenance}</p>
          <p className="mt-1 text-sm text-slate">Rooms under maintenance</p>
        </Card>
      </div>

      {/* CONTROL BAR */}
      <Card className="hover:-translate-y-0 hover:shadow-none">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <h2 className="font-display text-sm font-bold text-ink">Room Inventory</h2>
            <p className="text-sm text-slate">Search, filter, and manage room operational details.</p>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-3 lg:flex-nowrap">
            <Button className="min-w-[96px] shrink-0 justify-center px-3 py-2" onClick={openAddModal}>
              + Add Room
            </Button>
            <div className="relative min-w-[220px] flex-1">
              <input
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="Search rooms, numbers, types..."
                className="w-full rounded-xl border border-line bg-portal-bg px-3 py-2 pr-8 text-sm text-ink outline-none focus:border-portal-accent"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => handleSearchChange('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate hover:text-ink"
                >
                  ✕
                </button>
              )}
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="min-w-[140px] shrink-0 rounded-xl border border-line bg-white px-3 py-2 text-sm text-ink outline-none"
            >
              <option value="All">All Status</option>
              <option value="Available">Available</option>
              <option value="Booked">Booked</option>
              <option value="Maintenance">Maintenance</option>
            </select>
            <select
              value={moduleFilter}
              onChange={(e) => setModuleFilter(e.target.value)}
              className="min-w-[140px] shrink-0 rounded-xl border border-line bg-white px-3 py-2 text-sm text-ink outline-none"
            >
              {modules.map((mod) => (
                <option key={mod} value={mod}>
                  {mod === 'All' ? 'All Modules' : mod}
                </option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      {/* ROOM TABLE */}
      <Card className="overflow-x-auto">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead>
            <tr className="border-b border-line font-mono text-[11px] font-extrabold uppercase tracking-wider text-black">
              <th className="px-4 py-3">Room Name</th>
              <th className="px-4 py-3">Room Number</th>
              <th className="px-4 py-3">Module</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Capacity</th>
              <th className="px-4 py-3">Facilities</th>
              <th className="px-4 py-3 text-center">Status</th>
              <th className="px-4 py-3 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {loading ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-slate">
                  Loading room inventory...
                </td>
              </tr>
            ) : filteredRooms.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-slate">
                  No rooms match your filter criteria.
                </td>
              </tr>
            ) : (
              filteredRooms.map((room) => (
                <tr key={room.id} className="transition-colors hover:bg-portal-bg/70">
                  <td className="px-4 py-3.5 font-semibold text-ink">{room.roomName}</td>
                  <td className="px-4 py-3.5 font-mono text-xs text-slate">{room.roomNumber}</td>
                  <td className="px-4 py-3.5 text-slate">{room.module}</td>
                  <td className="px-4 py-3.5 text-slate">{room.roomType}</td>
                  <td className="px-4 py-3.5 text-slate">{room.capacity}</td>
                  <td className="px-4 py-3.5 text-slate">
                    {room.facilities?.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {room.facilities.map((fac, idx) => (
                          <span
                            key={fac.id ?? idx}
                            className="rounded bg-slate/10 px-1.5 py-0.5 text-xs font-medium text-ink"
                          >
                            {fac.name}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-slate">None</span>
                    )}
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    <CustomStatusTag status={room.status} />
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    <div className="inline-flex items-center gap-3 font-sans text-sm">
                      <button
                        type="button"
                        onClick={() => openViewModal(room)}
                        className="font-bold text-sky-600 hover:underline"
                      >
                        View
                      </button>
                      <button
                        type="button"
                        onClick={() => openEditModal(room)}
                        className="font-bold text-emerald-600 hover:underline"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(room.id)}
                        className="font-bold text-red-600 hover:underline"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </Card>

      {/* MODAL */}
      <Modal
        open={modalOpen}
        onClose={closeModal}
        className="max-w-xl"
        title={
          modalMode === 'add'
            ? 'Add New Room'
            : modalMode === 'edit'
            ? 'Edit Room'
            : 'Room Details'
        }
        footer={
          <>
            <Button variant="secondary" onClick={closeModal} disabled={submitting}>
              {modalMode === 'view' ? 'Close' : 'Cancel'}
            </Button>
            {modalMode !== 'view' && (
              <Button onClick={handleSubmit} disabled={submitting}>
                {submitting ? 'Saving...' : 'Save Room'}
              </Button>
            )}
          </>
        }
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block space-y-1">
            <span className="text-xs uppercase tracking-[0.2em] text-slate">Room Name</span>
            <input
              name="roomName"
              value={formData.roomName}
              onChange={(e) => setFormData({ ...formData, roomName: e.target.value })}
              disabled={modalMode === 'view'}
              required
              className="w-full rounded-xl border border-line bg-portal-bg px-3 py-2 text-sm text-ink outline-none"
            />
          </label>

          <label className="block space-y-1">
            <span className="text-xs uppercase tracking-[0.2em] text-slate">Room Number / Code</span>
            <input
              name="roomNumber"
              value={formData.roomNumber}
              onChange={(e) => setFormData({ ...formData, roomNumber: e.target.value })}
              disabled={modalMode === 'view'}
              required
              placeholder="e.g., CBE-05-EO1-001"
              className="w-full rounded-xl border border-line bg-portal-bg px-3 py-2 text-sm text-ink outline-none"
            />
          </label>

          <label className="block space-y-1">
            <span className="text-xs uppercase tracking-[0.2em] text-slate">Module</span>
            <input
              name="module"
              value={formData.module}
              onChange={(e) => setFormData({ ...formData, module: e.target.value })}
              disabled={modalMode === 'view'}
              required
              className="w-full rounded-xl border border-line bg-portal-bg px-3 py-2 text-sm text-ink outline-none"
            />
          </label>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="block space-y-1">
              <span className="text-xs uppercase tracking-[0.2em] text-slate">Type</span>
              <select
                name="roomType"
                value={formData.roomType}
                onChange={(e) => setFormData({ ...formData, roomType: e.target.value })}
                disabled={modalMode === 'view'}
                className="w-full rounded-xl border border-line bg-white px-3 py-2 text-sm text-ink outline-none"
              >
                <option value="Conference">Conference</option>
                <option value="Training">Training</option>
                <option value="Discussion">Discussion</option>
              </select>
            </label>

            <label className="block space-y-1">
              <span className="text-xs uppercase tracking-[0.2em] text-slate">Capacity</span>
              <input
                name="capacity"
                type="number"
                min="1"
                value={formData.capacity}
                onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                disabled={modalMode === 'view'}
                className="w-full rounded-xl border border-line bg-portal-bg px-3 py-2 text-sm text-ink outline-none"
              />
            </label>
          </div>

          <label className="block space-y-1">
            <span className="text-xs uppercase tracking-[0.2em] text-slate">Status</span>
            <select
              name="status"
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              disabled={modalMode === 'view'}
              className="w-full rounded-xl border border-line bg-white px-3 py-2 text-sm text-ink outline-none"
            >
              <option value="Available">Available</option>
              <option value="Booked">Booked</option>
              <option value="Maintenance">Maintenance</option>
            </select>
          </label>
        </form>
      </Modal>
    </div>
  )
}