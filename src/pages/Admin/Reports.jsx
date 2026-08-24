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
} from 'lucide-react'

import client from '../../api/client'
import Card from '../../components/common/Card'
import Button from '../../components/common/Button'
import {
  getBookingTrendReport,
  getBookingStatusReport,
  getRoomUsageReport,
  exportBookingsCsv,
} from '../../api/adminReports'
import { downloadCSV, exportToExcel } from '../../utils/exportHelpers'

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

  // Filters
  const [timeFilter, setTimeFilter] = useState('All')
  const [moduleFilter, setModuleFilter] = useState('All')
  const [statusFilter, setStatusFilter] = useState('All')
  const [trendPeriod, setTrendPeriod] = useState('Monthly') // 'Monthly' | 'Weekly'

  // =====================================================
  // Load Data
  // =====================================================

  const loadData = async () => {
    try {
      setLoading(true)
      setError(null)

      const [bookingsRes, trendRes, statusRes, usageRes] =
        await Promise.allSettled([
          client.get('/admin/bookings'),
          getBookingTrendReport({ reportType: trendPeriod }),
          getBookingStatusReport({}),
          getRoomUsageReport({}),
        ])

      // 1. Live Bookings
      if (bookingsRes.status === 'fulfilled') {
        const rawData = Array.isArray(bookingsRes.value.data)
          ? bookingsRes.value.data
          : bookingsRes.value.data?.data ||
            bookingsRes.value.data?.bookings ||
            []

        const mapped = rawData.map((b) => {
          const rawReason =
            b.cancellationReason ||
            b.cancellation_reason ||
            b.cancelReason ||
            b.reason ||
            b.cancel_reason ||
            ''

          return {
            bookingId: b.bookingId ?? b.id,
            title:
              b.title ??
              b.purpose ??
              b.meetingTitle ??
              'Reserved Workspace',
            roomName:
              b.roomName ??
              b.room?.name ??
              `Room ${b.roomId ?? ''}`,
            module:
              b.module ??
              b.moduleName ??
              b.room?.module ??
              'Module 1',
            roomType:
              b.roomType ??
              b.room?.type ??
              b.room?.roomType?.name ??
              'Conference',
            date: b.bookingDate ?? b.date ?? '',
            startTime: b.startTime
              ? String(b.startTime).substring(0, 5)
              : '',
            endTime: b.endTime
              ? String(b.endTime).substring(0, 5)
              : '',
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
    const todayStr = new Date().toISOString().split('T')[0]
    const now = new Date()

    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(now.getDate() - 7)
    const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0]

    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(now.getDate() - 30)
    const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0]

    return bookings.filter((b) => {
      // Module
      if (moduleFilter !== 'All') {
        const matchModule = String(b.module || '')
          .toLowerCase()
          .includes(moduleFilter.toLowerCase())
        if (!matchModule) return false
      }

      // Status
      if (statusFilter !== 'All') {
        if (statusFilter === 'Confirmed') {
          if (b.status === 'CANCELLED' || b.status === 'REJECTED')
            return false
        } else if (statusFilter === 'Cancelled') {
          if (b.status !== 'CANCELLED' && b.status !== 'REJECTED')
            return false
        }
      }

      // Time
      const bDate = String(b.date || '').substring(0, 10)
      if (timeFilter === 'Today') {
        if (bDate !== todayStr) return false
      } else if (timeFilter === 'This Week') {
        if (bDate < sevenDaysAgoStr) return false
      } else if (timeFilter === 'This Month') {
        if (bDate < thirtyDaysAgoStr) return false
      } else if (timeFilter === 'Past') {
        if (bDate >= todayStr) return false
      }

      return true
    })
  }, [bookings, moduleFilter, statusFilter, timeFilter])

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

    return {
      total,
      confirmed,
      cancelled,
      uniqueUsers: userSet.size,
      uniqueRooms: roomSet.size,
      confirmedRate,
      cancellationRate,
    }
  }, [filteredBookings])

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
            Workplace Analytics & Intelligence
          </h1>
          <p className="mt-1 text-sm text-slate">
            Executive visual insights on room utilization, employee
            habits, cancellation drivers, and peak hours.
          </p>
        </div>

        {/* Action Controls Toolbar */}
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

      {/* =================================================
          Filter Bar
      ================================================= */}
      <Card className="p-3.5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold uppercase tracking-wider text-slate">
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
              <option value="Module 1">Module 1 - Elcot Park</option>
              <option value="Module 2">Module 2 - Elcot Park</option>
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-xl border border-line bg-white px-3 py-1.5 text-xs font-medium text-ink outline-none focus:border-sky-500"
            >
              <option value="All">All Statuses</option>
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
          Top Visual KPI Cards with Progress Meters
      ================================================= */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Reservations */}
        <Card className="p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-slate">
              Total Reservations
            </span>
            <Calendar size={16} className="text-sky-600" />
          </div>
          <p className="mt-2 text-3xl font-extrabold text-ink">
            {kpis.total}
          </p>
          <div className="mt-2 flex items-center justify-between text-xs text-slate">
            <span>{kpis.uniqueRooms} Active Rooms</span>
            <span className="font-semibold text-sky-700">100% Volume</span>
          </div>
          <div className="mt-1.5 h-1.5 w-full rounded-full bg-slate-100">
            <div className="h-1.5 rounded-full bg-sky-600 w-full" />
          </div>
        </Card>

        {/* Confirmed Rate */}
        <Card className="p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-slate">
              Confirmed Bookings
            </span>
            <CheckCircle2 size={16} className="text-[#658362]" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <p className="text-3xl font-extrabold text-[#658362]">
              {kpis.confirmed}
            </p>
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-800">
              {kpis.confirmedRate}% Rate
            </span>
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-slate">
            <span>Successful Occupancy</span>
            <span className="font-bold text-emerald-700">
              {kpis.confirmedRate}%
            </span>
          </div>
          <div className="mt-1.5 h-1.5 w-full rounded-full bg-slate-100">
            <div
              className="h-1.5 rounded-full bg-[#658362] transition-all duration-500"
              style={{ width: `${kpis.confirmedRate}%` }}
            />
          </div>
        </Card>

        {/* Cancellation Rate */}
        <Card className="p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-slate">
              Cancelled Bookings
            </span>
            <XCircle size={16} className="text-[#B85450]" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <p className="text-3xl font-extrabold text-[#B85450]">
              {kpis.cancelled}
            </p>
            <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-800">
              {kpis.cancellationRate}% Cancel Rate
            </span>
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-slate">
            <span>Cancellation Impact</span>
            <span className="font-bold text-red-700">
              {kpis.cancellationRate}%
            </span>
          </div>
          <div className="mt-1.5 h-1.5 w-full rounded-full bg-slate-100">
            <div
              className="h-1.5 rounded-full bg-[#B85450] transition-all duration-500"
              style={{ width: `${kpis.cancellationRate}%` }}
            />
          </div>
        </Card>

        {/* Active Bookers */}
        <Card className="p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-slate">
              Workforce Engagement
            </span>
            <Users size={16} className="text-purple-600" />
          </div>
          <p className="mt-2 text-3xl font-extrabold text-ink">
            {kpis.uniqueUsers}
          </p>
          <div className="mt-2 flex items-center justify-between text-xs text-slate">
            <span>Active Team Members</span>
            <span className="font-semibold text-purple-700">
              {kpis.uniqueUsers > 0
                ? (kpis.total / kpis.uniqueUsers).toFixed(1)
                : 0}{' '}
              avg/person
            </span>
          </div>
          <div className="mt-1.5 h-1.5 w-full rounded-full bg-slate-100">
            <div className="h-1.5 rounded-full bg-purple-600 w-full" />
          </div>
        </Card>
      </div>

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
                Confirmed (green) vs Cancelled (red) reservations by top
                employees.
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
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#f1f5f9"
                  />
                  <XAxis
                    dataKey="name"
                    tick={{ fill: '#475569', fontSize: 11 }}
                    angle={-20}
                    textAnchor="end"
                    interval={0}
                  />
                  <YAxis
                    tick={{ fill: '#475569', fontSize: 11 }}
                    allowDecimals={false}
                  />
                  <Tooltip content={<CustomChartTooltip />} />
                  <Legend verticalAlign="top" height={36} />
                  <Bar
                    name="Confirmed"
                    dataKey="confirmed"
                    fill="#10B981"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    name="Cancelled"
                    dataKey="cancelled"
                    fill="#EF4444"
                    radius={[4, 4, 0, 0]}
                  />
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
                    innerRadius={70}
                    outerRadius={105}
                    paddingAngle={4}
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
                    height={36}
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
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* CHART 3: Booking Activity Trend (Smooth Gradient Area) */}
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

            {/* Monthly / Weekly toggle */}
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
              <AreaChart
                data={timelineData}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
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
                  tick={{ fill: '#475569', fontSize: 11 }}
                />
                <YAxis
                  tick={{ fill: '#475569', fontSize: 11 }}
                  allowDecimals={false}
                />
                <Tooltip content={<CustomChartTooltip />} />
                <Area
                  type="monotone"
                  dataKey="bookings"
                  name="Bookings"
                  stroke="#0284C7"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#bookingAreaGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* CHART 4: Room Demand & Utilization Ranking */}
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
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#f1f5f9"
                  />
                  <XAxis
                    type="number"
                    tick={{ fill: '#475569', fontSize: 11 }}
                    allowDecimals={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fill: '#0f172a', fontSize: 11, fontWeight: 600 }}
                    width={110}
                  />
                  <Tooltip content={<CustomChartTooltip />} />
                  <Bar
                    dataKey="bookings"
                    name="Reservations"
                    fill="#0284C7"
                    radius={[0, 6, 6, 0]}
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
          ROW 3: Cancellation Drivers & Peak Booking Hours
      ================================================= */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* CHART 5: Cancellation Drivers & Reasons Analysis */}
        <Card className="p-5 shadow-sm">
          <div className="flex items-center justify-between border-b border-line pb-3">
            <div>
              <h2 className="font-display text-sm font-700 text-ink">
                Top Cancellation Reasons & Drivers
              </h2>
              <p className="text-xs text-slate">
                Visual breakdown of why employees cancelled their room
                reservations.
              </p>
            </div>
            <AlertTriangle size={16} className="text-[#B85450]" />
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
                      <span className="font-mono font-bold text-red-700">
                        {item.count} {item.count === 1 ? 'time' : 'times'} (
                        {item.percentage}%)
                      </span>
                    </div>

                    {/* Progress Bar */}
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

        {/* CHART 6: Peak Booking Hours Distribution */}
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

          <div className="h-[250px] w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={hourlyDistributionData}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#f1f5f9"
                />
                <XAxis
                  dataKey="time"
                  tick={{ fill: '#475569', fontSize: 11 }}
                />
                <YAxis
                  tick={{ fill: '#475569', fontSize: 11 }}
                  allowDecimals={false}
                />
                <Tooltip content={<CustomChartTooltip />} />
                <Bar
                  dataKey="bookings"
                  name="Bookings at Hour"
                  fill="#6366F1"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </div>
  )
}