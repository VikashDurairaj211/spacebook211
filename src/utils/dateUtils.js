export function today() {
  return new Date().toISOString().slice(0, 10)
}

export function normalizeDate(value) {
  return String(value || '').slice(0, 10)
}

export function isPastDate(value) {
  const normalized = normalizeDate(value)
  return normalized && normalized < today()
}

export function isSameDate(a, b) {
  return normalizeDate(a) === normalizeDate(b)
}

export function formatCalendarDate(value) {
  return new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', weekday: 'short' })
}
