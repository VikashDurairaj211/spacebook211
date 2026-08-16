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
  const normalized =
    String(status || 'Available').toUpperCase()

  let bgClass =
    'bg-[#658362] text-white'

  if (
    normalized === 'PENDING' ||
    normalized === 'MAINTENANCE'
  ) {
    bgClass =
      'bg-[#E09F3E] text-white'
  } else if (
    normalized === 'BOOKED' ||
    normalized === 'CANCELLED' ||
    normalized === 'UNAVAILABLE' ||
    normalized === 'REJECTED'
  ) {
    bgClass =
      'bg-[#B85450] text-white'
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
  const lower =
    String(type || '')
      .toLowerCase()
      .trim()

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

  if (room.roomType?.roomTypeName) {
    return room.roomType.roomTypeName
  }

  if (room.roomType?.RoomTypeName) {
    return room.roomType.RoomTypeName
  }

  if (room.roomTypeName) {
    return room.roomTypeName
  }

  if (room.RoomTypeName) {
    return room.RoomTypeName
  }

  if (room.type) {
    return room.type
  }

  const roomTypeId =
    room.roomTypeId ??
    room.RoomTypeId

  if (
    Number(roomTypeId) ===
    ROOM_TYPE_IDS.discussion
  ) {
    return 'Discussion'
  }

  if (
    Number(roomTypeId) ===
    ROOM_TYPE_IDS.training
  ) {
    return 'Training'
  }

  if (
    Number(roomTypeId) ===
    ROOM_TYPE_IDS.conference
  ) {
    return 'Conference'
  }

  return 'Conference'
}

// =====================================================
// NORMALIZE FACILITIES
//
// Supports:
//
// 1. { facilityId: 1, facilityName: "Projector" }
//
// 2. {
//      facilityId: 1,
//      facility: {
//        facilityId: 1,
//        facilityName: "Projector"
//      }
//    }
//
// 3. {
//      FacilityId: 1,
//      Facility: {
//        Name: "Projector"
//      }
//    }
//
// 4. "Projector"
//
// 5. 1
//
// 6. Uses master facility list when only ID is returned.
// =====================================================

function normalizeFacilities(
  facilities,
  masterFacilities = []
) {
  if (!Array.isArray(facilities)) {
    return []
  }

  return facilities
    .map((item) => {
      // ===============================================
      // STRING
      // ===============================================

      if (typeof item === 'string') {
        const trimmed =
          item.trim()

        // If string is actually a numeric ID,
        // resolve it from master facilities.
        if (
          /^\d+$/.test(trimmed)
        ) {
          const masterFacility =
            masterFacilities.find(
              (facility) =>
                Number(facility.id) ===
                Number(trimmed)
            )

          if (masterFacility) {
            return {
              id: masterFacility.id,
              name: masterFacility.name,
            }
          }
        }

        return {
          id: null,
          name: trimmed,
        }
      }

      // ===============================================
      // NUMBER
      // ===============================================

      if (typeof item === 'number') {
        const masterFacility =
          masterFacilities.find(
            (facility) =>
              Number(facility.id) ===
              Number(item)
          )

        if (masterFacility) {
          return {
            id: masterFacility.id,
            name: masterFacility.name,
          }
        }

        return {
          id: item,
          name: `Facility ${item}`,
        }
      }

      // ===============================================
      // INVALID
      // ===============================================

      if (
        !item ||
        typeof item !== 'object'
      ) {
        return null
      }

      // ===============================================
      // DIRECT FACILITY DATA
      // ===============================================

      let id =
        item.facilityId ??
        item.id ??
        item.FacilityId ??
        item.FacilityID

      let name =
        item.facilityName ??
        item.name ??
        item.Name ??
        item.FacilityName

      // ===============================================
      // NESTED FACILITY
      //
      // {
      //   facilityId: 1,
      //   facility: {...}
      // }
      // ===============================================

      const nestedFacility =
        item.facility ??
        item.Facility ??
        item.facilityDetails ??
        item.FacilityDetails

      if (
        nestedFacility &&
        typeof nestedFacility ===
          'object'
      ) {
        id =
          id ??
          nestedFacility.facilityId ??
          nestedFacility.id ??
          nestedFacility.FacilityId ??
          nestedFacility.FacilityID

        name =
          name ??
          nestedFacility.facilityName ??
          nestedFacility.name ??
          nestedFacility.Name ??
          nestedFacility.FacilityName
      }

      // ===============================================
      // ROOM-FACILITY NESTED OBJECT
      // ===============================================

      const nestedRoomFacility =
        item.roomFacility ??
        item.RoomFacility

      if (
        nestedRoomFacility &&
        typeof nestedRoomFacility ===
          'object'
      ) {
        id =
          id ??
          nestedRoomFacility.facilityId ??
          nestedRoomFacility.FacilityId

        name =
          name ??
          nestedRoomFacility.facilityName ??
          nestedRoomFacility.FacilityName
      }

      // ===============================================
      // RESOLVE NAME FROM MASTER FACILITIES
      // ===============================================

      if (
        id !== undefined &&
        id !== null
      ) {
        const masterFacility =
          masterFacilities.find(
            (facility) =>
              Number(facility.id) ===
              Number(id)
          )

        if (masterFacility) {
          name =
            name ||
            masterFacility.name
        }
      }

      // ===============================================
      // FINAL OBJECT
      // ===============================================

      return {
        id:
          id !== undefined &&
          id !== null
            ? Number(id)
            : null,

        name:
          String(name || '').trim(),
      }
    })
    .filter(
      (facility) =>
        facility &&
        facility.name
    )
}

// =====================================================
// NORMALIZE FACILITY LIST FROM BACKEND
// =====================================================

function normalizeFacilityList(data) {
  let facilities = []

  if (Array.isArray(data)) {
    facilities = data
  } else if (
    Array.isArray(data?.data)
  ) {
    facilities = data.data
  } else if (
    Array.isArray(data?.facilities)
  ) {
    facilities = data.facilities
  } else if (
    Array.isArray(data?.Facilities)
  ) {
    facilities = data.Facilities
  }

  return facilities
    .map((facility) => {
      const id =
        facility?.facilityId ??
        facility?.id ??
        facility?.FacilityId ??
        facility?.FacilityID

      const name =
        facility?.facilityName ??
        facility?.name ??
        facility?.Name ??
        facility?.FacilityName

      return {
        id: Number(id),
        name: String(
          name || ''
        ).trim(),
      }
    })
    .filter(
      (facility) =>
        Number.isInteger(
          facility.id
        ) &&
        facility.id > 0 &&
        facility.name
    )
}

