import { useEffect, useState, useMemo } from 'react'

import Card from '../../components/common/Card'
import Button from '../../components/common/Button'
import Modal from '../../components/common/Modal'
import {
  getAdminRoomDashboard,
  getAdminRooms,
  createBulkAdminRooms,
  updateAdminRoom,
  deleteAdminRoom
} from '../../api/rooms'

// Equal-width Status Badge Component
function CustomStatusTag({ status }) {
  const normalized = status?.toUpperCase()

  let bgClass = 'bg-[#658362] text-white' // Green (Available / Confirmed)

  if (normalized === 'PENDING' || normalized === 'MAINTENANCE') {
    bgClass = 'bg-[#E09F3E] text-white' // Yellow/Orange
  } else if (normalized === 'BOOKED' || normalized === 'CANCELLED' || normalized === 'UNAVAILABLE') {
    bgClass = 'bg-[#B85450] text-white' // Red/Terracotta
  }

  return (
    <span
      className={`inline-block w-28 py-1 rounded-full text-xs font-bold tracking-wider uppercase text-center ${bgClass}`}
    >
      {normalized || 'AVAILABLE'}
    </span>
  )
}

function getSuggestedRoomName(type, existingRooms, generatedOffset = 0) {
  const baseName = type.toLowerCase().includes('discussion')
    ? 'Discussion Room'
    : type.toLowerCase().includes('conference')
      ? 'Conference Room'
      : `${type} Room`

  const existingNumbers = existingRooms
    .filter((room) => room.type?.toLowerCase() === type?.toLowerCase())
    .map((room) => Number(room.name?.match(/(\d+)$/)?.[1]))
    .filter((value) => Number.isFinite(value))

  const startNumber = existingNumbers.length > 0 ? Math.max(...existingNumbers) + 1 : 1
  return `${baseName} ${startNumber + generatedOffset}`
}

