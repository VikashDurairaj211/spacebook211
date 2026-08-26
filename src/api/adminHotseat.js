import client from './client'

/**
 * GET /api/admin/hotseats/filters
 * Fetches dynamic dropdown options for module, section, and status filters.
 */
export async function getHotseatFilters() {
  const { data } = await client.get('/admin/hotseats/filters')
  return data
}

/**
 * GET /api/admin/hotseats/dashboard
 * Fetches high-level KPI metrics (Total Reservations, Confirmed Bookings, Cancelled Bookings, etc.)
 */
export async function getHotseatDashboard(params = {}) {
  const { data } = await client.get('/admin/hotseats/dashboard', { params })
  return data
}

/**
 * GET or POST /api/admin/hotseats/analytics
 * Fetches analytics charts data (Module distribution, Peak check-in times, cancellation reasons)
 */
export async function getHotseatAnalytics(filterDto = {}) {
  try {
    const { data } = await client.post('/admin/hotseats/analytics', filterDto)
    return data
  } catch (err) {
    // If POST is not supported or fails, try GET with query params
    const { data } = await client.get('/admin/hotseats/analytics', { params: filterDto })
    return data
  }
}

/**
 * GET or POST /api/admin/hotseats/records
 * Fetches paginated hotseat reservation and audit records for the table modal.
 */
export async function getHotseatRecords(filterDto = {}) {
  try {
    const { data } = await client.post('/admin/hotseats/records', filterDto)
    return data
  } catch (err) {
    // If POST fails, fallback to GET with query params
    const { data } = await client.get('/admin/hotseats/records', { params: filterDto })
    return data
  }
}

/**
 * GET or POST /api/admin/hotseats/export-csv
 * Streams the backend-generated CSV file as a downloadable blob.
 */
export async function exportHotseatCsv(filterDto = {}) {
  try {
    const response = await client.post('/admin/hotseats/export-csv', filterDto, {
      responseType: 'blob',
    })
    return response.data
  } catch (err) {
    const response = await client.get('/admin/hotseats/export-csv', {
      params: filterDto,
      responseType: 'blob',
    })
    return response.data
  }
}