// =====================================================
// GET FACILITY NAMES
// =====================================================

function getFacilityNames(
  facilities
) {
  if (!Array.isArray(facilities)) {
    return []
  }

  return facilities
    .map((facility) => {
      if (
        typeof facility ===
        'string'
      ) {
        return facility
      }

      return (
        facility?.name ||
        facility?.facilityName ||
        ''
      )
    })
    .filter(Boolean)
}

// =====================================================
// GET FACILITY IDS
// =====================================================

function getFacilityIds(
  facilities
) {
  if (!Array.isArray(facilities)) {
    return []
  }

  return facilities
    .map((facility) => {
      if (
        typeof facility ===
        'number'
      ) {
        return facility
      }

      if (
        typeof facility ===
        'string'
      ) {
        const numericId =
          Number(facility)

        return Number.isInteger(
          numericId
        )
          ? numericId
          : null
      }

      if (
        typeof facility ===
        'object'
      ) {
        return Number(
          facility?.id ??
          facility?.facilityId ??
          facility?.FacilityId
        )
      }

      return null
    })
    .filter(
      (id) =>
        Number.isInteger(id) &&
        id > 0
    )
}

// =====================================================
// SUGGESTED ROOM NAME
// =====================================================

function getSuggestedRoomName(
  type,
  existingRooms,
  generatedOffset = 0
) {
  const normalizedType =
    String(
      type || 'Conference'
    )
      .toLowerCase()
      .trim()

  let baseName = 'Room'

  if (
    normalizedType.includes(
      'discussion'
    )
  ) {
    baseName =
      'Discussion Room'
  } else if (
    normalizedType.includes(
      'conference'
    )
  ) {
    baseName =
      'Conference Room'
  } else if (
    normalizedType.includes(
      'training'
    )
  ) {
    baseName =
      'Training Room'
  } else {
    baseName =
      `${type || 'Room'} Room`
  }

  const existingNumbers =
    existingRooms
      .filter((room) => {
        const roomType =
          String(
            room.type || ''
          ).toLowerCase()

        return (
          roomType ===
          normalizedType
        )
      })
      .map((room) => {
        const match =
          String(
            room.name || ''
          ).match(
            /(\d+)$/
          )

        return match
          ? Number(match[1])
          : NaN
      })
      .filter(
        Number.isFinite
      )

  const startNumber =
    existingNumbers.length >
    0
      ? Math.max(
          ...existingNumbers
        ) + 1
      : 1

  return `${baseName} ${
    startNumber +
    generatedOffset
  }`
}

// =====================================================
// SUGGESTED ROOM CODE
// =====================================================

function getSuggestedCode(
  moduleName,
  type,
  existingRooms,
  generatedOffset = 0
) {
  const moduleNumber =
    String(
      moduleName || ''
    ).match(/\d+/)?.[0] ||
    '1'

  const typeCode =
    String(type || 'RM')
      .slice(0, 2)
      .toUpperCase()

  const existingForType =
    existingRooms.filter(
      (room) =>
        room.module ===
          moduleName &&
        String(
          room.type || ''
        ).toLowerCase() ===
          String(
            type || ''
          ).toLowerCase()
    ).length

  return `M${moduleNumber}-${typeCode}${
    existingForType +
    generatedOffset +
    1
  }`
}

// =====================================================
// EMPTY FORM
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
// API HELPERS
// =====================================================

// GET /api/admin/rooms
async function fetchAdminRooms() {
  const response =
    await client.get(
      '/admin/rooms'
    )

  const data =
    response.data

  if (Array.isArray(data)) {
    return data
  }

  if (
    Array.isArray(
      data?.data
    )
  ) {
    return data.data
  }

  if (
    Array.isArray(
      data?.rooms
    )
  ) {
    return data.rooms
  }

  if (
    Array.isArray(
      data?.Rooms
    )
  ) {
    return data.Rooms
  }

  return []
}

// =====================================================
// GET /api/admin/rooms/dashboard
// =====================================================

async function fetchAdminRoomDashboard() {
  const response =
    await client.get(
      '/admin/rooms/dashboard'
    )

  return (
    response.data || {}
  )
}

// =====================================================
// GET /api/admin/facilities
// =====================================================

async function fetchAdminFacilities() {
  const response =
    await client.get(
      '/admin/facilities'
    )

  return normalizeFacilityList(
    response.data
  )
}

// =====================================================
// POST /api/admin/rooms
// =====================================================

async function createAdminRoom(
  room
) {
  const response =
    await client.post(
      '/admin/rooms',
      room
    )

  return response.data
}

// =====================================================
// PUT /api/admin/rooms/{id}
// =====================================================

async function updateAdminRoom(
  roomId,
  room
) {
  const response =
    await client.put(
      `/admin/rooms/${roomId}`,
      room
    )

  return response.data
}

// =====================================================
// DELETE /api/admin/rooms/{id}
// =====================================================

async function deleteAdminRoom(
  roomId
) {
  const response =
    await client.delete(
      `/admin/rooms/${roomId}`
    )

  return response.data
}

// =====================================================
// ROOM MANAGEMENT
// =====================================================

