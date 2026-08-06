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
