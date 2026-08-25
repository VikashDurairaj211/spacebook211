import { useState, useRef, useEffect } from 'react'

const OFFICE_START_HOUR = 10
const OFFICE_END_HOUR = 22

function normalizeTime(val) {
  if (!val) return ''
  const str = String(val).trim()
  if (str.includes('T')) {
    return str.split('T')[1].substring(0, 5)
  }
  return str.substring(0, 5)
}

function timeToMinutes(val) {
  if (!val) return null
  const [h, m] = String(val).substring(0, 5).split(':').map(Number)
  if (Number.isNaN(h) || Number.isNaN(m)) return null
  return h * 60 + m
}

export default function ScrollableTimePicker({
  label,
  value,
  onChange,
  selectedDate,
  minTime,
  error,
  placeholder = 'Select time',
  className = '',
  disabled = false,
}) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef(null)
  const hourContainerRef = useRef(null)
  const minuteContainerRef = useRef(null)

  const currentValue = normalizeTime(value)

  const [selectedHour, selectedMinute] = currentValue
    ? currentValue.split(':')
    : ['', '']

  const hoursList = Array.from(
    { length: OFFICE_END_HOUR - OFFICE_START_HOUR + 1 },
    (_, index) => String(index + OFFICE_START_HOUR).padStart(2, '0')
  )

  const minutesList = Array.from({ length: 60 }, (_, index) =>
    String(index).padStart(2, '0')
  )

  // Current Date & Time checks
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  const todayStr = `${year}-${month}-${day}`

  const isToday = !selectedDate || selectedDate === todayStr
  const isPastDate = Boolean(selectedDate && selectedDate < todayStr)

  const currentHour = now.getHours()
  const currentMinute = now.getMinutes()

  const minimumTimeMinutes = minTime ? timeToMinutes(minTime) : null

  function isHourDisabled(hour) {
    const numericHour = Number(hour)
    if (numericHour < OFFICE_START_HOUR || numericHour > OFFICE_END_HOUR) return true
    if (isPastDate) return true

    if (isToday) {
      if (numericHour < currentHour) return true
      if (numericHour === currentHour) {
        const hasValidMinute = minutesList.some(
          (minute) => !isMinuteDisabled(hour, minute)
        )
        if (!hasValidMinute) return true
      }
    }

    if (minimumTimeMinutes !== null && minimumTimeMinutes !== undefined) {
      const hourMax = numericHour * 60 + 59
      if (hourMax <= minimumTimeMinutes) return true
    }

    return false
  }

  function isMinuteDisabled(hour, minute) {
    const numericHour = Number(hour)
    const numericMinute = Number(minute)
    const selectedMinutes = numericHour * 60 + numericMinute

    if (
      selectedMinutes < OFFICE_START_HOUR * 60 ||
      selectedMinutes > OFFICE_END_HOUR * 60
    ) {
      return true
    }

    if (isPastDate) return true

    if (isToday) {
      const currentTotal = currentHour * 60 + currentMinute
      if (selectedMinutes <= currentTotal) return true
    }

    if (minimumTimeMinutes !== null && minimumTimeMinutes !== undefined) {
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
      onChange?.(`${hour}:${firstAvailableMinute}`)
      return
    }
    onChange?.(`${hour}:${minuteToUse}`)
  }

  function handleMinuteClick(minute) {
    let hour = selectedHour
    if (!hour || isHourDisabled(hour)) {
      const firstAvailableHour = hoursList.find((h) => !isHourDisabled(h))
      if (!firstAvailableHour) return
      hour = firstAvailableHour
    }

    if (isMinuteDisabled(hour, minute)) return
    onChange?.(`${hour}:${minute}`)
  }

  // Scroll active item into view on open
  useEffect(() => {
    if (isOpen) {
      requestAnimationFrame(() => {
        if (hourContainerRef.current) {
          const selectedHourEl = hourContainerRef.current.querySelector('[data-selected="true"]')
          if (selectedHourEl) {
            selectedHourEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
          }
        }
        if (minuteContainerRef.current) {
          const selectedMinEl = minuteContainerRef.current.querySelector('[data-selected="true"]')
          if (selectedMinEl) {
            selectedMinEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
          }
        }
      })
    }
  }, [isOpen])

  // Close when clicked outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  return (
    <div className={`relative w-full ${className}`} ref={containerRef}>
      {label && (
        <span className="mb-1 block font-mono text-[11px] uppercase tracking-wider text-slate">
          {label}
        </span>
      )}

      <div
        onClick={() => {
          if (!disabled) setIsOpen((prev) => !prev)
        }}
        className={`flex h-10 w-full cursor-pointer items-center justify-between rounded-lg border bg-white hover:bg-slate-50/80 px-3 text-sm shadow-sm transition-colors ${
          disabled
            ? 'cursor-not-allowed bg-slate-100 opacity-60'
            : error
            ? 'border-red-300 hover:border-red-400 bg-red-50/30'
            : 'border-slate-200 hover:border-slate-300'
        }`}
      >
        <span
          className={
            currentValue
              ? 'text-ink'
              : 'text-slate-500'
          }
        >
          {currentValue || placeholder}
        </span>

        <svg
          className={`h-4 w-4 text-slate-500 transition-transform duration-200 ${
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

      {isOpen && (
        <div className="absolute z-50 mt-1 flex w-full overflow-hidden rounded-xl border border-sky-200 bg-white shadow-xl">
          {/* HOURS */}
          <div className="flex flex-1 flex-col border-r border-slate-100 min-w-0">
            <div className="bg-sky-100 text-sky-900 py-1.5 text-xs font-bold border-b border-sky-200 text-center select-none">
              Hour
            </div>

            <div
              ref={hourContainerRef}
              className="max-h-48 overflow-y-auto p-1.5 space-y-1 text-center [scrollbar-width:thin]"
            >
              {hoursList.map((hour) => {
                const isHourDis = isHourDisabled(hour)
                const isSelected = selectedHour === hour

                return (
                  <button
                    key={hour}
                    type="button"
                    disabled={isHourDis}
                    data-selected={isSelected ? 'true' : 'false'}
                    onClick={() => handleHourClick(hour)}
                    className={`block w-full rounded-md py-1.5 text-xs font-semibold transition-colors text-center ${
                      isHourDis
                        ? 'cursor-not-allowed bg-slate-50 text-slate-300 opacity-50'
                        : isSelected
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

            <div
              ref={minuteContainerRef}
              className="max-h-48 overflow-y-auto p-1.5 space-y-1 text-center [scrollbar-width:thin]"
            >
              {minutesList.map((minute) => {
                const hour = selectedHour || '10'
                const isMinDis = isMinuteDisabled(hour, minute)
                const isSelected = selectedMinute === minute

                return (
                  <button
                    key={minute}
                    type="button"
                    disabled={isMinDis}
                    data-selected={isSelected ? 'true' : 'false'}
                    onClick={() => handleMinuteClick(minute)}
                    className={`block w-full rounded-md py-1.5 text-xs font-semibold transition-colors text-center ${
                      isMinDis
                        ? 'cursor-not-allowed bg-slate-50 text-slate-300 opacity-50'
                        : isSelected
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
