import { useMemo, useState } from 'react'
import Card from '../../components/common/Card'
import Button from '../../components/common/Button'
import Modal from '../../components/common/Modal'
import { rooms as ROOMS } from '../../services/mockData'

// Equal-width Status Badge Component (Maintenance set to yellow)
function CustomStatusTag({ status }) {
  const normalized = status?.toUpperCase()

  let bgClass = 'bg-[#5c7a60] text-white' // Green (Available / Confirmed)

  if (normalized === 'PENDING' || normalized === 'MAINTENANCE') {
    bgClass = 'bg-[#e5a038] text-white' // Yellow/Orange
  } else if (
    normalized === 'BOOKED' ||
    normalized === 'CANCELLED'
  ) {
    bgClass = 'bg-[#be534d] text-white' // Red/Terracotta
  }

  return (
    <span
      className={`inline-flex items-center justify-center min-w-[110px] rounded-full px-3 py-1 text-[11px] font-semibold tracking-wider text-center ${bgClass}`}
    >
      {normalized}
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
    .map((room) => Number(room.name.match(/(\d+)$/)?.[1]))
    .filter((value) => Number.isFinite(value))

  const startNumber = existingNumbers.length > 0 ? Math.max(...existingNumbers) + 1 : 1
  return `${baseName} ${startNumber + generatedOffset}`
}

function getSuggestedCode(moduleName, type, existingRooms, generatedOffset = 0) {
  const moduleNumber = moduleName.match(/\d+/)?.[0] || '1'
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
  const [rooms, setRooms] = useState(() => ROOMS.map((room) => ({ ...room, facilities: room.facilities ?? [] })))
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [moduleFilter, setModuleFilter] = useState('All')
  
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

  const handleSubmit = (e) => {
    if (e) e.preventDefault()

    if (modalMode === 'add') {
      const finalRoomsToAdd = generatedRooms.map((room) => ({
        id: `room-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        name: room.name,
        code: room.code,
        module: room.module || 'Module 1',
        type: room.type,
        capacity: Number(room.capacity) || 4,
        status: room.status || 'Available',
        facilities: room.facilities || [],
      }))

      setRooms((prev) => [...prev, ...finalRoomsToAdd])
    } else if (modalMode === 'edit') {
      const nextRoom = {
        ...formData,
        capacity: Number(formData.capacity) || 4,
        facilities: (formData.facilities || []).map((f) => f.trim()).filter(Boolean),
      }
      setRooms((prev) => prev.map((room) => (room.id === selectedRoomId ? nextRoom : room)))
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

      <div className="grid gap-3 md:grid-cols-4">
        <Card>
          <p className="font-mono text-[11px] uppercase tracking-wider text-slate">Total Rooms</p>
          <p className="mt-2 text-3xl font-700 text-ink">{rooms.length}</p>
          <p className="mt-1 text-sm text-slate">All rooms in the system</p>
        </Card>
        <Card>
          <p className="font-mono text-[11px] uppercase tracking-wider text-slate">Available</p>
          <p className="mt-2 text-3xl font-700 text-[#5c7a60]">{statusCounts.Available}</p>
          <p className="mt-1 text-sm text-slate">Rooms ready to reserve</p>
        </Card>
        <Card>
          <p className="font-mono text-[11px] uppercase tracking-wider text-slate">Booked</p>
          <p className="mt-2 text-3xl font-700 text-[#be534d]">{statusCounts.Booked}</p>
          <p className="mt-1 text-sm text-slate">Rooms currently reserved</p>
        </Card>
        <Card>
          <p className="font-mono text-[11px] uppercase tracking-wider text-slate">Maintenance</p>
          <p className="mt-2 text-3xl font-700 text-[#e5a038]">{statusCounts.Maintenance}</p>
          <p className="mt-1 text-sm text-slate">Rooms under maintenance</p>
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
            <tr className="border-b border-line text-[11px] font-bold uppercase tracking-wider text-slate">
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
          <tbody className="divide-y divide-line">
            {filteredRooms.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-6 text-center text-slate">No rooms match your filters.</td>
              </tr>
            ) : (
              filteredRooms.map((room) => (
                <tr key={room.id} className="transition-colors duration-200 hover:bg-portal-bg/70">
                  <td className="px-4 py-3.5 font-medium text-ink">{room.name}</td>
                  <td className="px-4 py-3.5 text-slate">{room.code}</td>
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
                  <td className="px-4 py-3.5">
                    <CustomStatusTag status={room.status} />
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-3 font-serif text-sm">
                      <button
                        onClick={() => openViewModal(room)}
                        className="text-ink hover:underline"
                      >
                        View
                      </button>
                      <button
                        onClick={() => openEditModal(room)}
                        className="text-ink hover:underline"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(room.id)}
                        className="text-[#be534d] hover:underline"
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
            <Button variant="secondary" onClick={closeModal}>Cancel</Button>
            {modalMode === 'add' && addStep === 1 && (
              <Button onClick={handleNextToAddRooms}>Next</Button>
            )}
            {modalMode === 'add' && addStep === 2 && (
              <>
                <Button variant="secondary" onClick={() => setAddStep(1)}>Back</Button>
                <Button onClick={handleSubmit}>Submit ({generatedRooms.length} Rooms)</Button>
              </>
            )}
            {modalMode === 'edit' && (
              <Button onClick={handleSubmit}>Save Changes</Button>
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
                            className="text-[#be534d] hover:underline text-xs font-serif pt-2"
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
                <span className="text-xs uppercase tracking-[0.2em] text-slate">Room Number</span>
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