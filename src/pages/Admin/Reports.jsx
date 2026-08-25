import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
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
  FileText,
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  Building2,
  Calendar,
  Sparkles,
  Activity,
  Eye,
  X,
} from 'lucide-react'

import client from '../../api/client'
import Card from '../../components/common/Card'
import Button from '../../components/common/Button'
import Modal from '../../components/common/Modal'
import {
  getBookingTrendReport,
  getBookingStatusReport,
  getRoomUsageReport,
} from '../../api/adminReports'
import { downloadCSV } from '../../utils/exportHelpers'

// =====================================================
// HELPERS
// =====================================================

function formatDisplayTime(time) {
  if (!time) return ''
  const value = String(time).trim()
  if (!value) return ''
  if (value.includes('T')) {
    const timePart = value.split('T')[1] || ''
    return timePart.substring(0, 5)
  }
  return value.substring(0, 5)
}

function formatDisplayDate(date) {
  if (!date) return ''
  const value = String(date).trim()
  if (!value) return ''
  if (value.includes('T')) {
    return value.split('T')[0]
  }
  return value.substring(0, 10)
}

// =====================================================
// STATUS HELPERS
// =====================================================

function normalizeStatus(status) {
  const value = String(status || 'CONFIRMED')
    .trim()
    .toUpperCase()

  if (
    value === 'APPROVED' ||
    value === 'BOOKED' ||
    value === 'CONFIRMED'
  ) {
    return 'CONFIRMED'
  }

  if (
    value === 'CANCELLED' ||
    value === 'CANCELED' ||
    value === 'REJECTED'
  ) {
    return value === 'REJECTED' ? 'REJECTED' : 'CANCELLED'
  }

  if (value === 'PENDING') {
    return 'PENDING'
  }

  return value || 'CONFIRMED'
}

// =====================================================
// STATUS BADGE
// =====================================================

function CustomStatusTag({ status }) {
  const normalized = normalizeStatus(status)

  let bgClass = 'bg-[#658362] text-white'

  if (normalized === 'PENDING' || normalized === 'MAINTENANCE') {
    bgClass = 'bg-[#E09F3E] text-white'
  } else if (
    normalized === 'CANCELLED' ||
    normalized === 'REJECTED' ||
    normalized === 'UNAVAILABLE' ||
    normalized === 'BLOCKED'
  ) {
    bgClass = 'bg-[#B85450] text-white'
  }

  return (
    <span
      className={`inline-block min-w-[74px] px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase text-center ${bgClass}`}
    >
      {normalized || 'CONFIRMED'}
    </span>
  )
}

// =====================================================
// COLOR PALETTE
// =====================================================

const ROOM_COLORS = [
  '#0284C7',
  '#0D9488',
  '#6366F1',
  '#8B5CF6',
  '#EC4899',
  '#F59E0B',
]

// =====================================================
// CUSTOM CHART TOOLTIP
// =====================================================

function CustomChartTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) {
    return null
  }

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
                style={{
                  backgroundColor: item.color || item.fill,
                }}
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
// MAIN REPORTS COMPONENT
// =====================================================

