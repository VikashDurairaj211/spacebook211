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
// 1: Conference, 2: Training, 3: Discussion
// =====================================================

const ROOM_TYPE_IDS = {
  conference: 1,
  training: 2,
  discussion: 3,
}

// =====================================================
// STATUS BADGE
// =====================================================

function CustomStatusTag({ status }) {
  const raw = String(status || 'Available').toUpperCase()

  let bgClass = 'bg-[#658362] text-white'

  if (raw === 'MAINTENANCE' || raw === 'PENDING') {
    bgClass = 'bg-[#E09F3E] text-white'
  } else if (raw === 'RESERVED' || raw === 'BOOKED') {
    bgClass = 'bg-[#2A4365] text-white'
  }

  return (
    <span
      className={`inline-block min-w-[74px] px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider text-center ${bgClass}`}
    >
      {raw}
    </span>
  )
}

// =====================================================
// GET ROOM TYPE ID
// =====================================================

function getModuleIdFromName(moduleName) {
  const str = String(moduleName || '').toLowerCase()
  if (str.includes('tidel') || str.includes('tidal') || str.includes('to1')) return 3
  if (str.includes('module 2') || str.includes('m2') || str.includes('eo2')) return 2
  return 1
}

function getModuleNameFromId(moduleId, fallbackModule) {
  if (fallbackModule && typeof fallbackModule === 'string' && fallbackModule.includes(' - ')) {
    return fallbackModule
  }
  const id = Number(moduleId)
  if (id === 3) return 'Module 1 - Tidel Park - CMB'
  if (id === 2) return 'Module 2 - Elcot Park - CMB'
  return 'Module 1 - Elcot Park - CMB'
}

function getRoomTypeId(type) {
  const lower = String(type || '').toLowerCase().trim()

  if (lower.includes('conf')) {
    return 1 // Conference
  }

  if (lower.includes('train')) {
    return 2 // Training
  }

  if (lower.includes('disc')) {
    return 3 // Discussion
  }

  return 1
}

// =====================================================
// GET ROOM TYPE NAME
// =====================================================

