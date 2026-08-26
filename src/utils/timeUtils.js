export const WORK_DAY_START = '08:00'
export const WORK_DAY_END = '18:00'

export function timeToMinutes(value = '00:00') {
  const [hours, minutes] = String(value).split(':').map(Number)
  return Number.isFinite(hours) && Number.isFinite(minutes) ? hours * 60 + minutes : 0
}

export function minutesToTime(minutes) {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`
}

export function isValidTimeRange(start, end) {
  return Boolean(start && end && timeToMinutes(start) < timeToMinutes(end))
}

export function durationInMinutes(start, end) {
  if (!isValidTimeRange(start, end)) return 0
  return timeToMinutes(end) - timeToMinutes(start)
}

export function isWithinWorkingHours(start, end) {
  if (!isValidTimeRange(start, end)) return false
  return timeToMinutes(start) >= timeToMinutes(WORK_DAY_START) && timeToMinutes(end) <= timeToMinutes(WORK_DAY_END)
}

export function formatTime24(timeStr) {
  if (!timeStr) return ''
  const val = String(timeStr).trim()
  let timePart = val
  if (val.includes('T')) {
    timePart = val.split('T')[1] || ''
  }
  const parts = timePart.split(':')
  if (parts.length >= 2) {
    const h = String(parts[0]).padStart(2, '0')
    const m = String(parts[1]).padStart(2, '0')
    return `${h}:${m}`
  }
  return timePart
}

export function formatDateWithZeros(dateStr) {
  if (!dateStr) return ''
  const val = String(dateStr).trim()
  const dateOnly = val.includes('T') ? val.split('T')[0] : val.substring(0, 10)
  const parts = dateOnly.split(/[-/]/)
  if (parts.length === 3) {
    if (parts[0].length === 4) {
      const y = parts[0]
      const m = String(parts[1]).padStart(2, '0')
      const d = String(parts[2]).padStart(2, '0')
      return `${y}-${m}-${d}`
    } else {
      const d = String(parts[0]).padStart(2, '0')
      const m = String(parts[1]).padStart(2, '0')
      const y = parts[2]
      return `${d}/${m}/${y}`
    }
  }
  return dateOnly
}