export default function RoomManagement() {
  const [searchParams] = useSearchParams()
  // ===================================================
  // ROOM STATE
  // ===================================================

  const [rooms, setRooms] =
    useState([])

  const [loading, setLoading] =
    useState(true)

  const [submitting, setSubmitting] =
    useState(false)

  const [error, setError] =
    useState('')

  const [
    successMessage,
    setSuccessMessage,
  ] = useState('')

  // ===================================================
  // FACILITY STATE
  // ===================================================

  const [
    facilities,
    setFacilities,
  ] = useState([])

  const [
    facilitiesLoading,
    setFacilitiesLoading,
  ] = useState(false)

  // ===================================================
  // FILTER STATE
  // ===================================================

  const [search, setSearch] =
    useState('')

  // ===================================================
  // TOP NAV SEARCH
  // Reads the search value from:
  // /admin/rooms?search=Conference%20Room
  // ===================================================

  useEffect(() => {
    const searchFromUrl =
      searchParams.get('search') || ''

    setSearch(searchFromUrl)
  }, [searchParams])

  const [
    statusFilter,
    setStatusFilter,
  ] = useState('All')

  const [
    moduleFilter,
    setModuleFilter,
  ] = useState('All')

  // ===================================================
  // DASHBOARD STATS
  // ===================================================

  const [
    dashboardStats,
    setDashboardStats,
  ] = useState({
    totalRooms: 0,
    availableRooms: 0,
    bookedRooms: 0,
  })

  // ===================================================
  // MODAL STATE
  // ===================================================

  const [
    modalOpen,
    setModalOpen,
  ] = useState(false)

  const [
    modalMode,
    setModalMode,
  ] = useState('add')

  const [
    addStep,
    setAddStep,
  ] = useState(1)

  const [
    selectedRoomId,
    setSelectedRoomId,
  ] = useState(null)

  // ===================================================
  // SINGLE ROOM FORM
  // ===================================================

  const [
    formData,
    setFormData,
  ] = useState(
    getEmptyFormData()
  )

  // ===================================================
  // ADD ROOM WIZARD
  // ===================================================

  const [
    typeConfigs,
    setTypeConfigs,
  ] = useState([
    {
      type: 'Discussion',
      count: 1,
      capacity: 4,
      facilities: [],
    },
  ])

  const [
    generatedRooms,
    setGeneratedRooms,
  ] = useState([])

  // ===================================================
  // FETCH FACILITIES
  // ===================================================

  const fetchFacilityData =
    async () => {
      try {
        setFacilitiesLoading(
          true
        )

        const facilityData =
          await fetchAdminFacilities()

        console.log(
          'Admin facilities:',
          facilityData
        )

        setFacilities(
          facilityData
        )

        // IMPORTANT:
        // Return the data so the initial room
        // fetch can use the latest facility list.
        return facilityData
      } catch (err) {
        console.error(
          'Failed to load facilities:',
          err
        )

        console.error(
          'Facility response:',
          err.response?.data
        )

        setFacilities([])

        setError(
          err.response?.data
            ?.message ||
            err.response?.data
              ?.title ||
            'Unable to load facilities.'
        )

        return []
      } finally {
        setFacilitiesLoading(
          false
        )
      }
    }

  // ===================================================
  // FETCH ROOM DATA
  //
  // facilityMasterList is passed explicitly so we
  // don't depend on React state being updated already.
  // ===================================================

  const fetchRoomData =
    async (
      facilityMasterList = facilities
    ) => {
      try {
        setLoading(true)
        setError('')

        const [
          statsResponse,
          roomsResponse,
        ] =
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

        // =============================================
        // DASHBOARD STATISTICS
        // =============================================

        setDashboardStats({
          totalRooms:
            statsResponse?.totalRooms ??
            statsResponse?.total ??
            statsResponse?.TotalRooms ??
            0,

          availableRooms:
            statsResponse?.availableRooms ??
            statsResponse?.available ??
            statsResponse?.AvailableRooms ??
            0,

          bookedRooms:
            statsResponse?.bookedRooms ??
            statsResponse?.booked ??
            statsResponse?.BookedRooms ??
            0,
        })

        // =============================================
        // NORMALIZE ROOMS
        // =============================================

        const mappedRooms =
          roomsResponse.map(
            (room) => {
              // -----------------------------------------
              // GET ALL POSSIBLE FACILITY DATA
              // -----------------------------------------

              const rawFacilities =
                room.facilities ??
                room.Facilities ??
                room.roomFacilities ??
                room.RoomFacilities

              let roomFacilities =
                normalizeFacilities(
                  rawFacilities,
                  facilityMasterList
                )

              // -----------------------------------------
              // IF BACKEND RETURNS ONLY FACILITY IDS
              // -----------------------------------------

              const rawFacilityIds =
                room.facilityIds ??
                room.FacilityIds

              if (
                roomFacilities.length ===
                  0 &&
                Array.isArray(
                  rawFacilityIds
                )
              ) {
                roomFacilities =
                  rawFacilityIds
                    .map(
                      (id) => {
                        const facility =
                          facilityMasterList.find(
                            (
                              item
                            ) =>
                              Number(
                                item.id
                              ) ===
                              Number(
                                id
                              )
                          )

                        return facility
                          ? {
                              id:
                                facility.id,
                              name:
                                facility.name,
                            }
                          : null
                      }
                    )
                    .filter(
                      Boolean
                    )
              }

              console.log(
                `Room "${room.roomName ?? room.name ?? room.RoomName}" facilities:`,
                {
                  rawFacilities,
                  rawFacilityIds,
                  normalized:
                    roomFacilities,
                }
              )

              // -----------------------------------------
              // ROOM ID
              // -----------------------------------------

              const roomId =
                room.roomId ??
                room.id ??
                room.RoomId

              // -----------------------------------------
              // ROOM TYPE
              // -----------------------------------------

              const roomType =
                getRoomTypeName(
                  room
                )

              // -----------------------------------------
              // RETURN NORMALIZED ROOM
              // -----------------------------------------

              return {
                id: roomId,

                name:
                  room.roomName ??
                  room.name ??
                  room.RoomName ??
                  'Unnamed Room',

                code:
                  room.code ??
                  room.roomCode ??
                  room.Code ??
                  `RM-${roomId ?? ''}`,

                module:
                  room.module ??
                  room.Module ??
                  'Module 1',

                type:
                  roomType,

                capacity:
                  room.capacity ??
                  room.Capacity ??
                  4,

                status:
                  room.status ??
                  room.Status ??
                  'Available',

                facilities:
                  roomFacilities,

                roomTypeId:
                  room.roomTypeId ??
                  room.RoomTypeId ??
                  getRoomTypeId(
                    roomType
                  ),
              }
            }
          )

        console.log(
          'Mapped rooms:',
          mappedRooms
        )

        setRooms(
          mappedRooms
        )
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

        if (
          err.response?.status ===
          401
        ) {
          setError(
            'Your session has expired. Please login again.'
          )
        } else if (
          err.response?.status ===
          403
        ) {
          setError(
            'You do not have permission to manage rooms.'
          )
        } else {
          setError(
            err.response?.data
              ?.message ||
              err.response?.data
                ?.title ||
              'Unable to fetch live room inventory.'
          )
        }
      } finally {
        setLoading(false)
      }
    }

  // ===================================================
  // INITIAL LOAD
  //
  // IMPORTANT:
  // Facilities are loaded FIRST.
  // Rooms are loaded SECOND.
  // ===================================================

  useEffect(() => {
    const loadInitialData =
      async () => {
        const facilityData =
          await fetchFacilityData()

        await fetchRoomData(
          facilityData
        )
      }

    loadInitialData()
  }, [])

  // ===================================================
  // MODULE OPTIONS
  // ===================================================

  const modules =
    useMemo(() => {
      return [
        'All',
        ...new Set(
          rooms
            .map(
              (room) =>
                room.module
            )
            .filter(Boolean)
        ),
      ]
    }, [rooms])

  // ===================================================
  // FILTER ROOMS
  // ===================================================

  const filteredRooms =
    useMemo(() => {
      const searchValue =
        search
          .toLowerCase()
          .trim()

      return rooms.filter(
        (room) => {
          const facilitiesText =
            getFacilityNames(
              room.facilities
            ).join(' ')

          const searchableText =
            [
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
            searchableText.includes(
              searchValue
            )

          const matchesStatus =
            statusFilter ===
              'All' ||
            String(
              room.status || ''
            ).toLowerCase() ===
              statusFilter.toLowerCase()

          const matchesModule =
            moduleFilter ===
              'All' ||
            room.module ===
              moduleFilter

          return (
            matchesSearch &&
            matchesStatus &&
            matchesModule
          )
        }
      )
    }, [
      rooms,
      search,
      statusFilter,
      moduleFilter,
    ])

  // ===================================================
  // STATUS COUNTS
  // ===================================================

  const statusCounts =
    useMemo(() => {
      return rooms.reduce(
        (acc, room) => {
          const status =
            String(
              room.status ||
                'Available'
            ).toLowerCase()

          if (
            status ===
            'available'
          ) {
            acc.Available +=
              1
          } else if (
            status === 'booked'
          ) {
            acc.Booked += 1
          } else if (
            status ===
            'maintenance'
          ) {
            acc.Maintenance +=
              1
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

  // ===================================================
  // OPEN ADD MODAL
  // ===================================================

  const openAddModal =
    () => {
      setTypeConfigs([
        {
          type: 'Discussion',
          count: 1,
          capacity: 4,
          facilities: [],
        },
      ])

      setGeneratedRooms(
        []
      )

      setAddStep(1)
      setModalMode('add')
      setSelectedRoomId(null)
      setError('')
      setSuccessMessage('')
      setModalOpen(true)

      if (
        facilities.length === 0
      ) {
        fetchFacilityData()
      }
    }

  // ===================================================
  // ADD TYPE CONFIG
  // ===================================================

  const handleAddTypeConfig =
    () => {
      setTypeConfigs(
        (previous) => [
          ...previous,
          {
            type: 'Conference',
            count: 1,
            capacity: 4,
            facilities: [],
          },
        ]
      )
    }

  // ===================================================
  // REMOVE TYPE CONFIG
  // ===================================================

  const handleRemoveTypeConfig =
    (index) => {
      setTypeConfigs(
        (previous) =>
          previous.filter(
            (
              _,
              currentIndex
            ) =>
              currentIndex !==
              index
          )
      )
    }

  // ===================================================
  // TYPE CONFIG CHANGE
  // ===================================================

  const handleTypeConfigChange =
    (
      index,
      field,
      value
    ) => {
      setTypeConfigs(
        (previous) => {
          const updated =
            [...previous]

          updated[index] = {
            ...updated[index],
            [field]: value,
          }

          return updated
        }
      )
    }

  // ===================================================
  // ADD FACILITY DROPDOWN
  // ===================================================

  const handleAddFacilityToConfig =
    (configIndex) => {
      if (
        facilities.length ===
        0
      ) {
        setError(
          'No facilities are available. Please check the Facilities API.'
        )

        return
      }

      setTypeConfigs(
        (previous) => {
          const updated =
            [...previous]

          const currentFacilities =
            updated[
              configIndex
            ].facilities || []

          const selectedIds =
            currentFacilities.map(
              (facility) =>
                Number(
                  facility?.id
                )
            )

          const availableFacility =
            facilities.find(
              (facility) =>
                !selectedIds.includes(
                  Number(
                    facility.id
                  )
                )
            )

          if (
            !availableFacility
          ) {
            return updated
          }

          updated[
            configIndex
          ] = {
            ...updated[
              configIndex
            ],
            facilities: [
              ...currentFacilities,
              {
                id:
                  availableFacility.id,
                name:
                  availableFacility.name,
              },
            ],
          }

          return updated
        }
      )
    }

  // ===================================================
  // FACILITY DROPDOWN CHANGE
  // ===================================================

  const handleFacilityConfigChange =
    (
      configIndex,
      facilityIndex,
      value
    ) => {
      const facilityId =
        Number(value)

      const selectedFacility =
        facilities.find(
          (facility) =>
            Number(
              facility.id
            ) ===
            facilityId
        )

      if (
        !selectedFacility
      ) {
        return
      }

      setTypeConfigs(
        (previous) => {
          const updated =
            [...previous]

          const currentFacilities =
            [
              ...(updated[
                configIndex
              ].facilities || []),
            ]

          const duplicate =
            currentFacilities.some(
              (
                facility,
                currentIndex
              ) =>
                currentIndex !==
                  facilityIndex &&
                Number(
                  facility?.id
                ) ===
                  facilityId
            )

          if (duplicate) {
            return updated
          }

          currentFacilities[
            facilityIndex
          ] = {
            id:
              selectedFacility.id,
            name:
              selectedFacility.name,
          }

          updated[
            configIndex
          ] = {
            ...updated[
              configIndex
            ],
            facilities:
              currentFacilities,
          }

          return updated
        }
      )
    }

  // ===================================================
  // REMOVE FACILITY
  // ===================================================

  const handleRemoveFacilityFromConfig =
    (
      configIndex,
      facilityIndex
    ) => {
      setTypeConfigs(
        (previous) => {
          const updated =
            [...previous]

          updated[
            configIndex
          ] = {
            ...updated[
              configIndex
            ],
            facilities:
              updated[
                configIndex
              ].facilities.filter(
                (
                  _,
                  index
                ) =>
                  index !==
                  facilityIndex
              ),
          }

          return updated
        }
      )
    }

  // ===================================================
  // GENERATE ROOMS
  // ===================================================

  const handleNextToAddRooms =
    () => {
      setError('')

      const newRooms = []

      for (
        let configIndex = 0;
        configIndex <
        typeConfigs.length;
        configIndex++
      ) {
        const config =
          typeConfigs[
            configIndex
          ]

        const roomType =
          String(
            config.type || ''
          ).trim() ||
          'Conference'

        const count =
          Math.max(
            1,
            Number(
              config.count
            ) || 1
          )

        const capacity =
          Math.max(
            1,
            Number(
              config.capacity
            ) || 4
          )

        const selectedFacilities =
          Array.isArray(
            config.facilities
          )
            ? config.facilities
                .filter(
                  (facility) =>
                    facility?.id
                )
                .map(
                  (facility) => ({
                    id: Number(
                      facility.id
                    ),
                    name:
                      facility.name,
                  })
                )
            : []

        for (
          let i = 0;
          i < count;
          i++
        ) {
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
            tempId:
              `temp-${Date.now()}-${configIndex}-${i}-${Math.random()}`,

            name,

            code,

            type:
              roomType,

            capacity,

            module:
              defaultModule,

            status:
              'Available',

            facilities:
              [
                ...selectedFacilities,
              ],
          })
        }
      }

      if (
        newRooms.length ===
        0
      ) {
        setError(
          'Please configure at least one room.'
        )

        return
      }

      setGeneratedRooms(
        newRooms
      )

      setAddStep(2)
    }

  // ===================================================
  // GENERATED ROOM CHANGE
  // ===================================================

  const handleGeneratedRoomChange =
    (
      index,
      field,
      value
    ) => {
      setGeneratedRooms(
        (previous) => {
          const updated =
            [...previous]

          updated[index] = {
            ...updated[index],
            [field]: value,
          }

          return updated
        }
      )
    }

  // ===================================================
  // REMOVE GENERATED ROOM
  // ===================================================

  const handleRemoveGeneratedRoom =
    (index) => {
      setGeneratedRooms(
        (previous) =>
          previous.filter(
            (
              _,
              currentIndex
            ) =>
              currentIndex !==
              index
          )
      )
    }

  // ===================================================
  // OPEN EDIT MODAL
  // ===================================================

  const openEditModal =
    (room) => {
      setFormData({
        name:
          room.name || '',
        code:
          room.code || '',
        module:
          room.module ||
          'Module 1',
        type:
          room.type ||
          'Conference',
        capacity:
          room.capacity || 4,
        status:
          room.status ||
          'Available',
        facilities: [
          ...(room.facilities ||
            []),
        ],
      })

      setModalMode('edit')
      setSelectedRoomId(
        room.id
      )
      setError('')
      setSuccessMessage('')
      setModalOpen(true)

      if (
        facilities.length ===
        0
      ) {
        fetchFacilityData()
      }
    }

  // ===================================================
  // OPEN VIEW MODAL
  // ===================================================

  const openViewModal =
    (room) => {
      setFormData({
        name:
          room.name || '',
        code:
          room.code || '',
        module:
          room.module ||
          'Module 1',
        type:
          room.type ||
          'Conference',
        capacity:
          room.capacity || 4,
        status:
          room.status ||
          'Available',
        facilities: [
          ...(room.facilities ||
            []),
        ],
      })

      setModalMode('view')
      setSelectedRoomId(
        room.id
      )
      setError('')
      setSuccessMessage('')
      setModalOpen(true)
    }

  // ===================================================
  // CLOSE MODAL
  // ===================================================

  const closeModal =
    () => {
      if (submitting) {
        return
      }

      setModalOpen(false)
      setSelectedRoomId(null)
      setAddStep(1)
      setGeneratedRooms(
        []
      )
      setFormData(
        getEmptyFormData()
      )
    }

  // ===================================================
  // EDIT FORM CHANGE
  // ===================================================

  const handleSingleFieldChange =
    (event) => {
      const {
        name,
        value,
      } = event.target

      setFormData(
        (previous) => ({
          ...previous,
          [name]: value,
        })
      )
    }

  // ===================================================
  // EDIT FACILITY DROPDOWN
  // ===================================================

  const handleEditFacilityChange =
    (
      facilityIndex,
      value
    ) => {
      const facilityId =
        Number(value)

      const selectedFacility =
        facilities.find(
          (facility) =>
            Number(
              facility.id
            ) ===
            facilityId
        )

      if (
        !selectedFacility
      ) {
        return
      }

      setFormData(
        (previous) => {
          const currentFacilities =
            [
              ...(previous.facilities ||
                []),
            ]

          const duplicate =
            currentFacilities.some(
              (
                facility,
                currentIndex
              ) =>
                currentIndex !==
                  facilityIndex &&
                Number(
                  facility?.id
                ) ===
                  facilityId
            )

          if (duplicate) {
            return previous
          }

          currentFacilities[
            facilityIndex
          ] = {
            id:
              selectedFacility.id,
            name:
              selectedFacility.name,
          }

          return {
            ...previous,
            facilities:
              currentFacilities,
          }
        }
      )
    }

  // ===================================================
  // ADD FACILITY TO EDIT FORM
  // ===================================================

  const handleAddFacilityToEdit =
    () => {
      if (
        facilities.length ===
        0
      ) {
        setError(
          'No facilities are available.'
        )

        return
      }

      setFormData(
        (previous) => {
          const currentFacilities =
            previous.facilities ||
            []

          const selectedIds =
            currentFacilities.map(
              (facility) =>
                Number(
                  facility?.id
                )
            )

          const availableFacility =
            facilities.find(
              (facility) =>
                !selectedIds.includes(
                  Number(
                    facility.id
                  )
                )
            )

          if (
            !availableFacility
          ) {
            return previous
          }

          return {
            ...previous,
            facilities: [
              ...currentFacilities,
              {
                id:
                  availableFacility.id,
                name:
                  availableFacility.name,
              },
            ],
          }
        }
      )
    }

  // ===================================================
  // REMOVE FACILITY FROM EDIT
  // ===================================================

  const handleRemoveFacilityFromEdit =
    (facilityIndex) => {
      setFormData(
        (previous) => ({
          ...previous,
          facilities:
            previous.facilities.filter(
              (
                _,
                index
              ) =>
                index !==
                facilityIndex
            ),
        })
      )
    }

  // ===================================================
  // VALIDATE ROOM
  // ===================================================

  const validateRoom =
    (room) => {
      if (
        !String(
          room.name || ''
        ).trim()
      ) {
        return 'Room name is required.'
      }

      if (
        !String(
          room.module || ''
        ).trim()
      ) {
        return 'Module is required.'
      }

      if (
        !Number(
          room.capacity
        ) ||
        Number(
          room.capacity
        ) < 1
      ) {
        return 'Capacity must be at least 1.'
      }

      return null
    }

  // ===================================================
  // CREATE / UPDATE ROOM
  // ===================================================

  const handleSubmit =
    async (event) => {
      if (event) {
        event.preventDefault()
      }

      if (submitting) {
        return
      }

      setSubmitting(true)
      setError('')
      setSuccessMessage('')

      try {
        // =============================================
        // ADD MODE
        // =============================================

        if (
          modalMode === 'add'
        ) {
          if (
            generatedRooms.length ===
            0
          ) {
            throw new Error(
              'Please add at least one room.'
            )
          }

          let createdCount = 0

          for (
            const room of generatedRooms
          ) {
            const validationError =
              validateRoom(
                room
              )

            if (
              validationError
            ) {
              throw new Error(
                validationError
              )
            }

            const facilityIds =
              getFacilityIds(
                room.facilities
              )

            const payload = {
              roomTypeId:
                getRoomTypeId(
                  room.type
                ),

              roomName:
                String(
                  room.name
                ).trim(),

              capacity:
                Number(
                  room.capacity
                ) || 4,

              module:
                String(
                  room.module ||
                    'Module 1'
                ).trim(),

              status:
                room.status ||
                'Available',

              // IMPORTANT:
              // Selected facility IDs are sent
              // to the backend.
              facilityIds:
                facilityIds,
            }

            console.log(
              'Creating room:',
              payload
            )

            await createAdminRoom(
              payload
            )

            createdCount++
          }

          // Reload rooms using the already loaded
          // facility master list.
          await fetchRoomData(
            facilities
          )

          setModalOpen(false)
          setSelectedRoomId(null)
          setGeneratedRooms(
            []
          )
          setAddStep(1)

          setSuccessMessage(
            `${createdCount} room${
              createdCount !==
              1
                ? 's'
                : ''
            } created successfully.`
          )

          return
        }

        // =============================================
        // EDIT MODE
        // =============================================

        if (
          modalMode === 'edit'
        ) {
          if (
            !selectedRoomId
          ) {
            throw new Error(
              'Room ID is missing.'
            )
          }

          const validationError =
            validateRoom({
              name:
                formData.name,
              module:
                formData.module,
              capacity:
                formData.capacity,
            })

          if (
            validationError
          ) {
            throw new Error(
              validationError
            )
          }

          const facilityIds =
            getFacilityIds(
              formData.facilities
            )

          const payload = {
            roomName:
              String(
                formData.name
              ).trim(),

            roomTypeId:
              getRoomTypeId(
                formData.type
              ),

            capacity:
              Number(
                formData.capacity
              ) || 4,

            module:
              String(
                formData.module ||
                  'Module 1'
              ).trim(),

            status:
              formData.status ||
              'Available',

            facilityIds:
              facilityIds,
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

          await fetchRoomData(
            facilities
          )

          setModalOpen(false)
          setSelectedRoomId(null)

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

        if (
          err.response?.status ===
          401
        ) {
          setError(
            'Your session has expired. Please login again.'
          )
        } else if (
          err.response?.status ===
          403
        ) {
          setError(
            'You do not have permission to manage rooms.'
          )
        } else {
          setError(
            err.response?.data
              ?.message ||
              err.response?.data
                ?.title ||
              err.message ||
              'Room operation failed.'
          )
        }
      } finally {
        setSubmitting(false)
      }
    }

  // ===================================================
  // DELETE ROOM
  // ===================================================

  const handleDelete =
    async (roomId) => {
      if (!roomId) {
        setError(
          'Room ID is missing.'
        )

        return
      }

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

        await deleteAdminRoom(
          roomId
        )

        await fetchRoomData(
          facilities
        )

        setSuccessMessage(
          'Room deleted successfully.'
        )
      } catch (err) {
        console.error(
          'Failed to delete room:',
          err
        )

        if (
          err.response?.status ===
          403
        ) {
          setError(
            'You do not have permission to delete this room.'
          )
        } else {
          setError(
            err.response?.data
              ?.message ||
              err.response?.data
                ?.title ||
              'Failed to delete room.'
          )
        }
      }
    }

  // ===================================================
  // UI
  // =====================================================

  return (
    <div className="space-y-6">

      {/* =================================================
          HEADER
      ================================================= */}

      <div className="rounded-2xl border border-ink bg-white p-5">

        <h1 className="font-display text-xl font-bold text-ink">
          Room Management
        </h1>

        <p className="mt-2 text-sm text-slate">
          Manage room inventory, capacity,
          availability, and facilities for
          your workspace.
        </p>

      </div>

      {/* =================================================
          SUCCESS MESSAGE
      ================================================= */}

      {successMessage && (
        <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
          {successMessage}
        </div>
      )}

      {/* =================================================
          ERROR MESSAGE
      ================================================= */}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </div>
      )}

      {/* =================================================
          SUMMARY CARDS
      ================================================= */}

      <div className="grid gap-3 md:grid-cols-4">

        <Card>
          <p className="font-mono text-[11px] uppercase tracking-wider text-slate">
            Total Rooms
          </p>

          <p className="mt-2 text-3xl font-bold text-ink">
            {dashboardStats.totalRooms}
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
            {dashboardStats.availableRooms}
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
            {dashboardStats.bookedRooms}
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
          CONTROL BAR
      ================================================= */}

      <Card className="hover:-translate-y-0 hover:shadow-none">

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
              className="min-w-[96px] shrink-0 justify-center px-3 py-2"
              onClick={
                openAddModal
              }
            >
              Add Room
            </Button>

            <input
              value={search}
              onChange={(
                event
              ) =>
                setSearch(
                  event.target.value
                )
              }
              placeholder="Search rooms, codes, types..."
              className="min-w-[220px] flex-1 rounded-xl border border-line bg-portal-bg px-3 py-2 text-sm text-ink outline-none focus:border-portal-accent"
            />

            <select
              value={
                statusFilter
              }
              onChange={(
                event
              ) =>
                setStatusFilter(
                  event.target.value
                )
              }
              className="min-w-[140px] shrink-0 rounded-xl border border-line bg-white px-3 py-2 text-sm text-ink outline-none"
            >
              <option value="All">
                All
              </option>

              <option value="Available">
                Available
              </option>

              <option value="Booked">
                Booked
              </option>

              <option value="Maintenance">
                Maintenance
              </option>
            </select>

            <select
              value={
                moduleFilter
              }
              onChange={(
                event
              ) =>
                setModuleFilter(
                  event.target.value
                )
              }
              className="min-w-[140px] shrink-0 rounded-xl border border-line bg-white px-3 py-2 text-sm text-ink outline-none"
            >
              {modules.map(
                (module) => (
                  <option
                    key={
                      module
                    }
                    value={
                      module
                    }
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
          ROOM TABLE
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
            ) : error &&
              rooms.length ===
                0 ? (
              <tr>
                <td
                  colSpan={8}
                  className="px-4 py-8 text-center text-red-600"
                >
                  {error}
                </td>
              </tr>
            ) : filteredRooms.length ===
              0 ? (
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
                    key={
                      room.id
                    }
                    className="transition-colors duration-200 hover:bg-portal-bg/70"
                  >

                    <td className="px-4 py-3.5 font-semibold text-ink">
                      {
                        room.name
                      }
                    </td>

                    <td className="px-4 py-3.5 font-mono text-xs text-slate">
                      {
                        room.code
                      }
                    </td>

                    <td className="px-4 py-3.5 text-slate">
                      {
                        room.module
                      }
                    </td>

                    <td className="px-4 py-3.5 text-slate">
                      {
                        room.type
                      }
                    </td>

                    <td className="px-4 py-3.5 text-slate">
                      {
                        room.capacity
                      }
                    </td>

                    <td className="px-4 py-3.5 text-slate">

                      {room.facilities?.length >
                      0 ? (
                        <div className="flex flex-wrap gap-1">

                          {room.facilities.map(
                            (
                              facility,
                              index
                            ) => (
                              <span
                                key={
                                  facility.id ??
                                  index
                                }
                                className="rounded bg-slate/10 px-1.5 py-0.5 text-xs font-medium text-ink"
                              >
                                {
                                  facility.name
                                }
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
                          type="button"
                          onClick={() =>
                            openViewModal(
                              room
                            )
                          }
                          className="text-sm font-bold text-sky-600 hover:text-sky-800 hover:underline"
                        >
                          View
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            openEditModal(
                              room
                            )
                          }
                          className="text-sm font-bold text-emerald-600 hover:text-emerald-800 hover:underline"
                        >
                          Edit
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            handleDelete(
                              room.id
                            )
                          }
                          className="text-sm font-bold text-red-600 hover:text-red-800 hover:underline"
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
          MODAL
      ================================================= */}

      <Modal
        open={
          modalOpen
        }
        onClose={
          closeModal
        }
        className={`w-full transition-all duration-300 ${
          modalMode ===
            'add' &&
          addStep ===
            2
            ? 'max-w-6xl'
            : 'max-w-3xl'
        }`}
        title={
          modalMode ===
          'add'
            ? addStep ===
              1
              ? 'Add Rooms - Step 1: Define Room Types & Quantities'
              : 'Add Rooms - Step 2: Configure Individual Rooms'
            : modalMode ===
                'edit'
              ? 'Edit Room'
              : 'Room Details'
        }
        footer={
          <>
            <Button
              variant="secondary"
              onClick={
                closeModal
              }
              disabled={
                submitting
              }
            >
              Cancel
            </Button>

            {modalMode ===
              'add' &&
              addStep ===
                1 && (
                <Button
                  onClick={
                    handleNextToAddRooms
                  }
                >
                  Next
                </Button>
              )}

            {modalMode ===
              'add' &&
              addStep ===
                2 && (
                <>
                  <Button
                    variant="secondary"
                    onClick={() =>
                      setAddStep(
                        1
                      )
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

            {modalMode ===
              'edit' && (
              <Button
                onClick={
                  handleSubmit
                }
                disabled={
                  submitting
                }
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

        {modalMode ===
          'add' &&
          addStep ===
            1 && (
            <div className="space-y-4">

              <p className="text-xs text-slate">
                Specify room configurations
                and quantities to generate
                rooms.
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
                          key={
                            index
                          }
                          className="transition-colors hover:bg-portal-bg/50"
                        >

                          {/* ROOM TYPE */}

                          <td className="p-3 align-top">

                            <select
                              value={
                                config.type
                              }
                              onChange={(
                                event
                              ) =>
                                handleTypeConfigChange(
                                  index,
                                  'type',
                                  event
                                    .target
                                    .value
                                )
                              }
                              className="w-full rounded-xl border border-line bg-white px-3 py-2 text-sm text-ink outline-none focus:border-portal-accent"
                            >

                              <option value="Discussion">
                                Discussion
                              </option>

                              <option value="Conference">
                                Conference
                              </option>

                              <option value="Training">
                                Training
                              </option>

                            </select>

                          </td>

                          {/* COUNT */}

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
                                  event
                                    .target
                                    .value
                                )
                              }
                              className="w-full rounded-xl border border-line bg-white px-3 py-2 text-sm text-ink outline-none focus:border-portal-accent"
                            />

                          </td>

                          {/* CAPACITY */}

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
                                  event
                                    .target
                                    .value
                                )
                              }
                              className="w-full rounded-xl border border-line bg-white px-3 py-2 text-sm text-ink outline-none focus:border-portal-accent"
                            />

                          </td>

                          {/* FACILITIES */}

                          <td className="p-3 align-top">

                            <div className="space-y-2.5">

                              {facilitiesLoading ? (
                                <p className="text-xs text-slate">
                                  Loading facilities...
                                </p>
                              ) : (
                                <>
                                  {config.facilities.map(
                                    (
                                      facility,
                                      facilityIndex
                                    ) => (
                                      <div
                                        key={`${index}-${facilityIndex}`}
                                        className="flex items-center gap-2"
                                      >

                                        <select
                                          value={
                                            facility?.id ??
                                            ''
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
                                          className="min-w-0 flex-1 rounded-xl border border-line bg-white px-3 py-2 text-xs text-ink outline-none focus:border-portal-accent"
                                        >

                                          <option value="">
                                            Select Facility
                                          </option>

                                          {facilities.map(
                                            (
                                              option
                                            ) => (
                                              <option
                                                key={
                                                  option.id
                                                }
                                                value={
                                                  option.id
                                                }
                                              >
                                                {
                                                  option.name
                                                }
                                              </option>
                                            )
                                          )}

                                        </select>

                                        <button
                                          type="button"
                                          onClick={() =>
                                            handleRemoveFacilityFromConfig(
                                              index,
                                              facilityIndex
                                            )
                                          }
                                          className="shrink-0 text-lg font-bold leading-none text-[#be534d] hover:opacity-70"
                                        >
                                          ×
                                        </button>

                                      </div>
                                    )
                                  )}

                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleAddFacilityToConfig(
                                        index
                                      )
                                    }
                                    disabled={
                                      facilities.length ===
                                      config.facilities.length
                                    }
                                    className="inline-flex items-center rounded-xl border border-line bg-white px-3 py-1.5 text-xs font-medium text-ink hover:bg-portal-bg disabled:cursor-not-allowed disabled:opacity-50"
                                  >
                                    + Add Facility
                                  </button>
                                </>
                              )}

                            </div>

                          </td>

                          {/* ACTION */}

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
                                className="pt-2 text-xs text-[#be534d] hover:underline"
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

        {modalMode ===
          'add' &&
          addStep ===
            2 && (
            <div className="space-y-4">

              <p className="text-xs text-slate">
                Review and edit the generated
                rooms before submitting them
                to the database.
              </p>

              <div className="max-h-[60vh] overflow-y-auto rounded-2xl border border-line bg-white shadow-sm">

                <table className="w-full table-fixed text-left text-sm">

                  <thead className="sticky top-0 z-10 border-b border-line bg-[#f8f9fa] text-[11px] font-bold uppercase tracking-wider text-slate">

                    <tr>

                      <th className="w-[16%] p-3.5">
                        Room Type
                      </th>

                      <th className="w-[23%] p-3.5">
                        Room Name
                      </th>

                      <th className="w-[18%] p-3.5">
                        Room Code
                      </th>

                      <th className="w-[15%] p-3.5">
                        Module
                      </th>

                      <th className="w-[13%] p-3.5">
                        Status
                      </th>

                      <th className="w-[15%] p-3.5">
                        Facilities
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
                            {
                              room.type
                            }
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
                                  event
                                    .target
                                    .value
                                )
                              }
                              className="w-full rounded-xl border border-line bg-white px-3 py-1.5 text-xs text-ink outline-none focus:border-portal-accent"
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
                                  event
                                    .target
                                    .value
                                )
                              }
                              className="w-full rounded-xl border border-line bg-white px-3 py-1.5 text-xs text-ink outline-none focus:border-portal-accent"
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
                                  event
                                    .target
                                    .value
                                )
                              }
                              className="w-full rounded-xl border border-line bg-white px-2 py-1.5 text-xs text-ink outline-none focus:border-portal-accent"
                            >

                              <option value="Available">
                                Available
                              </option>

                              <option value="Booked">
                                Booked
                              </option>

                              <option value="Maintenance">
                                Maintenance
                              </option>

                            </select>

                          </td>

                          {/* SHOW SELECTED FACILITIES */}

                          <td className="p-3">

                            <div className="flex flex-wrap gap-1">

                              {room.facilities?.length >
                              0 ? (
                                room.facilities.map(
                                  (
                                    facility,
                                    facilityIndex
                                  ) => (
                                    <span
                                      key={
                                        facility.id ??
                                        facilityIndex
                                      }
                                      className="rounded-full bg-portal-bg px-2 py-1 text-[10px] font-medium text-ink"
                                    >
                                      {
                                        facility.name
                                      }
                                    </span>
                                  )
                                )
                              ) : (
                                <span className="text-xs text-slate">
                                  None
                                </span>
                              )}

                            </div>

                          </td>

                          <td className="p-3 text-center">

                            <button
                              type="button"
                              onClick={() =>
                                handleRemoveGeneratedRoom(
                                  index
                                )
                              }
                              className="text-xs text-[#be534d] hover:underline"
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

        {modalMode !==
          'add' && (
          <form
            className="space-y-4"
            onSubmit={
              handleSubmit
            }
          >

            <div className="grid gap-4 md:grid-cols-2">

              {/* ROOM NAME */}

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

              {/* ROOM CODE */}

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

              {/* MODULE */}

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

              {/* TYPE */}

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

                  <option value="Conference">
                    Conference
                  </option>

                  <option value="Training">
                    Training
                  </option>

                  <option value="Discussion">
                    Discussion
                  </option>

                </select>

              </label>

              {/* CAPACITY */}

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

              {/* STATUS */}

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

                  <option value="Available">
                    Available
                  </option>

                  <option value="Booked">
                    Booked
                  </option>

                  <option value="Maintenance">
                    Maintenance
                  </option>

                </select>

              </label>

            </div>

            {/* =================================================
                FACILITIES
            ================================================= */}

            <div className="rounded-xl border border-line bg-portal-bg p-4">

              <div className="mb-3 flex items-center justify-between">

                <p className="text-xs uppercase tracking-[0.2em] text-slate">
                  Facilities
                </p>

                {modalMode ===
                  'edit' && (
                  <button
                    type="button"
                    onClick={
                      handleAddFacilityToEdit
                    }
                    disabled={
                      facilitiesLoading ||
                      facilities.length ===
                        formData.facilities.length
                    }
                    className="rounded-xl border border-line bg-white px-3 py-1.5 text-xs font-medium text-ink hover:bg-portal-bg disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    + Add Facility
                  </button>
                )}

              </div>

              {facilitiesLoading ? (
                <p className="text-sm text-slate">
                  Loading facilities...
                </p>
              ) : formData.facilities?.length >
                0 ? (
                <div className="space-y-2">

                  {formData.facilities.map(
                    (
                      facility,
                      index
                    ) => (
                      <div
                        key={
                          facility?.id ??
                          index
                        }
                        className="flex items-center gap-2"
                      >

                        {modalMode ===
                        'edit' ? (
                          <>
                            <select
                              value={
                                facility?.id ??
                                ''
                              }
                              onChange={(
                                event
                              ) =>
                                handleEditFacilityChange(
                                  index,
                                  event
                                    .target
                                    .value
                                )
                              }
                              className="flex-1 rounded-xl border border-line bg-white px-3 py-2 text-sm text-ink outline-none focus:border-portal-accent"
                            >

                              <option value="">
                                Select Facility
                              </option>

                              {facilities.map(
                                (
                                  option
                                ) => (
                                  <option
                                    key={
                                      option.id
                                    }
                                    value={
                                      option.id
                                    }
                                  >
                                    {
                                      option.name
                                    }
                                  </option>
                                )
                              )}

                            </select>

                            <button
                              type="button"
                              onClick={() =>
                                handleRemoveFacilityFromEdit(
                                  index
                                )
                              }
                              className="text-lg font-bold text-[#be534d] hover:opacity-70"
                            >
                              ×
                            </button>
                          </>
                        ) : (
                          <span className="rounded-full bg-white px-3 py-1.5 text-xs font-medium text-ink">
                            {
                              facility?.name
                            }
                          </span>
                        )}

                      </div>
                    )
                  )}

                </div>
              ) : (
                <div>

                  <span className="text-sm text-slate">
                    No facilities assigned
                  </span>

                  {modalMode ===
                    'edit' && (
                    <div className="mt-2">

                      <button
                        type="button"
                        onClick={
                          handleAddFacilityToEdit
                        }
                        disabled={
                          facilitiesLoading ||
                          facilities.length ===
                            0
                        }
                        className="rounded-xl border border-line bg-white px-3 py-1.5 text-xs font-medium text-ink hover:bg-portal-bg disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        + Add Facility
                      </button>

                    </div>
                  )}

                </div>
              )}

            </div>

          </form>
        )}

      </Modal>

    </div>
  )
}