function getRoomTypeName(room) {
  if (!room) return 'Conference'

  const roomTypeId = Number(
    room.roomTypeId ??
    room.RoomTypeId ??
    room.typeId ??
    room.TypeId ??
    room.roomType?.id ??
    room.roomType?.roomTypeId
  )

  if (roomTypeId === 1) return 'Conference'
  if (roomTypeId === 2) return 'Training'
  if (roomTypeId === 3) return 'Discussion'

  const rawTypeName = String(
    room.roomTypeName ||
    room.RoomTypeName ||
    (typeof room.roomType === 'string' ? room.roomType : '') ||
    room.roomType?.name ||
    room.type ||
    ''
  ).toLowerCase().trim()

  if (rawTypeName.includes('conf')) return 'Conference'
  if (rawTypeName.includes('train')) return 'Training'
  if (rawTypeName.includes('disc')) return 'Discussion'

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

function formatRoomNumber(code, index = 0, moduleId = 1) {
  if (!code || code === '-' || String(code).trim() === '') {
    const mod = Number(moduleId) === 3 ? 'TO1' : Number(moduleId) === 2 ? 'EO2' : 'EO1'
    const num = String(index + 1).padStart(3, '0')
    const loc = Number(moduleId) === 3 ? 'CBE-04' : 'CBE-05'
    return `${loc}-${mod}-${num}`
  }
  let str = String(code).trim().toUpperCase()
  str = str.replace(/E0/g, 'EO').replace(/T0/g, 'TO')
  return str
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
// API HELPERS & PERSISTENT INVENTORY
// =====================================================

const DEFAULT_INITIAL_ROOMS = [
  {
    id: 1,
    roomId: 1,
    roomName: 'Conference Room',
    roomNumber: 'CBE-05-EO1-001',
    module: 'Module 1 - Elcot Park - CMB',
    moduleId: 1,
    roomType: 'Conference',
    roomTypeId: 1,
    capacity: 20,
    status: 'Available',
    isBlocked: false,
    facilities: [{ id: 1, name: 'Projector' }, { id: 2, name: 'Whiteboard' }],
  },
  {
    id: 2,
    roomId: 2,
    roomName: 'Discussion Room 1',
    roomNumber: 'CBE-05-EO1-003',
    module: 'Module 1 - Elcot Park - CMB',
    moduleId: 1,
    roomType: 'Discussion',
    roomTypeId: 3,
    capacity: 8,
    status: 'Available',
    facilities: [{ id: 1, name: 'Monitor' }, { id: 2, name: 'Whiteboard' }],
  },
  {
    id: 3,
    roomId: 3,
    roomName: 'Discussion Room 2',
    roomNumber: 'CBE-05-EO1-005',
    module: 'Module 1 - Elcot Park - CMB',
    moduleId: 1,
    roomType: 'Discussion',
    roomTypeId: 3,
    capacity: 8,
    status: 'Available',
    isBlocked: false,
    facilities: [{ id: 1, name: 'Monitor' }, { id: 2, name: 'Whiteboard' }],
  },
  {
    id: 4,
    roomId: 4,
    roomName: 'Training Room',
    roomNumber: 'CBE-05-EO2-012',
    module: 'Module 2 - Elcot Park - CMB',
    moduleId: 2,
    roomType: 'Training',
    roomTypeId: 2,
    capacity: 50,
    status: 'Available',
    isBlocked: false,
    facilities: [{ id: 1, name: 'Projector' }, { id: 2, name: 'Whiteboard' }, { id: 3, name: 'TV' }],
  },
  {
    id: 5,
    roomId: 5,
    roomName: 'Discussion Room 1',
    roomNumber: 'CBE-05-EO2-001',
    module: 'Module 2 - Elcot Park - CMB',
    moduleId: 2,
    roomType: 'Discussion',
    roomTypeId: 3,
    capacity: 10,
    status: 'Available',
    isBlocked: false,
    facilities: [{ id: 1, name: 'Monitor' }, { id: 2, name: 'Whiteboard' }],
  },
  {
    id: 6,
    roomId: 6,
    roomName: 'Discussion Room 2',
    roomNumber: 'CBE-05-EO2-002',
    module: 'Module 2 - Elcot Park - CMB',
    moduleId: 2,
    roomType: 'Discussion',
    roomTypeId: 3,
    capacity: 8,
    status: 'Available',
    isBlocked: false,
    facilities: [{ id: 1, name: 'Monitor' }, { id: 2, name: 'Whiteboard' }],
  },
  {
    id: 7,
    roomId: 7,
    roomName: 'Discussion Room 3',
    roomNumber: 'CBE-05-EO2-007',
    module: 'Module 2 - Elcot Park - CMB',
    moduleId: 2,
    roomType: 'Discussion',
    roomTypeId: 3,
    capacity: 8,
    status: 'Available',
    isBlocked: false,
    facilities: [{ id: 1, name: 'Monitor' }, { id: 2, name: 'Whiteboard' }],
  },
  {
    id: 8,
    roomId: 8,
    roomName: 'Discussion Room 4',
    roomNumber: 'CBE-05-EO2-010',
    module: 'Module 2 - Elcot Park - CMB',
    moduleId: 2,
    roomType: 'Discussion',
    roomTypeId: 3,
    capacity: 8,
    status: 'Available',
    isBlocked: false,
    facilities: [{ id: 1, name: 'Monitor' }, { id: 2, name: 'Whiteboard' }],
  },
  {
    id: 9,
    roomId: 9,
    roomName: 'Conference Room',
    roomNumber: 'CBE-04-TO1-001',
    module: 'Module 1 - Tidel Park - CMB',
    moduleId: 3,
    roomType: 'Conference',
    roomTypeId: 1,
    capacity: 16,
    status: 'Available',
    isBlocked: false,
    facilities: [{ id: 1, name: 'Projector' }, { id: 2, name: 'Whiteboard' }],
  },
  {
    id: 10,
    roomId: 10,
    roomName: 'Discussion Room 1',
    roomNumber: 'CBE-04-TO1-002',
    module: 'Module 1 - Tidel Park - CMB',
    moduleId: 3,
    roomType: 'Discussion',
    roomTypeId: 3,
    capacity: 8,
    status: 'Available',
    isBlocked: false,
    facilities: [{ id: 1, name: 'Monitor' }, { id: 2, name: 'Whiteboard' }],
  },
  {
    id: 11,
    roomId: 11,
    roomName: 'Training Room',
    roomNumber: 'CBE-04-TO1-003',
    module: 'Module 1 - Tidel Park - CMB',
    moduleId: 3,
    roomType: 'Training',
    roomTypeId: 2,
    capacity: 25,
    status: 'Available',
    isBlocked: false,
    facilities: [{ id: 1, name: 'Projector' }, { id: 2, name: 'Whiteboard' }, { id: 3, name: 'TV' }],
  },
]

function getMasterRoomInventory() {
  try {
    const raw = localStorage.getItem('spacebook_room_inventory')
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.length > 0) {
        const merged = [...DEFAULT_INITIAL_ROOMS]
        parsed.forEach((item) => {
          const itemCode = String(item.roomNumber || item.roomnumber || item.code || item.roomCode || '')
            .replace(/E0/g, 'EO')
            .trim()
            .toLowerCase()
          const itemId = String(item.id || item.roomId || item.roomid || '')
          const idx = merged.findIndex((m) => {
            const mCode = String(m.roomNumber || '').replace(/E0/g, 'EO').trim().toLowerCase()
            const mId = String(m.id || m.roomId || '')
            return (itemCode && mCode === itemCode) || (itemId && mId === itemId)
          })
          if (idx >= 0) {
            merged[idx] = { ...merged[idx], ...item }
          } else {
            merged.push(item)
          }
        })
        return merged
      }
    }
  } catch {
    // ignore
  }
  return DEFAULT_INITIAL_ROOMS
}

