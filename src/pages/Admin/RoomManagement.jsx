import { useEffect, useState, useMemo } from 'react'

import client from '../../api/client'

import Card from '../../components/common/Card'
import Button from '../../components/common/Button'
import Modal from '../../components/common/Modal'

// =====================================================
// Status Badge
// =====================================================

function CustomStatusTag({ status }) {
  const normalized = status?.toUpperCase()

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
      className={`inline-block w-28 py-1 rounded-full text-xs font-bold tracking-wider uppercase text-center ${bgClass}`}
    >
      {normalized || 'AVAILABLE'}
    </span>
  )
}

// =====================================================
// Room Type ID Mapping
// Must match backend RoomType table
// =====================================================

function getRoomTypeId(type) {
  const lower = String(type || '').toLowerCase()

  if (lower.includes('conference')) return 1
  if (lower.includes('training')) return 2
  if (lower.includes('discussion')) return 3

  return 1
}

// =====================================================
// Room Type Name
// =====================================================

function getRoomTypeName(room) {
  if (typeof room.roomType === 'string') {
    return room.roomType
  }

  if (room.roomType?.name) {
    return room.roomType.name
  }

  if (room.roomTypeName) {
    return room.roomTypeName
  }

  return 'Conference'
}

// =====================================================
// Normalize Facilities
// =====================================================

function normalizeFacilities(facilities) {
  if (!Array.isArray(facilities)) {
    return []
  }

  return facilities.map((facility) => {
    if (typeof facility === 'string') {
      return facility
    }

    return (
      facility?.name ||
      facility?.facilityName ||
      `Facility ${facility?.facilityId ?? ''}`
    )
  })
}

// =====================================================
// Suggested Room Name
// =====================================================

function getSuggestedRoomName(type, existingRooms, generatedOffset = 0) {
  const lowerType = String(type || '').toLowerCase()

  let baseName = 'Room'

  if (lowerType.includes('discussion')) {
    baseName = 'Discussion Room'
  } else if (lowerType.includes('conference')) {
    baseName = 'Conference Room'
  } else if (lowerType.includes('training')) {
    baseName = 'Training Room'
  } else {
    baseName = `${type || 'Room'} Room`
  }

  const existingNumbers = existingRooms
    .filter(
      (room) =>
        room.type?.toLowerCase() === String(type || '').toLowerCase()
    )
    .map((room) => Number(room.name?.match(/(\d+)$/)?.[1]))
    .filter((value) => Number.isFinite(value))

  const startNumber =
    existingNumbers.length > 0
      ? Math.max(...existingNumbers) + 1
      : 1

  return `${baseName} ${startNumber + generatedOffset}`
}

// =====================================================
// Suggested Room Code
// Frontend-only display value.
// Not sent to backend because current API does not expect it.
// =====================================================

function getSuggestedCode(
  moduleName,
  type,
  existingRooms,
  generatedOffset = 0
) {
  const moduleNumber =
    String(moduleName || '').match(/\d+/)?.[0] || '1'

  const typeCode = (type || 'RM')
    .slice(0, 2)
    .toUpperCase()

  const existingForType =
    existingRooms.filter(
      (room) =>
        room.module === moduleName &&
        room.type === type
    ).length + 1

  return `M${moduleNumber}-${typeCode}${
    existingForType + generatedOffset
  }`
}

// =====================================================
// Empty Form
// =====================================================

function getEmptyFormData() {
  return {
    name: '',
    code: '',
    module: 'Module 1',
    type: 'Conference',
    capacity: 4,
    status: 'Available',
    facilities: [],
  }
}

// =====================================================
// API Helpers
// =====================================================

// GET /api/admin/rooms
async function fetchAdminRooms() {
  const response = await client.get('/admin/rooms')

  const data = response.data

  if (Array.isArray(data)) {
    return data
  }

  if (Array.isArray(data?.data)) {
    return data.data
  }

  if (Array.isArray(data?.rooms)) {
    return data.rooms
  }

  return []
}

// GET /api/admin/rooms/dashboard
async function fetchAdminRoomDashboard() {
  const response = await client.get('/admin/rooms/dashboard')

  return response.data || {}
}

// POST /api/admin/rooms
async function createAdminRoom(room) {
  const response = await client.post('/admin/rooms', room)

  return response.data
}

// PUT /api/admin/rooms/{id}
async function updateAdminRoom(roomId, room) {
  const response = await client.put(
    `/admin/rooms/${roomId}`,
    room
  )

  return response.data
}

// DELETE /api/admin/rooms/{id}
async function deleteAdminRoom(roomId) {
  const response = await client.delete(
    `/admin/rooms/${roomId}`
  )

  return response.data
}

// =====================================================
// Room Management
// =====================================================

