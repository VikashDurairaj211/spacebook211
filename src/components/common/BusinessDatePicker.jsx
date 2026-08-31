import { useState, useRef, useEffect } from 'react'

// =====================================================
// HELPER FUNCTIONS FOR BUSINESS DATE PICKER
// =====================================================

const pad = (num) => String(num).padStart(2, '0')

export function formatDateToYMD(dateObj) {
  if (!dateObj) return ''
  const year = dateObj.getFullYear()
  const month = pad(dateObj.getMonth() + 1)
  const day = pad(dateObj.getDate())
  return `${year}-${month}-${day}`
}

export function parseYMDToDate(dateStr) {
  if (!dateStr) return null
  const [y, m, d] = String(dateStr).split('-').map(Number)
  if (!y || !m || !d) return null
  return new Date(y, m - 1, d)
}

export function isWeekend(dateObj) {
  if (!dateObj) return false
  const day = dateObj.getDay()
  return day === 0 || day === 6 // 0 = Sunday, 6 = Saturday
}

export function getNextBusinessDay(dateObj = new Date()) {
  const next = new Date(dateObj)
  const day = next.getDay()
  if (day === 6) {
    next.setDate(next.getDate() + 2) // Saturday -> Monday
  } else if (day === 0) {
    next.setDate(next.getDate() + 1) // Sunday -> Monday
  }
  return next
}

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

const DAYS_HEADER = [
  { label: 'Mo', isWeekend: false },
  { label: 'Tu', isWeekend: false },
  { label: 'We', isWeekend: false },
  { label: 'Th', isWeekend: false },
  { label: 'Fr', isWeekend: false },
  { label: 'Sa', isWeekend: true },
  { label: 'Su', isWeekend: true },
]

