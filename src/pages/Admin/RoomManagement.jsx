import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'

import client from '../../api/client'

import Card from '../../components/common/Card'
import Button from '../../components/common/Button'
import Modal from '../../components/common/Modal'
import { AlertTriangle } from 'lucide-react'

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
    normalized === 'BLOCKED' ||
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

const DEFAULT_INITIAL_ROOMS = [
  {
    id: 1,
    roomId: 1,
    roomName: 'Conference Room',
    roomNumber: 'CBE-05-E01-001',
    module: 'Module 1 - Elcot Park - CMB',
    roomType: 'Conference',
    capacity: 20,
    status: 'Available',
    facilities: [{ id: 1, name: 'Monitor' }, { id: 2, name: 'Whiteboard' }],
  },
  {
    id: 2,
    roomId: 2,
    roomName: 'Discussion Room 1',
    roomNumber: 'CBE-05-E01-003',
    module: 'Module 1 - Elcot Park - CMB',
    roomType: 'Discussion',
    capacity: 8,
    status: 'Available',
    facilities: [{ id: 1, name: 'Monitor' }, { id: 2, name: 'Whiteboard' }],
  },
  {
    id: 3,
    roomId: 3,
    roomName: 'Discussion Room 2',
    roomNumber: 'CBE-05-E01-005',
    module: 'Module 1 - Elcot Park - CMB',
    roomType: 'Discussion',
    capacity: 8,
    status: 'Available',
    facilities: [{ id: 1, name: 'Monitor' }, { id: 2, name: 'Whiteboard' }],
  },
  {
    id: 4,
    roomId: 4,
    roomName: 'Discussion Room 1',
    roomNumber: 'CBE-05-E02-001',
    module: 'Module 2 - Elcot Park - CMB',
    roomType: 'Discussion',
    capacity: 10,
    status: 'Available',
    facilities: [{ id: 1, name: 'Monitor' }, { id: 2, name: 'Whiteboard' }],
  },
  {
    id: 5,
    roomId: 5,
    roomName: 'Discussion Room 3',
    roomNumber: 'CBE-05-E02-007',
    module: 'Module 2 - Elcot Park - CMB',
    roomType: 'Training',
    capacity: 8,
    status: 'Available',
    facilities: [{ id: 1, name: 'Monitor' }, { id: 2, name: 'Whiteboard' }],
  },
  {
    id: 6,
    roomId: 6,
    roomName: 'Discussion Room 4',
    roomNumber: 'CBE-05-E02-010',
    module: 'Module 2 - Elcot Park - CMB',
    roomType: 'Discussion',
    capacity: 8,
    status: 'Available',
    facilities: [{ id: 1, name: 'Monitor' }, { id: 2, name: 'Whiteboard' }],
  },
]

async function fetchAdminRooms() {
  // 1. Try Admin rooms endpoint
  try {
    const response = await client.get('/admin/rooms')
    const data = response.data
    const list = Array.isArray(data) ? data : data?.data || data?.rooms || []
    if (list.length > 0) {
      try {
        localStorage.setItem('spacebook_room_inventory', JSON.stringify(list))
      } catch {
        // ignore
      }
      return list
    }
  } catch (err) {
    console.warn('GET /admin/rooms note:', err)
  }

  // 2. Try Employee availability endpoint with valid date
  try {
    const now = new Date()
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
    const { data } = await client.get('/employee/availability', { params: { date: todayStr } })
    const list = data?.rooms || (Array.isArray(data) ? data : [])
    if (list.length > 0) {
      try {
        localStorage.setItem('spacebook_room_inventory', JSON.stringify(list))
      } catch {
        // ignore
      }
      return list
    }
  } catch (err) {
    console.warn('GET /employee/availability note:', err)
  }

  // 3. Try LocalStorage cached inventory
  try {
    const raw = localStorage.getItem('spacebook_room_inventory')
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed
      }
    }
  } catch {
    // ignore
  }

  // 4. Default seed rooms fallback
  return DEFAULT_INITIAL_ROOMS
}

