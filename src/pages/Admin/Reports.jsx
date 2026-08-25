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
  Building2,
  AlertTriangle,
  Calendar,
  Sparkles,
  Activity,
  Eye,
} from 'lucide-react'

import client from '../../api/client'
import Card from '../../components/common/Card'
import Button from '../../components/common/Button'
import Modal from '../../components/common/Modal'
import {
  getBookingTrendReport,
  getBookingStatusReport,
  getRoomUsageReport,
  exportBookingsCsv,
} from '../../api/adminReports'
import { downloadCSV, exportToExcel } from '../../utils/exportHelpers'

// =====================================================
// STATUS BADGE
// =====================================================

function formatDisplayTime(time) {
  if (!time) return ''
  const value = String(time).trim()
  if (value.includes('T')) {
    const timePart = value.split('T')[1] || ''
    return timePart.substring(0, 5)
  }
  return value.substring(0, 5)
}

function CustomStatusTag({ status }) {
  const raw = String(status || 'CONFIRMED').toUpperCase()
  const normalized = raw === 'BOOKED' ? 'CONFIRMED' : raw

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
// Color Palettes
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
// Main Reports Component
// =====================================================

export default function Reports() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Live raw bookings
  const [bookings, setBookings] = useState([])

  // Analytics endpoints
  const [trendData, setTrendData] = useState([])
  const [statusDistribution, setStatusDistribution] = useState([])
  const [roomTypeUsage, setRoomTypeUsage] = useState([])
  const [dashboardMetrics, setDashboardMetrics] = useState(null)

  // Filters
  const [timeFilter, setTimeFilter] = useState('All')
  const [moduleFilter, setModuleFilter] = useState('All')
  const [statusFilter, setStatusFilter] = useState('All')
  const [trendPeriod, setTrendPeriod] = useState('Monthly') // 'Monthly' | 'Weekly'

  // Table state & modal
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
  // Load Data
  // =====================================================

  const loadData = async () => {
    try {
      setLoading(true)
      setError(null)

      const [bookingsRes, trendRes, statusRes, usageRes, dashRes, roomsRes] =
        await Promise.allSettled([
          client.get('/admin/bookings'),
          getBookingTrendReport({ reportType: trendPeriod }),
          getBookingStatusReport({}),
          getRoomUsageReport({}),
          client.get('/admin/dashboard'),
          client.get('/rooms'),
        ])

      if (dashRes.status === 'fulfilled' && dashRes.value?.data) {
        setDashboardMetrics(dashRes.value.data)
      }

      // Room Map for Module & Type resolution
      const roomMap = {}
      if (roomsRes.status === 'fulfilled' && roomsRes.value?.data) {
        const list = Array.isArray(roomsRes.value.data)
          ? roomsRes.value.data
          : roomsRes.value.data?.data || []
        list.forEach((r) => {
          const key = r.id ?? r.roomId
          if (key) roomMap[key] = r
          if (r.roomName) roomMap[String(r.roomName).toLowerCase()] = r
        })
      }

      // 1. Live Admin Bookings
      if (bookingsRes.status === 'fulfilled') {
        const rawData = Array.isArray(bookingsRes.value.data)
          ? bookingsRes.value.data
          : bookingsRes.value.data?.data || bookingsRes.value.data?.bookings || []

        const mapped = rawData.map((b, idx) => {
          const rawReason =
            b.cancellationReason ||
            b.cancellation_reason ||
            b.cancelReason ||
            b.reason ||
            b.cancel_reason ||
            ''

          const resolvedId = b.bookingId ?? b.booking_id ?? b.BookingId ?? b.id ?? b.reservationId ?? (idx + 1)

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
            b.subject ??
            b.description ??
            ''

          const resolvedTitle = rawTitle ? String(rawTitle).trim() : ''

          const matchedRoom =
            roomMap[b.roomId] ||
            roomMap[String(b.roomName || '').toLowerCase()] ||
            b.room ||
            {}

          const rawMod = String(
            b.module ??
            b.moduleName ??
            matchedRoom.module ??
            matchedRoom.moduleName ??
            ''
          ).toLowerCase()

          const rawRoomNumber = String(
            b.roomNumber ??
            matchedRoom.roomNumber ??
            matchedRoom.room_number ??
            ''
          ).toLowerCase()

          const rawRoomName = String(
            b.roomName ??
            matchedRoom.roomName ??
            matchedRoom.name ??
            ''
          ).toLowerCase()

          const rawModuleId = Number(
            b.moduleId ??
            b.module_id ??
            matchedRoom.moduleId ??
            matchedRoom.module_id
          )

          let resolvedModule = 'Module 1 - Elcot Park - CMB'
          if (
            rawModuleId === 3 ||
            rawMod.includes('tidel') ||
            rawMod.includes('tidal') ||
            rawRoomNumber.includes('to1') ||
            rawRoomNumber.includes('t01') ||
            rawRoomName.includes('training') ||
            rawRoomName.includes('discussion room 2')
          ) {
            resolvedModule = 'Module 1 - Tidel Park - CMB'
          } else if (
            rawModuleId === 2 ||
            rawMod.includes('module 2') ||
            rawMod.includes('m2') ||
            rawRoomNumber.includes('eo2') ||
            rawRoomNumber.includes('e02') ||
            rawRoomName.includes('conference room 2')
          ) {
            resolvedModule = 'Module 2 - Elcot Park - CMB'
          }

          return {
            bookingId: resolvedId,
            id: resolvedId,
            title: resolvedTitle,
            meetingTitle: resolvedTitle,
            roomName:
              b.roomName ??
              matchedRoom.roomName ??
              matchedRoom.name ??
              b.room?.name ??
              `Room ${b.roomId ?? ''}`,
            module: resolvedModule,
            roomType:
              b.roomType ??
              matchedRoom.roomType ??
              b.room?.type ??
              b.room?.roomType?.name ??
              'Conference',
            date: b.bookingDate ?? b.date ?? '',
            startTime: formatDisplayTime(b.startTime ?? b.start_time ?? b.start),
            endTime: formatDisplayTime(b.endTime ?? b.end_time ?? b.end),
            createdBy:
              b.requestedBy ??
              b.createdBy ??
              b.requester ??
              b.employeeName ??
              b.employee?.name ??
              'Employee',
            status: String(b.status || 'CONFIRMED').toUpperCase(),
            cancelReason: rawReason ? String(rawReason).trim() : '',
            createdAt: b.createdAt || b.bookingDate || '',
          }
        })

        setBookings(mapped)
      }

      // 2. Trend Report Data
      if (trendRes.status === 'fulfilled' && trendRes.value?.chart) {
        const list = trendRes.value.chart.map((item) => ({
          name: item.label || 'Unknown',
          bookings: Number(item.count ?? 0),
        }))
        setTrendData(list)
      }

      // 3. Status Distribution
      if (statusRes.status === 'fulfilled' && statusRes.value) {
        const raw = Array.isArray(statusRes.value)
          ? statusRes.value
          : statusRes.value.data || []
        setStatusDistribution(
          raw.map((item) => ({
            name: item.status || 'Unknown',
            value: Number(item.count ?? 0),
          }))
        )
      }

      // 4. Room Type Usage
      if (usageRes.status === 'fulfilled' && usageRes.value) {
        const raw = Array.isArray(usageRes.value)
          ? usageRes.value
          : usageRes.value.data || []
        setRoomTypeUsage(
          raw.map((item) => ({
            name: item.roomType || 'Unknown',
            value: Number(item.count ?? 0),
          }))
        )
      }
    } catch (err) {
      console.error('Failed to load visual analytics:', err)
      setError('Unable to load live reports data.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [trendPeriod])

  // =====================================================
  // Filtered Bookings
  // =====================================================

  const filteredBookings = useMemo(() => {
    const now = new Date()
    const formatLocalDate = (d) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

    const todayStr = formatLocalDate(now)

    const sevenDaysAgo = new Date(now)
    sevenDaysAgo.setDate(now.getDate() - 7)
    const sevenDaysAgoStr = formatLocalDate(sevenDaysAgo)

    const thirtyDaysAgo = new Date(now)
    thirtyDaysAgo.setDate(now.getDate() - 30)
    const thirtyDaysAgoStr = formatLocalDate(thirtyDaysAgo)

    return bookings.filter((b) => {
      // Module Filter
      if (moduleFilter !== 'All') {
        const bMod = String(b.module || '').toLowerCase()
        if (moduleFilter.includes('Tidel')) {
          if (!bMod.includes('tidel') && !bMod.includes('tidal')) return false
        } else if (moduleFilter.includes('Module 2')) {
          if (!bMod.includes('module 2') && !bMod.includes('eo2') && !bMod.includes('e02')) return false
        } else if (moduleFilter.includes('Module 1')) {
          if ((!bMod.includes('module 1') && !bMod.includes('eo1') && !bMod.includes('e01')) || bMod.includes('tidel')) return false
        }
      }

      // Status Filter
      if (statusFilter !== 'All') {
        const s = String(b.status || '').toUpperCase()
        if (statusFilter === 'Confirmed') {
          if (s === 'CANCELLED' || s === 'REJECTED') return false
        } else if (statusFilter === 'Cancelled') {
          if (s !== 'CANCELLED' && s !== 'REJECTED') return false
        }
      }

      // Timeframe Filter
      const rawDate = String(b.date || b.bookingDate || '').trim()
      const bDate = rawDate.includes('T') ? rawDate.split('T')[0] : rawDate.substring(0, 10)

      if (timeFilter === 'Today') {
        if (bDate !== todayStr) return false
      } else if (timeFilter === 'This Week') {
        if (bDate < sevenDaysAgoStr) return false
      } else if (timeFilter === 'This Month') {
        if (bDate < thirtyDaysAgoStr) return false
      } else if (timeFilter === 'Past') {
        if (bDate >= todayStr) return false
      } else if (timeFilter === 'Upcoming') {
        if (bDate < todayStr) return false
      }

      return true
    })
  }, [bookings, moduleFilter, statusFilter, timeFilter])

  // Table Search Filtered Bookings
  const displayedTableBookings = useMemo(() => {
    if (!tableSearch.trim()) return filteredBookings
    const query = tableSearch.toLowerCase().trim()
    return filteredBookings.filter((b) => {
      return (
        String(b.bookingId || '').toLowerCase().includes(query) ||
        String(b.title || '').toLowerCase().includes(query) ||
        String(b.roomName || '').toLowerCase().includes(query) ||
        String(b.module || '').toLowerCase().includes(query) ||
        String(b.createdBy || '').toLowerCase().includes(query) ||
        String(b.date || '').toLowerCase().includes(query) ||
        String(b.status || '').toLowerCase().includes(query)
      )
    })
  }, [filteredBookings, tableSearch])

  const totalPages = Math.ceil(displayedTableBookings.length / pageSize) || 1

  const paginatedBookings = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return displayedTableBookings.slice(start, start + pageSize)
  }, [displayedTableBookings, currentPage, pageSize])

  useEffect(() => {
    setCurrentPage(1)
  }, [tableSearch, timeFilter, moduleFilter, statusFilter])

  // =====================================================
  // Computed Executive KPI Stats
  // =====================================================

  const kpis = useMemo(() => {
    const total = filteredBookings.length
    let confirmed = 0
    let cancelled = 0
    const userSet = new Set()
    const roomSet = new Set()

    filteredBookings.forEach((b) => {
      if (b.createdBy) userSet.add(b.createdBy)
      if (b.roomName) roomSet.add(b.roomName)

      if (b.status === 'CANCELLED' || b.status === 'REJECTED') {
        cancelled += 1
      } else {
        confirmed += 1
      }
    })

    const confirmedRate =
      total > 0 ? Math.round((confirmed / total) * 100) : 0
    const cancellationRate =
      total > 0 ? Math.round((cancelled / total) * 100) : 0

    let utilization = '12.5'
    if (dashboardMetrics?.utilization !== undefined && dashboardMetrics?.utilization !== null) {
      utilization = Number(dashboardMetrics.utilization).toFixed(1)
    }

    return {
      total,
      confirmed,
      cancelled,
      uniqueUsers: userSet.size,
      uniqueRooms: roomSet.size,
      confirmedRate,
      cancellationRate,
      utilization,
    }
  }, [filteredBookings, dashboardMetrics])

  // =====================================================
  // 1. Visual: Status Distribution (Donut Chart)
  // =====================================================

  const visualStatusData = useMemo(() => {
    if (kpis.total === 0) return []
    return [
      { name: 'Confirmed', value: kpis.confirmed, color: '#10B981' },
      { name: 'Cancelled', value: kpis.cancelled, color: '#EF4444' },
    ]
  }, [kpis])

  // =====================================================
  // 2. Visual: Employee Booking vs Cancellation Comparison
  // =====================================================

  const employeeComparisonData = useMemo(() => {
    const map = {}

    filteredBookings.forEach((b) => {
      const name = b.createdBy || 'Employee'
      if (!map[name]) {
        map[name] = { name, confirmed: 0, cancelled: 0, total: 0 }
      }

      map[name].total += 1
      if (b.status === 'CANCELLED' || b.status === 'REJECTED') {
        map[name].cancelled += 1
      } else {
        map[name].confirmed += 1
      }
    })

    return Object.values(map)
      .sort((a, b) => b.total - a.total)
      .slice(0, 7) // Top 7 employees
  }, [filteredBookings])

  // =====================================================
  // 3. Visual: Room Popularity & Demand Ranking
  // =====================================================

  const roomPopularityData = useMemo(() => {
    const map = {}

    filteredBookings.forEach((b) => {
      const room = b.roomName || 'Room'
      if (!map[room]) {
        map[room] = { name: room, bookings: 0, confirmed: 0, cancelled: 0 }
      }

      map[room].bookings += 1
      if (b.status === 'CANCELLED' || b.status === 'REJECTED') {
        map[room].cancelled += 1
      } else {
        map[room].confirmed += 1
      }
    })

    return Object.values(map)
      .sort((a, b) => b.bookings - a.bookings)
      .slice(0, 6)
  }, [filteredBookings])

  // =====================================================
  // 4. Visual: Cancellation Reasons Breakdown & Impact
  // =====================================================

  const cancellationReasonsData = useMemo(() => {
    const map = {}
    let totalCancelled = 0

    filteredBookings.forEach((b) => {
      if (b.status === 'CANCELLED' || b.status === 'REJECTED') {
        const reason = b.cancelReason
          ? b.cancelReason.trim()
          : 'General Schedule Conflict'
        map[reason] = (map[reason] || 0) + 1
        totalCancelled += 1
      }
    })

    return Object.entries(map)
      .map(([reason, count]) => ({
        reason,
        count,
        percentage:
          totalCancelled > 0
            ? Math.round((count / totalCancelled) * 100)
            : 0,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
  }, [filteredBookings])

  // =====================================================
  // 5. Visual: Peak Booking Hours Distribution
  // =====================================================

  const hourlyDistributionData = useMemo(() => {
    const slots = {
      '10:00': 0,
      '11:00': 0,
      '12:00': 0,
      '13:00': 0,
      '14:00': 0,
      '15:00': 0,
      '16:00': 0,
      '17:00': 0,
      '18:00': 0,
      '19:00': 0,
      '20:00': 0,
      '21:00': 0,
      '22:00': 0,
    }

    filteredBookings.forEach((b) => {
      if (b.startTime) {
        const hour = b.startTime.substring(0, 2) + ':00'
        if (slots[hour] !== undefined) {
          slots[hour] += 1
        }
      }
    })

    return Object.entries(slots).map(([time, count]) => ({
      time,
      bookings: count,
    }))
  }, [filteredBookings])

  // =====================================================
  // 6. Visual: Booking Growth Timeline (Area Data)
  // =====================================================

  const timelineData = useMemo(() => {
    if (trendData && trendData.length > 0) {
      return trendData
    }

    const monthMap = {}
    filteredBookings.forEach((b) => {
      const month = String(b.date || '').substring(0, 7) || 'Current'
      monthMap[month] = (monthMap[month] || 0) + 1
    })

    const list = Object.entries(monthMap).map(([name, bookings]) => ({
      name,
      bookings,
    }))

    return list.length > 0 ? list : [{ name: 'Current Month', bookings: kpis.total }]
  }, [trendData, filteredBookings, kpis.total])

  // =====================================================
  // Export Handlers
  // =====================================================

  const handleExportExcel = () => {
    // Sheet 1: Detailed Audit Log
    const auditData = filteredBookings.map((b) => ({
      'Booking ID': b.bookingId,
      'Meeting Title': b.title,
      'Employee Name': b.createdBy,
      'Room Name': b.roomName,
      Module: b.module,
      'Room Type': b.roomType,
      'Booking Date': b.date,
      'Start Time': b.startTime,
      'End Time': b.endTime,
      Status: b.status,
      'Cancellation Reason': b.cancelReason || 'N/A - Active Booking',
      'Created On': b.createdAt,
    }))

    // Sheet 2: Employee Activity Breakdown
    const employeeData = employeeComparisonData.map((emp) => ({
      'Employee Name': emp.name,
      'Total Bookings': emp.total,
      'Confirmed Bookings': emp.confirmed,
      'Cancelled Bookings': emp.cancelled,
      'Cancellation Rate (%)':
        emp.total > 0
          ? `${Math.round((emp.cancelled / emp.total) * 100)}%`
          : '0%',
    }))

    // Sheet 3: Cancellation Reasons Summary
    const cancellationData = cancellationReasonsData.map((c) => ({
      'Cancellation Reason': c.reason,
      'Frequency Count': c.count,
      'Percentage (%)': `${c.percentage}%`,
    }))

    // Sheet 4: Room Demand Summary
    const roomData = roomPopularityData.map((r) => ({
      'Room Name': r.name,
      'Total Bookings': r.bookings,
      Confirmed: r.confirmed,
      Cancelled: r.cancelled,
    }))

    exportToExcel(
      [
        { name: 'Bookings Detailed Audit', data: auditData },
        { name: 'Employee Breakdown', data: employeeData },
        { name: 'Cancellation Insights', data: cancellationData },
        { name: 'Room Utilization', data: roomData },
      ],
      `SpaceBook-Executive-Analytics-${new Date().toISOString().split('T')[0]}.xlsx`
    )
  }

  const handleExportCSV = async () => {
    try {
      const params = {}
      if (moduleFilter && moduleFilter !== 'All') params.module = moduleFilter
      if (statusFilter && statusFilter !== 'All') params.status = statusFilter
      if (timeFilter && timeFilter !== 'All') params.period = timeFilter

      const blobData = await exportBookingsCsv(params)

      const blob =
        blobData instanceof Blob
          ? blobData
          : new Blob([blobData], { type: 'text/csv;charset=utf-8;' })

      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.setAttribute(
        'download',
        `SpaceBook-Analytics-${new Date().toISOString().split('T')[0]}.csv`
      )
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(link.href)
    } catch (err) {
      console.warn('API CSV export failed, falling back to client CSV generation:', err)
      const csvData = filteredBookings.map((b) => ({
        'Booking ID': b.bookingId,
        'Meeting Title': b.title,
        'Employee Name': b.createdBy,
        'Room Name': b.roomName,
        Module: b.module,
        Date: b.date,
        'Start Time': b.startTime,
        'End Time': b.endTime,
        Status: b.status,
        'Cancellation Reason': b.cancelReason || 'N/A',
      }))

      downloadCSV(
        csvData,
        `SpaceBook-Analytics-${new Date().toISOString().split('T')[0]}.csv`
      )
    }
  }

  // =====================================================
  // UI Render (Unified, Clean Dashboard)
  // =====================================================

  return (
    <div className="space-y-6 pb-8">
      {/* =================================================
          Header & Global Actions
      ================================================= */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-xl font-700 text-ink">
            Dashboard
          </h1>
          <p className="mt-1 text-sm text-slate">
            Executive visual insights on room utilization, workplace reservations, employee
            habits, and audit records.
          </p>
        </div>

        {/* Action Controls Toolbar */}
        <div className="flex items-center gap-2 flex-nowrap flex-shrink-0">
          <Button
            size="sm"
            variant="secondary"
            onClick={loadData}
            disabled={loading}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold whitespace-nowrap shadow-sm hover:border-slate-400 transition-all active:scale-95 h-7.5"
          >
            <RefreshCw
              size={12}
              className={loading ? 'animate-spin text-sky-600' : 'text-slate-600'}
            />
            <span>{loading ? 'Refreshing...' : 'Refresh'}</span>
          </Button>

          <Button
            size="sm"
            onClick={handleExportCSV}
            disabled={filteredBookings.length === 0}
            className="flex items-center gap-1.5 px-3 py-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-xs font-bold text-white shadow-sm shadow-blue-700/20 whitespace-nowrap transition-all active:scale-95 border-0 h-7.5"
          >
            <FileText size={12} className="text-blue-100" />
            <span className="text-white">Export CSV</span>
          </Button>
        </div>
      </div>

      {/* =================================================
          Filter Bar
      ================================================= */}
      <Card className="p-3.5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate">
              Filters:
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
              <option value="Confirmed">Confirmed</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>

          <div className="flex items-center gap-2 text-xs font-semibold text-slate">
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            Analyzing {filteredBookings.length} total bookings
          </div>
        </div>
      </Card>

      {/* =================================================
          Top Visual KPI Cards with Progress Meters (Compact 5-Column Grid)
      ================================================= */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
        {/* Total Reservations */}
        <Card className="p-3 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate">
              Total Reservations
            </span>
            <Calendar size={14} className="text-sky-600" />
          </div>
          <p className="mt-1 text-xl font-extrabold text-ink">
            {kpis.total}
          </p>
          <div className="mt-1 flex items-center justify-between text-[10px] text-slate">
            <span>{kpis.uniqueRooms} Active Rooms</span>
            <span className="font-semibold text-sky-700">100% Vol</span>
          </div>
          <div className="mt-1 h-1 w-full rounded-full bg-slate-100">
            <div className="h-1 rounded-full bg-sky-600 w-full" />
          </div>
        </Card>

        {/* Utilization */}
        <Card className="p-3 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate">
              Utilization
            </span>
            <Activity size={14} className="text-sky-600" />
          </div>
          <p className="mt-1 text-xl font-extrabold text-ink">
            {kpis.utilization}%
          </p>
          <div className="mt-1 flex items-center justify-between text-[10px] text-slate">
            <span>Occupancy</span>
            <span className="font-semibold text-sky-700">{kpis.utilization}%</span>
          </div>
          <div className="mt-1 h-1 w-full rounded-full bg-slate-100">
            <div
              className="h-1 rounded-full bg-sky-600 transition-all duration-500"
              style={{ width: `${Math.min(100, Math.max(0, Number(kpis.utilization) || 0))}%` }}
            />
          </div>
        </Card>

        {/* Confirmed Rate */}
        <Card className="p-3 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate">
              Confirmed Bookings
            </span>
            <CheckCircle2 size={14} className="text-[#658362]" />
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <p className="text-xl font-extrabold text-[#658362]">
              {kpis.confirmed}
            </p>
            <span className="rounded-full bg-emerald-100 px-1.5 py-0.2 text-[10px] font-bold text-emerald-800">
              {kpis.confirmedRate}%
            </span>
          </div>
          <div className="mt-1 flex items-center justify-between text-[10px] text-slate">
            <span>Successful</span>
            <span className="font-bold text-emerald-700">
              {kpis.confirmedRate}%
            </span>
          </div>
          <div className="mt-1 h-1 w-full rounded-full bg-slate-100">
            <div
              className="h-1 rounded-full bg-[#658362] transition-all duration-500"
              style={{ width: `${kpis.confirmedRate}%` }}
            />
          </div>
        </Card>

        {/* Cancellation Rate */}
        <Card className="p-3 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate">
              Cancelled Bookings
            </span>
            <XCircle size={14} className="text-[#B85450]" />
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <p className="text-xl font-extrabold text-[#B85450]">
              {kpis.cancelled}
            </p>
            <span className="rounded-full bg-red-100 px-1.5 py-0.2 text-[10px] font-bold text-red-800">
              {kpis.cancellationRate}%
            </span>
          </div>
          <div className="mt-1 flex items-center justify-between text-[10px] text-slate">
            <span>Cancelled</span>
            <span className="font-bold text-red-700">
              {kpis.cancellationRate}%
            </span>
          </div>
          <div className="mt-1 h-1 w-full rounded-full bg-slate-100">
            <div
              className="h-1 rounded-full bg-[#B85450] transition-all duration-500"
              style={{ width: `${kpis.cancellationRate}%` }}
            />
          </div>
        </Card>

        {/* Active Bookers */}
        <Card className="p-3 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate">
              Workforce Engagement
            </span>
            <Users size={14} className="text-purple-600" />
          </div>
          <p className="mt-1 text-xl font-extrabold text-ink">
            {kpis.uniqueUsers}
          </p>
          <div className="mt-1 flex items-center justify-between text-[10px] text-slate">
            <span>Team Members</span>
            <span className="font-semibold text-purple-700">
              {kpis.uniqueUsers > 0
                ? (kpis.total / kpis.uniqueUsers).toFixed(1)
                : 0}{' '}
              avg
            </span>
          </div>
          <div className="mt-1 h-1 w-full rounded-full bg-slate-100">
            <div className="h-1 rounded-full bg-purple-600 w-full" />
          </div>
        </Card>
      </div>

      {/* =================================================
          Workplace Reservation Records & Audit Summary Card
      ================================================= */}
      <Card className="p-4 shadow-sm border border-line">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="font-display text-sm font-bold text-ink">
              Workplace Reservation Records & Audit
            </h2>
            <p className="text-xs text-slate mt-0.5">
              Showing {displayedTableBookings.length} of {bookings.length} reservations matching active filters.
            </p>
          </div>
          <Button
            size="sm"
            onClick={() => setIsAuditModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-1 text-xs font-bold text-white bg-gradient-to-r from-sky-600 to-sky-700 hover:from-sky-700 hover:to-sky-800 shadow-sm border-0 h-7.5 whitespace-nowrap self-start sm:self-auto"
          >
            <Eye size={13} />
            <span>View</span>
          </Button>
        </div>
      </Card>

      {/* =================================================
          ROW 1: Primary Visual Charts (2 Columns)
      ================================================= */}
      <div className="grid grid-cols-1 gap-3.5 lg:grid-cols-2">
        {/* CHART 1: Employee Reservation vs Cancellation Comparison */}
        <Card className="p-3.5 shadow-sm">
          <div className="flex items-center justify-between border-b border-line pb-2">
            <div>
              <h2 className="font-display text-xs font-bold text-ink">
                Employee Booking vs Cancellation Ratio
              </h2>
              <p className="text-[11px] text-slate">
                Confirmed (green) vs Cancelled (red) reservations by top employees.
              </p>
            </div>
            <Users size={14} className="text-sky-600" />
          </div>

          <div className="h-[190px] w-full pt-2">
            {employeeComparisonData.length === 0 ? (
              <div className="flex h-full items-center justify-center text-xs text-slate">
                No employee activity data available.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={employeeComparisonData}
                  margin={{ top: 5, right: 10, left: -25, bottom: 15 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#f1f5f9"
                  />
                  <XAxis
                    dataKey="name"
                    tick={{ fill: '#475569', fontSize: 10 }}
                    angle={-15}
                    textAnchor="end"
                    interval={0}
                  />
                  <YAxis
                    tick={{ fill: '#475569', fontSize: 10 }}
                    allowDecimals={false}
                  />
                  <Tooltip content={<CustomChartTooltip />} />
                  <Legend verticalAlign="top" height={24} wrapperStyle={{ fontSize: '11px' }} />
                  <Bar
                    name="Confirmed"
                    dataKey="confirmed"
                    fill="#10B981"
                    radius={[3, 3, 0, 0]}
                  />
                  <Bar
                    name="Cancelled"
                    dataKey="cancelled"
                    fill="#EF4444"
                    radius={[3, 3, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        {/* CHART 2: Status Outcome Donut Chart */}
        <Card className="p-3.5 shadow-sm">
          <div className="flex items-center justify-between border-b border-line pb-2">
            <div>
              <h2 className="font-display text-xs font-bold text-ink">
                Reservation Outcome Breakdown
              </h2>
              <p className="text-[11px] text-slate">
                Proportion of successful bookings vs cancellations.
              </p>
            </div>
            <Sparkles size={14} className="text-emerald-600" />
          </div>

          <div className="h-[190px] w-full pt-1">
            {visualStatusData.length === 0 ? (
              <div className="flex h-full items-center justify-center text-xs text-slate">
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
                    innerRadius={45}
                    outerRadius={68}
                    paddingAngle={3}
                  >
                    {visualStatusData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.color}
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomChartTooltip />} />
                  <Legend
                    verticalAlign="bottom"
                    iconType="circle"
                    height={24}
                    wrapperStyle={{ fontSize: '11px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>
      </div>

      {/* =================================================
          ROW 2: Timeline Trends & Room Popularity
      ================================================= */}
      <div className="grid grid-cols-1 gap-3.5 lg:grid-cols-2">
        {/* CHART 3: Booking Activity Trend (Smooth Gradient Area) */}
        <Card className="p-3.5 shadow-sm">
          <div className="flex items-center justify-between border-b border-line pb-2">
            <div>
              <h2 className="font-display text-xs font-bold text-ink">
                Reservation Volume Trendline
              </h2>
              <p className="text-[11px] text-slate">
                Historical reservation activity and volume patterns.
              </p>
            </div>

            {/* Monthly / Weekly toggle */}
            <div className="flex items-center rounded-lg bg-slate-100 p-0.5 text-xs">
              <button
                onClick={() => setTrendPeriod('Monthly')}
                className={`rounded-md px-2 py-0.5 text-[11px] font-bold ${
                  trendPeriod === 'Monthly'
                    ? 'bg-white text-ink shadow-sm'
                    : 'text-slate hover:text-ink'
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setTrendPeriod('Weekly')}
                className={`rounded-md px-2 py-0.5 text-[11px] font-bold ${
                  trendPeriod === 'Weekly'
                    ? 'bg-white text-ink shadow-sm'
                    : 'text-slate hover:text-ink'
                }`}
              >
                Weekly
              </button>
            </div>
          </div>

          <div className="h-[180px] w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={timelineData}
                margin={{ top: 5, right: 10, left: -25, bottom: 0 }}
              >
                <defs>
                  <linearGradient
                    id="bookingAreaGrad"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="5%"
                      stopColor="#0284C7"
                      stopOpacity={0.4}
                    />
                    <stop
                      offset="95%"
                      stopColor="#0284C7"
                      stopOpacity={0.0}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#f1f5f9"
                />
                <XAxis
                  dataKey="name"
                  tick={{ fill: '#475569', fontSize: 10 }}
                />
                <YAxis
                  tick={{ fill: '#475569', fontSize: 10 }}
                  allowDecimals={false}
                />
                <Tooltip content={<CustomChartTooltip />} />
                <Area
                  type="monotone"
                  dataKey="bookings"
                  name="Bookings"
                  stroke="#0284C7"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#bookingAreaGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* CHART 4: Room Demand & Utilization Ranking */}
        <Card className="p-3.5 shadow-sm">
          <div className="flex items-center justify-between border-b border-line pb-2">
            <div>
              <h2 className="font-display text-xs font-bold text-ink">
                Most Reserved Rooms & Workspaces
              </h2>
              <p className="text-[11px] text-slate">
                Workspace popularity ranked by total reservation volume.
              </p>
            </div>
            <Building2 size={14} className="text-sky-600" />
          </div>

          <div className="h-[180px] w-full pt-2">
            {roomPopularityData.length === 0 ? (
              <div className="flex h-full items-center justify-center text-xs text-slate">
                No room usage records found.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={roomPopularityData}
                  layout="vertical"
                  margin={{ top: 5, right: 15, left: 15, bottom: 5 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#f1f5f9"
                  />
                  <XAxis
                    type="number"
                    tick={{ fill: '#475569', fontSize: 10 }}
                    allowDecimals={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fill: '#0f172a', fontSize: 10, fontWeight: 600 }}
                    width={95}
                  />
                  <Tooltip content={<CustomChartTooltip />} />
                  <Bar
                    dataKey="bookings"
                    name="Reservations"
                    fill="#0284C7"
                    radius={[0, 4, 4, 0]}
                  >
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
          ROW 3: Peak Workspace Demand by Hour
      ================================================= */}
      <div>
        {/* Peak Booking Hours Distribution */}
        <Card className="p-3.5 shadow-sm">
          <div className="flex items-center justify-between border-b border-line pb-2">
            <div>
              <h2 className="font-display text-xs font-bold text-ink">
                Peak Workspace Demand by Hour
              </h2>
              <p className="text-[11px] text-slate">
                Distribution of reservations across operational office hours.
              </p>
            </div>
            <Clock size={14} className="text-sky-600" />
          </div>

          <div className="h-[170px] w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={hourlyDistributionData}
                margin={{ top: 5, right: 10, left: -25, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#f1f5f9"
                />
                <XAxis
                  dataKey="time"
                  tick={{ fill: '#475569', fontSize: 10 }}
                />
                <YAxis
                  tick={{ fill: '#475569', fontSize: 10 }}
                  allowDecimals={false}
                />
                <Tooltip content={<CustomChartTooltip />} />
                <Bar
                  dataKey="bookings"
                  name="Bookings at Hour"
                  fill="#6366F1"
                  radius={[3, 3, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* =====================================================
          All Audit Records Table Modal
      ===================================================== */}
      <Modal
        open={isAuditModalOpen}
        onClose={() => setIsAuditModalOpen(false)}
        title="Workplace Reservation Records & Audit"
        className="max-w-5xl"
        footer={
          <div className="flex w-full items-center justify-between">
            <span className="text-xs text-slate">
              Total {displayedTableBookings.length} bookings found
            </span>
            <Button size="sm" variant="secondary" onClick={() => setIsAuditModalOpen(false)}>
              Close
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-line pb-3">
            <p className="text-xs text-slate">
              Showing {displayedTableBookings.length} of {bookings.length} reservations matching active filters.
              {(timeFilter !== 'All' || moduleFilter !== 'All' || statusFilter !== 'All' || tableSearch) && (
                <button
                  type="button"
                  onClick={() => {
                    setTimeFilter('All')
                    setModuleFilter('All')
                    setStatusFilter('All')
                    setTableSearch('')
                  }}
                  className="ml-2 font-bold text-sky-600 hover:underline"
                >
                  Reset all filters
                </button>
              )}
            </p>
            <div className="flex items-center gap-2">
              <input
                value={tableSearch}
                onChange={(e) => setTableSearch(e.target.value)}
                placeholder="Search bookings, rooms, employees..."
                className="w-full sm:w-64 rounded-xl border border-line bg-white px-3 py-1.5 text-xs text-ink outline-none focus:border-sky-500"
              />
              {tableSearch && (
                <button
                  type="button"
                  onClick={() => setTableSearch('')}
                  className="text-xs font-bold text-slate hover:text-ink px-1"
                  title="Clear search"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          <div className="overflow-x-auto max-h-[55vh] border border-line rounded-xl">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 bg-slate-50 border-b border-line text-[10px] font-extrabold uppercase tracking-wider text-black">
                <tr>
                  <th className="px-3 py-2.5 whitespace-nowrap">Booking ID</th>
                  <th className="px-3 py-2.5 whitespace-nowrap">Meeting Title</th>
                  <th className="px-3 py-2.5 whitespace-nowrap">Room</th>
                  <th className="px-3 py-2.5 whitespace-nowrap">Module</th>
                  <th className="px-3 py-2.5 whitespace-nowrap">Date</th>
                  <th className="px-3 py-2.5 whitespace-nowrap">Time</th>
                  <th className="px-3 py-2.5 whitespace-nowrap">Created By</th>
                  <th className="px-3 py-2.5 text-center whitespace-nowrap">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="px-3 py-6 text-center text-slate">
                      Loading booking records...
                    </td>
                  </tr>
                ) : displayedTableBookings.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-3 py-6 text-center text-slate">
                      No booking records match the active filter criteria.
                    </td>
                  </tr>
                ) : (
                  paginatedBookings.map((booking) => (
                    <tr
                      key={booking.bookingId}
                      onClick={() => openViewModal(booking)}
                      className="cursor-pointer transition-colors duration-150 hover:bg-sky-50/70"
                      title="Click to view full reservation details"
                    >
                      <td className="px-3 py-2.5 font-sans text-xs font-semibold text-ink whitespace-nowrap">
                        {booking.bookingId}
                      </td>
                      <td className="px-3 py-2.5 font-medium text-ink whitespace-nowrap max-w-[180px] truncate" title={booking.title || '-'}>
                        {booking.title || '-'}
                      </td>
                      <td className="px-3 py-2.5 text-slate whitespace-nowrap">
                        {booking.roomName}
                      </td>
                      <td className="px-3 py-2.5 text-slate whitespace-nowrap">
                        {booking.module}
                      </td>
                      <td className="px-3 py-2.5 text-slate whitespace-nowrap">
                        {booking.date}
                      </td>
                      <td className="px-3 py-2.5 font-sans text-xs text-slate whitespace-nowrap">
                        {booking.startTime && booking.endTime
                          ? `${booking.startTime} - ${booking.endTime}`
                          : booking.startTime || '-'}
                      </td>
                      <td className="px-3 py-2.5 text-slate whitespace-nowrap">
                        {booking.createdBy}
                      </td>
                      <td className="px-3 py-2.5 text-center whitespace-nowrap">
                        <CustomStatusTag status={booking.status} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Bar */}
          {displayedTableBookings.length > pageSize && (
            <div className="flex items-center justify-between border-t border-line pt-2 text-xs">
              <span className="text-slate text-[11px]">
                Showing {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, displayedTableBookings.length)} of {displayedTableBookings.length} bookings
              </span>
              <div className="flex items-center gap-1.5">
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="px-2.5 py-0.5 text-xs h-6.5"
                >
                  Prev
                </Button>
                <span className="px-2 font-semibold text-ink text-[11px]">
                  {currentPage} / {totalPages}
                </span>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="px-2.5 py-0.5 text-xs h-6.5"
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* =====================================================
          Booking Details Modal
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
                <p className="text-xs uppercase tracking-wider text-slate font-semibold">Booking ID</p>
                <p className="font-bold text-ink text-base">{selectedBooking.bookingId}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-slate font-semibold">Status</p>
                <div className="mt-1">
                  <CustomStatusTag status={selectedBooking.status} />
                </div>
              </div>
            </div>

            <div>
              <p className="text-xs uppercase tracking-wider text-slate font-semibold">Meeting Title</p>
              <p className="font-semibold text-ink text-base mt-0.5">{selectedBooking.title || '-'}</p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <p className="text-xs uppercase tracking-wider text-slate font-semibold">Room</p>
                <p className="font-medium text-ink mt-0.5">{selectedBooking.roomName}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-slate font-semibold">Module</p>
                <p className="font-medium text-ink mt-0.5">{selectedBooking.module}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-slate font-semibold">Date</p>
                <p className="font-medium text-ink mt-0.5">{selectedBooking.date}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-slate font-semibold">Time</p>
                <p className="font-medium text-ink mt-0.5">
                  {selectedBooking.startTime} {selectedBooking.endTime ? `– ${selectedBooking.endTime}` : ''}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-slate font-semibold">Created By</p>
                <p className="font-medium text-ink mt-0.5">{selectedBooking.createdBy}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-slate font-semibold">Room Type</p>
                <p className="font-medium text-ink mt-0.5">{selectedBooking.roomType}</p>
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