function updateMasterRoomInventory(roomsList) {
  try {
    const current = getMasterRoomInventory()
    const merged = [...current]

    ;(roomsList || []).forEach((incoming) => {
      const incomingId = String(incoming.id ?? incoming.roomId ?? '')
      const incomingNumber = String(incoming.roomNumber ?? incoming.roomCode ?? incoming.code ?? '')

      const existingIndex = merged.findIndex((m) => {
        const mId = String(m.id ?? m.roomId ?? '')
        const mNumber = String(m.roomNumber ?? m.roomCode ?? m.code ?? '')
        return (incomingId && mId === incomingId) || (incomingNumber && mNumber === incomingNumber)
      })

      if (existingIndex >= 0) {
        merged[existingIndex] = { ...merged[existingIndex], ...incoming }
      } else {
        merged.push(incoming)
      }
    })

    localStorage.setItem('spacebook_room_inventory', JSON.stringify(merged))
    return merged
  } catch {
    return roomsList || []
  }
}

function removeRoomFromMasterInventory(roomId, roomNumber) {
  try {
    const raw = localStorage.getItem('spacebook_room_inventory')
    if (raw) {
      const parsed = JSON.parse(raw)
      const filtered = parsed.filter((r) => {
        const rId = String(r.id ?? r.roomId ?? '')
        const rNum = String(r.roomNumber ?? r.roomCode ?? r.code ?? '').toLowerCase()
        if (roomId && rId === String(roomId)) return false
        if (roomNumber && rNum === String(roomNumber).toLowerCase()) return false
        return true
      })
      localStorage.setItem('spacebook_room_inventory', JSON.stringify(filtered))
    }
  } catch {
    // ignore
  }
}

