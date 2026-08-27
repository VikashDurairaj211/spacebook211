import client from './client'

/**
 * Sanitizes filter DTO so 'All', empty strings, or nulls are stripped/cleaned for Swagger APIs.
 */
function sanitizeFilterDto(dto = {}) {
  const cleaned = {}
  for (const [key, val] of Object.entries(dto)) {
    if (
      val === undefined ||
      val === null ||
      val === '' ||
      (typeof val === 'string' && val.trim().toLowerCase() === 'all')
    ) {
      continue
    }
    cleaned[key] = val
  }
  return cleaned
}

/**
 * GET /api/admin/hotseats/filters
 * Fetches dynamic dropdown options for module, section, and status filters.
 */
export async function getHotseatFilters() {
  const { data } = await client.get('/admin/hotseats/filters')
  return data
}

/**
 * GET or POST /api/admin/hotseats/dashboard
 * Fetches high-level KPI metrics (Total Reservations, Confirmed Bookings, Cancelled Bookings, etc.)
 */
export async function getHotseatDashboard(filterDto = {}) {
  const cleaned = sanitizeFilterDto(filterDto)
  try {
    const { data } = await client.get('/admin/hotseats/dashboard', { params: cleaned })
    return data
  } catch (err) {
    try {
      const { data } = await client.post('/admin/hotseats/dashboard', cleaned)
      return data
    } catch {
      throw err
    }
  }
}

/**
 * GET or POST /api/admin/hotseats/analytics
 * Fetches analytics charts data (Module distribution, Peak check-in times, floor section demand)
 */
export async function getHotseatAnalytics(filterDto = {}) {
  const cleaned = sanitizeFilterDto(filterDto)
  try {
    const { data } = await client.post('/admin/hotseats/analytics', cleaned)
    return data
  } catch (err) {
    const { data } = await client.get('/admin/hotseats/analytics', { params: cleaned })
    return data
  }
}

/**
 * GET or POST /api/admin/hotseats/records
 * Fetches paginated hotseat reservation and audit records for the table modal.
 */
export async function getHotseatRecords(filterDto = {}) {
  const cleaned = sanitizeFilterDto(filterDto)
  const payload = {
    page: 1,
    pageSize: 1000,
    ...cleaned,
  }
  try {
    const { data } = await client.post('/admin/hotseats/records', payload)
    return data
  } catch (err) {
    const { data } = await client.get('/admin/hotseats/records', { params: payload })
    return data
  }
}

/**
 * GET or POST /api/admin/hotseats/export-csv
 * Streams the backend-generated CSV file as a downloadable blob.
 */
export async function exportHotseatCsv(filterDto = {}) {
  const cleaned = sanitizeFilterDto(filterDto)
  try {
    const response = await client.post('/admin/hotseats/export-csv', cleaned, {
      responseType: 'blob',
    })
    return response.data
  } catch (err) {
    const response = await client.get('/admin/hotseats/export-csv', {
      params: cleaned,
      responseType: 'blob',
    })
    return response.data
  }
}