export default function BusinessDatePicker({
  value,
  onChange,
  min,
  max,
  label,
  error,
  disabled = false,
  className = '',
}) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef(null)

  const today = new Date()
  const todayYMD = formatDateToYMD(today)
  const minYMD = min || todayYMD

  // Default max to 7 calendar days (1 week) ahead if not specified
  const defaultMaxDate = new Date(today)
  defaultMaxDate.setDate(defaultMaxDate.getDate() + 7)
  const maxYMD = max || formatDateToYMD(defaultMaxDate)

  // Selected date object
  const selectedDate = parseYMDToDate(value)

  // Current month being viewed in calendar
  const [viewDate, setViewDate] = useState(() => {
    return selectedDate || parseYMDToDate(minYMD) || new Date()
  })

  // Sync view date if external value changes
  useEffect(() => {
    if (value) {
      const parsed = parseYMDToDate(value)
      if (parsed) {
        setViewDate(new Date(parsed.getFullYear(), parsed.getMonth(), 1))
      }
    }
  }, [value])

  // Handle outside click to close dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target)
      ) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  // Navigation handlers & constraints
  const isPrevDisabled = () => {
    if (!minYMD) return false
    const minD = parseYMDToDate(minYMD)
    if (!minD) return false
    return year < minD.getFullYear() || (year === minD.getFullYear() && month <= minD.getMonth())
  }

  const isNextDisabled = () => {
    if (!maxYMD) return false
    const maxD = parseYMDToDate(maxYMD)
    if (!maxD) return false
    return year > maxD.getFullYear() || (year === maxD.getFullYear() && month >= maxD.getMonth())
  }

  const prevMonth = (e) => {
    e.stopPropagation()
    if (isPrevDisabled()) return
    setViewDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))
  }

  const nextMonth = (e) => {
    e.stopPropagation()
    if (isNextDisabled()) return
    setViewDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))
  }

  const year = viewDate.getFullYear()
  const month = viewDate.getMonth()

  // Build days for the month grid
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const firstDayIndex = (new Date(year, month, 1).getDay() + 6) % 7 // Monday = 0, Sunday = 6

  const days = []
  // Previous month padding
  for (let i = 0; i < firstDayIndex; i++) {
    days.push(null)
  }
  // Current month days
  for (let d = 1; d <= daysInMonth; d++) {
    days.push(new Date(year, month, d))
  }

  const handleSelectDate = (dateObj) => {
    if (!dateObj) return
    const ymd = formatDateToYMD(dateObj)
    if (minYMD && ymd < minYMD) return
    if (maxYMD && ymd > maxYMD) return
    if (isWeekend(dateObj)) return
    onChange?.(ymd)
    setIsOpen(false)
  }

  // Format display in input
  const formatDisplay = (val) => {
    if (!val) return 'Select date'
    const dt = parseYMDToDate(val)
    if (!dt) return val
    return dt.toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  return (
    <div className="relative w-full" ref={containerRef}>
      {label && (
        <label className="mb-1 block font-mono text-[11px] uppercase tracking-wider text-slate">
          {label}
        </label>
      )}

      {/* TRIGGER BUTTON */}
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        onClick={() => {
          if (!disabled) setIsOpen((prev) => !prev)
        }}
        onKeyDown={(e) => {
          if (disabled) return
          if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
            e.preventDefault()
            setIsOpen((prev) => !prev)
          } else if (e.key === 'Escape') {
            setIsOpen(false)
          }
        }}
        className={`flex h-10 w-full min-w-[190px] cursor-pointer items-center justify-between gap-2 rounded-lg border bg-white hover:bg-slate-50/80 px-3 text-sm shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-sky-500 ${
          disabled
            ? 'cursor-not-allowed bg-slate-100 opacity-60'
            : error
            ? 'border-red-300 bg-red-50/30 hover:border-red-400'
            : 'border-slate-200 hover:border-slate-300'
        } ${className}`}
      >
        <span
          className={`whitespace-nowrap ${
            value ? 'text-ink' : 'text-slate-500'
          }`}
        >
          {formatDisplay(value)}
        </span>

        {/* Calendar Icon */}
        <svg
          className="h-4 w-4 shrink-0 text-slate-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
      </div>

      {error && (
        <p className="mt-1 text-xs font-medium text-red-600">{error}</p>
      )}

      {/* DROPDOWN POPUP */}
      {isOpen && (
        <div className="absolute left-0 z-50 mt-1 w-72 rounded-2xl border border-sky-200 bg-white p-3.5 shadow-2xl backdrop-blur-sm animate-in fade-in zoom-in-95 duration-100">
          {/* HEADER: Month + Navigation */}
          <div className="flex items-center justify-between mb-3">
            <button
              type="button"
              disabled={isPrevDisabled()}
              onClick={prevMonth}
              className={`rounded-lg p-1.5 transition-colors ${
                isPrevDisabled()
                  ? 'text-slate-300 cursor-not-allowed opacity-40'
                  : 'text-slate-600 hover:bg-sky-100 hover:text-sky-900 cursor-pointer'
              }`}
              title="Previous Month"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            <span className="font-bold text-xs text-sky-950">
              {MONTH_NAMES[month]} {year}
            </span>

            <button
              type="button"
              disabled={isNextDisabled()}
              onClick={nextMonth}
              className={`rounded-lg p-1.5 transition-colors ${
                isNextDisabled()
                  ? 'text-slate-300 cursor-not-allowed opacity-40'
                  : 'text-slate-600 hover:bg-sky-100 hover:text-sky-900 cursor-pointer'
              }`}
              title="Next Month"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {/* DAY NAMES HEADER */}
          <div className="grid grid-cols-7 gap-1 text-center mb-1">
            {DAYS_HEADER.map((d) => (
              <div
                key={d.label}
                className={`py-1 text-[11px] font-bold ${
                  d.isWeekend ? 'text-amber-600/80 bg-amber-50/50 rounded' : 'text-slate-600'
                }`}
                title={d.isWeekend ? 'Weekend (Closed)' : 'Business Day'}
              >
                {d.label}
              </div>
            ))}
          </div>

          {/* CALENDAR DAYS GRID */}
          <div className="grid grid-cols-7 gap-1">
            {days.map((dateObj, idx) => {
              if (!dateObj) {
                return <div key={`empty-${idx}`} className="h-7 w-7" />
              }

              const ymd = formatDateToYMD(dateObj)
              const weekend = isWeekend(dateObj)
              const isPast = minYMD && ymd < minYMD
              const isFutureMax = maxYMD && ymd > maxYMD
              const isDisabled = weekend || isPast || isFutureMax

              const isSelected = value === ymd
              const isCurrentDay = todayYMD === ymd

              return (
                <button
                  key={ymd}
                  type="button"
                  disabled={isDisabled}
                  onClick={() => handleSelectDate(dateObj)}
                  title={
                    weekend
                      ? 'Weekends are unavailable'
                      : isPast
                      ? 'Past dates cannot be selected'
                      : isFutureMax
                      ? 'Bookings are limited to 1 week in advance'
                      : `Select ${ymd}`
                  }
                  className={`h-7 w-full rounded-lg text-xs font-semibold flex items-center justify-center transition-all ${
                    isDisabled
                      ? 'cursor-not-allowed bg-slate-50 text-slate-300 opacity-40 select-none'
                      : isSelected
                      ? 'bg-[#2F6FE0] text-white font-bold shadow-sm ring-2 ring-sky-300'
                      : isCurrentDay
                      ? 'border border-sky-400 text-sky-900 bg-sky-50 font-bold hover:bg-sky-100'
                      : 'text-slate-800 hover:bg-sky-100 hover:text-sky-900'
                  }`}
                >
                  {dateObj.getDate()}
                </button>
              )
            })}
          </div>

          {/* FOOTER QUICK HELPER */}
          <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
            <span className="text-slate-400">
              <span className="inline-block w-2 h-2 rounded-full bg-amber-400 mr-1" />
              Weekends disabled
            </span>
            <button
              type="button"
              onClick={() => {
                const nextBiz = getNextBusinessDay(new Date())
                handleSelectDate(nextBiz)
              }}
              className="font-bold text-sky-600 hover:text-sky-800 hover:underline"
            >
              Next Business Day
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