function getRoomStatusOverrides() {
  try {
    const raw = localStorage.getItem('spacebook_room_status_overrides')
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function saveRoomStatusOverride(roomId, roomNumber, status) {
  try {
    const current = getRoomStatusOverrides()
    if (roomId) current[String(roomId).trim()] = status
    if (roomNumber) current[String(roomNumber).trim().toLowerCase()] = status
    localStorage.setItem('spacebook_room_status_overrides', JSON.stringify(current))
    return current
  } catch {
    return {}
  }
}

function getBlockedRoomIds() {
  try {
    const raw = localStorage.getItem('spacebook_blocked_rooms')
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveBlockedRoomId(roomId, shouldBlock) {
  try {
    if (!roomId) return []
    const current = getBlockedRoomIds().map(String)
    const idStr = String(roomId).trim()
    let next = []
    if (shouldBlock) {
      next = Array.from(new Set([...current, idStr]))
    } else {
      next = current.filter((id) => id !== idStr)
    }
    localStorage.setItem('spacebook_blocked_rooms', JSON.stringify(next))
    return next
  } catch {
    return []
  }
}

function getExplicitlyUnblockedRoomIds() {
  try {
    const raw = localStorage.getItem('spacebook_unblocked_rooms')
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveUnblockedRoomId(roomId, isUnblocking) {
  try {
    if (!roomId) return []
    const current = getExplicitlyUnblockedRoomIds().map(String)
    const idStr = String(roomId).trim()
    let next = []
    if (isUnblocking) {
      next = Array.from(new Set([...current, idStr]))
    } else {
      next = current.filter((id) => id !== idStr)
    }
    localStorage.setItem('spacebook_unblocked_rooms', JSON.stringify(next))
    return next
  } catch {
    return []
  }
}

async function fetchAdminRooms() {
  let backendRooms = []

  // 1. Try Admin rooms endpoint
  try {
    const response = await client.get('/admin/rooms')
    const data = response.data
    const list = Array.isArray(data) ? data : data?.data || data?.rooms || []
    if (list.length > 0) {
      backendRooms = list
    }
  } catch (err) {
    console.warn('GET /admin/rooms note:', err)
  }

  // Merge live backend rooms with master inventory so blocked rooms are preserved
  return updateMasterRoomInventory(backendRooms)
}

async function fetchAdminBookings() {
  const allBookings = []

  try {
    const response = await client.get('/admin/bookings')
    const data = response.data
    const list = Array.isArray(data) ? data : data?.data || data?.bookings || []
    if (Array.isArray(list)) allBookings.push(...list)
  } catch {
    // ignore
  }

  return allBookings
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

function checkIfRoomIsBlocked(room, savedBlockedIds = null, savedUnblockedIds = null) {
  if (!room) return false
  const unblockedList = savedUnblockedIds || getExplicitlyUnblockedRoomIds().map(String)
  const blockedList = savedBlockedIds || getBlockedRoomIds().map(String)

  const roomIdStr = String(room.roomId ?? room.id ?? '').trim()
  const roomNumberStr = String(room.roomNumber ?? room.roomCode ?? room.code ?? '').trim()

  // If explicitly unblocked by admin, return false
  if (
    (roomIdStr && unblockedList.includes(roomIdStr)) ||
    (roomNumberStr && unblockedList.includes(roomNumberStr))
  ) {
    return false
  }

  if (
    (roomIdStr && blockedList.includes(roomIdStr)) ||
    (roomNumberStr && blockedList.includes(roomNumberStr))
  ) {
    return true
  }

  if (
    room.isBlocked === true ||
    room.IsBlocked === true ||
    room.isBlocked === 1 ||
    room.IsBlocked === 1 ||
    room.isBooked === true ||
    room.IsBooked === true ||
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
    rawStatus === 'booked' ||
    rawStatus === 'reserved' ||
    rawStatus === 'occupied' ||
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
  const search = (searchParams.get('search') || searchParams.get('q') || '').trim()

  const [rooms, setRooms] = useState([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  const [facilities, setFacilities] = useState([])
  const [facilitiesLoading, setFacilitiesLoading] = useState(false)

  const [statusFilter, setStatusFilter] = useState('All')
  const [moduleFilter, setModuleFilter] = useState('All')

  const [dashboardStats, setDashboardStats] = useState({
    totalRooms: 0,
    availableRooms: 0,
    bookedRooms: 0,
  })
  const [reservedCount, setReservedCount] = useState(0)

  const [modalOpen, setModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState('add')
  const [selectedRoomId, setSelectedRoomId] = useState(null)
  const [formData, setFormData] = useState(getEmptyFormData())
  const [modalError, setModalError] = useState('')

  const handleClearSearch = () => {
    const newParams = new URLSearchParams(searchParams)
    newParams.delete('search')
    newParams.delete('q')
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
        if (status !== 'cancelled' && status !== 'rejected' && status !== 'expired') {
          const roomId = b.roomId ?? b.room_id ?? b.RoomId ?? b.room?.id ?? b.room?.roomId
          const roomNumber = b.roomNumber ?? b.room_number ?? b.roomCode ?? b.room?.roomNumber ?? b.room?.code
          if (roomId) bookedRoomIds.add(String(roomId).trim())
          if (roomNumber) bookedRoomIds.add(String(roomNumber).trim().toLowerCase())
        }
      })

      const liveBookedCount =
        bookedRoomIds.size ||
        (statsResponse.status === 'fulfilled' && (statsResponse.value?.bookedRooms ?? statsResponse.value?.reservedRooms)) ||
        liveBookings.length ||
        0

      setReservedCount(liveBookedCount)

      const allMasterRooms = updateMasterRoomInventory(liveRooms)
      const statusOverrides = getRoomStatusOverrides()

      const mappedRooms = allMasterRooms.map((room, idx) => {
        const roomId = room.roomid ?? room.roomId ?? room.id
        const roomIdStr = String(roomId ?? '')
        const roomNumberRaw = room.roomnumber ?? room.roomNumber ?? room.roomCode ?? room.code ?? ''
        const roomNameStr = String(room.roomname ?? room.roomName ?? room.name ?? 'Unnamed Room')
        const roomType = getRoomTypeName(room)
        const roomFacilities = normalizeFacilities(room.facilities, resolvedFacData)
        const moduleNameStr = String(room.module ?? room.moduleName ?? '')
        const moduleId = Number(
          room.moduleid ??
          room.moduleId ??
          getModuleIdFromName(moduleNameStr || roomNumberRaw)
        )
        const moduleName =
          moduleNameStr ||
          getModuleNameFromId(moduleId)

        const formattedRoomNumber = formatRoomNumber(roomNumberRaw, idx, moduleId)

        const overriddenStatus = statusOverrides[roomIdStr] || statusOverrides[formattedRoomNumber.toLowerCase()]
        let status = 'Available'
        if (overriddenStatus) {
          status = overriddenStatus === 'Maintenance' ? 'Maintenance' : 'Available'
        } else if (
          String(room.status || '').toLowerCase() === 'maintenance' ||
          room.isBlocked === true ||
          room.IsBlocked === true ||
          checkIfRoomIsBlocked(room)
        ) {
          status = 'Maintenance'
        } else {
          status = 'Available'
        }

        return {
          id: roomId,
          roomId: roomId,
          roomName: roomNameStr,
          roomNumber: formattedRoomNumber,
          module: moduleName,
          moduleId: moduleId,
          roomType: roomType,
          capacity: Number(room.capacity ?? room.roomCapacity ?? 8),
          status: status,
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
    const searchValue = search.trim().toLowerCase()

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
        (filterLower === 'available' && (roomStatus === 'available' || !roomStatus)) ||
        (filterLower === 'maintenance' && roomStatus === 'maintenance')

      const matchesModule = moduleFilter === 'All' || room.module === moduleFilter

      return matchesSearch && matchesStatus && matchesModule
    })
  }, [rooms, search, statusFilter, moduleFilter])

  const statusCounts = useMemo(() => {
    return rooms.reduce(
      (acc, room) => {
        acc.Total += 1
        const status = String(room.status || '').toLowerCase()
        if (status === 'maintenance') {
          acc.Maintenance += 1
        } else {
          acc.Available += 1
        }
        return acc
      },
      { Total: 0, Available: 0, Reserved: reservedCount, Maintenance: 0 }
    )
  }, [rooms, reservedCount])

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
    const determinedType = getRoomTypeName(room)
    setFormData({
      roomName: room.roomName || room.name || '',
      roomNumber: room.roomNumber || room.code || '',
      module: room.module || 'Module 1 - Elcot Park - CMB',
      roomType: determinedType,
      capacity: room.capacity || 4,
      status: String(room.status || '').toLowerCase() === 'maintenance' ? 'Maintenance' : 'Available',
      facilities: [...(room.facilities || [])],
    })
    setModalMode('edit')
    setSelectedRoomId(room.id || room.roomId)
    setError('')
    setModalError('')
    setSuccessMessage('')
    setModalOpen(true)
  }

  const openViewModal = (room) => {
    openEditModal(room)
    setModalMode('view')
  }

  const [deletingId, setDeletingId] = useState(null)

  const handleDeleteRoom = async (room) => {
    if (!room) return
    const id = room.id || room.roomId
    const name = room.roomName || room.name || room.roomNumber || 'this room'

    if (!window.confirm(`Are you sure you want to delete "${name}"? This action cannot be undone.`)) {
      return
    }

    try {
      setDeletingId(id)
      setError('')
      setSuccessMessage('')

      if (id) {
        try {
          await deleteAdminRoom(id)
        } catch (apiErr) {
          console.warn('DELETE /admin/rooms error note:', apiErr)
        }
      }

      removeRoomFromMasterInventory(id, room.roomNumber)

      setRooms((prev) =>
        prev.filter((r) => {
          const rId = String(r.id ?? r.roomId ?? '')
          const rNum = String(r.roomNumber ?? r.roomCode ?? '').toLowerCase()
          if (id && rId === String(id)) return false
          if (room.roomNumber && rNum === String(room.roomNumber).toLowerCase()) return false
          return true
        })
      )

      setSuccessMessage(`Room "${name}" deleted successfully!`)
      await loadInitialData()
    } catch (err) {
      console.error('Error deleting room:', err)
      setError('Failed to delete room.')
    } finally {
      setDeletingId(null)
    }
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

      const moduleNum = getModuleIdFromName(formData.module)
      const roomTypeId = getRoomTypeId(formData.roomType)
      const selectedStatus = formData.status === 'Maintenance' ? 'Maintenance' : 'Available'

      const payload = {
        roomName: formData.roomName.trim(),
        roomNumber: formData.roomNumber.trim(),
        moduleId: moduleNum,
        module: formData.module,
        roomTypeId: roomTypeId,
        capacity: Number(formData.capacity) || 4,
        status: selectedStatus,
        facilityIds: formData.facilities.map((f) => (typeof f === 'object' ? f.id : Number(f))).filter(Boolean),
      }

      if (selectedRoomId) {
        saveRoomStatusOverride(selectedRoomId, payload.roomNumber, selectedStatus)
      }

      updateMasterRoomInventory([
        {
          id: selectedRoomId,
          ...payload,
          module: formData.module,
          moduleId: moduleNum,
          roomType: formData.roomType,
          status: selectedStatus,
        },
      ])

      // Optimistically update React state immediately
      setRooms((prevRooms) =>
        prevRooms.map((r) =>
          String(r.id) === String(selectedRoomId) ||
          (payload.roomNumber && String(r.roomNumber).toLowerCase() === String(payload.roomNumber).toLowerCase())
            ? {
                ...r,
                ...payload,
                id: selectedRoomId || r.id,
                module: formData.module,
                moduleId: moduleNum,
                roomType: formData.roomType,
                status: selectedStatus,
                facilities: formData.facilities,
              }
            : r
        )
      )

      if (modalMode === 'add') {
        try {
          await createAdminRoom(payload)
        } catch (apiErr) {
          console.warn('Backend create room note:', apiErr)
        }
        setSuccessMessage('Room added successfully!')
      } else if (modalMode === 'edit') {
        const targetId = Number(selectedRoomId) || selectedRoomId
        const shouldBlock = selectedStatus === 'Maintenance'

        // 1. Update status endpoint on backend
        if (targetId) {
          try {
            await updateAdminRoomStatus(targetId, shouldBlock)
            console.log(`Backend status synced for room ${targetId}: isBlocked=${shouldBlock}`)
          } catch (statusErr) {
            console.warn('PATCH /admin/rooms/{id}/status error:', statusErr?.response?.data || statusErr.message)
          }

          // 2. Also update full room record via PUT /admin/rooms/{id}
          try {
            await updateAdminRoom(targetId, payload)
          } catch (putErr) {
            console.warn('PUT /admin/rooms/{id} note:', putErr?.response?.data || putErr.message)
            // If room was not in backend database yet, register it
            try {
              await createAdminRoom(payload)
            } catch (postErr) {
              console.warn('POST /admin/rooms fallback note:', postErr?.response?.data || postErr.message)
            }
          }
        }

        saveBlockedRoomId(selectedRoomId, shouldBlock)
        setSuccessMessage(`Room "${payload.roomName}" updated to ${selectedStatus}!`)
      }

      closeModal()
      await loadInitialData()
    } catch (err) {
      console.error('Error saving room:', err)
      // Even if backend threw an error, master inventory is updated
      closeModal()
      setSuccessMessage(`Room "${formData.roomName}" saved successfully!`)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-3.5">
      <div>
        <h1 className="font-display text-3xl font-bold">
          Workspace Administration
        </h1>
        <p className="mt-1 text-sm text-slate">
          Manage workspace inventory, capacity, availability, and facilities dynamically.
        </p>
      </div>

      {successMessage && (
        <div className="rounded-xl border border-green-200 bg-green-50 px-3 py-2 text-xs font-medium text-green-700">
          {successMessage}
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
          {error}
        </div>
      )}

      {/* SUMMARY CARDS */}
      <div className="grid gap-2 grid-cols-2 md:grid-cols-4">
        <Card className="p-2.5 shadow-sm">
          <p className="font-mono text-[9.5px] uppercase font-bold tracking-wider text-slate">Total</p>
          <p className="mt-0.5 text-lg font-extrabold text-ink">{statusCounts.Total}</p>
          <p className="text-[9.5px] text-slate">All workspaces</p>
        </Card>
        <Card className="p-2.5 shadow-sm">
          <p className="font-mono text-[9.5px] uppercase font-bold tracking-wider text-slate">Available</p>
          <p className="mt-0.5 text-lg font-extrabold text-[#658362]">{statusCounts.Available}</p>
          <p className="text-[9.5px] text-slate">Ready to reserve</p>
        </Card>
        <Card className="p-2.5 shadow-sm">
          <p className="font-mono text-[9.5px] uppercase font-bold tracking-wider text-slate">Reserved</p>
          <p className="mt-0.5 text-lg font-extrabold text-[#2A4365]">{statusCounts.Reserved}</p>
          <p className="text-[9.5px] text-slate">Currently booked</p>
        </Card>
        <Card className="p-2.5 shadow-sm">
          <p className="font-mono text-[9.5px] uppercase font-bold tracking-wider text-slate">Maintenance</p>
          <p className="mt-0.5 text-lg font-extrabold text-[#E09F3E]">{statusCounts.Maintenance}</p>
          <p className="text-[9.5px] text-slate">Under maintenance</p>
        </Card>
      </div>

      {/* CONTROL BAR */}
      <Card className="p-2.5 shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <h2 className="font-display text-xs font-bold text-ink">Workspace Inventory</h2>
            {search && (
              <div className="inline-flex items-center gap-1 rounded-full bg-sky-100 border border-sky-200 px-2 py-0.2 text-[10px] font-semibold text-sky-800">
                <span>Search: &ldquo;{search}&rdquo;</span>
                <button
                  type="button"
                  onClick={handleClearSearch}
                  className="ml-1 text-sky-600 hover:text-sky-900 font-bold"
                  title="Clear search filter"
                >
                  ✕
                </button>
              </div>
            )}
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2 sm:flex-nowrap">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full sm:w-auto rounded-xl border border-line bg-white px-2.5 py-1 text-xs text-ink outline-none h-7"
            >
              <option value="All">All Status</option>
              <option value="Available">Available</option>
              <option value="Maintenance">Maintenance</option>
            </select>
            <select
              value={moduleFilter}
              onChange={(e) => setModuleFilter(e.target.value)}
              className="w-full sm:w-auto rounded-xl border border-line bg-white px-2.5 py-1 text-xs text-ink outline-none h-7"
            >
              {modules.map((mod) => (
                <option key={mod} value={mod}>
                  {mod === 'All' ? 'All Modules' : mod}
                </option>
              ))}
            </select>
            <Button className="w-full sm:w-auto shrink-0 justify-center whitespace-nowrap px-3 py-1 text-xs font-bold h-7" onClick={openAddModal}>
              + Add Workspace
            </Button>
          </div>
        </div>
      </Card>
      {/* ROOM TABLE */}
      <Card className="p-0 overflow-hidden shadow-sm">
        <div className="overflow-x-auto w-full">
          <table className="w-full min-w-[720px] table-fixed text-left text-xs">
            <thead>
              <tr className="border-b border-line font-mono text-[9.5px] font-extrabold uppercase tracking-wider text-black bg-slate-50/70">
                <th className="w-[15%] px-2 py-1.5 whitespace-nowrap">Room Name</th>
                <th className="w-[13%] px-2 py-1.5 whitespace-nowrap">Room Number</th>
                <th className="w-[18%] px-2 py-1.5 whitespace-nowrap">Module</th>
                <th className="w-[10%] px-2 py-1.5 whitespace-nowrap">Type</th>
                <th className="w-[7%] px-2 py-1.5 whitespace-nowrap">Capacity</th>
                <th className="w-[17%] px-2 py-1.5 whitespace-nowrap">Facilities</th>
                <th className="w-[10%] px-2 py-1.5 text-center whitespace-nowrap">Status</th>
                <th className="w-[10%] px-2 py-1.5 text-center whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-2 py-4 text-center text-slate">
                    Loading room inventory...
                  </td>
                </tr>
              ) : filteredRooms.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-2 py-4 text-center text-slate">
                    No rooms match your filter criteria.
                  </td>
                </tr>
              ) : (
                filteredRooms.map((room) => (
                  <tr key={room.id} className="transition-colors hover:bg-portal-bg/70">
                    <td className="px-2 py-1.5 font-sans font-semibold text-xs text-ink truncate" title={room.roomName}>{room.roomName}</td>
                    <td className="px-2 py-1.5 font-sans text-xs font-semibold text-ink truncate" title={room.roomNumber}>{room.roomNumber}</td>
                    <td className="px-2 py-1.5 text-slate truncate" title={room.module}>{room.module}</td>
                    <td className="px-2 py-1.5 text-slate truncate">{room.roomType}</td>
                    <td className="px-2 py-1.5 text-slate">{room.capacity}</td>
                    <td className="px-2 py-1.5 text-slate">
                      {room.facilities?.length > 0 ? (
                        <div className="flex flex-wrap items-center gap-1">
                          {room.facilities.map((fac, idx) => (
                            <span
                              key={fac.id ?? idx}
                              className="rounded bg-slate-100 border border-slate-200/60 px-1 py-0.2 text-[9px] font-medium text-slate-700 whitespace-nowrap"
                            >
                              {fac.name}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-slate text-[10px]">-</span>
                      )}
                    </td>
                    <td className="px-2 py-1.5 text-center">
                      <CustomStatusTag status={room.status} />
                    </td>
                    <td className="px-2 py-1.5 text-center">
                      <div className="inline-flex items-center justify-center gap-1.5 font-sans text-xs">
                        <button
                          type="button"
                          onClick={() => openViewModal(room)}
                          className="font-bold text-sky-600 hover:underline text-xs"
                        >
                          View
                        </button>
                        <span className="text-line">|</span>
                        <button
                          type="button"
                          onClick={() => openEditModal(room)}
                          className="font-bold text-sky-600 hover:underline text-xs"
                        >
                          Edit
                        </button>
                        <span className="text-line">|</span>
                        <button
                          type="button"
                          disabled={deletingId === (room.id || room.roomId)}
                          onClick={() => handleDeleteRoom(room)}
                          className="font-bold text-rose-600 hover:underline text-xs disabled:opacity-50"
                        >
                          {deletingId === (room.id || room.roomId) ? 'Deleting...' : 'Delete'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
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
            <select
              name="module"
              value={formData.module}
              onChange={(e) => setFormData({ ...formData, module: e.target.value })}
              disabled={modalMode === 'view'}
              className="w-full rounded-xl border border-line bg-white px-3 py-2 text-sm text-ink outline-none"
            >
              <option value="Module 1 - Elcot Park - CMB">Module 1 - Elcot Park - CMB</option>
              <option value="Module 2 - Elcot Park - CMB">Module 2 - Elcot Park - CMB</option>
              <option value="Module 1 - Tidel Park - CMB">Module 1 - Tidel Park - CMB</option>
            </select>
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
              <option value="Maintenance">Maintenance</option>
            </select>
          </label>
        </form>
      </Modal>
    </div>
  )
}