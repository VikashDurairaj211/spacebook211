import { useEffect, useMemo, useState, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { createBooking } from '../api/bookings'
import { getRoomAvailability } from '../api/rooms'
import { Field, Input, Select } from '../components/common/Input'
import BusinessDatePicker from '../components/common/BusinessDatePicker'
import { useToast } from '../components/common/ToastProvider'
import Button from '../components/common/Button'
import Card from '../components/common/Card'
import Modal from '../components/common/Modal'

// =====================================================
// HELPER - GET LOCAL DATE
// =====================================================

function getLocalDateStr(dateObj = new Date()) {
  const offset = dateObj.getTimezoneOffset() * 60000

  return new Date(
    dateObj.getTime() - offset
  )
    .toISOString()
    .slice(0, 10)
}

function isWeekendDate(dateStr) {
  if (!dateStr) return false
  const [y, m, d] = dateStr.split('-').map(Number)
  if (!y || !m || !d) return false
  const dt = new Date(y, m - 1, d)
  const day = dt.getDay()
  return day === 0 || day === 6
}

function getNextBusinessDayStr(dateObj = new Date()) {
  const next = new Date(dateObj)
  const day = next.getDay()
  if (day === 6) {
    next.setDate(next.getDate() + 2)
  } else if (day === 0) {
    next.setDate(next.getDate() + 1)
  }
  return getLocalDateStr(next)
}

// =====================================================
// HELPER - GET LOCAL TIME
// =====================================================

function getLocalTimeStr(dateObj = new Date()) {
  const hours = String(
    dateObj.getHours()
  ).padStart(2, '0')

  const minutes = String(
    dateObj.getMinutes()
  ).padStart(2, '0')

  return `${hours}:${minutes}`
}

// =====================================================
// NORMALIZE ROOM DATA
// =====================================================

function normalizeRooms(data) {
  const rooms =
    Array.isArray(data)
      ? data
      : data?.rooms ||
        data?.data ||
        data?.result ||
        []

  return rooms.map((room) => ({
    ...room,

    roomId:
      room.roomId ||
      room.id ||
      room.roomID,

    roomName:
      room.roomName ||
      room.name ||
      room.roomNumber ||
      'Unnamed Room',

    // ===============================================
    // ROOM LOCATION
    //
    // Backend may return the configured location
    // using "module"
    // ===============================================

    location:
      room.location ||
      room.roomLocation ||
      room.locationName ||
      room.module ||
      room.room?.location ||
      '',

    // ===============================================
    // MODULE
    // ===============================================

    module:
      room.module ||
      room.location ||
      room.roomLocation ||
      room.locationName ||
      '',

    // ===============================================
    // CAPACITY
    // ===============================================

    capacity:
      room.capacity ||
      room.roomCapacity ||
      room.maxCapacity ||
      0,

    // ===============================================
    // FACILITIES
    // ===============================================

    facilities:
      room.facilities ||
      room.roomFacilities ||
      [],

    // ===============================================
    // TIME SLOTS & BOOKINGS
    // ===============================================

    timeSlots:
      room.timeSlots ||
      room.slots ||
      room.availabilitySlots ||
      [],

    bookings:
      room.bookings ||
      [],
  }))
}

// =====================================================
// HELPER - CHECK ROOM TIME OVERLAP CONFLICT
// =====================================================

function checkRoomBookingConflict(room, requestedStart, requestedEnd) {
  if (!room || !requestedStart || !requestedEnd) return false

  const reqStart =
    requestedStart.length === 5
      ? `${requestedStart}:00`
      : requestedStart

  const reqEnd =
    requestedEnd.length === 5
      ? `${requestedEnd}:00`
      : requestedEnd

  // 1. Check timeSlots / slots / availabilitySlots
  const rawSlots =
    room.timeSlots ||
    room.slots ||
    room.availabilitySlots ||
    []

  for (const slot of rawSlots) {
    const isBooked =
      slot.isBooked === true ||
      slot.booked === true ||
      String(slot.status || '').toLowerCase() === 'booked' ||
      String(slot.status || '').toLowerCase() === 'pending' ||
      String(slot.status || '').toLowerCase() === 'confirmed'

    if (isBooked) {
      const slotStart =
        slot.start ||
        slot.startTime ||
        slot.fromTime ||
        slot.timeSlot?.start ||
        slot.timeSlot?.startTime

      const slotEnd =
        slot.end ||
        slot.endTime ||
        slot.toTime ||
        slot.timeSlot?.end ||
        slot.timeSlot?.endTime

      if (slotStart && slotEnd) {
        const sStart =
          slotStart.length === 5
            ? `${slotStart}:00`
            : slotStart

        const sEnd =
          slotEnd.length === 5
            ? `${slotEnd}:00`
            : slotEnd

        if (reqStart < sEnd && reqEnd > sStart) {
          return true
        }
      }
    }
  }

  // 2. Check bookings array if present
  const bookings = room.bookings || []
  for (const b of bookings) {
    const status = String(b.status || '').toLowerCase()
    if (status !== 'cancelled' && status !== 'rejected') {
      const bStart = b.startTime || b.start
      const bEnd = b.endTime || b.end
      if (bStart && bEnd) {
        const sStart =
          bStart.length === 5
            ? `${bStart}:00`
            : bStart

        const sEnd =
          bEnd.length === 5
            ? `${bEnd}:00`
            : bEnd

        if (reqStart < sEnd && reqEnd > sStart) {
          return true
        }
      }
    }
  }

  return false
}

// =====================================================
// SCROLLABLE TIME PICKER
// =====================================================

function ScrollableTimePicker({
  label,
  value,
  onChange,
  selectedDate,
  minTime,
  error,
}) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef(null)

  const currentValue = value ? String(value).substring(0, 5) : ''

  const [selectedHour, selectedMinute] = currentValue
    ? currentValue.split(':')
    : ['', '']

  const hoursList = Array.from(
    { length: 13 },
    (_, index) => String(index + 10).padStart(2, '0')
  )

  const minutesList = Array.from(
    { length: 60 },
    (_, index) => String(index).padStart(2, '0')
  )

  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  const todayStr = `${year}-${month}-${day}`

  const isToday = !selectedDate || selectedDate === todayStr
  const isPastDate = Boolean(selectedDate && selectedDate < todayStr)

  const currentHour = now.getHours()
  const currentMinute = now.getMinutes()

  const minimumTimeMinutes = minTime
    ? (() => {
        const [h, m] = minTime.substring(0, 5).split(':').map(Number)
        return Number.isNaN(h) || Number.isNaN(m) ? null : h * 60 + m
      })()
    : null

  function isHourDisabled(hour) {
    const numericHour = Number(hour)
    if (numericHour < 10 || numericHour > 22) return true
    if (isPastDate) return true

    if (isToday) {
      if (numericHour < currentHour) return true
      if (numericHour === currentHour) {
        const hasValidMinute = minutesList.some(
          (minute) => !isMinuteDisabled(hour, minute)
        );
        if (!hasValidMinute) return true
      }
    }

    if (minimumTimeMinutes !== null) {
      const hourMax = numericHour * 60 + 59
      if (hourMax <= minimumTimeMinutes) return true
    }

    return false
  }

  function isMinuteDisabled(hour, minute) {
    const numericHour = Number(hour)
    const numericMinute = Number(minute)
    const selectedMinutes = numericHour * 60 + numericMinute

    if (selectedMinutes < 10 * 60 || selectedMinutes > 22 * 60) return true
    if (isPastDate) return true

    if (isToday) {
      const currentTotal = currentHour * 60 + currentMinute
      if (selectedMinutes <= currentTotal) return true
    }

    if (minimumTimeMinutes !== null) {
      if (selectedMinutes <= minimumTimeMinutes) return true
    }

    return false
  }

  function handleHourClick(hour) {
    if (isHourDisabled(hour)) return

    const minuteToUse = selectedMinute || '00'
    if (isMinuteDisabled(hour, minuteToUse)) {
      const firstAvailableMinute = minutesList.find(
        (minute) => !isMinuteDisabled(hour, minute)
      )
      if (!firstAvailableMinute) return
      onChange(`${hour}:${firstAvailableMinute}`)
      return
    }
    onChange(`${hour}:${minuteToUse}`)
  }

  function handleMinuteClick(minute) {
    let hour = selectedHour
    if (!hour || isHourDisabled(hour)) {
      const firstAvailableHour = hoursList.find((h) => !isHourDisabled(h))
      if (!firstAvailableHour) return
      hour = firstAvailableHour
    }
    if (isMinuteDisabled(hour, minute)) return
    onChange(`${hour}:${minute}`)
  }

  useEffect(() => {
    function handleClickOutside(event) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target)
      ) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () =>
      document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className="relative" ref={containerRef}>
      <Field label={label}>
        <div
          onClick={() => setIsOpen((c) => !c)}
          className={`flex h-10 w-full cursor-pointer items-center justify-between rounded-lg border bg-sky-50/70 hover:bg-sky-100/70 px-3 text-sm shadow-sm transition-colors ${
            error
              ? 'border-red-300 hover:border-red-400 bg-red-50/30'
              : 'border-sky-300/80 hover:border-sky-400'
          }`}
        >
          <span className={value ? 'text-sky-950 font-semibold' : 'text-slate-500'}>
            {value ? String(value).substring(0, 5) : 'Select time'}
          </span>
          <svg
            className={`h-4 w-4 text-sky-700 transition-transform ${
              isOpen ? 'rotate-180' : ''
            }`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </div>
        {error && (
          <p className="mt-1 text-sm font-medium text-red-600">{error}</p>
        )}
      </Field>

      {isOpen && (
        <div className="absolute z-50 mt-1 flex w-full overflow-hidden rounded-xl border border-sky-200 bg-white shadow-xl">
          {/* HOURS */}
          <div className="flex flex-1 flex-col border-r border-slate-100 min-w-0">
            <div className="bg-sky-100 text-sky-900 py-1.5 text-xs font-bold border-b border-sky-200 text-center select-none">
              Hour
            </div>
            <div className="max-h-48 overflow-y-auto p-1.5 space-y-1 text-center [scrollbar-width:thin]">
              {hoursList.map((hour) => {
                const disabled = isHourDisabled(hour)
                const selected = selectedHour === hour
                return (
                  <button
                    key={hour}
                    type="button"
                    disabled={disabled}
                    onClick={() => handleHourClick(hour)}
                    className={`block w-full rounded-md py-1.5 text-xs font-semibold transition-colors text-center ${
                      disabled
                        ? 'cursor-not-allowed bg-slate-50 text-slate-300 opacity-50'
                        : selected
                        ? 'bg-[#2F6FE0] text-white font-bold shadow-sm'
                        : 'text-slate-700 hover:bg-sky-50'
                    }`}
                  >
                    {hour}
                  </button>
                )
              })}
            </div>
          </div>

          {/* MINUTES */}
          <div className="flex flex-1 flex-col min-w-0">
            <div className="bg-sky-100 text-sky-900 py-1.5 text-xs font-bold border-b border-sky-200 text-center select-none">
              Min
            </div>
            <div className="max-h-48 overflow-y-auto p-1.5 space-y-1 text-center [scrollbar-width:thin]">
              {minutesList.map((minute) => {
                const hour = selectedHour || '10'
                const disabled = isMinuteDisabled(hour, minute)
                const selected = selectedMinute === minute
                return (
                  <button
                    key={minute}
                    type="button"
                    disabled={disabled}
                    onClick={() => handleMinuteClick(minute)}
                    className={`block w-full rounded-md py-1.5 text-xs font-semibold transition-colors text-center ${
                      disabled
                        ? 'cursor-not-allowed bg-slate-50 text-slate-300 opacity-50'
                        : selected
                        ? 'bg-[#2F6FE0] text-white font-bold shadow-sm'
                        : 'text-slate-700 hover:bg-sky-50'
                    }`}
                  >
                    {minute}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// =====================================================
// BOOK ROOM
// =====================================================

export default function BookRoom() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const roomIdParam =
    searchParams.get('roomId')

  const todayStr = getLocalDateStr()
  const defaultBusinessDay = getNextBusinessDayStr()

  const prefillDate =
    searchParams.get('date') ||
    defaultBusinessDay

  const prefillStart =
    searchParams.get('startTime') || ''

  const prefillEnd =
    searchParams.get('endTime') || ''

  const prefillAttendees =
    searchParams.get('attendees') || '1'

  // =====================================================
  // STATE
  // =====================================================

  const [availableRooms, setAvailableRooms] =
    useState([])

  const [loadingRooms, setLoadingRooms] =
    useState(false)

  const [currentTime, setCurrentTime] =
    useState(getLocalTimeStr())

  const [form, setForm] = useState({
    title: '',
    module: '',
    roomId: roomIdParam || '',
    date: prefillDate,
    startTime: prefillStart,
    endTime: prefillEnd,
    attendees: prefillAttendees,
  })

  const [errors, setErrors] =
    useState({})

  const [submitting, setSubmitting] =
    useState(false)

  const [confirming, setConfirming] =
    useState(false)

  const toast = useToast()

  // =====================================================
  // KEEP CURRENT TIME UPDATED
  // =====================================================

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(
        getLocalTimeStr()
      )
    }, 30000)

    return () => clearInterval(timer)
  }, [])

  // =====================================================
  // LOAD ROOMS
  // =====================================================

  useEffect(() => {
    let active = true

    setLoadingRooms(true)

    getRoomAvailability(form.date)
      .then((data) => {
        if (!active) return

        // Normalize API response so BookRoom uses
        // the same room structure consistently.
        const mappedRooms =
          normalizeRooms(data)

        setAvailableRooms(
          mappedRooms
        )

        // ===============================================
        // PRESELECT ROOM FROM AVAILABILITY CALENDAR
        // ===============================================

        if (roomIdParam) {
          const matchedRoom =
            mappedRooms.find(
              (r) =>
                String(r.roomId) ===
                String(roomIdParam)
            )

          if (matchedRoom) {
            setForm((f) => ({
              ...f,

              module:
                matchedRoom.module ||
                f.module,

              roomId:
                String(
                  matchedRoom.roomId
                ),
            }))
          }
        }
      })
      .catch((err) => {
        console.error(
          'Failed to load rooms:',
          err
        )
      })
      .finally(() => {
        if (active) {
          setLoadingRooms(false)
        }
      })

    return () => {
      active = false
    }
  }, [form.date, roomIdParam])

  // =====================================================
  // GET UNIQUE MODULES
  // =====================================================

  const modules = useMemo(() => {
    const list =
      availableRooms
        .map((r) => r.module)
        .filter(Boolean)

    return [
      ...new Set(list)
    ]
  }, [availableRooms])

  // =====================================================
  // GET ROOMS IN SELECTED MODULE
  // =====================================================

  const roomsInModule = useMemo(() => {
    if (!form.module) {
      return []
    }

    return availableRooms.filter(
      (r) =>
        r.module === form.module
    )
  }, [
    availableRooms,
    form.module
  ])

  // =====================================================
  // GET SELECTED ROOM DETAILS
  // =====================================================

  const selectedRoomDetails =
    useMemo(() => {
      return availableRooms.find(
        (r) =>
          String(r.roomId) ===
          String(form.roomId)
      )
    }, [
      availableRooms,
      form.roomId
    ])

  // =====================================================
  // UPDATE FORM
  // =====================================================

  function update(key, value) {
    setForm((f) => ({
      ...f,
      [key]: value,
    }))

    if (key === 'date' && isWeekendDate(value)) {
      setErrors((prev) => ({
        ...prev,
        date: 'Room reservations are only permitted on business working days (Monday to Friday). Saturdays and Sundays are unavailable.',
      }))
      return
    }

    setErrors((prev) => ({
      ...prev,
      [key]: '',
    }))
  }

  // =====================================================
  // MODULE CHANGE
  // =====================================================

  function handleModuleChange(module) {
    setForm((f) => ({
      ...f,
      module,
      roomId: '',
    }))

    setErrors((prev) => ({
      ...prev,
      module: '',
      roomId: '',
    }))
  }

  // =====================================================
  // TIME PICKER
  // =====================================================

  const isSelectedDateToday =
    form.date === todayStr

  const minStartTime =
    isSelectedDateToday
      ? currentTime
      : '10:00'

  // =====================================================
  // SUBMIT BOOKING
  // =====================================================

  async function handleSubmit(e) {
    e.preventDefault()

    const newErrors = {}

    // -------------------------------------------------
    // REQUIRED FIELD VALIDATION
    // -------------------------------------------------

    if (!form.title.trim()) {
      newErrors.title =
        'Meeting title is required.'
    }

    if (!form.module) {
      newErrors.module =
        'Module is required.'
    }

    if (!form.roomId) {
      newErrors.roomId =
        'Room is required.'
    }

    if (!form.date) {
      newErrors.date =
        'Date is required.'
    } else if (isWeekendDate(form.date)) {
      newErrors.date =
        'Room reservations are only permitted on business working days (Monday to Friday). Saturdays and Sundays are unavailable.'
    }

    if (!form.startTime) {
      newErrors.startTime =
        'Start time is required.'
    }

    if (!form.endTime) {
      newErrors.endTime =
        'End time is required.'
    }

    if (!form.attendees) {
      newErrors.attendees =
        'Number of attendees is required.'
    }

    if (
      Object.keys(newErrors).length > 0
    ) {
      setErrors(newErrors)
      return
    }

    setErrors({})

    // -------------------------------------------------
    // PAST DATE VALIDATION
    // -------------------------------------------------

    if (form.date < todayStr) {
      setErrors({
        date:
          'Cannot book a date in the past.',
      })

      return
    }

    // -------------------------------------------------
    // ROOM CAPACITY VALIDATION
    // -------------------------------------------------

    if (
      selectedRoomDetails &&
      Number(form.attendees) >
        Number(
          selectedRoomDetails.capacity
        )
    ) {
      setErrors({
        attendees:
          `Number of attendees cannot exceed the room capacity of ${selectedRoomDetails.capacity}.`,
      })

      return
    }

    // -------------------------------------------------
    // START / END TIME VALIDATION
    // -------------------------------------------------

    if (
      form.startTime >=
      form.endTime
    ) {
      setErrors({
        endTime:
          'End time must be after start time.',
      })

      return
    }

    // -------------------------------------------------
    // PAST TIME VALIDATION
    // -------------------------------------------------

    if (
      isSelectedDateToday &&
      form.startTime < currentTime
    ) {
      setErrors({
        startTime:
          'Cannot book a start time in the past for today.',
      })

      return
    }

    // -------------------------------------------------
    // OFFICE HOURS
    // -------------------------------------------------

    const OFFICE_START_TIME =
      '10:00'

    const OFFICE_END_TIME =
      '22:01'

    if (
      form.startTime <
      OFFICE_START_TIME
    ) {
      setErrors({
        startTime:
          'Bookings are allowed only between 10:00 AM and 10:00 PM.',
      })

      return
    }

    if (
      form.endTime >
      OFFICE_END_TIME
    ) {
      setErrors({
        endTime:
          'Bookings are allowed only between 10:00 AM and 10:00 PM.',
      })

      return
    }

    // -------------------------------------------------
    // ROOM BOOKING OVERLAP PRE-VALIDATION
    // -------------------------------------------------

    if (
      selectedRoomDetails &&
      checkRoomBookingConflict(
        selectedRoomDetails,
        form.startTime,
        form.endTime
      )
    ) {
      setErrors({
        startTime:
          'The selected room is already booked for the selected time period. Please choose another room or time.',
      })

      return
    }

    // -------------------------------------------------
    // OPEN CONFIRMATION MODAL
    // -------------------------------------------------

    setConfirming(true)
  }

  // =====================================================
  // CONFIRM BOOKING
  // =====================================================

  async function confirmBooking() {
    setConfirming(false)
    setSubmitting(true)

    try {
      const payload = {
        meetingTitle:
          form.title.trim(),

        purpose:
          form.title.trim(),

        roomId:
          Number(form.roomId),

        participantCount:
          Number(form.attendees),

        bookingDate:
          form.date,

        startTime:
          form.startTime.length === 5
            ? `${form.startTime}:00`
            : form.startTime,

        endTime:
          form.endTime.length === 5
            ? `${form.endTime}:00`
            : form.endTime,

        facilityIds: [],
      }

      await createBooking(payload)

      toast.addToast({
        type: 'success',
        title:
          'Booking confirmed',
        message:
          'Redirecting to My Bookings…',
      })

      setTimeout(() => {
        navigate('/my-bookings')
      }, 900)
    } catch (err) {
      let errorMessage =
        'Could not create booking. Please try again.'

      const responseData =
        err.response?.data

      if (responseData?.errors) {
        errorMessage =
          Object.values(
            responseData.errors
          )
            .flat()
            .join(' ')
      } else if (
        responseData?.message ||
        responseData?.title
      ) {
        errorMessage =
          responseData.message ||
          responseData.title
      }

      // Intercept misleading backend capacity/participant errors for room time conflict
      const lowerMsg = String(errorMessage).toLowerCase()
      if (
        (lowerMsg.includes('accommodate') ||
          lowerMsg.includes('capacity') ||
          lowerMsg.includes('overlap') ||
          lowerMsg.includes('conflict') ||
          lowerMsg.includes('no room can')) &&
        (lowerMsg.includes('participant') || lowerMsg.includes('no room can'))
      ) {
        errorMessage =
          'The selected room is already booked for the selected time period. Please choose another room or time.'
      }

      toast.addToast({
        type: 'error',
        title: errorMessage,
      })
    } finally {
      setSubmitting(false)
    }
  }

  // =====================================================
  // UI
  // =====================================================

  return (
    <div className="mx-auto max-w-2xl space-y-6">

      <h1 className="font-display text-xl font-700">
        Booking
      </h1>

      <Card>

        <form
          onSubmit={handleSubmit}
          className="space-y-4"
        >

          {/* MEETING TITLE */}

          <Field label="Meeting Title">

            <Input
              value={form.title}
              onChange={(e) =>
                update(
                  'title',
                  e.target.value
                )
              }
              placeholder="e.g. sprint"
            />

            {errors.title && (
              <p className="mt-1 text-sm font-medium text-red-600">
                {errors.title}
              </p>
            )}

          </Field>

          {/* MODULE + ROOM */}

          <div className="grid grid-cols-2 gap-4">

            <Field label="Module">

              <Select
                value={form.module}
                onChange={(e) =>
                  handleModuleChange(
                    e.target.value
                  )
                }
                disabled={loadingRooms}
              >

                <option value="">
                  {loadingRooms
                    ? 'Loading modules...'
                    : 'Select module'}
                </option>

                {modules.map((m) => (
                  <option
                    key={m}
                    value={m}
                  >
                    {m}
                  </option>
                ))}

              </Select>

              {errors.module && (
                <p className="mt-1 text-sm font-medium text-red-600">
                  {errors.module}
                </p>
              )}

            </Field>

            <Field label="Room">

              <Select
                value={form.roomId}
                onChange={(e) =>
                  update(
                    'roomId',
                    e.target.value
                  )
                }
                disabled={
                  !form.module ||
                  loadingRooms
                }
              >

                <option value="">
                  {form.module
                    ? 'Select room'
                    : 'Choose a module first'}
                </option>

                {roomsInModule.map(
                  (r, index) => (
                    <option
                      key={r.roomId}
                      value={r.roomId}
                    >
                      {r.roomName ||
                        `Room ${index + 1}`}{' '}
                      (Cap: {r.capacity})
                    </option>
                  )
                )}

              </Select>

              {errors.roomId && (
                <p className="mt-1 text-sm font-medium text-red-600">
                  {errors.roomId}
                </p>
              )}

            </Field>

          </div>

          {/* DATE + TIME */}

          <div className="grid grid-cols-3 gap-4">

            <BusinessDatePicker
              label="Date"
              min={todayStr}
              value={form.date}
              error={errors.date}
              onChange={(value) =>
                update('date', value)
              }
            />

            <ScrollableTimePicker
              label="Start Time"
              value={form.startTime}
              selectedDate={form.date}
              onChange={(value) => update('startTime', value)}
              error={errors.startTime}
            />

            <ScrollableTimePicker
              label="End Time"
              value={form.endTime}
              selectedDate={form.date}
              minTime={form.startTime}
              onChange={(value) => update('endTime', value)}
              error={errors.endTime}
            />

          </div>

          {/* ATTENDEES */}

          <Field label="Number of Attendees">

            <Input
              type="number"
              min="1"
              max={
                selectedRoomDetails?.capacity
              }
              className="w-32"
              value={form.attendees}
              onChange={(e) =>
                update(
                  'attendees',
                  e.target.value
                )
              }
            />

            {selectedRoomDetails && (
              <p className="mt-1 text-sm text-slate-500">

                Maximum capacity for this
                room:{' '}

                <span className="font-semibold">
                  {
                    selectedRoomDetails.capacity
                  }
                </span>{' '}
                participants

              </p>
            )}

            {errors.attendees && (
              <p className="mt-1 text-sm font-medium text-red-600">
                {errors.attendees}
              </p>
            )}

          </Field>

          {/* CONFIRM BOOKING */}

          <Button
            type="submit"
            className="w-full flex items-center justify-center gap-2"
            disabled={
              submitting ||
              (
                selectedRoomDetails &&
                Number(form.attendees) >
                  Number(
                    selectedRoomDetails.capacity
                  )
              )
            }
          >
            {submitting ? (
              <>
                <svg
                  className="h-4 w-4 animate-spin text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                <span>Confirming...</span>
              </>
            ) : (
              'Confirm Booking'
            )}
          </Button>

          {submitting && (
            <p className="text-center text-xs text-sky-600 font-medium animate-pulse">
              Connecting to server and reserving room...
            </p>
          )}

        </form>

      </Card>

      {/* =====================================================
          CONFIRMATION MODAL
      ===================================================== */}

      <Modal
        open={confirming}
        title="Confirm booking"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() =>
                setConfirming(false)
              }
            >
              Back
            </Button>

            <Button
              disabled={submitting}
              onClick={confirmBooking}
            >
              {submitting ? 'Confirming...' : 'Confirm Booking'}
            </Button>
          </>
        }
      >

        <div className="space-y-1">

          <p>
            <strong>
              Meeting Title:
            </strong>{' '}
            {form.title}
          </p>

          <p>
            <strong>
              Room:
            </strong>{' '}
            {selectedRoomDetails?.roomName ||
              'Selected room'}
          </p>

          <p>
            <strong>
              Module:
            </strong>{' '}
            {form.module}
          </p>

          {/* FIXED ROOM LOCATION */}

          
          <p>
            <strong>
              Date & time:
            </strong>{' '}
            {form.date} ·{' '}
            {form.startTime}–
            {form.endTime}
          </p>

          <p>
            <strong>
              Attendees:
            </strong>{' '}
            {form.attendees}
          </p>

        </div>

      </Modal>

    </div>
  )
}