export default function RoomManagement() {
  const [rooms, setRooms] = useState([])

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [moduleFilter, setModuleFilter] = useState('All')

  // =====================================================
  // Dashboard Stats
  // =====================================================

  const [dashboardStats, setDashboardStats] = useState({
    totalRooms: 0,
    availableRooms: 0,
    bookedRooms: 0,
  })

  // =====================================================
  // Modal State
  // =====================================================

  const [modalOpen, setModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState('add')
  const [addStep, setAddStep] = useState(1)

  const [selectedRoomId, setSelectedRoomId] = useState(null)

  // =====================================================
  // Edit / View Form
  // =====================================================

  const [formData, setFormData] =
    useState(getEmptyFormData())

  // =====================================================
  // Add Wizard
  // =====================================================

  const [typeConfigs, setTypeConfigs] = useState([
    {
      type: 'Discussion',
      count: 8,
      capacity: 4,
      facilities: [],
    },
  ])

  const [generatedRooms, setGeneratedRooms] = useState([])

  // =====================================================
  // Fetch Room Data
  // =====================================================

  const fetchRoomData = async () => {
    try {
      setLoading(true)
      setError('')

      const [statsResponse, roomsResponse] =
        await Promise.all([
          fetchAdminRoomDashboard(),
          fetchAdminRooms(),
        ])

      console.log(
        'Admin room dashboard:',
        statsResponse
      )

      console.log(
        'Admin rooms:',
        roomsResponse
      )

      // =================================================
      // Dashboard Statistics
      // =================================================

      setDashboardStats({
        totalRooms:
          statsResponse.totalRooms ??
          statsResponse.total ??
          statsResponse.TotalRooms ??
          0,

        availableRooms:
          statsResponse.availableRooms ??
          statsResponse.available ??
          statsResponse.AvailableRooms ??
          0,

        bookedRooms:
          statsResponse.bookedRooms ??
          statsResponse.booked ??
          statsResponse.BookedRooms ??
          0,
      })

      // =================================================
      // Normalize Rooms
      // =================================================

      const mappedRooms = roomsResponse.map((room) => ({
        id:
          room.roomId ??
          room.id,

        name:
          room.roomName ??
          room.name ??
          'Unnamed Room',

        code:
          room.code ??
          `RM-${room.roomId ?? room.id ?? ''}`,

        module:
          room.module ??
          'Module 1',

        type:
          getRoomTypeName(room),

        capacity:
          room.capacity ??
          4,

        status:
          room.status ??
          'Available',

        facilities:
          normalizeFacilities(
            room.facilities
          ),
      }))

      console.log(
        'Mapped rooms:',
        mappedRooms
      )

      setRooms(mappedRooms)
    } catch (err) {
      console.error(
        'Failed to load room inventory:',
        err
      )

      console.error(
        'Response:',
        err.response?.data
      )

      console.error(
        'Status:',
        err.response?.status
      )

      if (err.response?.status === 401) {
        setError(
          'Your session has expired. Please login again.'
        )
      } else if (err.response?.status === 403) {
        setError(
          'You do not have permission to manage rooms.'
        )
      } else {
        setError(
          err.response?.data?.message ||
          'Unable to fetch live room inventory.'
        )
      }
    } finally {
      setLoading(false)
    }
  }

  // =====================================================
  // Initial Load
  // =====================================================

  useEffect(() => {
    fetchRoomData()
  }, [])

  // =====================================================
  // Module Options
  // =====================================================

  const modules = useMemo(() => {
    return [
      'All',
      ...new Set(
        rooms
          .map((room) => room.module)
          .filter(Boolean)
      ),
    ]
  }, [rooms])

  // =====================================================
  // Filter Rooms
  // =====================================================

  const filteredRooms = useMemo(() => {
    const searchValue =
      search.toLowerCase().trim()

    return rooms.filter((room) => {
      const facilitiesText =
        Array.isArray(room.facilities)
          ? room.facilities.join(' ')
          : ''

      const searchableText = [
        room.name,
        room.code,
        room.type,
        room.module,
        facilitiesText,
      ]
        .join(' ')
        .toLowerCase()

      const matchesSearch =
        !searchValue ||
        searchableText.includes(searchValue)

      const matchesStatus =
        statusFilter === 'All' ||
        room.status?.toLowerCase() ===
          statusFilter.toLowerCase()

      const matchesModule =
        moduleFilter === 'All' ||
        room.module === moduleFilter

      return (
        matchesSearch &&
        matchesStatus &&
        matchesModule
      )
    })
  }, [
    rooms,
    search,
    statusFilter,
    moduleFilter,
  ])

  // =====================================================
  // Status Counts
  // =====================================================

  const statusCounts = useMemo(() => {
    return rooms.reduce(
      (acc, room) => {
        const status =
          room.status || 'Available'

        if (
          status.toLowerCase() ===
          'available'
        ) {
          acc.Available += 1
        } else if (
          status.toLowerCase() ===
          'booked'
        ) {
          acc.Booked += 1
        } else if (
          status.toLowerCase() ===
          'maintenance'
        ) {
          acc.Maintenance += 1
        }

        return acc
      },
      {
        Available: 0,
        Booked: 0,
        Maintenance: 0,
      }
    )
  }, [rooms])

  // =====================================================
  // Add Room Modal
  // =====================================================

  const openAddModal = () => {
    setTypeConfigs([
      {
        type: 'Discussion',
        count: 1,
        capacity: 4,
        facilities: [],
      },
    ])

    setGeneratedRooms([])
    setAddStep(1)
    setModalMode('add')
    setSelectedRoomId(null)
    setError('')
    setSuccessMessage('')
    setModalOpen(true)
  }

  // =====================================================
  // Add Type Configuration
  // =====================================================

  const handleAddTypeConfig = () => {
    setTypeConfigs((previous) => [
      ...previous,
      {
        type: '',
        count: 1,
        capacity: 4,
        facilities: [],
      },
    ])
  }

  const handleRemoveTypeConfig = (index) => {
    setTypeConfigs((previous) =>
      previous.filter(
        (_, currentIndex) =>
          currentIndex !== index
      )
    )
  }

  const handleTypeConfigChange = (
    index,
    field,
    value
  ) => {
    setTypeConfigs((previous) => {
      const updated = [...previous]

      updated[index] = {
        ...updated[index],
        [field]: value,
      }

      return updated
    })
  }

  // =====================================================
  // Facility UI
  // =====================================================

  const handleAddFacilityToConfig = (
    configIndex
  ) => {
    setTypeConfigs((previous) => {
      const updated = [...previous]

      updated[configIndex] = {
        ...updated[configIndex],
        facilities: [
          ...updated[configIndex].facilities,
          '',
        ],
      }

      return updated
    })
  }

  const handleFacilityConfigChange = (
    configIndex,
    facilityIndex,
    value
  ) => {
    setTypeConfigs((previous) => {
      const updated = [...previous]

      const facilities = [
        ...updated[configIndex].facilities,
      ]

      facilities[facilityIndex] = value

      updated[configIndex] = {
        ...updated[configIndex],
        facilities,
      }

      return updated
    })
  }

  const handleRemoveFacilityFromConfig = (
    configIndex,
    facilityIndex
  ) => {
    setTypeConfigs((previous) => {
      const updated = [...previous]

      updated[configIndex] = {
        ...updated[configIndex],
        facilities:
          updated[configIndex].facilities.filter(
            (_, index) =>
              index !== facilityIndex
          ),
      }

      return updated
    })
  }

  // =====================================================
  // Generate Rooms
  // =====================================================

  const handleNextToAddRooms = () => {
    const newRooms = []

    typeConfigs.forEach((config) => {
      const roomType =
        config.type.trim() || 'Conference'

      const count = Math.max(
        1,
        Number(config.count) || 1
      )

      const cleanFacilities =
        config.facilities
          .map((facility) =>
            facility.trim()
          )
          .filter(Boolean)

      for (let i = 0; i < count; i++) {
        const defaultModule =
          'Module 1'

        const name =
          getSuggestedRoomName(
            roomType,
            rooms,
            i
          )

        const code =
          getSuggestedCode(
            defaultModule,
            roomType,
            rooms,
            i
          )

        newRooms.push({
          tempId: `temp-${Date.now()}-${Math.random()}`,

          name,

          code,

          type: roomType,

          capacity:
            Number(config.capacity) || 4,

          module: defaultModule,

          status: 'Available',

          facilities:
            [...cleanFacilities],
        })
      }
    })

    setGeneratedRooms(newRooms)

    setAddStep(2)
  }

  // =====================================================
  // Generated Room Changes
  // =====================================================

  const handleGeneratedRoomChange = (
    index,
    field,
    value
  ) => {
    setGeneratedRooms((previous) => {
      const updated = [...previous]

      updated[index] = {
        ...updated[index],
        [field]: value,
      }

      return updated
    })
  }

  const handleRemoveGeneratedRoom = (
    index
  ) => {
    setGeneratedRooms((previous) =>
      previous.filter(
        (_, currentIndex) =>
          currentIndex !== index
      )
    )
  }

  // =====================================================
  // Edit Modal
  // =====================================================

  const openEditModal = (room) => {
    setFormData({
      name: room.name || '',
      code: room.code || '',
      module:
        room.module || 'Module 1',
      type:
        room.type || 'Conference',
      capacity:
        room.capacity || 4,
      status:
        room.status || 'Available',
      facilities:
        [...(room.facilities || [])],
    })

    setModalMode('edit')
    setSelectedRoomId(room.id)
    setError('')
    setSuccessMessage('')
    setModalOpen(true)
  }

  // =====================================================
  // View Modal
  // =====================================================

  const openViewModal = (room) => {
    setFormData({
      name: room.name || '',
      code: room.code || '',
      module:
        room.module || 'Module 1',
      type:
        room.type || 'Conference',
      capacity:
        room.capacity || 4,
      status:
        room.status || 'Available',
      facilities:
        [...(room.facilities || [])],
    })

    setModalMode('view')
    setSelectedRoomId(room.id)
    setError('')
    setSuccessMessage('')
    setModalOpen(true)
  }

  // =====================================================
  // Close Modal
  // =====================================================

  const closeModal = () => {
    setModalOpen(false)
    setSelectedRoomId(null)
    setAddStep(1)
    setGeneratedRooms([])
  }

  // =====================================================
  // Edit Form Change
  // =====================================================

  const handleSingleFieldChange = (event) => {
    const {
      name,
      value,
    } = event.target

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }))
  }

  // =====================================================
  // Create Rooms
  //
  // Backend endpoint:
  // POST /api/admin/rooms
  //
  // Backend expects:
  // {
  //   roomTypeId,
  //   roomName,
  //   capacity,
  //   module,
  //   status,
  //   facilityIds
  // }
  // =====================================================

  const handleSubmit = async (event) => {
    if (event) {
      event.preventDefault()
    }

    setSubmitting(true)
    setError('')
    setSuccessMessage('')

    try {
      // =================================================
      // ADD MODE
      // =================================================

      if (modalMode === 'add') {
        if (generatedRooms.length === 0) {
          setError(
            'Please add at least one room.'
          )

          return
        }

        let createdCount = 0

        for (const room of generatedRooms) {
          /*
           * IMPORTANT:
           *
           * The current backend API expects
           * facilityIds as integer IDs.
           *
           * The current UI contains facility names,
           * so we cannot safely convert "TV" or
           * "Board" into IDs without knowing the
           * facility table IDs.
           *
           * Therefore [] is sent until the frontend
           * has a facility ID selector.
           */

          const payload = {
            roomTypeId:
              getRoomTypeId(room.type),

            roomName:
              room.name.trim(),

            capacity:
              Number(room.capacity) || 4,

            module:
              room.module || 'Module 1',

            status:
              room.status || 'Available',

            facilityIds: [],
          }

          console.log(
            'Creating room:',
            payload
          )

          await createAdminRoom(payload)

          createdCount++
        }

        // =================================================
        // Refresh database data
        // =================================================

        await fetchRoomData()

        setSuccessMessage(
          `${createdCount} room${
            createdCount > 1
              ? 's'
              : ''
          } created successfully.`
        )

        closeModal()

        return
      }

      // =================================================
      // EDIT MODE
      // =================================================

      if (modalMode === 'edit') {
        if (!selectedRoomId) {
          throw new Error(
            'Room ID is missing.'
          )
        }

        const payload = {
          roomName:
            formData.name.trim(),

          roomTypeId:
            getRoomTypeId(
              formData.type
            ),

          capacity:
            Number(
              formData.capacity
            ) || 4,

          module:
            formData.module ||
            'Module 1',

          status:
            formData.status ||
            'Available',

          /*
           * Backend expects facilityIds.
           * Current UI has facility names,
           * therefore leave it empty.
           */
          facilityIds: [],
        }

        console.log(
          'Updating room:',
          selectedRoomId,
          payload
        )

        await updateAdminRoom(
          selectedRoomId,
          payload
        )

        await fetchRoomData()

        closeModal()

        setSuccessMessage(
          'Room updated successfully.'
        )
      }
    } catch (err) {
      console.error(
        'Room API error:',
        err
      )

      console.error(
        'Response:',
        err.response?.data
      )

      console.error(
        'Status:',
        err.response?.status
      )

      setError(
        err.response?.data?.message ||
        err.response?.data?.title ||
        err.message ||
        'Room operation failed.'
      )
    } finally {
      setSubmitting(false)
    }
  }

  // =====================================================
  // Delete Room
  // =====================================================

  const handleDelete = async (
    roomId
  ) => {
    const confirmed =
      window.confirm(
        'Are you sure you want to delete or cancel this room?'
      )

    if (!confirmed) {
      return
    }

    try {
      setError('')
      setSuccessMessage('')

      await deleteAdminRoom(roomId)

      await fetchRoomData()

      setSuccessMessage(
        'Room deleted successfully.'
      )
    } catch (err) {
      console.error(
        'Failed to delete room:',
        err
      )

      setError(
        err.response?.data?.message ||
        'Failed to delete room.'
      )
    }
  }

  // =====================================================
  // UI
  // =====================================================

  return (
    <div className="space-y-6">

      {/* =================================================
          Header
      ================================================= */}

      <div className="rounded-2xl border border-ink bg-white p-5">

        <h1 className="font-display text-xl font-bold text-ink">
          Room Management
        </h1>

        <p className="mt-2 text-sm text-slate">
          Manage room inventory, capacity,
          availability, and facilities for your
          workspace.
        </p>

      </div>

      {/* =================================================
          Messages
      ================================================= */}

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

      {/* =================================================
          Summary Cards
      ================================================= */}

      <div className="grid gap-3 md:grid-cols-4">

        <Card>
          <p className="font-mono text-[11px] uppercase tracking-wider text-slate">
            Total Rooms
          </p>

          <p className="mt-2 text-3xl font-bold text-ink">
            {dashboardStats.totalRooms ||
              rooms.length}
          </p>

          <p className="mt-1 text-sm text-slate">
            All rooms in the system
          </p>
        </Card>

        <Card>
          <p className="font-mono text-[11px] uppercase tracking-wider text-slate">
            Available
          </p>

          <p className="mt-2 text-3xl font-bold text-[#658362]">
            {dashboardStats.availableRooms ||
              statusCounts.Available}
          </p>

          <p className="mt-1 text-sm text-slate">
            Rooms ready to reserve
          </p>
        </Card>

        <Card>
          <p className="font-mono text-[11px] uppercase tracking-wider text-slate">
            Booked
          </p>

          <p className="mt-2 text-3xl font-bold text-[#B85450]">
            {dashboardStats.bookedRooms ||
              statusCounts.Booked}
          </p>

          <p className="mt-1 text-sm text-slate">
            Rooms currently reserved
          </p>
        </Card>

        <Card>
          <p className="font-mono text-[11px] uppercase tracking-wider text-slate">
            Maintenance
          </p>

          <p className="mt-2 text-3xl font-bold text-[#E09F3E]">
            {statusCounts.Maintenance}
          </p>

          <p className="mt-1 text-sm text-slate">
            Rooms under maintenance
          </p>
        </Card>

      </div>

      {/* =================================================
          Control Bar
      ================================================= */}

      <Card className="hover:shadow-none hover:-translate-y-0">

        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

          <div className="min-w-0">

            <h2 className="font-display text-sm font-bold text-ink">
              Room Inventory
            </h2>

            <p className="text-sm text-slate">
              Search, filter, and manage room
              details for admin operations.
            </p>

          </div>

          <div className="flex flex-wrap items-center justify-end gap-3 lg:flex-nowrap">

            <Button
              className="shrink-0 min-w-[96px] justify-center px-3 py-2"
              onClick={openAddModal}
            >
              Add Room
            </Button>

            <input
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value
                )
              }
              placeholder="Search rooms, codes, types..."
              className="min-w-[220px] flex-1 rounded-xl border border-line bg-portal-bg px-3 py-2 text-sm text-ink outline-none focus:border-portal-accent"
            />

            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(
                  event.target.value
                )
              }
              className="shrink-0 min-w-[140px] rounded-xl border border-line bg-white px-3 py-2 text-sm text-ink outline-none"
            >
              <option>All</option>
              <option>Available</option>
              <option>Booked</option>
              <option>Maintenance</option>
            </select>

            <select
              value={moduleFilter}
              onChange={(event) =>
                setModuleFilter(
                  event.target.value
                )
              }
              className="shrink-0 min-w-[140px] rounded-xl border border-line bg-white px-3 py-2 text-sm text-ink outline-none"
            >
              {modules.map(
                (module) => (
                  <option
                    key={module}
                  >
                    {module}
                  </option>
                )
              )}
            </select>

          </div>

        </div>

      </Card>

      {/* =================================================
          Room Table
      ================================================= */}

      <Card className="overflow-x-auto">

        <table className="w-full min-w-[900px] text-left text-sm">

          <thead>
            <tr className="border-b border-line font-mono text-[11px] font-extrabold uppercase tracking-wider text-black">

              <th className="px-4 py-3">
                Room
              </th>

              <th className="px-4 py-3">
                Code
              </th>

              <th className="px-4 py-3">
                Module
              </th>

              <th className="px-4 py-3">
                Type
              </th>

              <th className="px-4 py-3">
                Capacity
              </th>

              <th className="px-4 py-3">
                Facilities
              </th>

              <th className="px-4 py-3 text-center">
                Status
              </th>

              <th className="px-4 py-3 text-center">
                Actions
              </th>

            </tr>
          </thead>

          <tbody className="divide-y divide-line">

            {loading ? (

              <tr>
                <td
                  colSpan={8}
                  className="px-4 py-8 text-center text-slate"
                >
                  Loading room inventory...
                </td>
              </tr>

            ) : error && rooms.length === 0 ? (

              <tr>
                <td
                  colSpan={8}
                  className="px-4 py-8 text-center text-red-600"
                >
                  {error}
                </td>
              </tr>

            ) : filteredRooms.length === 0 ? (

              <tr>
                <td
                  colSpan={8}
                  className="px-4 py-6 text-center text-slate"
                >
                  No rooms match your filters.
                </td>
              </tr>

            ) : (

              filteredRooms.map(
                (room) => (

                  <tr
                    key={room.id}
                    className="transition-colors duration-200 hover:bg-portal-bg/70"
                  >

                    <td className="px-4 py-3.5 font-semibold text-ink">
                      {room.name}
                    </td>

                    <td className="px-4 py-3.5 font-mono text-xs text-slate">
                      {room.code}
                    </td>

                    <td className="px-4 py-3.5 text-slate">
                      {room.module}
                    </td>

                    <td className="px-4 py-3.5 text-slate">
                      {room.type}
                    </td>

                    <td className="px-4 py-3.5 text-slate">
                      {room.capacity}
                    </td>

                    <td className="px-4 py-3.5 text-slate">

                      {(room.facilities || [])
                        .length > 0 ? (

                        <div className="flex flex-wrap gap-1">

                          {room.facilities.map(
                            (
                              facility,
                              index
                            ) => (

                              <span
                                key={index}
                                className="rounded bg-slate/10 px-1.5 py-0.5 text-xs font-medium text-ink"
                              >
                                {facility}
                              </span>

                            )
                          )}

                        </div>

                      ) : (

                        <span className="text-slate">
                          None
                        </span>

                      )}

                    </td>

                    <td className="px-4 py-3.5 text-center">

                      <CustomStatusTag
                        status={
                          room.status
                        }
                      />

                    </td>

                    <td className="px-4 py-3.5 text-center">

                      <div className="inline-flex items-center gap-3 font-sans text-sm">

                        <button
                          onClick={() =>
                            openViewModal(
                              room
                            )
                          }
                          className="font-bold text-sm text-sky-600 hover:text-sky-800 hover:underline"
                        >
                          View
                        </button>

                        <button
                          onClick={() =>
                            openEditModal(
                              room
                            )
                          }
                          className="font-bold text-sm text-emerald-600 hover:text-emerald-800 hover:underline"
                        >
                          Edit
                        </button>

                        <button
                          onClick={() =>
                            handleDelete(
                              room.id
                            )
                          }
                          className="font-bold text-sm text-red-600 hover:text-red-800 hover:underline"
                        >
                          Cancel
                        </button>

                      </div>

                    </td>

                  </tr>

                )
              )

            )}

          </tbody>

        </table>

      </Card>

      {/* =================================================
          Modal
      ================================================= */}

      <Modal
        open={modalOpen}
        onClose={closeModal}
        className={`w-full transition-all duration-300 ${
          modalMode === 'add' &&
          addStep === 2
            ? 'max-w-6xl'
            : 'max-w-3xl'
        }`}
        title={
          modalMode === 'add'
            ? addStep === 1
              ? 'Add Rooms - Step 1: Define Room Types & Quantities'
              : 'Add Rooms - Step 2: Configure Individual Rooms'
            : modalMode === 'edit'
              ? 'Edit Room'
              : 'Room Details'
        }
        footer={
          <>
            <Button
              variant="secondary"
              onClick={closeModal}
              disabled={submitting}
            >
              Cancel
            </Button>

            {modalMode === 'add' &&
              addStep === 1 && (
                <Button
                  onClick={
                    handleNextToAddRooms
                  }
                >
                  Next
                </Button>
              )}

            {modalMode === 'add' &&
              addStep === 2 && (
                <>
                  <Button
                    variant="secondary"
                    onClick={() =>
                      setAddStep(1)
                    }
                    disabled={
                      submitting
                    }
                  >
                    Back
                  </Button>

                  <Button
                    onClick={
                      handleSubmit
                    }
                    disabled={
                      submitting ||
                      generatedRooms.length ===
                        0
                    }
                  >
                    {submitting
                      ? 'Creating...'
                      : `Submit (${generatedRooms.length} Rooms)`}
                  </Button>
                </>
              )}

            {modalMode === 'edit' && (
              <Button
                onClick={
                  handleSubmit
                }
                disabled={submitting}
              >
                {submitting
                  ? 'Saving...'
                  : 'Save Changes'}
              </Button>
            )}
          </>
        }
      >

        {/* =================================================
            ADD - STEP 1
        ================================================= */}

        {modalMode === 'add' &&
          addStep === 1 && (

            <div className="space-y-4">

              <p className="text-xs text-slate">
                Specify room configurations and
                quantities to generate rooms.
              </p>

              <div className="overflow-hidden rounded-2xl border border-line bg-white shadow-sm">

                <table className="w-full text-left text-sm">

                  <thead className="border-b border-line bg-[#f8f9fa] text-[11px] font-bold uppercase tracking-wider text-slate">

                    <tr>

                      <th className="w-[25%] p-3.5">
                        Room Type
                      </th>

                      <th className="w-[15%] p-3.5">
                        Count
                      </th>

                      <th className="w-[15%] p-3.5">
                        Capacity
                      </th>

                      <th className="w-[33%] p-3.5">
                        Facilities
                      </th>

                      <th className="w-[12%] p-3.5 text-center">
                        Action
                      </th>

                    </tr>

                  </thead>

                  <tbody className="divide-y divide-line">

                    {typeConfigs.map(
                      (
                        config,
                        index
                      ) => (

                        <tr
                          key={index}
                          className="transition-colors hover:bg-portal-bg/50"
                        >

                          <td className="p-3 align-top">

                            <input
                              type="text"
                              value={
                                config.type
                              }
                              onChange={(
                                event
                              ) =>
                                handleTypeConfigChange(
                                  index,
                                  'type',
                                  event.target
                                    .value
                                )
                              }
                              placeholder="e.g. Discussion"
                              className="w-full rounded-xl border border-line bg-white px-3 py-2 text-sm text-ink outline-none transition-colors focus:border-portal-accent"
                            />

                          </td>

                          <td className="p-3 align-top">

                            <input
                              type="number"
                              min="1"
                              value={
                                config.count
                              }
                              onChange={(
                                event
                              ) =>
                                handleTypeConfigChange(
                                  index,
                                  'count',
                                  event.target
                                    .value
                                )
                              }
                              className="w-full rounded-xl border border-line bg-white px-3 py-2 text-sm text-ink outline-none transition-colors focus:border-portal-accent"
                            />

                          </td>

                          <td className="p-3 align-top">

                            <input
                              type="number"
                              min="1"
                              value={
                                config.capacity
                              }
                              onChange={(
                                event
                              ) =>
                                handleTypeConfigChange(
                                  index,
                                  'capacity',
                                  event.target
                                    .value
                                )
                              }
                              className="w-full rounded-xl border border-line bg-white px-3 py-2 text-sm text-ink outline-none transition-colors focus:border-portal-accent"
                            />

                          </td>

                          <td className="p-3 align-top">

                            <div className="space-y-2.5">

                              <div className="flex flex-wrap items-center gap-2">

                                {config.facilities.map(
                                  (
                                    facility,
                                    facilityIndex
                                  ) => (

                                    <div
                                      key={
                                        facilityIndex
                                      }
                                      className="flex items-center gap-1.5 rounded-full border border-line bg-portal-bg px-3 py-1 text-xs text-ink"
                                    >

                                      <input
                                        type="text"
                                        value={
                                          facility
                                        }
                                        onChange={(
                                          event
                                        ) =>
                                          handleFacilityConfigChange(
                                            index,
                                            facilityIndex,
                                            event
                                              .target
                                              .value
                                          )
                                        }
                                        placeholder="Facility"
                                        className="w-16 bg-transparent text-xs font-medium text-ink outline-none"
                                      />

                                      <button
                                        type="button"
                                        onClick={() =>
                                          handleRemoveFacilityFromConfig(
                                            index,
                                            facilityIndex
                                          )
                                        }
                                        className="px-0.5 text-sm font-bold leading-none text-[#be534d] hover:opacity-70"
                                      >
                                        ×
                                      </button>

                                    </div>

                                  )
                                )}

                              </div>

                              <button
                                type="button"
                                onClick={() =>
                                  handleAddFacilityToConfig(
                                    index
                                  )
                                }
                                className="inline-flex items-center rounded-xl border border-line bg-white px-3 py-1.5 text-xs font-medium text-ink transition-colors hover:bg-portal-bg"
                              >
                                + Add Facility
                              </button>

                            </div>

                          </td>

                          <td className="p-3 text-center align-top">

                            {typeConfigs.length >
                              1 && (

                              <button
                                type="button"
                                onClick={() =>
                                  handleRemoveTypeConfig(
                                    index
                                  )
                                }
                                className="pt-2 font-sans text-xs text-[#be534d] hover:underline"
                              >
                                Remove
                              </button>

                            )}

                          </td>

                        </tr>

                      )
                    )}

                  </tbody>

                </table>

              </div>

              <Button
                type="button"
                variant="secondary"
                onClick={
                  handleAddTypeConfig
                }
                className="rounded-xl border-line"
              >
                + Add Another Room Type
              </Button>

            </div>

          )}

        {/* =================================================
            ADD - STEP 2
        ================================================= */}

        {modalMode === 'add' &&
          addStep === 2 && (

            <div className="space-y-4">

              <p className="text-xs text-slate">
                Review and edit the generated
                rooms before submitting them to
                the database.
              </p>

              <div className="max-h-[60vh] overflow-y-auto rounded-2xl border border-line bg-white shadow-sm">

                <table className="w-full table-fixed text-left text-sm">

                  <thead className="sticky top-0 z-10 border-b border-line bg-[#f8f9fa] text-[11px] font-bold uppercase tracking-wider text-slate">

                    <tr>

                      <th className="w-[18%] p-3.5">
                        Room Type
                      </th>

                      <th className="w-[28%] p-3.5">
                        Room Name
                      </th>

                      <th className="w-[20%] p-3.5">
                        Room Code
                      </th>

                      <th className="w-[18%] p-3.5">
                        Module
                      </th>

                      <th className="w-[16%] p-3.5">
                        Status
                      </th>

                      <th className="w-16 p-3.5 text-center">
                        Action
                      </th>

                    </tr>

                  </thead>

                  <tbody className="divide-y divide-line">

                    {generatedRooms.map(
                      (
                        room,
                        index
                      ) => (

                        <tr
                          key={
                            room.tempId
                          }
                          className="transition-colors hover:bg-portal-bg/50"
                        >

                          <td className="truncate p-3 text-xs font-medium text-slate">
                            {room.type}
                          </td>

                          <td className="p-3">

                            <input
                              type="text"
                              value={
                                room.name
                              }
                              onChange={(
                                event
                              ) =>
                                handleGeneratedRoomChange(
                                  index,
                                  'name',
                                  event.target
                                    .value
                                )
                              }
                              className="w-full rounded-xl border border-line bg-white px-3 py-1.5 text-xs text-ink outline-none transition-colors focus:border-portal-accent"
                            />

                          </td>

                          <td className="p-3">

                            <input
                              type="text"
                              value={
                                room.code
                              }
                              disabled
                              className="w-full cursor-not-allowed rounded-xl border border-line bg-gray-100 px-3 py-1.5 text-xs text-slate outline-none"
                            />

                          </td>

                          <td className="p-3">

                            <input
                              type="text"
                              value={
                                room.module
                              }
                              onChange={(
                                event
                              ) =>
                                handleGeneratedRoomChange(
                                  index,
                                  'module',
                                  event.target
                                    .value
                                )
                              }
                              className="w-full rounded-xl border border-line bg-white px-3 py-1.5 text-xs text-ink outline-none transition-colors focus:border-portal-accent"
                            />

                          </td>

                          <td className="p-3">

                            <select
                              value={
                                room.status
                              }
                              onChange={(
                                event
                              ) =>
                                handleGeneratedRoomChange(
                                  index,
                                  'status',
                                  event.target
                                    .value
                                )
                              }
                              className="w-full rounded-xl border border-line bg-white px-2 py-1.5 text-xs text-ink outline-none transition-colors focus:border-portal-accent"
                            >

                              <option>
                                Available
                              </option>

                              <option>
                                Booked
                              </option>

                              <option>
                                Maintenance
                              </option>

                            </select>

                          </td>

                          <td className="p-3 text-center">

                            <button
                              type="button"
                              onClick={() =>
                                handleRemoveGeneratedRoom(
                                  index
                                )
                              }
                              className="font-serif text-xs text-[#be534d] hover:underline"
                            >
                              Remove
                            </button>

                          </td>

                        </tr>

                      )
                    )}

                  </tbody>

                </table>

              </div>

            </div>

          )}

        {/* =================================================
            EDIT / VIEW
        ================================================= */}

        {modalMode !== 'add' && (

          <form
            className="space-y-4"
            onSubmit={
              handleSubmit
            }
          >

            <div className="grid gap-4 md:grid-cols-2">

              <label className="space-y-1">

                <span className="text-xs uppercase tracking-[0.2em] text-slate">
                  Room Name
                </span>

                <input
                  name="name"
                  value={
                    formData.name
                  }
                  onChange={
                    handleSingleFieldChange
                  }
                  disabled={
                    modalMode ===
                    'view'
                  }
                  className="w-full rounded-xl border border-line bg-portal-bg px-3 py-2 text-sm text-ink outline-none disabled:cursor-not-allowed"
                />

              </label>

              <label className="space-y-1">

                <span className="text-xs uppercase tracking-[0.2em] text-slate">
                  Room Code
                </span>

                <input
                  name="code"
                  value={
                    formData.code
                  }
                  disabled
                  className="w-full cursor-not-allowed rounded-xl border border-line bg-gray-100 px-3 py-2 text-sm text-slate outline-none"
                />

              </label>

              <label className="space-y-1">

                <span className="text-xs uppercase tracking-[0.2em] text-slate">
                  Module
                </span>

                <input
                  name="module"
                  value={
                    formData.module
                  }
                  onChange={
                    handleSingleFieldChange
                  }
                  disabled={
                    modalMode ===
                    'view'
                  }
                  className="w-full rounded-xl border border-line bg-portal-bg px-3 py-2 text-sm text-ink outline-none disabled:cursor-not-allowed"
                />

              </label>

              <label className="space-y-1">

                <span className="text-xs uppercase tracking-[0.2em] text-slate">
                  Type
                </span>

                <select
                  name="type"
                  value={
                    formData.type
                  }
                  onChange={
                    handleSingleFieldChange
                  }
                  disabled={
                    modalMode ===
                    'view'
                  }
                  className="w-full rounded-xl border border-line bg-white px-3 py-2 text-sm text-ink outline-none disabled:cursor-not-allowed"
                >

                  <option>
                    Conference
                  </option>

                  <option>
                    Training
                  </option>

                  <option>
                    Discussion
                  </option>

                </select>

              </label>

              <label className="space-y-1">

                <span className="text-xs uppercase tracking-[0.2em] text-slate">
                  Capacity
                </span>

                <input
                  name="capacity"
                  type="number"
                  min="1"
                  value={
                    formData.capacity
                  }
                  onChange={
                    handleSingleFieldChange
                  }
                  disabled={
                    modalMode ===
                    'view'
                  }
                  className="w-full rounded-xl border border-line bg-portal-bg px-3 py-2 text-sm text-ink outline-none disabled:cursor-not-allowed"
                />

              </label>

              <label className="space-y-1">

                <span className="text-xs uppercase tracking-[0.2em] text-slate">
                  Status
                </span>

                <select
                  name="status"
                  value={
                    formData.status
                  }
                  onChange={
                    handleSingleFieldChange
                  }
                  disabled={
                    modalMode ===
                    'view'
                  }
                  className="w-full rounded-xl border border-line bg-white px-3 py-2 text-sm text-ink outline-none disabled:cursor-not-allowed"
                >

                  <option>
                    Available
                  </option>

                  <option>
                    Booked
                  </option>

                  <option>
                    Maintenance
                  </option>

                </select>

              </label>

            </div>

            <div className="rounded-xl border border-line bg-portal-bg p-4">

              <p className="mb-2 text-xs uppercase tracking-[0.2em] text-slate">
                Facilities
              </p>

              {formData.facilities?.length >
              0 ? (

                <div className="flex flex-wrap gap-2">

                  {formData.facilities.map(
                    (
                      facility,
                      index
                    ) => (

                      <span
                        key={index}
                        className="rounded-full bg-white px-3 py-1 text-xs font-medium text-ink"
                      >
                        {facility}
                      </span>

                    )
                  )}

                </div>

              ) : (

                <span className="text-sm text-slate">
                  No facilities assigned
                </span>

              )}

            </div>

          </form>

        )}

      </Modal>

    </div>
  )
}