async function fetchAdminBookings() {
  try {
    const response = await client.get('/admin/bookings')
    const data = response.data
    if (Array.isArray(data)) return data
    if (Array.isArray(data?.data)) return data.data
    if (Array.isArray(data?.bookings)) return data.bookings
    return []
  } catch {
    return []
  }
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

async function updateAdminRoomStatus(roomId, isBlocked) {
  const response = await client.patch(`/admin/rooms/${roomId}/status`, { isBlocked })
  return response.data
}

async function deleteAdminRoom(roomId) {
  const response = await client.delete(`/admin/rooms/${roomId}`)
  return response.data
}

function checkIfRoomIsBlocked(room) {
  if (!room) return false

  if (
    room.isBlocked === true ||
    room.IsBlocked === true ||
    room.isBlocked === 1 ||
    room.IsBlocked === 1 ||
    String(room.isBlocked).toLowerCase() === 'true' ||
    String(room.IsBlocked).toLowerCase() === 'true' ||
    String(room.isBlocked) === '1' ||
    String(room.IsBlocked) === '1'
  ) {
    return true
  }

  const rawStatus = String(
    room.status ??
    room.Status ??
    room.roomStatus ??
    room.RoomStatus ??
    room.availabilityStatus ??
    room.AvailabilityStatus ??
    ''
  ).toLowerCase().trim()

  if (
    rawStatus === 'blocked' ||
    rawStatus === 'unavailable' ||
    rawStatus === 'disabled' ||
    rawStatus === 'inactive'
  ) {
    return true
  }

  const numStatus = Number(room.status ?? room.Status ?? room.statusId ?? room.StatusId)
  if (numStatus === 1 && typeof (room.status ?? room.Status) === 'number') {
    return true
  }

  if (
    room.isActive === false ||
    room.IsActive === false ||
    room.isAvailable === false ||
    room.IsAvailable === false
  ) {
    return true
  }

  return false
}

function isRoomBlocked(room) {
  return checkIfRoomIsBlocked(room)
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
  const [modalError, setModalError] = useState('')
  const [confirmModalOpen, setConfirmModalOpen] = useState(false)
  const [targetRoom, setTargetRoom] = useState(null)

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

      const [facData, statsResponse, roomsResponse, bookingsResponse] = await Promise.allSettled([
        fetchAdminFacilities(),
        fetchAdminRoomDashboard(),
        fetchAdminRooms(),
        fetchAdminBookings(),
      ])

      const resolvedFacData = facData.status === 'fulfilled' ? facData.value : []
      setFacilities(resolvedFacData)

      const liveRooms = roomsResponse.status === 'fulfilled' && Array.isArray(roomsResponse.value)
        ? roomsResponse.value
        : []

      const liveBookings = bookingsResponse.status === 'fulfilled' && Array.isArray(bookingsResponse.value)
        ? bookingsResponse.value
        : []

      const bookedRoomIds = new Set()
      liveBookings.forEach((b) => {
        const status = String(b.status || b.bookingStatus || '').toLowerCase()
        if (status !== 'cancelled' && status !== 'rejected') {
          if (b.roomId) bookedRoomIds.add(String(b.roomId))
          if (b.roomNumber) bookedRoomIds.add(String(b.roomNumber))
          if (b.roomName) bookedRoomIds.add(String(b.roomName))
        }
      })

      const mappedRooms = liveRooms.map((room) => {
        const roomType = getRoomTypeName(room)
        const roomFacilities = normalizeFacilities(room.facilities, resolvedFacData)
        const roomId = room.roomId ?? room.id
        const roomIdStr = String(roomId ?? '')
        const roomNumberStr = String(room.roomNumber ?? room.roomCode ?? room.code ?? '')

        const isBlocked = checkIfRoomIsBlocked(room)
        const isBooked = !isBlocked && (bookedRoomIds.has(roomIdStr) || (roomNumberStr && bookedRoomIds.has(roomNumberStr)))

        let status = 'Available'
        if (isBlocked) {
          status = 'Blocked'
        } else if (isBooked) {
          status = 'Booked'
        } else if (String(room.status || '').toLowerCase() === 'maintenance') {
          status = 'Maintenance'
        } else if (room.status) {
          status = String(room.status).charAt(0).toUpperCase() + String(room.status).slice(1).toLowerCase()
        }

        return {
          id: roomId,
          roomId: roomId,
          roomName: room.roomName ?? room.name ?? 'Unnamed Room',
          roomNumber: roomNumberStr || '-',
          module: room.module ?? room.moduleName ?? 'Module 1 - Elcot Park - CMB',
          roomType: roomType,
          capacity: Number(room.capacity ?? room.roomCapacity ?? 4),
          status: status,
          isBlocked: isBlocked,
          IsBlocked: isBlocked,
          isBooked: isBooked,
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
      const roomStatus = String(room.status || '').toLowerCase()
      const filterLower = statusFilter.toLowerCase()
      const blocked = isRoomBlocked(room)

      const matchesStatus =
        statusFilter === 'All' ||
        (filterLower === 'blocked' && blocked) ||
        (filterLower === 'available' && !blocked && (roomStatus === 'available' || !roomStatus)) ||
        (filterLower === 'maintenance' && !blocked && roomStatus === 'maintenance') ||
        (!blocked && roomStatus === filterLower)

      const matchesModule = moduleFilter === 'All' || room.module === moduleFilter

      return matchesSearch && matchesStatus && matchesModule
    })
  }, [rooms, search, statusFilter, moduleFilter])

  const statusCounts = useMemo(() => {
    return rooms.reduce(
      (acc, room) => {
        acc.Total += 1
        const status = String(room.status || '').toLowerCase()
        const blocked = isRoomBlocked(room)
        if (blocked) {
          acc.Blocked += 1
        } else if (status === 'maintenance') {
          acc.Maintenance += 1
        } else {
          acc.Available += 1
        }
        return acc
      },
      { Total: 0, Available: 0, Blocked: 0, Maintenance: 0 }
    )
  }, [rooms])

  const openAddModal = () => {
    setFormData(getEmptyFormData())
    setModalMode('add')
    setSelectedRoomId(null)
    setError('')
    setModalError('')
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
      status: isRoomBlocked(room) ? 'Blocked' : room.status || 'Available',
      facilities: [...(room.facilities || [])],
    })
    setModalMode('edit')
    setSelectedRoomId(room.id)
    setError('')
    setModalError('')
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
    setModalError('')
    setFormData(getEmptyFormData())
  }

  const handleSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault()

    if (!formData.roomName.trim()) {
      setModalError('Room name is required.')
      return
    }

    if (!formData.roomNumber.trim()) {
      setModalError('Room code / number is required.')
      return
    }

    try {
      setSubmitting(true)
      setError('')
      setModalError('')
      setSuccessMessage('')

      const moduleNum = parseInt(String(formData.module).replace(/\D+/g, ''), 10) || 1
      const isBlocked = String(formData.status).toLowerCase() === 'blocked'
      const roomTypeId = getRoomTypeId(formData.roomType)

      const payload = {
        roomName: formData.roomName.trim(),
        roomNumber: formData.roomNumber.trim(),
        moduleId: moduleNum,
        roomTypeId: roomTypeId,
        capacity: Number(formData.capacity) || 4,
        status: formData.status,
        isBlocked: isBlocked,
        facilityIds: formData.facilities.map((f) => f.id || f).filter(Boolean),
      }

      if (modalMode === 'add') {
        await createAdminRoom(payload)
        setSuccessMessage('Room added successfully!')
      } else if (modalMode === 'edit') {
        await updateAdminRoom(selectedRoomId, payload)
        setSuccessMessage(`Room "${payload.roomName}" updated successfully!`)
      }

      closeModal()
      await loadInitialData()
    } catch (err) {
      console.error('Error saving room:', err)
      setModalError(err.response?.data?.message || 'Failed to save room details.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleOpenConfirmToggle = (room) => {
    if (!room || !room.id) return
    setTargetRoom(room)
    setConfirmModalOpen(true)
  }

  const handleConfirmToggle = async () => {
    if (!targetRoom || !targetRoom.id) return
    const room = targetRoom
    const currentlyBlocked = isRoomBlocked(room)
    const nextIsBlocked = !currentlyBlocked

    setConfirmModalOpen(false)
    setTargetRoom(null)

    try {
      setError('')
      setSuccessMessage('')

      try {
        await updateAdminRoomStatus(room.id, nextIsBlocked)
      } catch (patchErr) {
        const roomTypeId = getRoomTypeId(room.roomType)
        const facilityIds = (room.facilities || []).map((f) => f.id || f).filter(Boolean)
        const moduleNum = parseInt(String(room.module).replace(/\D+/g, ''), 10) || 1
        const payload = {
          roomName: room.roomName,
          roomNumber: room.roomNumber,
          moduleId: moduleNum,
          roomTypeId: roomTypeId,
          capacity: Number(room.capacity) || 4,
          status: nextIsBlocked ? 'Blocked' : 'Available',
          isBlocked: nextIsBlocked,
          facilityIds: facilityIds,
        }
        await updateAdminRoom(room.id, payload)
      }

      setSuccessMessage(
        `Room "${room.roomName}" has been successfully ${currentlyBlocked ? 'unblocked' : 'blocked'}!`
      )
      await loadInitialData()
    } catch (err) {
      console.error('Error toggling room block status:', err)
      setError('Failed to update room status on the server.')
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-xl font-700 text-ink">
          Workspace Administration
        </h1>
        <p className="mt-1 text-sm text-slate">
          Manage workspace inventory, capacity, availability, and facilities dynamically.
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
          <p className="font-mono text-[11px] uppercase tracking-wider text-slate">Total</p>
          <p className="mt-2 text-3xl font-bold text-ink">{statusCounts.Total}</p>
          <p className="mt-1 text-sm text-slate">All workspaces across the workplace</p>
        </Card>
        <Card>
          <p className="font-mono text-[11px] uppercase tracking-wider text-slate">Available</p>
          <p className="mt-2 text-3xl font-bold text-[#658362]">{statusCounts.Available}</p>
          <p className="mt-1 text-sm text-slate">Workspaces ready to reserve</p>
        </Card>
        <Card>
          <p className="font-mono text-[11px] uppercase tracking-wider text-slate">Blocked</p>
          <p className="mt-2 text-3xl font-bold text-[#B85450]">{statusCounts.Blocked}</p>
          <p className="mt-1 text-sm text-slate">Workspaces currently blocked</p>
        </Card>
        <Card>
          <p className="font-mono text-[11px] uppercase tracking-wider text-slate">Maintenance</p>
          <p className="mt-2 text-3xl font-bold text-[#E09F3E]">{statusCounts.Maintenance}</p>
          <p className="mt-1 text-sm text-slate">Workspaces under maintenance</p>
        </Card>
      </div>

      {/* CONTROL BAR */}
      <Card>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <h2 className="font-display text-sm font-bold text-ink">Workspace Inventory</h2>
            <p className="text-sm text-slate">Search, filter, and manage workspace operational details.</p>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-3 lg:flex-nowrap">
            <Button className="min-w-[96px] shrink-0 justify-center px-3 py-2" onClick={openAddModal}>
              + Add Workspace
            </Button>
            <div className="relative min-w-[220px] flex-1">
              <input
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="Search workspaces, numbers, types..."
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
              <option value="Blocked">Blocked</option>
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
                    <CustomStatusTag status={isRoomBlocked(room) ? 'BLOCKED' : room.status} />
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
                        onClick={() => handleOpenConfirmToggle(room)}
                        className={`font-bold hover:underline ${
                          isRoomBlocked(room) ? 'text-amber-600' : 'text-red-600'
                        }`}
                      >
                        {isRoomBlocked(room) ? 'Unblock' : 'Block'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </Card>

      {/* IN-APP CONFIRMATION MODAL */}
      <Modal
        open={confirmModalOpen}
        onClose={() => {
          setConfirmModalOpen(false)
          setTargetRoom(null)
        }}
        className="max-w-md"
        title={
          targetRoom && isRoomBlocked(targetRoom)
            ? 'Confirm Unblock Room'
            : 'Confirm Block Room'
        }
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => {
                setConfirmModalOpen(false)
                setTargetRoom(null)
              }}
            >
              Cancel
            </Button>
            <Button
              className={
                targetRoom && isRoomBlocked(targetRoom)
                  ? 'bg-amber-600 hover:bg-amber-700 text-white font-medium shadow-sm'
                  : 'bg-red-600 hover:bg-red-700 text-white font-medium shadow-sm'
              }
              onClick={handleConfirmToggle}
            >
              {targetRoom && isRoomBlocked(targetRoom)
                ? 'Yes, Unblock Room'
                : 'Yes, Block Room'}
            </Button>
          </>
        }
      >
        <div className="space-y-3 py-2">
          <div className="flex items-start gap-3 rounded-2xl bg-sky-50/70 border border-sky-100 p-4">
            <div
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                targetRoom && isRoomBlocked(targetRoom)
                  ? 'bg-amber-100 text-amber-600'
                  : 'bg-red-100 text-red-600'
              }`}
            >
              <AlertTriangle size={20} />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-semibold text-ink">
                {targetRoom?.roomName}
              </p>
              <p className="text-xs text-slate font-mono">
                Code: {targetRoom?.roomNumber} | Module: {targetRoom?.module}
              </p>
              <p className="pt-1 text-xs text-slate leading-relaxed">
                {targetRoom && isRoomBlocked(targetRoom)
                  ? 'Unblocking will restore this room to Available status, allowing employees across the organization to reserve it.'
                  : 'Blocking will immediately mark this room as unavailable. Employees will not be able to book it until unblocked.'}
              </p>
            </div>
          </div>
        </div>
      </Modal>

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
          {modalError && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {modalError}
            </div>
          )}

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
              <option value="Blocked">Blocked</option>
              <option value="Maintenance">Maintenance</option>
            </select>
          </label>
        </form>
      </Modal>
    </div>
  )
}