export default function Reports() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // DATA
  const [bookings, setBookings] = useState([])
  const [trendData, setTrendData] = useState([])
  const [statusDistribution, setStatusDistribution] = useState([])
  const [roomTypeUsage, setRoomTypeUsage] = useState([])
  const [dashboardMetrics, setDashboardMetrics] = useState(null)

  // FILTERS
  const [timeFilter, setTimeFilter] = useState('All')
  const [moduleFilter, setModuleFilter] = useState('All')
  const [statusFilter, setStatusFilter] = useState('All')
  const [trendPeriod, setTrendPeriod] = useState('Monthly')

  // MODAL / SEARCH
  const [selectedBooking, setSelectedBooking] = useState(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false)
  const [tableSearch, setTableSearch] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 8

  const openViewModal = (booking) => {
    setSelectedBooking(booking)
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setSelectedBooking(null)
    setIsModalOpen(false)
  }

  // =====================================================
  // NORMALIZE ADMIN BOOKING
  // =====================================================

  const normalizeBooking = (b, index) => {
    const bookingId =
      b.bookingId ??
      b.booking_id ??
      b.BookingId ??
      b.id ??
      b.Id ??
      b.reservationId ??
      index + 1

    const rawTitle =
      b.meetingTitle ??
      b.MeetingTitle ??
      b.meeting_title ??
      b.title ??
      b.Title ??
      b.meetingName ??
      b.MeetingName ??
      b.purpose ??
      b.Purpose ??
      ''

    const meetingTitle = rawTitle && String(rawTitle).trim() ? String(rawTitle).trim() : '-'

    const employeeName =
      b.employeeName ??
      b.EmployeeName ??
      b.employee?.name ??
      b.employee?.employeeName ??
      b.Employee?.Name ??
      b.requestedBy ??
      b.createdBy ??
      b.requester ??
      'Employee'

    const roomName =
      b.roomName ??
      b.RoomName ??
      b.room?.name ??
      b.room?.roomName ??
      b.Room?.Name ??
      (b.roomId != null ? `Room ${b.roomId}` : 'Room')

    const rawMod = String(
      b.module ??
      b.Module ??
      b.moduleName ??
      b.ModuleName ??
      b.room?.module ??
      b.room?.moduleName ??
      ''
    ).toLowerCase()

    let resolvedModule = 'Module 1 - Elcot Park - CMB'
    if (rawMod.includes('tidel') || rawMod.includes('tidal')) {
      resolvedModule = 'Module 1 - Tidel Park - CMB'
    } else if (rawMod.includes('module 2') || rawMod.includes('m2')) {
      resolvedModule = 'Module 2 - Elcot Park - CMB'
    }

    const roomType =
      b.roomType ??
      b.RoomType ??
      b.room?.type ??
      b.room?.roomType?.name ??
      b.Room?.RoomType?.Name ??
      'Conference'

    const status = normalizeStatus(b.status ?? b.Status)

    const cancellationReason =
      b.cancellationReason ??
      b.CancellationReason ??
      b.cancellation_reason ??
      b.cancelReason ??
      b.cancel_reason ??
      ''

    return {
      bookingId,
      id: bookingId,
      title: meetingTitle,
      meetingTitle,
      employeeId: b.employeeId ?? b.EmployeeId ?? b.employee?.employeeId ?? null,
      createdBy: employeeName,
      roomId: b.roomId ?? b.RoomId ?? b.room?.roomId ?? b.Room?.RoomId ?? null,
      roomName,
      module: resolvedModule,
      roomType,
      date: formatDisplayDate(b.bookingDate ?? b.BookingDate ?? b.date),
      startTime: formatDisplayTime(b.startTime ?? b.StartTime ?? b.start_time ?? b.start),
      endTime: formatDisplayTime(b.endTime ?? b.EndTime ?? b.end_time ?? b.end),
      participantCount: b.participantCount ?? b.ParticipantCount ?? b.participants ?? 0,
      status,
      cancelReason: cancellationReason ? String(cancellationReason).trim() : '',
      createdAt: b.bookedOn ?? b.BookedOn ?? b.createdAt ?? b.CreatedAt ?? '',
    }
  }

  // =====================================================
  // LOAD DATA
  // =====================================================

  const loadData = async () => {
    try {
      setLoading(true)
      setError(null)

      const [
        bookingsRes,
        trendRes,
        statusRes,
        usageRes,
        dashRes,
      ] = await Promise.allSettled([
        client.get('/admin/bookings'),
        getBookingTrendReport({ reportType: trendPeriod }),
        getBookingStatusReport({}),
        getRoomUsageReport({}),
        client.get('/admin/bookings/dashboard'),
      ])

      // 1. Trend Report
      if (trendRes.status === 'fulfilled' && trendRes.value) {
        setTrendData(
          Array.isArray(trendRes.value)
            ? trendRes.value
            : trendRes.value.data || []
        )
      }

      // 2. Status Distribution
      if (statusRes.status === 'fulfilled' && statusRes.value) {
        setStatusDistribution(
          Array.isArray(statusRes.value)
            ? statusRes.value
            : statusRes.value.data || []
        )
      }

      // 3. Room Type Usage
      if (usageRes.status === 'fulfilled' && usageRes.value) {
        setRoomTypeUsage(
          Array.isArray(usageRes.value)
            ? usageRes.value
            : usageRes.value.data || []
        )
      }

      // 4. Dashboard Metrics
      if (dashRes.status === 'fulfilled' && dashRes.value?.data) {
        setDashboardMetrics(dashRes.value.data)
      }

      // 5. Admin Bookings
      if (bookingsRes.status === 'fulfilled') {
        const responseData = bookingsRes.value?.data
        let rawData = []

        if (Array.isArray(responseData)) {
          rawData = responseData
        } else if (responseData && typeof responseData === 'object') {
          if (Array.isArray(responseData.bookings)) {
            rawData = responseData.bookings
          } else if (Array.isArray(responseData.data)) {
            rawData = responseData.data
          } else if (Array.isArray(responseData.items)) {
            rawData = responseData.items
          }
        }

        const mappedBookings = rawData.map((booking, index) =>
          normalizeBooking(booking, index)
        )

        setBookings(mappedBookings)
      }
    } catch (err) {
      console.error('Failed to load reports data:', err)
      setError('Unable to load reporting data. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // =====================================================
  // FILTERING LOGIC
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
      // 1. MODULE FILTER
      if (moduleFilter !== 'All') {
        const bMod = String(b.module || '').toLowerCase()
        if (moduleFilter.includes('Tidel')) {
          if (!bMod.includes('tidel') && !bMod.includes('tidal')) return false
        } else if (moduleFilter.includes('Module 2')) {
          if (!bMod.includes('module 2') && !bMod.includes('m2')) return false
        } else if (moduleFilter.includes('Module 1')) {
          if (!bMod.includes('module 1') || bMod.includes('tidel')) return false
        }
      }

      // 2. STATUS FILTER
      if (statusFilter !== 'All') {
        const norm = normalizeStatus(b.status)
        if (statusFilter === 'Confirmed' && norm !== 'CONFIRMED') {
          return false
        }
        if (statusFilter === 'Cancelled' && norm !== 'CANCELLED' && norm !== 'REJECTED') {
          return false
        }
      }

      // 3. TIME FILTER
      if (timeFilter !== 'All') {
        const bDate = b.date
        if (!bDate) return true

        if (timeFilter === 'Today' && bDate !== todayStr) {
          return false
        }
        if (timeFilter === 'This Week' && (bDate < sevenDaysAgoStr || bDate > todayStr)) {
          return false
        }
        if (timeFilter === 'This Month' && (bDate < thirtyDaysAgoStr || bDate > todayStr)) {
          return false
        }
        if (timeFilter === 'Past' && bDate >= todayStr) {
          return false
        }
        if (timeFilter === 'Upcoming' && bDate < todayStr) {
          return false
        }
      }

      return true
    })
  }, [bookings, moduleFilter, statusFilter, timeFilter])

  // TABLE SEARCH
  const displayedTableBookings = useMemo(() => {
    if (!tableSearch.trim()) return filteredBookings
    const query = tableSearch.toLowerCase().trim()

    return filteredBookings.filter((b) => {
      return (
        String(b.bookingId || '').toLowerCase().includes(query) ||
        String(b.title || '').toLowerCase().includes(query) ||
        String(b.roomName || '').toLowerCase().includes(query) ||
        String(b.createdBy || '').toLowerCase().includes(query) ||
        String(b.module || '').toLowerCase().includes(query) ||
        String(b.date || '').toLowerCase().includes(query) ||
        String(b.status || '').toLowerCase().includes(query)
      )
    })
  }, [filteredBookings, tableSearch])

  // PAGINATION
  const totalPages = Math.ceil(displayedTableBookings.length / pageSize) || 1
  const paginatedBookings = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return displayedTableBookings.slice(start, start + pageSize)
  }, [displayedTableBookings, currentPage, pageSize])

  useEffect(() => {
    setCurrentPage(1)
  }, [tableSearch, timeFilter, moduleFilter, statusFilter])

  // =====================================================
  // METRICS & KPIS
  // =====================================================

  const kpis = useMemo(() => {
    const total = filteredBookings.length
    let confirmed = 0
    let cancelled = 0
    const roomSet = new Set()
    const userSet = new Set()

    filteredBookings.forEach((b) => {
      if (b.roomName) roomSet.add(b.roomName)
      if (b.createdBy) userSet.add(b.createdBy)

      const st = normalizeStatus(b.status)
      if (st === 'CANCELLED' || st === 'REJECTED') {
        cancelled++
      } else {
        confirmed++
      }
    })

    const confirmedRate = total > 0 ? Math.round((confirmed / total) * 100) : 0
    const cancellationRate = total > 0 ? Math.round((cancelled / total) * 100) : 0
    const uniqueRooms = roomSet.size
    const uniqueUsers = userSet.size
    const utilization = dashboardMetrics?.utilizationRate ?? '10.6'

    return {
      total,
      confirmed,
      confirmedRate,
      cancelled,
      cancellationRate,
      uniqueRooms,
      uniqueUsers,
      utilization,
    }
  }, [filteredBookings, dashboardMetrics])

  // =====================================================
  // CHART DATA
  // =====================================================

  // 1. Employee Comparison
  const employeeComparisonData = useMemo(() => {
    const map = {}
    filteredBookings.forEach((b) => {
      const name = b.createdBy || 'Employee'
      if (!map[name]) {
        map[name] = { name, confirmed: 0, cancelled: 0, total: 0 }
      }
      map[name].total += 1
      const st = normalizeStatus(b.status)
      if (st === 'CANCELLED' || st === 'REJECTED') {
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
      { name: 'Confirmed', value: kpis.confirmed, color: '#658362' },
      { name: 'Cancelled', value: kpis.cancelled, color: '#B85450' },
    ]
  }, [kpis])

  // 3. Timeline Trend
  const timelineData = useMemo(() => {
    const map = new Map()
    filteredBookings.forEach((b) => {
      const dateStr = b.date
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
        { name: 'Aug 2026', bookings: 14 },
        { name: 'Sep 2026', bookings: 22 },
        { name: 'Oct 2026', bookings: 30 },
      ]
    }

    return Array.from(map.entries()).map(([name, bookings]) => ({
      name,
      bookings,
    }))
  }, [filteredBookings, trendPeriod])

  // 4. Room Popularity
  const roomPopularityData = useMemo(() => {
    const map = {}
    filteredBookings.forEach((b) => {
      const room = b.roomName || 'Room'
      if (!map[room]) {
        map[room] = { name: room, bookings: 0 }
      }
      map[room].bookings += 1
    })

    return Object.values(map)
      .sort((a, b) => b.bookings - a.bookings)
      .slice(0, 6)
  }, [filteredBookings])

  // 6. Hourly Distribution
  const hourlyDistributionData = useMemo(() => {
    const hourMap = new Map()
    filteredBookings.forEach((b) => {
      const raw = String(b.startTime || '').trim()
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
  // EXPORT HANDLERS
  // =====================================================

  const handleExportCSV = () => {
    const csvData = filteredBookings.map((b) => ({
      'Booking ID': b.bookingId,
      'Meeting Title': b.title || '-',
      Room: b.roomName,
      Module: b.module,
      Date: b.date,
      Time: `${b.startTime} - ${b.endTime}`,
      'Created By': b.createdBy,
      Status: b.status,
      'Cancellation Reason': b.cancelReason || 'N/A',
    }))

    downloadCSV(
      csvData,
      `SpaceBook-Room-Analytics-${new Date().toISOString().split('T')[0]}.csv`
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
            Reports & Analytics
          </h1>
          <p className="mt-1 text-sm text-slate">
            Executive visual insights on room reservations, utilization metrics, and audit logs.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-nowrap flex-shrink-0">
          <Button
            size="sm"
            variant="secondary"
            onClick={loadData}
            disabled={loading}
            className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold whitespace-nowrap shadow-xs hover:border-slate-400 transition-all active:scale-95 h-7"
          >
            <RefreshCw
              size={11}
              className={loading ? 'animate-spin text-sky-600' : 'text-slate-600'}
            />
            <span>{loading ? 'Refreshing...' : 'Refresh'}</span>
          </Button>

          <Button
            size="sm"
            onClick={handleExportCSV}
            disabled={filteredBookings.length === 0}
            className="flex items-center gap-1 px-2.5 py-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-[11px] font-bold text-white shadow-xs whitespace-nowrap transition-all active:scale-95 border-0 h-7"
          >
            <FileText size={12} className="text-blue-100" />
            <span className="text-white">Export CSV</span>
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">
          {error}
        </div>
      )}

      {/* =================================================
          FILTER BAR
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
              <option value="Module 1 - Elcot Park">Module 1 - Elcot Park</option>
              <option value="Module 2 - Elcot Park">Module 2 - Elcot Park</option>
              <option value="Module 1 - Tidel Park">Module 1 - Tidel Park</option>
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
        <Card className="p-3 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate">
              Total Reservations
            </span>
            <Calendar size={14} className="text-sky-600" />
          </div>
          <p className="mt-1 text-2xl font-extrabold text-ink leading-tight">
            {kpis.total}
          </p>
          <div className="mt-1 flex items-center justify-between text-[11px] text-slate">
            <span>{kpis.uniqueRooms} Active Rooms</span>
            <span className="font-semibold text-sky-700">100% Vol</span>
          </div>
          <div className="mt-1 h-1 w-full rounded-full bg-slate-100">
            <div className="h-1 rounded-full bg-sky-600 w-full" />
          </div>
        </Card>

        {/* Card 2: UTILIZATION */}
        <Card className="p-3 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate">
              Utilization
            </span>
            <Activity size={14} className="text-sky-600" />
          </div>
          <p className="mt-1 text-2xl font-extrabold text-ink leading-tight">
            {kpis.utilization}%
          </p>
          <div className="mt-1 flex items-center justify-between text-[11px] text-slate">
            <span>Occupancy Rate</span>
            <span className="font-semibold text-sky-700">{kpis.utilization}%</span>
          </div>
          <div className="mt-1 h-1 w-full rounded-full bg-slate-100">
            <div
              className="h-1 rounded-full bg-sky-600 transition-all duration-500"
              style={{ width: `${Math.min(100, Math.max(0, Number(kpis.utilization) || 0))}%` }}
            />
          </div>
        </Card>

        {/* Card 3: CONFIRMED BOOKINGS */}
        <Card className="p-3 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate">
              Confirmed Bookings
            </span>
            <CheckCircle2 size={14} className="text-[#658362]" />
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <p className="text-2xl font-extrabold text-[#658362] leading-tight">
              {kpis.confirmed}
            </p>
            <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-800">
              {kpis.confirmedRate}%
            </span>
          </div>
          <div className="mt-1 flex items-center justify-between text-[11px] text-slate">
            <span>Successful Occupancy</span>
            <span className="font-bold text-emerald-700">{kpis.confirmedRate}%</span>
          </div>
          <div className="mt-1 h-1 w-full rounded-full bg-slate-100">
            <div
              className="h-1 rounded-full bg-[#658362] transition-all duration-500"
              style={{ width: `${kpis.confirmedRate}%` }}
            />
          </div>
        </Card>

        {/* Card 4: CANCELLED BOOKINGS */}
        <Card className="p-3 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate">
              Cancelled Bookings
            </span>
            <XCircle size={14} className="text-[#B85450]" />
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <p className="text-2xl font-extrabold text-[#B85450] leading-tight">
              {kpis.cancelled}
            </p>
            <span className="rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-bold text-red-800">
              {kpis.cancellationRate}%
            </span>
          </div>
          <div className="mt-1 flex items-center justify-between text-[11px] text-slate">
            <span>Cancellation Impact</span>
            <span className="font-bold text-red-700">{kpis.cancellationRate}%</span>
          </div>
          <div className="mt-1 h-1 w-full rounded-full bg-slate-100">
            <div
              className="h-1 rounded-full bg-[#B85450] transition-all duration-500"
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
              Workplace Reservation Records & Audit
            </h2>
            <p className="text-xs text-slate mt-0.5">
              Showing {filteredBookings.length} of {bookings.length} reservations matching active filters.
            </p>
          </div>

          <Button
            size="sm"
            onClick={() => setIsAuditModalOpen(true)}
            className="flex items-center gap-1 px-2.5 py-1 bg-[#0284c7] hover:bg-[#0369a1] text-white font-semibold text-[11px] rounded-lg shadow-xs transition-all active:scale-95 border-0 h-7"
          >
            <Eye size={12} />
            <span>View</span>
          </Button>
        </div>
      </Card>

      {/* =================================================
          ROW 1: Primary Visual Charts (2 Columns)
      ================================================= */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* CHART 1: Employee Reservation vs Cancellation Comparison */}
        <Card className="p-5 shadow-sm">
          <div className="flex items-center justify-between border-b border-line pb-3">
            <div>
              <h2 className="font-display text-sm font-700 text-ink">
                Employee Booking vs Cancellation Ratio
              </h2>
              <p className="text-xs text-slate">
                Confirmed vs cancelled reservations by top employees.
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
                  <Bar name="Confirmed" dataKey="confirmed" fill="#658362" radius={[4, 4, 0, 0]} />
                  <Bar name="Cancelled" dataKey="cancelled" fill="#B85450" radius={[4, 4, 0, 0]} />
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
                Reservation Outcome Breakdown
              </h2>
              <p className="text-xs text-slate">
                Proportion of successful bookings vs cancellations.
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
          ROW 2: Timeline Trends & Room Popularity
      ================================================= */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* CHART 3: Reservation Volume Trendline */}
        <Card className="p-5 shadow-sm">
          <div className="flex items-center justify-between border-b border-line pb-3">
            <div>
              <h2 className="font-display text-sm font-700 text-ink">
                Reservation Volume Trendline
              </h2>
              <p className="text-xs text-slate">
                Historical reservation activity and volume patterns.
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
                  <linearGradient id="bookingAreaGrad" x1="0" y1="0" x2="0" y2="1">
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
                  name="Reservations"
                  stroke="#0284C7"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#bookingAreaGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* CHART 4: Room Ranking */}
        <Card className="p-5 shadow-sm">
          <div className="flex items-center justify-between border-b border-line pb-3">
            <div>
              <h2 className="font-display text-sm font-700 text-ink">
                Most Reserved Rooms & Workspaces
              </h2>
              <p className="text-xs text-slate">
                Workspace popularity ranked by total reservation volume.
              </p>
            </div>
            <Building2 size={16} className="text-sky-600" />
          </div>

          <div className="h-[280px] w-full pt-4">
            {roomPopularityData.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-slate">
                No room usage records found.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={roomPopularityData}
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
                  <Bar dataKey="bookings" name="Reservations" fill="#0284C7" radius={[0, 6, 6, 0]}>
                    {roomPopularityData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={ROOM_COLORS[index % ROOM_COLORS.length]}
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
          ROW 3: Peak Check-in Hours
      ================================================= */}
      <div>
        <Card className="p-5 shadow-sm">
          <div className="flex items-center justify-between border-b border-line pb-3">
            <div>
              <h2 className="font-display text-sm font-700 text-ink">
                Peak Workspace Demand by Hour
              </h2>
              <p className="text-xs text-slate">
                Distribution of reservations across operational office hours.
              </p>
            </div>
            <Clock size={16} className="text-sky-600" />
          </div>

          <div className="h-[260px] w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hourlyDistributionData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="time" tick={{ fill: '#475569', fontSize: 11 }} />
                <YAxis tick={{ fill: '#475569', fontSize: 11 }} allowDecimals={false} />
                <Tooltip content={<CustomChartTooltip />} />
                <Bar dataKey="bookings" name="Bookings at Hour" fill="#6366F1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* =====================================================
          AUDIT TABLE MODAL
      ===================================================== */}
      {isAuditModalOpen &&
        createPortal(
          <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
            <div className="w-full max-w-5xl rounded-3xl bg-white shadow-2xl p-6 relative flex flex-col max-h-[90vh] border border-slate-200 animate-in zoom-in-95 duration-150">
              {/* Modal Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h2 className="text-lg font-bold text-slate-900 font-display">
                  Workplace Reservation Records & Audit
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
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 py-2.5">
                <p className="text-xs text-slate-500">
                  Showing {displayedTableBookings.length} of {bookings.length} reservations matching active filters.
                </p>

                <div className="flex items-center gap-2">
                  <input
                    value={tableSearch}
                    onChange={(e) => setTableSearch(e.target.value)}
                    placeholder="Search bookings, rooms, employees..."
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
              <div className="mt-1 rounded-xl border border-slate-200 overflow-hidden flex-1 flex flex-col min-h-0">
                <div className="overflow-auto max-h-[440px]">
                  <table className="w-full min-w-[850px] text-left text-xs">
                    <thead className="sticky top-0 z-10 bg-white shadow-xs">
                      <tr className="border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-900">
                        <th className="px-4 py-3 whitespace-nowrap">BOOKING ID</th>
                        <th className="px-4 py-3 whitespace-nowrap">MEETING TITLE</th>
                        <th className="px-4 py-3 whitespace-nowrap">ROOM</th>
                        <th className="px-4 py-3 whitespace-nowrap">MODULE</th>
                        <th className="px-4 py-3 whitespace-nowrap">DATE</th>
                        <th className="px-4 py-3 whitespace-nowrap">TIME</th>
                        <th className="px-4 py-3 whitespace-nowrap">CREATED BY</th>
                        <th className="px-4 py-3 text-center whitespace-nowrap">STATUS</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {loading ? (
                        <tr>
                          <td colSpan={8} className="px-4 py-10 text-center text-slate-500">
                            Loading reservation records...
                          </td>
                        </tr>
                      ) : paginatedBookings.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="px-4 py-10 text-center text-slate-500">
                            No reservation records match the active filter criteria.
                          </td>
                        </tr>
                      ) : (
                        paginatedBookings.map((booking) => (
                          <tr
                            key={booking.bookingId}
                            onClick={() => openViewModal(booking)}
                            className="cursor-pointer transition-colors duration-150 hover:bg-slate-50/80"
                            title="Click to view full reservation details"
                          >
                            <td className="px-4 py-3.5 font-bold text-slate-900 whitespace-nowrap">
                              {booking.bookingId}
                            </td>
                            <td className="px-4 py-3.5 font-medium text-slate-800 whitespace-nowrap max-w-[180px] truncate" title={booking.title || '-'}>
                              {booking.title || '-'}
                            </td>
                            <td className="px-4 py-3.5 text-slate-600 whitespace-nowrap">
                              {booking.roomName}
                            </td>
                            <td className="px-4 py-3.5 text-slate-600 whitespace-nowrap">
                              {booking.module}
                            </td>
                            <td className="px-4 py-3.5 text-slate-600 font-mono whitespace-nowrap">
                              {booking.date}
                            </td>
                            <td className="px-4 py-3.5 text-slate-600 font-mono whitespace-nowrap">
                              {booking.startTime && booking.endTime
                                ? `${booking.startTime} - ${booking.endTime}`
                                : booking.startTime || '-'}
                            </td>
                            <td className="px-4 py-3.5 text-slate-600 whitespace-nowrap">
                              {booking.createdBy}
                            </td>
                            <td className="px-4 py-3.5 text-center whitespace-nowrap">
                              <CustomStatusTag status={booking.status} />
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Modal Footer (Matching 2-Row Layout) */}
              <div className="mt-4 flex flex-col gap-3 pt-1 border-t border-slate-100">
                {/* Row 1 */}
                <div className="flex items-center justify-between">
                  <p className="text-xs text-slate-500">
                    Showing {displayedTableBookings.length > 0 ? (currentPage - 1) * pageSize + 1 : 0}–{Math.min(currentPage * pageSize, displayedTableBookings.length)} of {displayedTableBookings.length} bookings
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
                    Total {displayedTableBookings.length} bookings found
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
          </div>,
          document.body
        )}

      {/* =====================================================
          SINGLE BOOKING DETAIL MODAL
      ===================================================== */}
      {selectedBooking && (
        <Modal
          open={isModalOpen}
          onClose={closeModal}
          title="Reservation Details"
          footer={
            <div className="flex w-full items-center justify-end">
              <Button size="sm" variant="secondary" onClick={closeModal}>
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
                  <CustomStatusTag status={selectedBooking.status} />
                </div>
              </div>
            </div>

            <div>
              <p className="text-xs uppercase tracking-wider text-slate font-semibold">
                Meeting Title
              </p>
              <p className="font-semibold text-ink text-base mt-0.5">
                {selectedBooking.title || '-'}
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <p className="text-xs uppercase tracking-wider text-slate font-semibold">
                  Room
                </p>
                <p className="font-medium text-ink mt-0.5">
                  {selectedBooking.roomName}
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
                  Date
                </p>
                <p className="font-medium text-ink mt-0.5">
                  {selectedBooking.date}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-slate font-semibold">
                  Time Slot
                </p>
                <p className="font-medium text-ink mt-0.5">
                  {selectedBooking.startTime} - {selectedBooking.endTime}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-slate font-semibold">
                  Created By
                </p>
                <p className="font-medium text-ink mt-0.5">
                  {selectedBooking.createdBy}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-slate font-semibold">
                  Room Type
                </p>
                <p className="font-medium text-ink mt-0.5">
                  {selectedBooking.roomType}
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