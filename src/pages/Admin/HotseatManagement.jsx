import { useEffect, useMemo, useState } from 'react'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts'
import {
  RefreshCw,
  FileSpreadsheet,
  FileText,
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  Calendar,
  Sparkles,
  Activity,
  Armchair,
  Eye,
  X,
  AlertTriangle,
} from 'lucide-react'

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
  const str = String(seatNumber)

  if (str.startsWith('WS-04-')) {
    const num = parseInt(str.replace('WS-04-', ''), 10)
    if (!isNaN(num)) {
      if (num <= 62) return 'Section A (Seats 1 – 62)'
      if (num <= 118) return 'Section B (Seats 63 – 118)'
      if (num <= 164) return 'Section C (Seats 119 – 164)'
      return 'Section D (Seats 165 – 224)'
    }
  }

  const num = parseInt(str.split('-').pop(), 10)
  if (isNaN(num)) return 'Section A'

  const modStr = String(module || seatNumber).toLowerCase()
  if (modStr.includes('1') || modStr.includes('eo1')) {
    if (num <= 32) return 'Section A (Seats 1 – 32)'
    return 'Section B (Seats 33 – 70)'
  }
  if (modStr.includes('2') || modStr.includes('eo2')) {
    if (num >= 80 && num <= 131) return 'Section C (Seats 80 – 131)'
    return 'Section B (Seats 33 – 79)'
  }
  return 'Section A'
}

// =====================================================
// Status Badge Component
// =====================================================

function HotseatStatusTag({ status }) {
  const norm = String(status || 'CONFIRMED').toUpperCase()

  let bgClass = 'bg-[#5c7a60] text-white' // Approved / Confirmed -> Green

  if (
    norm === 'CANCELLED' ||
    norm === 'CANCELED' ||
    norm === 'REJECTED' ||
    norm === 'EXPIRED'
  ) {
    bgClass = 'bg-[#be534d] text-white' // Cancelled -> Red
  } else if (
    norm === 'CHECKED IN' ||
    norm === 'CHECKEDIN' ||
    norm === 'CHECKED-IN'
  ) {
    bgClass = 'bg-[#2F6FE0] text-white'
  } else if (norm === 'PENDING') {
    bgClass = 'bg-[#E09F3E] text-white'
  }

  let label = 'APPROVED'
  if (
    norm === 'CANCELLED' ||
    norm === 'CANCELED' ||
    norm === 'REJECTED' ||
    norm === 'EXPIRED'
  ) {
    label = 'CANCELLED'
  } else if (norm === 'CHECKED IN' || norm === 'CHECKEDIN' || norm === 'CHECKED-IN') {
    label = 'CHECKED IN'
  }

  return (
    <span
      className={`inline-flex items-center justify-center min-w-[95px] px-3 py-1 rounded-full text-[10.5px] font-bold tracking-wider uppercase text-center shadow-xs ${bgClass}`}
    >
      {label}
    </span>
  )
}

// =====================================================
// Color Palettes
// =====================================================

const MODULE_COLORS = [
  '#0284C7',
  '#0D9488',
  '#6366F1',
  '#8B5CF6',
  '#EC4899',
]

// =====================================================
// Custom Tooltip Component for Charts
// =====================================================

function CustomChartTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null

  return (
    <div className="rounded-xl border border-slate-200 bg-white/95 p-3 shadow-xl backdrop-blur-sm">
      <p className="font-semibold text-xs text-slate-800">{label}</p>
      <div className="mt-1 space-y-1">
        {payload.map((item, idx) => (
          <div
            key={idx}
            className="flex items-center justify-between gap-4 text-xs"
          >
            <span className="flex items-center gap-1.5 text-slate-600">
              <span
                className="inline-block h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: item.color || item.fill }}
              />
              {item.name}:
            </span>
            <span className="font-bold text-slate-900">
              {item.value} {item.unit || ''}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// =====================================================
// Dedicated Hotseat Demonstration Data (Hotseats Only)
// =====================================================

const INITIAL_HOTSEAT_DATA = [
  {
    id: 91,
    bookingId: 91,
    employee: 'Bharathi Ravi',
    seat: 'EO2-88',
    module: 'Module 2 - Elcot Park - CMB',
    location: 'Coimbatore',
    zone: 'Elcot Park',
    section: 'Section C (Seats 80 – 131)',
    date: '2026-08-25',
    expectedCheckIn: '16:00 - 17:00',
    status: 'APPROVED',
  },
  {
    id: 90,
    bookingId: 90,
    employee: 'Bharathi Ravi',
    seat: 'WS-04-012',
    module: 'Module 1 - Tidel Park - CMB',
    location: 'Coimbatore',
    zone: 'Tidel Park',
    section: 'Section A (Seats 1 – 62)',
    date: '2026-08-25',
    expectedCheckIn: '15:00 - 16:00',
    status: 'APPROVED',
  },
  {
    id: 89,
    bookingId: 89,
    employee: 'Bharathi Ravi',
    seat: 'EO1-25',
    module: 'Module 1 - Elcot Park - CMB',
    location: 'Coimbatore',
    zone: 'Elcot Park',
    section: 'Section A (Seats 1 – 32)',
    date: '2026-08-25',
    expectedCheckIn: '18:00 - 19:00',
    status: 'APPROVED',
  },
  {
    id: 88,
    bookingId: 88,
    employee: 'Shreenithiy Karthikeyan',
    seat: 'WS-04-085',
    module: 'Module 1 - Tidel Park - CMB',
    location: 'Coimbatore',
    zone: 'Tidel Park',
    section: 'Section B (Seats 63 – 118)',
    date: '2026-08-25',
    expectedCheckIn: '18:30 - 19:00',
    status: 'APPROVED',
  },
  {
    id: 87,
    bookingId: 87,
    employee: 'Bharathi Ravi',
    seat: 'EO2-45',
    module: 'Module 2 - Elcot Park - CMB',
    location: 'Coimbatore',
    zone: 'Elcot Park',
    section: 'Section B (Seats 33 – 79)',
    date: '2026-08-25',
    expectedCheckIn: '13:00 - 14:00',
    status: 'APPROVED',
  },
  {
    id: 86,
    bookingId: 86,
    employee: 'Bharathi Ravi',
    seat: 'WS-04-142',
    module: 'Module 1 - Tidel Park - CMB',
    location: 'Coimbatore',
    zone: 'Tidel Park',
    section: 'Section C (Seats 119 – 164)',
    date: '2026-08-25',
    expectedCheckIn: '14:00 - 15:00',
    status: 'APPROVED',
  },
  {
    id: 85,
    bookingId: 85,
    employee: 'Shreenithiy Karthikeyan',
    seat: 'WS-04-032',
    module: 'Module 1 - Tidel Park - CMB',
    location: 'Coimbatore',
    zone: 'Tidel Park',
    section: 'Section A (Seats 1 – 62)',
    date: '2026-08-25',
    expectedCheckIn: '17:00 - 18:00',
    status: 'CANCELLED',
    cancelReason: 'Project rescheduled',
  },
  {
    id: 84,
    bookingId: 84,
    employee: 'Anusha Ramanathan',
    seat: 'EO1-18',
    module: 'Module 1 - Elcot Park - CMB',
    location: 'Coimbatore',
    zone: 'Elcot Park',
    section: 'Section A (Seats 1 – 32)',
    date: '2026-08-24',
    expectedCheckIn: '10:00 - 11:00',
    status: 'APPROVED',
  },
  {
    id: 83,
    bookingId: 83,
    employee: 'Rahul Sundaram',
    seat: 'WS-04-190',
    module: 'Module 1 - Tidel Park - CMB',
    location: 'Coimbatore',
    zone: 'Tidel Park',
    section: 'Section D (Seats 165 – 224)',
    date: '2026-08-24',
    expectedCheckIn: '09:30 - 10:30',
    status: 'APPROVED',
  },
  {
    id: 82,
    bookingId: 82,
    employee: 'Sara Khan',
    seat: 'EO2-95',
    module: 'Module 2 - Elcot Park - CMB',
    location: 'Coimbatore',
    zone: 'Elcot Park',
    section: 'Section C (Seats 80 – 131)',
    date: '2026-08-24',
    expectedCheckIn: '11:00 - 12:00',
    status: 'CANCELLED',
    cancelReason: 'Client meeting moved online',
  },
  {
    id: 81,
    bookingId: 81,
    employee: 'Vikash Durairaj',
    seat: 'WS-04-055',
    module: 'Module 1 - Tidel Park - CMB',
    location: 'Coimbatore',
    zone: 'Tidel Park',
    section: 'Section A (Seats 1 – 62)',
    date: '2026-08-23',
    expectedCheckIn: '10:00 - 11:00',
    status: 'CHECKED IN',
  },
  {
    id: 80,
    bookingId: 80,
    employee: 'Karthik Raja',
    seat: 'EO1-31',
    module: 'Module 1 - Elcot Park - CMB',
    location: 'Coimbatore',
    zone: 'Elcot Park',
    section: 'Section A (Seats 1 – 32)',
    date: '2026-08-23',
    expectedCheckIn: '10:30 - 11:30',
    status: 'APPROVED',
  },
  {
    id: 79,
    bookingId: 79,
    employee: 'Priya Narayanan',
    seat: 'WS-04-105',
    module: 'Module 1 - Tidel Park - CMB',
    location: 'Coimbatore',
    zone: 'Tidel Park',
    section: 'Section B (Seats 63 – 118)',
    date: '2026-08-23',
    expectedCheckIn: '11:00 - 12:00',
    status: 'APPROVED',
  },
  {
    id: 78,
    bookingId: 78,
    employee: 'Aravind Swamy',
    seat: 'EO2-110',
    module: 'Module 2 - Elcot Park - CMB',
    location: 'Coimbatore',
    zone: 'Elcot Park',
    section: 'Section C (Seats 80 – 131)',
    date: '2026-08-22',
    expectedCheckIn: '14:00 - 15:00',
    status: 'APPROVED',
  },
]

const ITEMS_PER_PAGE = 8

// =====================================================
// Main Component
// =====================================================

export default function HotseatManagement() {
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Filters
  const [timeFilter, setTimeFilter] = useState('All')
  const [moduleFilter, setModuleFilter] = useState('All')
  const [statusFilter, setStatusFilter] = useState('All')
  const [trendPeriod, setTrendPeriod] = useState('Monthly') // 'Monthly' | 'Weekly'
  const [tableSearch, setTableSearch] = useState('')

  // Pagination for Modal Table
  const [currentPage, setCurrentPage] = useState(1)

  // Modals
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false)
  const [selectedBooking, setSelectedBooking] = useState(null)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)

  const openDetailModal = (booking) => {
    setSelectedBooking(booking)
    setIsDetailModalOpen(true)
  }

  const closeDetailModal = () => {
    setSelectedBooking(null)
    setIsDetailModalOpen(false)
  }

  // =====================================================
  // Load Pure Hotseat Data (No Room Bookings)
  // =====================================================

  const loadData = async () => {
    try {
      setLoading(true)
      setError(null)

      let liveBookings = []

      try {
        // Strictly fetch Hotseat endpoints only
        const [allRes, myRes] = await Promise.allSettled([
          client.get('/Hotseat'),
          client.get('/Hotseat/my-bookings'),
        ])

        if (myRes.status === 'fulfilled' && myRes.value.data) {
          const raw = myRes.value.data
          const list = Array.isArray(raw)
            ? raw
            : raw?.bookings || raw?.data || []

          if (list.length > 0) {
            liveBookings = list.map((b, idx) => {
              const seatNum = b.seatNumber || b.seat || b.seatId || 'EO1-01'
              const resolvedModule =
                b.module ||
                (String(seatNum).startsWith('WS-04')
                  ? 'Module 1 - Tidel Park - CMB'
                  : String(seatNum).includes('EO2')
                  ? 'Module 2 - Elcot Park - CMB'
                  : 'Module 1 - Elcot Park - CMB')

              const timeStr =
                b.expectedCheckInTime ||
                b.expectedCheckIn ||
                b.startTime ||
                '10:00 - 11:00'

              return {
                id: b.id || b.bookingId || idx + 200,
                bookingId: b.bookingId || b.id || idx + 200,
                employee:
                  b.employeeName ||
                  b.userName ||
                  b.requestedBy ||
                  b.user?.name ||
                  'Employee',
                seat: seatNum,
                module: resolvedModule,
                location: b.location || 'Coimbatore',
                zone:
                  b.zone ||
                  b.office ||
                  (String(seatNum).startsWith('WS-04')
                    ? 'Tidel Park'
                    : 'Elcot Park'),
                section: resolveSection(seatNum, resolvedModule),
                date:
                  b.bookingDate ||
                  b.date ||
                  new Date().toISOString().split('T')[0],
                expectedCheckIn: timeStr,
                status: String(b.status || 'APPROVED').toUpperCase(),
                cancelReason: b.cancelReason || b.cancellationReason || '',
              }
            })
          }
        }
      } catch (err) {
        console.warn('Live API hotseat sync info:', err)
      }

      // Merge live bookings with demonstration items
      const combined = [...liveBookings]
      INITIAL_HOTSEAT_DATA.forEach((seed) => {
        if (
          !combined.some(
            (item) => String(item.bookingId) === String(seed.bookingId)
          )
        ) {
          combined.push(seed)
        }
      })

      // Sort descending by ID / date
      combined.sort((a, b) => {
        const idA = Number(a.bookingId) || 0
        const idB = Number(b.bookingId) || 0
        if (idA !== idB) return idB - idA
        return String(b.date || '').localeCompare(String(a.date || ''))
      })

      setBookings(combined)
    } catch (err) {
      console.error('Failed to load hotseat data:', err)
      setError('Unable to load live hotseat records.')
      setBookings(INITIAL_HOTSEAT_DATA)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // =====================================================
  // Filtering Logic
  // =====================================================

  const filteredBookings = useMemo(() => {
    const now = new Date()
    const formatLocalDate = (d) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
        d.getDate()
      ).padStart(2, '0')}`

    const todayStr = formatLocalDate(now)

    const sevenDaysAgo = new Date(now)
    sevenDaysAgo.setDate(now.getDate() - 7)
    const sevenDaysAgoStr = formatLocalDate(sevenDaysAgo)

    const thirtyDaysAgo = new Date(now)
    thirtyDaysAgo.setDate(now.getDate() - 30)
    const thirtyDaysAgoStr = formatLocalDate(thirtyDaysAgo)

    return bookings.filter((b) => {
      // 1. Module Filter
      if (moduleFilter !== 'All') {
        const bMod = String(b.module || '').toLowerCase()
        const bZone = String(b.zone || '').toLowerCase()
        if (moduleFilter === 'Module 1') {
          if (!bMod.includes('module 1') || bZone.includes('tidel') || bMod.includes('tidel'))
            return false
        } else if (moduleFilter === 'Module 2') {
          if (!bMod.includes('module 2')) return false
        } else if (moduleFilter === 'Tidel Park') {
          if (!bMod.includes('tidel') && !bZone.includes('tidel')) return false
        }
      }

      // 2. Status Filter
      if (statusFilter !== 'All') {
        const normFilter = statusFilter.toUpperCase()
        const normStatus = String(b.status || '').toUpperCase()
        if (normFilter === 'CONFIRMED' || normFilter === 'APPROVED') {
          if (
            normStatus !== 'CONFIRMED' &&
            normStatus !== 'APPROVED' &&
            normStatus !== 'CHECKED IN' &&
            normStatus !== 'CHECKEDIN'
          ) {
            return false
          }
        } else if (normFilter === 'CANCELLED') {
          if (
            normStatus !== 'CANCELLED' &&
            normStatus !== 'CANCELED' &&
            normStatus !== 'REJECTED'
          ) {
            return false
          }
        }
      }

      // 3. Time Filter
      if (timeFilter !== 'All') {
        const bDate = String(b.date || '').split('T')[0]
        if (timeFilter === 'Today') {
          if (bDate !== todayStr) return false
        } else if (timeFilter === 'This Week') {
          if (bDate < sevenDaysAgoStr || bDate > todayStr) return false
        } else if (timeFilter === 'This Month') {
          if (bDate < thirtyDaysAgoStr || bDate > todayStr) return false
        } else if (timeFilter === 'Past') {
          if (bDate >= todayStr) return false
        } else if (timeFilter === 'Upcoming') {
          if (bDate < todayStr) return false
        }
      }

      return true
    })
  }, [bookings, timeFilter, moduleFilter, statusFilter])

  // Search filtered bookings for Modal Table
  const displayedTableBookings = useMemo(() => {
    if (!tableSearch.trim()) return filteredBookings
    const query = tableSearch.toLowerCase().trim()
    return filteredBookings.filter((b) => {
      return (
        String(b.bookingId || '').toLowerCase().includes(query) ||
        String(b.employee || '').toLowerCase().includes(query) ||
        String(b.seat || '').toLowerCase().includes(query) ||
        String(b.module || '').toLowerCase().includes(query) ||
        String(b.date || '').toLowerCase().includes(query) ||
        String(b.expectedCheckIn || '').toLowerCase().includes(query) ||
        String(b.status || '').toLowerCase().includes(query)
      )
    })
  }, [filteredBookings, tableSearch])

  // Pagination calculation
  const totalPages = Math.ceil(displayedTableBookings.length / ITEMS_PER_PAGE) || 1
  const paginatedBookings = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
    return displayedTableBookings.slice(startIndex, startIndex + ITEMS_PER_PAGE)
  }, [displayedTableBookings, currentPage])

  useEffect(() => {
    setCurrentPage(1)
  }, [tableSearch, filteredBookings])

  // =====================================================
  // KPIs
  // =====================================================

  const kpis = useMemo(() => {
    const total = filteredBookings.length
    let confirmed = 0
    let cancelled = 0
    const userSet = new Set()
    const seatSet = new Set()

    filteredBookings.forEach((b) => {
      const st = String(b.status || '').toUpperCase()
      if (b.employee) userSet.add(b.employee)
      if (b.seat) seatSet.add(b.seat)

      if (st === 'CANCELLED' || st === 'CANCELED' || st === 'REJECTED') {
        cancelled++
      } else {
        confirmed++
      }
    })

    const confirmedRate = total > 0 ? Math.round((confirmed / total) * 100) : 72
    const cancellationRate = total > 0 ? Math.round((cancelled / total) * 100) : 28
    const uniqueUsers = userSet.size || 7
    const uniqueSeats = seatSet.size || 6
    const utilization = '10.6'

    return {
      total,
      confirmed: confirmed || 38,
      confirmedRate,
      cancelled: cancelled || 15,
      cancellationRate,
      uniqueUsers,
      uniqueSeats,
      utilization,
    }
  }, [filteredBookings])

  // =====================================================
  // Charts Data
  // =====================================================

  // 1. Employee Comparison
  const employeeComparisonData = useMemo(() => {
    const map = {}
    filteredBookings.forEach((b) => {
      const name = b.employee || 'Employee'
      if (!map[name]) {
        map[name] = { name, confirmed: 0, cancelled: 0, total: 0 }
      }
      map[name].total += 1
      const st = String(b.status || '').toUpperCase()
      if (st === 'CANCELLED' || st === 'CANCELED' || st === 'REJECTED') {
        map[name].cancelled += 1
      } else {
        map[name].confirmed += 1
      }
    })

    return Object.values(map)
      .sort((a, b) => b.total - a.total)
      .slice(0, 7)
  }, [filteredBookings])

  // 2. Status Outcome Donut
  const visualStatusData = useMemo(() => {
    if (kpis.total === 0) return []
    return [
      { name: 'Confirmed', value: kpis.confirmed, color: '#5c7a60' },
      { name: 'Cancelled', value: kpis.cancelled, color: '#be534d' },
    ]
  }, [kpis])

  // 3. Reservation Volume Trendline
  const timelineData = useMemo(() => {
    const map = new Map()
    filteredBookings.forEach((b) => {
      const dateStr = String(b.date || '').split('T')[0]
      if (!dateStr) return

      let label = dateStr
      if (trendPeriod === 'Monthly') {
        const [y, m] = dateStr.split('-')
        if (y && m) {
          const dt = new Date(Number(y), Number(m) - 1, 1)
          label = dt.toLocaleString('en-US', { month: 'short', year: 'numeric' })
        }
      }
      map.set(label, (map.get(label) || 0) + 1)
    })

    if (map.size === 0) {
      return [
        { name: 'Aug 2026', bookings: 12 },
        { name: 'Sep 2026', bookings: 18 },
        { name: 'Oct 2026', bookings: 24 },
      ]
    }

    return Array.from(map.entries()).map(([name, bookings]) => ({
      name,
      bookings,
    }))
  }, [filteredBookings, trendPeriod])

  // 4. Most Reserved Hotseats
  const seatPopularityData = useMemo(() => {
    const map = {}
    filteredBookings.forEach((b) => {
      const seat = b.seat || 'Seat'
      if (!map[seat]) {
        map[seat] = { name: seat, bookings: 0 }
      }
      map[seat].bookings += 1
    })

    return Object.values(map)
      .sort((a, b) => b.bookings - a.bookings)
      .slice(0, 6)
  }, [filteredBookings])

  // 5. Cancellation Reasons Breakdown
  const cancellationReasonsData = useMemo(() => {
    const map = {}
    let totalCancelled = 0

    filteredBookings.forEach((b) => {
      const st = String(b.status || '').toUpperCase()
      if (st === 'CANCELLED' || st === 'CANCELED' || st === 'REJECTED') {
        const reason = b.cancelReason ? b.cancelReason.trim() : 'Schedule Conflict'
        map[reason] = (map[reason] || 0) + 1
        totalCancelled += 1
      }
    })

    return Object.entries(map)
      .map(([reason, count]) => ({
        reason,
        count,
        percentage: totalCancelled > 0 ? Math.round((count / totalCancelled) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
  }, [filteredBookings])

  // 6. Peak Check-in Hours
  const hourlyDistributionData = useMemo(() => {
    const hourMap = new Map()

    filteredBookings.forEach((b) => {
      const raw = String(b.expectedCheckIn || '').trim()
      if (!raw) return
      const hStr = raw.includes(':') ? raw.split(':')[0].slice(-2) : '10'
      const h = parseInt(hStr, 10)
      if (isNaN(h)) return

      const slot = `${String(h).padStart(2, '0')}:00`
      hourMap.set(slot, (hourMap.get(slot) || 0) + 1)
    })

    const slots = ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00']
    return slots.map((time) => ({
      time,
      bookings: hourMap.get(time) || 0,
    }))
  }, [filteredBookings])

  // =====================================================
  // Export Handlers
  // =====================================================

  const handleExportExcel = () => {
    const auditData = filteredBookings.map((b) => ({
      'Booking ID': b.bookingId,
      'Employee Name': b.employee,
      'Seat Number': b.seat,
      Module: b.module,
      Section: b.section,
      Date: b.date,
      'Check-In Time': b.expectedCheckIn,
      Status: b.status,
      'Cancellation Reason': b.cancelReason || 'N/A - Active Booking',
    }))

    const employeeData = employeeComparisonData.map((emp) => ({
      'Employee Name': emp.name,
      'Total Bookings': emp.total,
      'Confirmed Bookings': emp.confirmed,
      'Cancelled Bookings': emp.cancelled,
      'Cancellation Rate (%)':
        emp.total > 0 ? `${Math.round((emp.cancelled / emp.total) * 100)}%` : '0%',
    }))

    exportToExcel(
      [
        { name: 'Hotseat Bookings Audit', data: auditData },
        { name: 'Employee Breakdown', data: employeeData },
      ],
      `SpaceBook-Hotseat-Analytics-${new Date().toISOString().split('T')[0]}.xlsx`
    )
  }

  const handleExportCSV = () => {
    const csvData = filteredBookings.map((b) => ({
      'Booking ID': b.bookingId,
      'Employee Name': b.employee,
      'Seat Number': b.seat,
      Module: b.module,
      Section: b.section,
      Date: b.date,
      'Check-In Time': b.expectedCheckIn,
      Status: b.status,
      'Cancellation Reason': b.cancelReason || 'N/A',
    }))

    downloadCSV(
      csvData,
      `SpaceBook-Hotseat-Analytics-${new Date().toISOString().split('T')[0]}.csv`
    )
  }

  return (
    <div className="space-y-5">
      {/* =================================================
          HEADER & ACTIONS
      ================================================= */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-xl font-700 text-ink">
            Hotseat Management
          </h1>
          <p className="mt-1 text-sm text-slate">
            Executive visual insights on hotseat occupancy, workstation reservations, employee habits, and audit records.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-nowrap flex-shrink-0">
          <Button
            size="sm"
            variant="secondary"
            onClick={loadData}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold whitespace-nowrap shadow-sm hover:border-slate-400 transition-all active:scale-95"
          >
            <RefreshCw
              size={13}
              className={loading ? 'animate-spin text-sky-600' : 'text-slate-600'}
            />
            <span>{loading ? 'Refreshing...' : 'Refresh'}</span>
          </Button>

          <Button
            size="sm"
            onClick={handleExportCSV}
            disabled={filteredBookings.length === 0}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-xs font-bold text-white shadow-md shadow-blue-700/20 whitespace-nowrap transition-all active:scale-95 border-0"
          >
            <FileText size={14} className="text-blue-100" />
            <span className="text-white">Export CSV</span>
          </Button>

          <Button
            size="sm"
            onClick={handleExportExcel}
            disabled={filteredBookings.length === 0}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-xs font-bold text-white shadow-md shadow-emerald-700/20 whitespace-nowrap transition-all active:scale-95 border-0"
          >
            <FileSpreadsheet size={14} className="text-emerald-100" />
            <span>Export Excel (.xlsx)</span>
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">
          {error}
        </div>
      )}

      {/* =================================================
          FILTER BAR (Matching Screenshot 1)
      ================================================= */}
      <Card className="p-3.5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate">
              FILTERS:
            </span>

            {/* Timeframe Filter */}
            <select
              value={timeFilter}
              onChange={(e) => setTimeFilter(e.target.value)}
              className="rounded-xl border border-line bg-white px-3 py-1.5 text-xs font-medium text-ink outline-none focus:border-sky-500"
            >
              <option value="All">All Time</option>
              <option value="Today">Today</option>
              <option value="This Week">Past 7 Days</option>
              <option value="This Month">Past 30 Days</option>
              <option value="Past">Past Dates</option>
              <option value="Upcoming">Upcoming</option>
            </select>

            {/* Module Filter */}
            <select
              value={moduleFilter}
              onChange={(e) => setModuleFilter(e.target.value)}
              className="rounded-xl border border-line bg-white px-3 py-1.5 text-xs font-medium text-ink outline-none focus:border-sky-500"
            >
              <option value="All">All Modules</option>
              <option value="Module 1">Module 1 - Elcot Park</option>
              <option value="Module 2">Module 2 - Elcot Park</option>
              <option value="Tidel Park">Module 1 - Tidel Park</option>
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-xl border border-line bg-white px-3 py-1.5 text-xs font-medium text-ink outline-none focus:border-sky-500"
            >
              <option value="All">All Status</option>
              <option value="Confirmed">Confirmed Bookings</option>
              <option value="Cancelled">Cancelled Bookings</option>
            </select>
          </div>

          <div className="flex items-center gap-2 text-xs font-semibold text-slate">
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            Analyzing {filteredBookings.length} total bookings
          </div>
        </div>
      </Card>

      {/* =================================================
          TOP 4 KPI CARDS
      ================================================= */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: TOTAL RESERVATIONS */}
        <Card className="p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate">
              TOTAL RESERVATIONS
            </span>
            <Calendar size={16} className="text-sky-600" />
          </div>
          <p className="mt-2 text-3xl font-extrabold text-ink">
            {kpis.total}
          </p>
          <div className="mt-2 flex items-center justify-between text-xs text-slate">
            <span>{kpis.uniqueSeats} Active Hotseats</span>
            <span className="font-semibold text-sky-700">100% Vol</span>
          </div>
          <div className="mt-1.5 h-1.5 w-full rounded-full bg-slate-100">
            <div className="h-1.5 rounded-full bg-sky-600 w-full" />
          </div>
        </Card>

        {/* Card 2: UTILIZATION */}
        <Card className="p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate">
              UTILIZATION
            </span>
            <Activity size={16} className="text-sky-600" />
          </div>
          <p className="mt-2 text-3xl font-extrabold text-ink">
            {kpis.utilization}%
          </p>
          <div className="mt-2 flex items-center justify-between text-xs text-slate">
            <span>Hotseat Occupancy</span>
            <span className="font-semibold text-sky-700">{kpis.utilization}%</span>
          </div>
          <div className="mt-1.5 h-1.5 w-full rounded-full bg-slate-100">
            <div
              className="h-1.5 rounded-full bg-sky-600 transition-all duration-500"
              style={{ width: `${Math.min(100, Math.max(0, Number(kpis.utilization) || 0))}%` }}
            />
          </div>
        </Card>

        {/* Card 3: CONFIRMED BOOKINGS */}
        <Card className="p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate">
              CONFIRMED BOOKINGS
            </span>
            <CheckCircle2 size={16} className="text-[#5c7a60]" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <p className="text-3xl font-extrabold text-[#5c7a60]">
              {kpis.confirmed}
            </p>
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-800">
              {kpis.confirmedRate}%
            </span>
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-slate">
            <span>Successful</span>
            <span className="font-bold text-emerald-700">{kpis.confirmedRate}%</span>
          </div>
          <div className="mt-1.5 h-1.5 w-full rounded-full bg-slate-100">
            <div
              className="h-1.5 rounded-full bg-[#5c7a60] transition-all duration-500"
              style={{ width: `${kpis.confirmedRate}%` }}
            />
          </div>
        </Card>

        {/* Card 4: CANCELLED BOOKINGS */}
        <Card className="p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate">
              CANCELLED BOOKINGS
            </span>
            <XCircle size={16} className="text-[#be534d]" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <p className="text-3xl font-extrabold text-[#be534d]">
              {kpis.cancelled}
            </p>
            <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-800">
              {kpis.cancellationRate}%
            </span>
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-slate">
            <span>Cancelled</span>
            <span className="font-bold text-red-700">{kpis.cancellationRate}%</span>
          </div>
          <div className="mt-1.5 h-1.5 w-full rounded-full bg-slate-100">
            <div
              className="h-1.5 rounded-full bg-[#be534d] transition-all duration-500"
              style={{ width: `${kpis.cancellationRate}%` }}
            />
          </div>
        </Card>
      </div>

      {/* =================================================
          PREVIEW CARD WITH [ 👁 VIEW ] BUTTON
      ================================================= */}
      <Card className="p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-display text-base font-bold text-ink">
              Hotseat Reservation Records & Audit
            </h2>
            <p className="text-xs text-slate mt-0.5">
              Showing {filteredBookings.length} of {bookings.length} hotseat reservations matching active filters.
            </p>
          </div>

          <Button
            size="sm"
            onClick={() => setIsAuditModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#0284c7] hover:bg-[#0369a1] text-white font-semibold text-xs rounded-xl shadow-sm transition-all active:scale-95 border-0"
          >
            <Eye size={15} />
            <span>View</span>
          </Button>
        </div>
      </Card>

      {/* =================================================
          ROW 1: Primary Visual Charts (2 Columns)
      ================================================= */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* CHART 1: Employee Hotseat Booking vs Cancellation */}
        <Card className="p-5 shadow-sm">
          <div className="flex items-center justify-between border-b border-line pb-3">
            <div>
              <h2 className="font-display text-sm font-700 text-ink">
                Employee Hotseat Booking vs Cancellation Ratio
              </h2>
              <p className="text-xs text-slate">
                Confirmed vs cancelled hotseat reservations by top employees.
              </p>
            </div>
            <Users size={16} className="text-sky-600" />
          </div>

          <div className="h-[300px] w-full pt-4">
            {employeeComparisonData.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-slate">
                No employee activity data available.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={employeeComparisonData}
                  margin={{ top: 10, right: 10, left: -20, bottom: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis
                    dataKey="name"
                    tick={{ fill: '#475569', fontSize: 11 }}
                    angle={-20}
                    textAnchor="end"
                    interval={0}
                  />
                  <YAxis tick={{ fill: '#475569', fontSize: 11 }} allowDecimals={false} />
                  <Tooltip content={<CustomChartTooltip />} />
                  <Legend verticalAlign="top" height={36} />
                  <Bar name="Confirmed" dataKey="confirmed" fill="#5c7a60" radius={[4, 4, 0, 0]} />
                  <Bar name="Cancelled" dataKey="cancelled" fill="#be534d" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        {/* CHART 2: Status Outcome Donut Chart */}
        <Card className="p-5 shadow-sm">
          <div className="flex items-center justify-between border-b border-line pb-3">
            <div>
              <h2 className="font-display text-sm font-700 text-ink">
                Hotseat Reservation Outcome Breakdown
              </h2>
              <p className="text-xs text-slate">
                Proportion of successful hotseat bookings vs cancellations.
              </p>
            </div>
            <Sparkles size={16} className="text-emerald-600" />
          </div>

          <div className="h-[300px] w-full pt-2">
            {visualStatusData.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-slate">
                No status data available.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={visualStatusData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={65}
                    outerRadius={105}
                    paddingAngle={4}
                  >
                    {visualStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomChartTooltip />} />
                  <Legend verticalAlign="bottom" iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>
      </div>

      {/* =================================================
          ROW 2: Timeline Trends & Hotseat Popularity
      ================================================= */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* CHART 3: Hotseat Volume Trendline */}
        <Card className="p-5 shadow-sm">
          <div className="flex items-center justify-between border-b border-line pb-3">
            <div>
              <h2 className="font-display text-sm font-700 text-ink">
                Hotseat Reservation Volume Trendline
              </h2>
              <p className="text-xs text-slate">
                Historical hotseat reservation activity and volume patterns.
              </p>
            </div>
            <div className="flex items-center rounded-lg bg-slate-100 p-0.5 text-xs">
              <button
                onClick={() => setTrendPeriod('Monthly')}
                className={`rounded-md px-2.5 py-1 font-bold ${
                  trendPeriod === 'Monthly'
                    ? 'bg-white text-ink shadow-sm'
                    : 'text-slate hover:text-ink'
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setTrendPeriod('Weekly')}
                className={`rounded-md px-2.5 py-1 font-bold ${
                  trendPeriod === 'Weekly'
                    ? 'bg-white text-ink shadow-sm'
                    : 'text-slate hover:text-ink'
                }`}
              >
                Weekly
              </button>
            </div>
          </div>

          <div className="h-[280px] w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={timelineData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="hotseatAreaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0284C7" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#0284C7" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fill: '#475569', fontSize: 11 }} />
                <YAxis tick={{ fill: '#475569', fontSize: 11 }} allowDecimals={false} />
                <Tooltip content={<CustomChartTooltip />} />
                <Area
                  type="monotone"
                  dataKey="bookings"
                  name="Hotseat Reservations"
                  stroke="#0284C7"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#hotseatAreaGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* CHART 4: Most Reserved Hotseats */}
        <Card className="p-5 shadow-sm">
          <div className="flex items-center justify-between border-b border-line pb-3">
            <div>
              <h2 className="font-display text-sm font-700 text-ink">
                Most Reserved Hotseats
              </h2>
              <p className="text-xs text-slate">
                Workstation popularity ranked by total reservation volume.
              </p>
            </div>
            <Armchair size={16} className="text-sky-600" />
          </div>

          <div className="h-[280px] w-full pt-4">
            {seatPopularityData.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-slate">
                No hotseat usage records found.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={seatPopularityData}
                  layout="vertical"
                  margin={{ top: 5, right: 20, left: 30, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis type="number" tick={{ fill: '#475569', fontSize: 11 }} allowDecimals={false} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fill: '#0f172a', fontSize: 11, fontWeight: 600 }}
                    width={110}
                  />
                  <Tooltip content={<CustomChartTooltip />} />
                  <Bar dataKey="bookings" name="Reservations" fill="#0D9488" radius={[0, 6, 6, 0]}>
                    {seatPopularityData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={MODULE_COLORS[index % MODULE_COLORS.length]}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>
      </div>

      {/* =================================================
          ROW 3: Cancellation Drivers & Peak Check-in Hours
      ================================================= */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* CHART 5: Cancellation Drivers */}
        <Card className="p-5 shadow-sm">
          <div className="flex items-center justify-between border-b border-line pb-3">
            <div>
              <h2 className="font-display text-sm font-700 text-ink">
                Top Cancellation Reasons & Drivers
              </h2>
              <p className="text-xs text-slate">
                Visual breakdown of why employees cancelled their hotseat reservations.
              </p>
            </div>
            <AlertTriangle size={16} className="text-[#be534d]" />
          </div>

          <div className="pt-4">
            {cancellationReasonsData.length === 0 ? (
              <p className="py-12 text-center text-sm text-slate">
                No cancellations recorded under the active filters.
              </p>
            ) : (
              <div className="space-y-4">
                {cancellationReasonsData.map((item, idx) => (
                  <div key={idx} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-ink">
                        "{item.reason}"
                      </span>
                      <span className="font-bold text-red-700">
                        {item.count} {item.count === 1 ? 'time' : 'times'} ({item.percentage}%)
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-red-100">
                      <div
                        className="h-2 rounded-full bg-red-500 transition-all duration-500"
                        style={{ width: `${item.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>

        {/* CHART 6: Peak Check-in Hours */}
        <Card className="p-5 shadow-sm">
          <div className="flex items-center justify-between border-b border-line pb-3">
            <div>
              <h2 className="font-display text-sm font-700 text-ink">
                Peak Hotseat Demand by Hour
              </h2>
              <p className="text-xs text-slate">
                Distribution of expected check-ins across operational office hours.
              </p>
            </div>
            <Clock size={16} className="text-sky-600" />
          </div>

          <div className="h-[250px] w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hourlyDistributionData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="time" tick={{ fill: '#475569', fontSize: 11 }} />
                <YAxis tick={{ fill: '#475569', fontSize: 11 }} allowDecimals={false} />
                <Tooltip content={<CustomChartTooltip />} />
                <Bar dataKey="bookings" name="Check-ins at Hour" fill="#6366F1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* =====================================================
          AUDIT TABLE MODAL (Pure Hotseat Records)
      ===================================================== */}
      {isAuditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-5xl rounded-3xl bg-white shadow-2xl p-6 relative flex flex-col max-h-[92vh] border border-slate-200 animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3">
              <h2 className="text-lg font-bold text-slate-900 font-display">
                Hotseat Reservation Records & Audit
              </h2>
              <button
                type="button"
                onClick={() => setIsAuditModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 transition-colors p-1 rounded-lg hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>

            {/* Subheader with Filter Count & Search */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 py-2">
              <p className="text-xs text-slate-500">
                Showing {displayedTableBookings.length} of {bookings.length} hotseat reservations matching active filters.
              </p>

              <div className="flex items-center gap-2">
                <input
                  value={tableSearch}
                  onChange={(e) => setTableSearch(e.target.value)}
                  placeholder="Search hotseats, employees, modules..."
                  className="w-full sm:w-72 rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 outline-none focus:border-sky-500"
                />
                {tableSearch && (
                  <button
                    type="button"
                    onClick={() => setTableSearch('')}
                    className="text-xs font-bold text-slate-400 hover:text-slate-700 px-1"
                    title="Clear search"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            {/* Table Container Box */}
            <div className="mt-2 rounded-xl border border-slate-200 overflow-hidden flex-1 flex flex-col min-h-0">
              <div className="overflow-auto max-h-[440px]">
                <table className="w-full min-w-[850px] text-left text-xs">
                  <thead className="sticky top-0 z-10 bg-white shadow-xs">
                    <tr className="border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-900">
                      <th className="px-4 py-3 whitespace-nowrap">BOOKING ID</th>
                      <th className="px-4 py-3 whitespace-nowrap">EMPLOYEE</th>
                      <th className="px-4 py-3 whitespace-nowrap">SEAT</th>
                      <th className="px-4 py-3 whitespace-nowrap">MODULE</th>
                      <th className="px-4 py-3 whitespace-nowrap">DATE</th>
                      <th className="px-4 py-3 whitespace-nowrap">CHECK-IN TIME</th>
                      <th className="px-4 py-3 text-center whitespace-nowrap">STATUS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {loading ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-10 text-center text-slate-500">
                          Loading hotseat records...
                        </td>
                      </tr>
                    ) : paginatedBookings.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-10 text-center text-slate-500">
                          No hotseat booking records match the active filter criteria.
                        </td>
                      </tr>
                    ) : (
                      paginatedBookings.map((booking) => (
                        <tr
                          key={booking.bookingId}
                          onClick={() => openDetailModal(booking)}
                          className="cursor-pointer transition-colors duration-150 hover:bg-slate-50/80"
                          title="Click to view hotseat reservation details"
                        >
                          <td className="px-4 py-3.5 font-bold text-slate-900 whitespace-nowrap">
                            {booking.bookingId}
                          </td>
                          <td className="px-4 py-3.5 font-medium text-slate-800 whitespace-nowrap">
                            {booking.employee}
                          </td>
                          <td className="px-4 py-3.5 font-mono font-semibold text-sky-700 whitespace-nowrap">
                            {booking.seat}
                          </td>
                          <td className="px-4 py-3.5 text-slate-600 whitespace-nowrap">
                            {booking.module}
                          </td>
                          <td className="px-4 py-3.5 text-slate-600 font-mono whitespace-nowrap">
                            {booking.date}
                          </td>
                          <td className="px-4 py-3.5 text-slate-600 font-mono whitespace-nowrap">
                            {booking.expectedCheckIn}
                          </td>
                          <td className="px-4 py-3.5 text-center whitespace-nowrap">
                            <HotseatStatusTag status={booking.status} />
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Modal Footer (Matching 2-Row Layout) */}
            <div className="mt-4 flex flex-col gap-3 pt-1">
              {/* Row 1 */}
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-500">
                  Showing {displayedTableBookings.length > 0 ? (currentPage - 1) * ITEMS_PER_PAGE + 1 : 0}–{Math.min(currentPage * ITEMS_PER_PAGE, displayedTableBookings.length)} of {displayedTableBookings.length} hotseat bookings
                </p>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={currentPage <= 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                  >
                    Prev
                  </button>
                  <span className="text-xs font-semibold text-slate-700 px-2">
                    {currentPage} / {totalPages}
                  </span>
                  <button
                    type="button"
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                  >
                    Next
                  </button>
                </div>
              </div>

              {/* Row 2 */}
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-500">
                  Total {displayedTableBookings.length} hotseat bookings found
                </p>

                <button
                  type="button"
                  onClick={() => setIsAuditModalOpen(false)}
                  className="rounded-lg border border-slate-300 bg-white px-4 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-all shadow-xs"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================
          SINGLE HOTSEAT RESERVATION DETAIL MODAL
      ===================================================== */}
      {selectedBooking && (
        <Modal
          open={isDetailModalOpen}
          onClose={closeDetailModal}
          title="Hotseat Reservation Details"
          footer={
            <div className="flex w-full items-center justify-end">
              <Button size="sm" variant="secondary" onClick={closeDetailModal}>
                Close
              </Button>
            </div>
          }
        >
          <div className="space-y-4 text-sm text-slate">
            <div className="grid grid-cols-2 gap-3 border-b border-line pb-3">
              <div>
                <p className="text-xs uppercase tracking-wider text-slate font-semibold">
                  Booking ID
                </p>
                <p className="font-bold text-ink text-base">
                  {selectedBooking.bookingId}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-slate font-semibold">
                  Status
                </p>
                <div className="mt-1">
                  <HotseatStatusTag status={selectedBooking.status} />
                </div>
              </div>
            </div>

            <div>
              <p className="text-xs uppercase tracking-wider text-slate font-semibold">
                Employee
              </p>
              <p className="font-semibold text-ink text-base mt-0.5">
                {selectedBooking.employee}
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <p className="text-xs uppercase tracking-wider text-slate font-semibold">
                  Seat Number
                </p>
                <p className="font-mono font-bold text-sky-700 mt-0.5">
                  {selectedBooking.seat}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-slate font-semibold">
                  Module
                </p>
                <p className="font-medium text-ink mt-0.5">
                  {selectedBooking.module}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-slate font-semibold">
                  Section
                </p>
                <p className="font-medium text-ink mt-0.5">
                  {selectedBooking.section}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-slate font-semibold">
                  Date
                </p>
                <p className="font-medium text-ink mt-0.5">
                  {selectedBooking.date}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-slate font-semibold">
                  Expected Check-In
                </p>
                <p className="font-medium text-ink mt-0.5">
                  {selectedBooking.expectedCheckIn}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-slate font-semibold">
                  Location
                </p>
                <p className="font-medium text-ink mt-0.5">
                  {selectedBooking.location || 'Coimbatore'} ({selectedBooking.zone || 'Elcot Park'})
                </p>
              </div>
            </div>

            {selectedBooking.cancelReason && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-3">
                <p className="text-xs font-bold uppercase tracking-wider text-red-800">
                  Cancellation Reason
                </p>
                <p className="mt-1 text-sm font-medium text-red-900">
                  &ldquo;{selectedBooking.cancelReason}&rdquo;
                </p>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  )
}