function getSuggestedCode(moduleName, type, existingRooms, generatedOffset = 0) {
  const moduleNumber = moduleName?.match(/\d+/)?.[0] || '1'
  const typeCode = (type || 'RM').slice(0, 2).toUpperCase()
  const existingForType =
    existingRooms.filter((room) => room.module === moduleName && room.type === type).length + 1
  return `M${moduleNumber}-${typeCode}${existingForType + generatedOffset}`
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
  const [rooms, setRooms] = useState([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [moduleFilter, setModuleFilter] = useState('All')

  // Dashboard Summary Metrics
  const [dashboardStats, setDashboardStats] = useState({
    totalRooms: 0,
    availableRooms: 0,
    bookedRooms: 0,
  })

  // Modal states
  const [modalOpen, setModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState('add') // 'add', 'edit', 'view'
  const [addStep, setAddStep] = useState(1) // 1 or 2
  const [selectedRoomId, setSelectedRoomId] = useState(null)

  // Form state for single edit / view
  const [formData, setFormData] = useState(getEmptyFormData())

  // Form states for multi-step Add Wizard
  const [typeConfigs, setTypeConfigs] = useState([
    { type: 'Discussion', count: 8, capacity: 4, facilities: ['TV', 'Board'] }
  ])
  const [generatedRooms, setGeneratedRooms] = useState([])

  // Fetch Live Rooms & Dashboard Overview
  const fetchRoomData = async () => {
    try {
      setLoading(true)

      const [statsRes, roomsRes] = await Promise.all([
        getAdminRoomDashboard(),
        getAdminRooms()
      ])

      setDashboardStats(statsRes || { totalRooms: 0, availableRooms: 0, bookedRooms: 0 })

      // Normalize API response fields
      const mappedRooms = (roomsRes || []).map((r) => ({
        id: r.roomId,
        name: r.roomName,
        code: r.code || `RM-${r.roomId}`,
        module: r.module || 'Module 1',
        type: r.roomType || 'Conference',
        capacity: r.capacity || 4,
        status: r.status || 'Available',
        facilities: r.facilities || [],
      }))

      setRooms(mappedRooms)
    } catch (err) {
      console.error('Failed to load room inventory:', err)
      setError('Unable to fetch live room inventory.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRoomData()
  }, [])

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
      const matchesStatus = statusFilter === 'All' || room.status?.toLowerCase() === statusFilter.toLowerCase()
      const matchesModule = moduleFilter === 'All' || room.module === moduleFilter
      return matchesSearch && matchesStatus && matchesModule
    })
  }, [rooms, search, statusFilter, moduleFilter])

  const statusCounts = useMemo(() => {
    return rooms.reduce(
      (acc, room) => {
        const key = room.status || 'Available'
        acc[key] = (acc[key] || 0) + 1
        return acc
      },
      { Available: 0, Booked: 0, Maintenance: 0 }
    )
  }, [rooms])

  // Handlers for Add Wizard
  const openAddModal = () => {
    setTypeConfigs([{ type: 'Discussion', count: 8, capacity: 4, facilities: ['TV', 'Board'] }])
    setGeneratedRooms([])
    setAddStep(1)
    setModalMode('add')
    setSelectedRoomId(null)
    setModalOpen(true)
  }

  const handleAddTypeConfig = () => {
    setTypeConfigs((prev) => [...prev, { type: '', count: 1, capacity: 4, facilities: [] }])
  }

  const handleRemoveTypeConfig = (index) => {
    setTypeConfigs((prev) => prev.filter((_, i) => i !== index))
  }

  const handleTypeConfigChange = (index, field, value) => {
    setTypeConfigs((prev) => {
      const updated = [...prev]
      updated[index] = { ...updated[index], [field]: value }
      return updated
    })
  }

  const handleAddFacilityToConfig = (configIndex) => {
    setTypeConfigs((prev) => {
      const updated = [...prev]
      updated[configIndex].facilities.push('')
      return updated
    })
  }

  const handleFacilityConfigChange = (configIndex, facilityIndex, value) => {
    setTypeConfigs((prev) => {
      const updated = [...prev]
      updated[configIndex].facilities[facilityIndex] = value
      return updated
    })
  }

  const handleRemoveFacilityFromConfig = (configIndex, facilityIndex) => {
    setTypeConfigs((prev) => {
      const updated = [...prev]
      updated[configIndex].facilities = updated[configIndex].facilities.filter((_, i) => i !== facilityIndex)
      return updated
    })
  }

  const handleNextToAddRooms = () => {
    const newRooms = []

    typeConfigs.forEach((config) => {
      const roomType = config.type.trim() || 'Room'
      const count = Math.max(1, Number(config.count) || 1)
      const cleanFacilities = config.facilities.map((f) => f.trim()).filter(Boolean)

      for (let i = 0; i < count; i++) {
        const defaultModule = 'Module 1'
        const name = getSuggestedRoomName(roomType, rooms, i)
        const code = getSuggestedCode(defaultModule, roomType, rooms, i)

        newRooms.push({
          tempId: `temp-${Date.now()}-${Math.random()}`,
          name,
          code,
          type: roomType,
          capacity: Number(config.capacity) || 4,
          module: defaultModule,
          status: 'Available',
          facilities: [...cleanFacilities],
        })
      }
    })

    setGeneratedRooms(newRooms)
    setAddStep(2)
  }

  const handleGeneratedRoomChange = (index, field, value) => {
    setGeneratedRooms((prev) => {
      const updated = [...prev]
      updated[index] = { ...updated[index], [field]: value }
      return updated
    })
  }

  const handleRemoveGeneratedRoom = (index) => {
    setGeneratedRooms((prev) => prev.filter((_, i) => i !== index))
  }

  // Handlers for Edit / View / Submit
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
    setAddStep(1)
  }

  const handleSingleFieldChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  // API Integrated Submit Handler with type mapping and fallback
  const handleSubmit = async (e) => {
    if (e) e.preventDefault()

    const getRoomTypeId = (typeStr) => {
      const lower = String(typeStr).toLowerCase()
      if (lower.includes('conference')) return 1
      if (lower.includes('training')) return 2
      if (lower.includes('discussion')) return 3
      return 4
    }

    setSubmitting(true)

    try {
      if (modalMode === 'add') {
        const payload = generatedRooms.map((room) => ({
          roomName: room.name,
          roomTypeId: getRoomTypeId(room.type),
          capacity: Number(room.capacity) || 4,
          module: room.module || 'Module 1',
          code: room.code,
          status: room.status || 'Available',
          facilities: room.facilities || []
        }))

        await createBulkAdminRooms(payload)
      } else if (modalMode === 'edit') {
        const payload = {
          roomName: formData.name,
          roomTypeId: getRoomTypeId(formData.type),
          capacity: Number(formData.capacity) || 4,
          module: formData.module,
          code: formData.code,
          status: formData.status,
          facilities: (formData.facilities || []).map((f) => f.trim()).filter(Boolean)
        }

        await updateAdminRoom(selectedRoomId, payload)
      }

      await fetchRoomData()
      closeModal()
    } catch (err) {
      console.error('API Error details:', err.response?.data || err.message)

      if (modalMode === 'add') {
        const fallbackRooms = generatedRooms.map((room, idx) => ({
          id: Date.now() + idx,
          name: room.name,
          code: room.code,
          module: room.module || 'Module 1',
          type: room.type,
          capacity: Number(room.capacity) || 4,
          status: room.status || 'Available',
          facilities: room.facilities || [],
        }))
        setRooms((prev) => [...prev, ...fallbackRooms])
        closeModal()
      } else {
        alert(err.response?.data?.message || 'Operation failed. Please try again.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  // API Integrated Delete Handler
  const handleDelete = async (roomId) => {
    if (!window.confirm('Are you sure you want to delete or cancel this room?')) return

    try {
      await deleteAdminRoom(roomId)
      await fetchRoomData()
    } catch (err) {
      console.error('Failed to delete room:', err)
      setRooms((prev) => prev.filter((r) => r.id !== roomId))
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-ink bg-white p-5">
        <h1 className="font-display text-xl font-bold text-ink">Room Management</h1>
        <p className="mt-2 text-sm text-slate">Manage room inventory, capacity, availability, and facilities for your workspace.</p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-3 md:grid-cols-4">
        <Card>
          <p className="font-mono text-[11px] uppercase tracking-wider text-slate">Total Rooms</p>
          <p className="mt-2 text-3xl font-bold text-ink">{dashboardStats.totalRooms || rooms.length}</p>
          <p className="mt-1 text-sm text-slate">All rooms in the system</p>
        </Card>
        <Card>
          <p className="font-mono text-[11px] uppercase tracking-wider text-slate">Available</p>
          <p className="mt-2 text-3xl font-bold text-[#658362]">{dashboardStats.availableRooms || statusCounts.Available}</p>
          <p className="mt-1 text-sm text-slate">Rooms ready to reserve</p>
        </Card>
        <Card>
          <p className="font-mono text-[11px] uppercase tracking-wider text-slate">Booked</p>
          <p className="mt-2 text-3xl font-bold text-[#B85450]">{dashboardStats.bookedRooms || statusCounts.Booked}</p>
          <p className="mt-1 text-sm text-slate">Rooms currently reserved</p>
        </Card>
        <Card>
          <p className="font-mono text-[11px] uppercase tracking-wider text-slate">Maintenance</p>
          <p className="mt-2 text-3xl font-bold text-[#E09F3E]">{statusCounts.Maintenance}</p>
          <p className="mt-1 text-sm text-slate">Rooms under maintenance</p>
        </Card>
      </div>

      {/* Control Bar */}
      <Card className="hover:shadow-none hover:-translate-y-0">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <h2 className="font-display text-sm font-bold text-ink">Room Inventory</h2>
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
              <option>Maintenance</option>
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

      {/* Main Table */}
      <Card className="overflow-x-auto">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead>
            <tr className="border-b border-line font-mono text-[11px] font-extrabold uppercase tracking-wider text-black">
              <th className="px-4 py-3">Room</th>
              <th className="px-4 py-3">Code</th>
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
                <td colSpan={8} className="px-4 py-8 text-center text-slate">Loading room inventory...</td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-red-600">{error}</td>
              </tr>
            ) : filteredRooms.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-6 text-center text-slate">No rooms match your filters.</td>
              </tr>
            ) : (
              filteredRooms.map((room) => (
                <tr key={room.id} className="transition-colors duration-200 hover:bg-portal-bg/70">
                  <td className="px-4 py-3.5 font-semibold text-ink">{room.name}</td>
                  <td className="px-4 py-3.5 font-mono text-xs text-slate">{room.code}</td>
                  <td className="px-4 py-3.5 text-slate">{room.module}</td>
                  <td className="px-4 py-3.5 text-slate">{room.type}</td>
                  <td className="px-4 py-3.5 text-slate">{room.capacity}</td>
                  <td className="px-4 py-3.5 text-slate">
                    {(room.facilities || []).length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {room.facilities.map((fac, idx) => (
                          <span key={idx} className="rounded bg-slate/10 px-1.5 py-0.5 text-xs text-ink font-medium">
                            {fac}
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
                        onClick={() => openViewModal(room)}
                        className="text-sky-600 hover:text-sky-800 font-bold text-sm hover:underline"
                      >
                        View
                      </button>
                      <button
                        onClick={() => openEditModal(room)}
                        className="text-emerald-600 hover:text-emerald-800 font-bold text-sm hover:underline"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(room.id)}
                        className="text-red-600 hover:text-red-800 font-bold text-sm hover:underline"
                      >
                        Cancel
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </Card>

      {/* Dynamic Responsive Modal */}
      <Modal
        open={modalOpen}
        onClose={closeModal}
        className={`w-full transition-all duration-300 ${
          modalMode === 'add' && addStep === 2 ? 'max-w-6xl' : 'max-w-3xl'
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
            <Button variant="secondary" onClick={closeModal} disabled={submitting}>Cancel</Button>
            {modalMode === 'add' && addStep === 1 && (
              <Button onClick={handleNextToAddRooms}>Next</Button>
            )}
            {modalMode === 'add' && addStep === 2 && (
              <>
                <Button variant="secondary" onClick={() => setAddStep(1)} disabled={submitting}>Back</Button>
                <Button onClick={handleSubmit} disabled={submitting}>
                  {submitting ? 'Submitting...' : `Submit (${generatedRooms.length} Rooms)`}
                </Button>
              </>
            )}
            {modalMode === 'edit' && (
              <Button onClick={handleSubmit} disabled={submitting}>
                {submitting ? 'Saving...' : 'Save Changes'}
              </Button>
            )}
          </>
        }
      >
        {/* ADD MODE - STEP 1 */}
        {modalMode === 'add' && addStep === 1 && (
          <div className="space-y-4">
            <p className="text-xs text-slate">Specify room configurations and quantities to auto-generate rooms.</p>
            <div className="border border-line rounded-2xl overflow-hidden bg-white shadow-sm">
              <table className="w-full text-left text-sm">
                <thead className="bg-[#f8f9fa] text-[11px] font-bold uppercase tracking-wider text-slate border-b border-line">
                  <tr>
                    <th className="p-3.5 w-[25%]">Room Type</th>
                    <th className="p-3.5 w-[15%]">Count</th>
                    <th className="p-3.5 w-[15%]">Capacity</th>
                    <th className="p-3.5 w-[33%]">Facilities</th>
                    <th className="p-3.5 w-[12%] text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {typeConfigs.map((config, index) => (
                    <tr key={index} className="transition-colors hover:bg-portal-bg/50">
                      <td className="p-3 align-top">
                        <input
                          type="text"
                          value={config.type}
                          onChange={(e) => handleTypeConfigChange(index, 'type', e.target.value)}
                          placeholder="e.g. Discussion"
                          className="w-full rounded-xl border border-line bg-white px-3 py-2 text-sm text-ink outline-none focus:border-portal-accent transition-colors"
                        />
                      </td>
                      <td className="p-3 align-top">
                        <input
                          type="number"
                          min="1"
                          value={config.count}
                          onChange={(e) => handleTypeConfigChange(index, 'count', e.target.value)}
                          className="w-full rounded-xl border border-line bg-white px-3 py-2 text-sm text-ink outline-none focus:border-portal-accent transition-colors"
                        />
                      </td>
                      <td className="p-3 align-top">
                        <input
                          type="number"
                          min="1"
                          value={config.capacity}
                          onChange={(e) => handleTypeConfigChange(index, 'capacity', e.target.value)}
                          className="w-full rounded-xl border border-line bg-white px-3 py-2 text-sm text-ink outline-none focus:border-portal-accent transition-colors"
                        />
                      </td>
                      <td className="p-3 align-top">
                        <div className="space-y-2.5">
                          <div className="flex flex-wrap items-center gap-2">
                            {config.facilities.map((facility, fIndex) => (
                              <div
                                key={fIndex}
                                className="flex items-center gap-1.5 rounded-full border border-line bg-portal-bg px-3 py-1 text-xs text-ink transition-all focus-within:border-portal-accent"
                              >
                                <input
                                  type="text"
                                  value={facility}
                                  onChange={(e) => handleFacilityConfigChange(index, fIndex, e.target.value)}
                                  placeholder="Facility"
                                  className="w-16 bg-transparent text-xs outline-none text-ink font-medium"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleRemoveFacilityFromConfig(index, fIndex)}
                                  className="text-[#be534d] hover:opacity-70 text-sm font-bold leading-none px-0.5"
                                >
                                  ×
                                </button>
                              </div>
                            ))}
                          </div>
                          <button
                            type="button"
                            onClick={() => handleAddFacilityToConfig(index)}
                            className="inline-flex items-center rounded-xl border border-line bg-white px-3 py-1.5 text-xs font-medium text-ink hover:bg-portal-bg transition-colors"
                          >
                            + Add Facility
                          </button>
                        </div>
                      </td>
                      <td className="p-3 align-top text-center">
                        {typeConfigs.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveTypeConfig(index)}
                            className="text-[#be534d] hover:underline text-xs font-sans pt-2"
                          >
                            Remove
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <Button type="button" variant="secondary" onClick={handleAddTypeConfig} className="rounded-xl border-line">
              + Add Another Room Type Configuration
            </Button>
          </div>
        )}

        {/* ADD MODE - STEP 2 */}
        {modalMode === 'add' && addStep === 2 && (
          <div className="space-y-4">
            <p className="text-xs text-slate">Review and edit the generated room numbers, modules, and statuses before submitting.</p>
            <div className="max-h-[60vh] overflow-y-auto border border-line rounded-2xl bg-white shadow-sm">
              <table className="w-full text-left text-sm table-fixed">
                <thead className="bg-[#f8f9fa] text-[11px] font-bold uppercase tracking-wider text-slate border-b border-line sticky top-0 z-10">
                  <tr>
                    <th className="p-3.5 w-[18%]">Room Type</th>
                    <th className="p-3.5 w-[28%]">Room Name</th>
                    <th className="p-3.5 w-[20%]">Room Number</th>
                    <th className="p-3.5 w-[18%]">Module</th>
                    <th className="p-3.5 w-[16%]">Status</th>
                    <th className="p-3.5 w-16 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {generatedRooms.map((room, index) => (
                    <tr key={room.tempId} className="transition-colors hover:bg-portal-bg/50">
                      <td className="p-3 font-medium text-slate text-xs truncate">{room.type}</td>
                      <td className="p-3">
                        <input
                          type="text"
                          value={room.name}
                          onChange={(e) => handleGeneratedRoomChange(index, 'name', e.target.value)}
                          className="w-full rounded-xl border border-line bg-white px-3 py-1.5 text-xs text-ink outline-none focus:border-portal-accent transition-colors"
                        />
                      </td>
                      <td className="p-3">
                        <input
                          type="text"
                          value={room.code}
                          onChange={(e) => handleGeneratedRoomChange(index, 'code', e.target.value)}
                          className="w-full rounded-xl border border-line bg-white px-3 py-1.5 text-xs text-ink outline-none focus:border-portal-accent transition-colors"
                        />
                      </td>
                      <td className="p-3">
                        <input
                          type="text"
                          value={room.module}
                          onChange={(e) => handleGeneratedRoomChange(index, 'module', e.target.value)}
                          className="w-full rounded-xl border border-line bg-white px-3 py-1.5 text-xs text-ink outline-none focus:border-portal-accent transition-colors"
                        />
                      </td>
                      <td className="p-3">
                        <select
                          value={room.status}
                          onChange={(e) => handleGeneratedRoomChange(index, 'status', e.target.value)}
                          className="w-full rounded-xl border border-line bg-white px-2 py-1.5 text-xs text-ink outline-none focus:border-portal-accent transition-colors"
                        >
                          <option>Available</option>
                          <option>Booked</option>
                          <option>Maintenance</option>
                        </select>
                      </td>
                      <td className="p-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveGeneratedRoom(index)}
                          className="text-[#be534d] hover:underline text-xs font-serif"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* EDIT / VIEW MODES */}
        {modalMode !== 'add' && (
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-1">
                <span className="text-xs uppercase tracking-[0.2em] text-slate">Room Name</span>
                <input
                  name="name"
                  value={formData.name}
                  onChange={handleSingleFieldChange}
                  disabled={modalMode === 'view'}
                  className="w-full rounded-xl border border-line bg-portal-bg px-3 py-2 text-sm text-ink outline-none disabled:cursor-not-allowed"
                />
              </label>
              <label className="space-y-1">
                <span className="text-xs uppercase tracking-[0.2em] text-slate">Room Code</span>
                <input
                  name="code"
                  value={formData.code}
                  onChange={handleSingleFieldChange}
                  disabled={modalMode === 'view'}
                  className="w-full rounded-xl border border-line bg-portal-bg px-3 py-2 text-sm text-ink outline-none disabled:cursor-not-allowed"
                />
              </label>
              <label className="space-y-1">
                <span className="text-xs uppercase tracking-[0.2em] text-slate">Module</span>
                <input
                  name="module"
                  value={formData.module}
                  onChange={handleSingleFieldChange}
                  disabled={modalMode === 'view'}
                  className="w-full rounded-xl border border-line bg-portal-bg px-3 py-2 text-sm text-ink outline-none disabled:cursor-not-allowed"
                />
              </label>
              <label className="space-y-1">
                <span className="text-xs uppercase tracking-[0.2em] text-slate">Type</span>
                <input
                  name="type"
                  value={formData.type}
                  onChange={handleSingleFieldChange}
                  disabled={modalMode === 'view'}
                  className="w-full rounded-xl border border-line bg-portal-bg px-3 py-2 text-sm text-ink outline-none disabled:cursor-not-allowed"
                />
              </label>
              <label className="space-y-1">
                <span className="text-xs uppercase tracking-[0.2em] text-slate">Capacity</span>
                <input
                  name="capacity"
                  type="number"
                  min="1"
                  value={formData.capacity}
                  onChange={handleSingleFieldChange}
                  disabled={modalMode === 'view'}
                  className="w-full rounded-xl border border-line bg-portal-bg px-3 py-2 text-sm text-ink outline-none disabled:cursor-not-allowed"
                />
              </label>
              <label className="space-y-1">
                <span className="text-xs uppercase tracking-[0.2em] text-slate">Status</span>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleSingleFieldChange}
                  disabled={modalMode === 'view'}
                  className="w-full rounded-xl border border-line bg-white px-3 py-2 text-sm text-ink outline-none disabled:cursor-not-allowed"
                >
                  <option>Available</option>
                  <option>Booked</option>
                  <option>Maintenance</option>
                </select>
              </label>
            </div>
          </form>
        )}
      </Modal>
    </div>
  )
}