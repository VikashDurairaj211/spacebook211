import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Eye, Download, FileSpreadsheet, FileText, RefreshCw, X, CheckCircle2 } from 'lucide-react'
import client from '../../api/client'
import Card from '../../components/common/Card'
import Button from '../../components/common/Button'
import Modal from '../../components/common/Modal'
import { exportToExcel, downloadCSV } from '../../utils/exportHelpers'

// =====================================================
// Helper: Resolve Section from Seat Number
// =====================================================

function resolveSection(seatNumber, module) {
  if (!seatNumber) return 'General Section'
  const num = parseInt(String(seatNumber).split('-').pop(), 10)
  if (isNaN(num)) return 'Section A'

  const modStr = String(module || seatNumber).toLowerCase()
  if (modStr.includes('1') || modStr.includes('eo1')) {
    if (num <= 32) return 'Section A (Seats 1 – 32)'
    return 'Section B (Seats 33 – 70)'
  }
  if (modStr.includes('2') || modStr.includes('eo2')) {
    if (num >= 80 && num <= 131) return 'Section C (Seats 80 – 131)'
    return 'Section B'
  }
  return 'Section A'
}

// =====================================================
// Helper: Format Date & Time
// =====================================================

function formatDateDisplay(dateStr) {
  if (!dateStr) return ''
  const cleanDate = String(dateStr).split('T')[0]
  const [y, m, d] = cleanDate.split('-')
  if (!y || !m || !d) return dateStr
  const dateObj = new Date(Number(y), Number(m) - 1, Number(d))
  return dateObj.toLocaleDateString('en-US', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function formatTimeDisplay(timeStr) {
  if (!timeStr) return ''
  const str = String(timeStr).trim()
  const rawTime = str.includes('T') ? str.split('T')[1].substring(0, 5) : str.substring(0, 5)
  const [hStr, mStr] = rawTime.split(':')
  const h = parseInt(hStr, 10)
  if (isNaN(h)) return timeStr
  const ampm = h >= 12 ? 'PM' : 'AM'
  const h12 = h % 12 === 0 ? 12 : h % 12
  return `${String(h12).padStart(2, '0')}:${mStr || '00'} ${ampm}`
}

// =====================================================
// Status Badge Component
// =====================================================

function HotseatStatusTag({ status }) {
  const norm = String(status || 'CONFIRMED').toUpperCase()

  let bgClass = 'bg-[#658362] text-white' // Confirmed -> Green
  let dotClass = 'bg-emerald-200'

  if (norm === 'CHECKED IN' || norm === 'CHECKEDIN' || norm === 'CHECKED-IN') {
    bgClass = 'bg-[#2F6FE0] text-white' // Checked in -> Blue
    dotClass = 'bg-sky-200'
  } else if (norm === 'CANCELLED' || norm === 'CANCELED' || norm === 'REJECTED' || norm === 'EXPIRED') {
    bgClass = 'bg-[#B85450] text-white' // Cancelled -> Red
    dotClass = 'bg-rose-200'
  }

  const label = norm === 'CHECKEDIN' || norm === 'CHECKED-IN' ? 'CHECKED IN' : norm

  return (
    <span
      className={`inline-flex items-center justify-center gap-1.5 min-w-[105px] px-3 py-1 rounded-full text-[11px] font-bold tracking-wider uppercase text-center shadow-xs ${bgClass}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${dotClass}`} />
      {label}
    </span>
  )
}

// =====================================================
// Initial Mock / Fallback Data
// =====================================================

const INITIAL_HOTSEAT_DATA = [
  {
    id: 102,
    bookingId: 'HS102',
    employee: 'Shreenithiy Karthikeyan',
    employeeShort: 'Shree',
    seat: 'EO1-25',
    module: 'Module 1',
    location: 'Coimbatore',
    zone: 'Elcot Park',
    section: 'Section A (Seats 1 – 32)',
    date: '2026-08-24',
    expectedCheckIn: '10:00',
    status: 'CONFIRMED',
  },
  {
    id: 101,
    bookingId: 'HS101',
    employee: 'Anusha Ramanathan',
    employeeShort: 'Anusha',
    seat: 'EO1-31',
    module: 'Module 1',
    location: 'Coimbatore',
    zone: 'Elcot Park',
    section: 'Section A (Seats 1 – 32)',
    date: '2026-08-24',
    expectedCheckIn: '10:30',
    status: 'CHECKED IN',
  },
  {
    id: 100,
    bookingId: 'HS100',
    employee: 'Bharathi Kannan',
    employeeShort: 'Bharathi',
    seat: 'EO2-45',
    module: 'Module 2',
    location: 'Coimbatore',
    zone: 'Elcot Park',
    section: 'Section B (Seats 33 – 70)',
    date: '2026-08-24',
    expectedCheckIn: '11:00',
    status: 'CANCELLED',
  },
  {
    id: 99,
    bookingId: 'HS99',
    employee: 'Rahul Sundaram',
    employeeShort: 'Rahul',
    seat: 'EO1-18',
    module: 'Module 1',
    location: 'Coimbatore',
    zone: 'Elcot Park',
    section: 'Section A (Seats 1 – 32)',
    date: '2026-08-25',
    expectedCheckIn: '09:30',
    status: 'CONFIRMED',
  },
  {
    id: 98,
    bookingId: 'HS98',
    employee: 'Sara Khan',
    employeeShort: 'Sara',
    seat: 'EO2-88',
    module: 'Module 2',
    location: 'Coimbatore',
    zone: 'Elcot Park',
    section: 'Section C (Seats 80 – 131)',
    date: '2026-08-24',
    expectedCheckIn: '10:00',
    status: 'CHECKED IN',
  },
  {
    id: 97,
    bookingId: 'HS97',
    employee: 'Karthik Raja',
    employeeShort: 'Karthik',
    seat: 'EO1-05',
    module: 'Module 1',
    location: 'Coimbatore',
    zone: 'Elcot Park',
    section: 'Section A (Seats 1 – 32)',
    date: '2026-08-26',
    expectedCheckIn: '11:30',
    status: 'CONFIRMED',
  },
]

// =====================================================
// Hotseat Management Component
// =====================================================

export default function HotseatManagement() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [statusFilter, setStatusFilter] = useState('All')
  const [dateFilter, setDateFilter] = useState('All')

  const [selectedBooking, setSelectedBooking] = useState(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  // Fetch / Sync Hotseat Data
  const fetchHotseatData = async () => {
    try {
      setLoading(true)
      setError('')

      let liveBookings = []

      // 1. Try fetching from hotseat stats / all endpoints
      try {
        const [myRes, seatsRes] = await Promise.allSettled([
          client.get('/Hotseat/my-bookings'),
          client.get('/Hotseat'),
        ])

        if (myRes.status === 'fulfilled' && myRes.value.data) {
          const raw = myRes.value.data
          const list = Array.isArray(raw) ? raw : raw?.bookings || raw?.data || []
          if (list.length > 0) {
            liveBookings = list.map((b, idx) => ({
              id: b.id || b.bookingId || idx + 200,
              bookingId: String(b.bookingId || b.id || `HS${idx + 200}`).startsWith('HS')
                ? String(b.bookingId || b.id)
                : `HS${b.bookingId || b.id || idx + 200}`,
              employee: b.employeeName || b.userName || b.requestedBy || b.user?.name || 'Current User',
              employeeShort: (b.employeeName || b.userName || b.requestedBy || 'User').split(' ')[0],
              seat: b.seatNumber || b.seat || b.seatId || 'EO1-01',
              module: b.module || (b.seatNumber?.includes('EO2') ? 'Module 2' : 'Module 1'),
              location: b.location || 'Coimbatore',
              zone: b.zone || b.office || 'Elcot Park',
              section: resolveSection(b.seatNumber, b.module),
              date: b.bookingDate || b.date || new Date().toISOString().split('T')[0],
              expectedCheckIn: b.expectedCheckInTime || b.expectedCheckIn || b.startTime || '10:00',
              status: String(b.status || 'CONFIRMED').toUpperCase(),
            }))
          }
        }
      } catch (err) {
        console.warn('Live API hotseat sync info:', err)
      }

      // Merge live bookings with seed mock items to ensure rich demonstration
      const combined = [...liveBookings]
      INITIAL_HOTSEAT_DATA.forEach((seed) => {
        if (!combined.some((item) => String(item.bookingId) === String(seed.bookingId))) {
          combined.push(seed)
        }
      })

      // Sort by date descending and time
      combined.sort((a, b) => {
        const dateA = String(a.date || '').substring(0, 10)
        const dateB = String(b.date || '').substring(0, 10)
        if (dateA !== dateB) return dateB.localeCompare(dateA)
        return String(b.expectedCheckIn || '').localeCompare(String(a.expectedCheckIn || ''))
      })

      setBookings(combined)
    } catch (err) {
      console.error('Failed to load hotseat reservations:', err)
      setError('Could not load hotseat data. Displaying fallback reservations.')
      setBookings(INITIAL_HOTSEAT_DATA)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchHotseatData()
  }, [])

  // =====================================================
  // Dynamic Statistics
  // =====================================================

  const stats = useMemo(() => {
    let confirmed = 0
    let checkedIn = 0

    bookings.forEach((b) => {
      const st = String(b.status || '').toUpperCase()
      if (st === 'CONFIRMED') confirmed++
      else if (st === 'CHECKED IN' || st === 'CHECKEDIN' || st === 'CHECKED-IN') checkedIn++
    })

    return { confirmed, checkedIn }
  }, [bookings])

  // =====================================================
  // Filtering Logic
  // =====================================================

  const todayStr = new Date().toISOString().split('T')[0]

  const filteredBookings = useMemo(() => {
    return bookings.filter((b) => {
      // 1. Status filter
      if (statusFilter !== 'All') {
        const normFilter = statusFilter.toUpperCase()
        const normStatus = String(b.status || '').toUpperCase()
        if (normFilter === 'CHECKED IN') {
          if (normStatus !== 'CHECKED IN' && normStatus !== 'CHECKEDIN' && normStatus !== 'CHECKED-IN') {
            return false
          }
        } else if (normFilter === 'CONFIRMED') {
          if (normStatus !== 'CONFIRMED') return false
        } else if (normFilter === 'CANCELLED') {
          if (normStatus !== 'CANCELLED' && normStatus !== 'CANCELED' && normStatus !== 'REJECTED') {
            return false
          }
        }
      }

      // 2. Date filter
      if (dateFilter !== 'All') {
        const bDate = String(b.date || '').substring(0, 10)
        if (dateFilter === 'Today') {
          if (bDate !== todayStr) return false
        } else if (dateFilter === 'Upcoming') {
          if (bDate < todayStr) return false
        } else if (dateFilter === 'Past') {
          if (bDate >= todayStr) return false
        }
      }

      return true
    })
  }, [bookings, statusFilter, dateFilter, todayStr])

  // =====================================================
  // Export Handlers
  // =====================================================

  const handleExportExcel = () => {
    const exportData = filteredBookings.map((b) => ({
      'Booking ID': b.bookingId || b.id,
      'Employee Name': b.employee,
      'Seat Number': b.seat,
      'Module': b.module,
      'Section': b.section,
      'Location': b.location,
      'Office / Zone': b.zone,
      'Booking Date': b.date,
      'Expected Check-in': formatTimeDisplay(b.expectedCheckIn),
      'Status': b.status,
    }))

    exportToExcel(
      [{ name: 'Hotseat Bookings', data: exportData }],
      `Hotseat_Management_Report_${todayStr}.xlsx`
    )
  }

  const handleExportCSV = () => {
    const exportData = filteredBookings.map((b) => ({
      'Booking ID': b.bookingId || b.id,
      'Employee Name': b.employee,
      'Seat Number': b.seat,
      'Module': b.module,
      'Section': b.section,
      'Location': b.location,
      'Office / Zone': b.zone,
      'Booking Date': b.date,
      'Expected Check-in': formatTimeDisplay(b.expectedCheckIn),
      'Status': b.status,
    }))

    downloadCSV(exportData, `Hotseat_Management_Report_${todayStr}.csv`)
  }

  const handleViewDetails = (booking) => {
    setSelectedBooking(booking)
    setIsModalOpen(true)
  }

  return (
    <div className="space-y-6">
      {/* =================================================
          PAGE HEADER
      ================================================= */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-ink">
            Hotseat Management
          </h1>
          <p className="mt-1 text-sm text-slate">
            Review, filter, and monitor hotseat reservations for the workplace.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            onClick={fetchHotseatData}
            className="flex items-center gap-2 text-xs py-2 px-3 border border-sky-200 hover:bg-sky-50 text-sky-900"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </Button>

          <div className="flex items-center gap-1.5">
            <Button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 text-xs py-2 px-3 bg-sky-600 hover:bg-sky-700 text-white shadow-sm"
              title="Export as CSV"
            >
              <FileText size={14} />
              CSV
            </Button>

            <Button
              onClick={handleExportExcel}
              className="flex items-center gap-1.5 text-xs py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
              title="Export as Excel"
            >
              <FileSpreadsheet size={14} />
              Excel
            </Button>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
          {error}
        </div>
      )}

      {/* =================================================
          SUMMARY CARDS
      ================================================= */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* CONFIRMED */}
        <Card className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm transition-all hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-emerald-800">
              Confirmed
            </span>
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
          </div>

          <p className="mt-3 text-3xl font-extrabold text-[#658362]">
            {stats.confirmed}
          </p>

          <p className="mt-1 text-xs text-slate">
            Active & scheduled hotseat reservations
          </p>
        </Card>

        {/* CHECKED IN */}
        <Card className="rounded-2xl border border-sky-100 bg-white p-5 shadow-sm transition-all hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-sky-800">
              Checked In
            </span>
            <span className="h-2 w-2 rounded-full bg-[#2F6FE0]" />
          </div>

          <p className="mt-3 text-3xl font-extrabold text-[#2F6FE0]">
            {stats.checkedIn}
          </p>

          <p className="mt-1 text-xs text-slate">
            Users currently checked in
          </p>
        </Card>
      </div>

      {/* =================================================
          HOTSEAT REQUESTS & FILTERS
      ================================================= */}
      <Card className="p-4 shadow-sm rounded-2xl border border-sky-100 bg-white">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="font-display text-sm font-bold text-ink uppercase tracking-wide">
              Hotseat Requests
            </h2>
            <p className="text-xs text-slate">
              Filter and inspect workplace hotseat reservations.
            </p>
          </div>

          <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-ink outline-none focus:border-sky-500"
            >
              <option value="All">All Statuses</option>
              <option value="CONFIRMED">Confirmed</option>
              <option value="CHECKED IN">Checked In</option>
              <option value="CANCELLED">Cancelled</option>
            </select>

            {/* Date Filter */}
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-ink outline-none focus:border-sky-500"
            >
              <option value="All">All Dates</option>
              <option value="Today">Today</option>
              <option value="Upcoming">Upcoming</option>
              <option value="Past">Past</option>
            </select>
          </div>
        </div>
      </Card>

      {/* =================================================
          HOTSEAT BOOKING TABLE
      ================================================= */}
      <Card className="overflow-hidden p-0 shadow-sm rounded-2xl border border-sky-100 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/90 font-mono text-[11px] font-bold uppercase tracking-wider text-slate-600">
                <th className="px-4 py-3.5 whitespace-nowrap">BOOKING ID</th>
                <th className="px-4 py-3.5 whitespace-nowrap">EMPLOYEE</th>
                <th className="px-4 py-3.5 whitespace-nowrap">SEAT</th>
                <th className="px-4 py-3.5 whitespace-nowrap">MODULE</th>
                <th className="px-4 py-3.5 whitespace-nowrap">DATE</th>
                <th className="px-4 py-3.5 whitespace-nowrap">CHECK-IN</th>
                <th className="px-4 py-3.5 whitespace-nowrap text-center">STATUS</th>
                <th className="px-4 py-3.5 whitespace-nowrap text-right">ACTIONS</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {loading && bookings.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <RefreshCw className="mx-auto mb-2 h-5 w-5 animate-spin text-sky-600" />
                    Loading hotseat reservations...
                  </td>
                </tr>
              ) : filteredBookings.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    No hotseat reservations match the selected criteria.
                  </td>
                </tr>
              ) : (
                filteredBookings.map((b) => (
                  <tr
                    key={b.id || b.bookingId}
                    className="hover:bg-sky-50/40 transition-colors"
                  >
                    <td className="px-4 py-3.5 font-mono font-semibold text-slate-900 whitespace-nowrap">
                      {b.bookingId || b.id}
                    </td>

                    <td className="px-4 py-3.5 font-medium text-slate-900 whitespace-nowrap">
                      {b.employeeShort || b.employee}
                    </td>

                    <td className="px-4 py-3.5 font-mono font-semibold text-sky-800 whitespace-nowrap">
                      {b.seat}
                    </td>

                    <td className="px-4 py-3.5 text-slate-700 whitespace-nowrap">
                      {b.module}
                    </td>

                    <td className="px-4 py-3.5 text-slate-700 whitespace-nowrap font-mono">
                      {formatDateDisplay(b.date)}
                    </td>

                    <td className="px-4 py-3.5 text-slate-700 whitespace-nowrap font-medium">
                      {formatTimeDisplay(b.expectedCheckIn)}
                    </td>

                    <td className="px-4 py-3.5 text-center whitespace-nowrap">
                      <HotseatStatusTag status={b.status} />
                    </td>

                    <td className="px-4 py-3.5 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => handleViewDetails(b)}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white hover:bg-sky-50 hover:border-sky-300 hover:text-sky-700 px-3 py-1 text-xs font-semibold text-slate-700 shadow-2xs transition-all"
                      >
                        <Eye size={13} />
                        View
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* =================================================
          VIEW BOOKING DETAILS MODAL
      ================================================= */}
      {isModalOpen && selectedBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl border border-sky-100 animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4.5 bg-slate-50/70">
              <h3 className="font-mono text-sm font-bold tracking-wider uppercase text-slate-800">
                HOTSEAT BOOKING DETAILS
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="rounded-full p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-3.5">
              <dl className="grid grid-cols-1 gap-y-3 gap-x-6 sm:grid-cols-2 text-xs">
                <div className="border-b border-slate-100 pb-2">
                  <dt className="font-mono text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Booking ID
                  </dt>
                  <dd className="mt-1 font-mono text-sm font-bold text-slate-900">
                    {selectedBooking.bookingId || selectedBooking.id}
                  </dd>
                </div>

                <div className="border-b border-slate-100 pb-2">
                  <dt className="font-mono text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Employee
                  </dt>
                  <dd className="mt-1 text-sm font-semibold text-slate-900">
                    {selectedBooking.employee}
                  </dd>
                </div>

                <div className="border-b border-slate-100 pb-2">
                  <dt className="font-mono text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Seat
                  </dt>
                  <dd className="mt-1 font-mono text-sm font-bold text-sky-800">
                    {selectedBooking.seat}
                  </dd>
                </div>

                <div className="border-b border-slate-100 pb-2">
                  <dt className="font-mono text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Location
                  </dt>
                  <dd className="mt-1 font-medium text-slate-800">
                    {selectedBooking.location || 'Coimbatore'}
                  </dd>
                </div>

                <div className="border-b border-slate-100 pb-2">
                  <dt className="font-mono text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Office / Zone
                  </dt>
                  <dd className="mt-1 font-medium text-slate-800">
                    {selectedBooking.zone || 'Elcot Park'}
                  </dd>
                </div>

                <div className="border-b border-slate-100 pb-2">
                  <dt className="font-mono text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Module
                  </dt>
                  <dd className="mt-1 font-medium text-slate-800">
                    {selectedBooking.module}
                  </dd>
                </div>

                <div className="border-b border-slate-100 pb-2 sm:col-span-2">
                  <dt className="font-mono text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Section
                  </dt>
                  <dd className="mt-1 font-medium text-slate-800">
                    {selectedBooking.section || resolveSection(selectedBooking.seat, selectedBooking.module)}
                  </dd>
                </div>

                <div className="border-b border-slate-100 pb-2">
                  <dt className="font-mono text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Booking Date
                  </dt>
                  <dd className="mt-1 font-semibold text-slate-800">
                    {formatDateDisplay(selectedBooking.date)}
                  </dd>
                </div>

                <div className="border-b border-slate-100 pb-2">
                  <dt className="font-mono text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Expected Check-in
                  </dt>
                  <dd className="mt-1 font-semibold text-slate-800">
                    {formatTimeDisplay(selectedBooking.expectedCheckIn)}
                  </dd>
                </div>

                <div className="pt-1 sm:col-span-2">
                  <dt className="font-mono text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Status
                  </dt>
                  <dd>
                    <HotseatStatusTag status={selectedBooking.status} />
                  </dd>
                </div>
              </dl>
            </div>

            {/* Footer */}
            <div className="flex justify-end border-t border-slate-100 bg-slate-50/70 px-6 py-4">
              <Button
                variant="secondary"
                onClick={() => setIsModalOpen(false)}
                className="px-5 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 rounded-xl"
              >
                CLOSE
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
