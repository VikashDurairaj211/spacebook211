import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  ResponsiveContainer,
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
  Calendar,
  Sparkles,
  Activity,
  Armchair,
  Eye,
  X,
  Layers,
  MapPin,
  Loader2,
  UserCheck,
  LogOut,
  AlertCircle,
} from 'lucide-react'

import client from '../../api/client'
import {
  getHotseatFilters,
  getHotseatDashboard,
  getHotseatAnalytics,
  getHotseatRecords,
  exportHotseatCsv,
} from '../../api/adminHotseat'
import Card from '../../components/common/Card'
import Button from '../../components/common/Button'
import Modal from '../../components/common/Modal'
import { downloadCSV } from '../../utils/exportHelpers'
import { formatTime24, formatDateWithZeros } from '../../utils/timeUtils'

// =====================================================
// Helper: Convert any date format into YYYY-MM-DD
// =====================================================

function toStandardIsoDate(dateVal) {
  if (!dateVal || dateVal === '-') return ''
  const str = String(dateVal).trim()
  const dateOnly = str.includes('T') ? str.split('T')[0] : str.substring(0, 10)
  const parts = dateOnly.split(/[-/.]/)
  if (parts.length === 3) {
    if (parts[0].length === 4) {
      // YYYY-MM-DD
      const y = parts[0]
      const m = String(parts[1]).padStart(2, '0')
      const d = String(parts[2]).padStart(2, '0')
      return `${y}-${m}-${d}`
    } else if (parts[2].length === 4) {
      // DD-MM-YYYY
      const y = parts[2]
      const m = String(parts[1]).padStart(2, '0')
      const d = String(parts[0]).padStart(2, '0')
      return `${y}-${m}-${d}`
    }
  }
  return dateOnly
}

// =====================================================
// Helper: Resolve Section from Seat Number
// =====================================================

function resolveSection(seatNumber, module) {
  if (!seatNumber) return 'Section A'
  const str = String(seatNumber)

  if (str.startsWith('WS-04-')) {
    const num = parseInt(str.replace('WS-04-', ''), 10)
    if (!isNaN(num)) {
      if (num <= 62) return 'Section A'
      if (num <= 118) return 'Section B'
      if (num <= 164) return 'Section C'
      return 'Section D'
    }
  }

  const num = parseInt(str.split('-').pop(), 10)
  if (isNaN(num)) return 'Section A'

  const modStr = String(module || seatNumber).toLowerCase()
  if (modStr.includes('1') || modStr.includes('eo1')) {
    if (num <= 32) return 'Section A'
    return 'Section B'
  }
  if (modStr.includes('2') || modStr.includes('eo2')) {
    if (num >= 80 && num <= 131) return 'Section C'
    return 'Section B'
  }
  return 'Section A'
}

function resolveFullSectionName(seatNumber, module) {
  const short = resolveSection(seatNumber, module)
  if (short === 'Section A') return 'Section A (Seats 1 – 62 / 1 – 32)'
  if (short === 'Section B') return 'Section B (Seats 63 – 118 / 33 – 79)'
  if (short === 'Section C') return 'Section C (Seats 119 – 164 / 80 – 131)'
  return 'Section D (Seats 165 – 224)'
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
    bgClass = 'bg-[#0284C7] text-white' // Checked In -> Blue
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
  } else if (
    norm === 'CHECKED IN' ||
    norm === 'CHECKEDIN' ||
    norm === 'CHECKED-IN'
  ) {
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
  '#0284C7', // Tidel Park Blue
  '#0D9488', // Elcot Module 1 Teal
  '#6366F1', // Elcot Module 2 Indigo
  '#8B5CF6',
  '#EC4899',
]

const SECTION_COLORS = {
  'Section A': '#0284C7',
  'Section B': '#0D9488',
  'Section C': '#6366F1',
  'Section D': '#F59E0B',
}

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

const ITEMS_PER_PAGE = 8

// =====================================================
// Main Component
// =====================================================

export default function HotseatManagement() {
  const [bookings, setBookings] = useState([])
  const [dashboardData, setDashboardData] = useState(null)
  const [analyticsData, setAnalyticsData] = useState(null)
  const [filterOptions, setFilterOptions] = useState({
    modules: [],
    statuses: [],
  })
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [error, setError] = useState(null)

  // Filters
  const [timeFilter, setTimeFilter] = useState('All')
  const [moduleFilter, setModuleFilter] = useState('All')
  const [statusFilter, setStatusFilter] = useState('All')
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
  // Load Pure Hotseat Data from Backend APIs
  // =====================================================

  const loadData = async () => {
    try {
      setLoading(true)
      setError(null)

      const normalizeTimeframe = (tf) => {
        if (!tf || tf === 'All') return null
        if (tf === 'Today') return 'daily'
        if (tf === 'This Week') return 'weekly'
        if (tf === 'This Month') return 'monthly'
        return tf.toLowerCase()
      }

      const filterDto = {
        timeframe: normalizeTimeframe(timeFilter),
        module: moduleFilter === 'All' ? null : moduleFilter,
        status: statusFilter === 'All' ? null : statusFilter,
        page: 1,
        pageSize: 1000,
      }

      // Fetch dynamic endpoints in parallel
      const [recordsRes, dashboardRes, analyticsRes, filtersRes] =
        await Promise.allSettled([
          getHotseatRecords(filterDto),
          getHotseatDashboard(filterDto),
          getHotseatAnalytics(filterDto),
          getHotseatFilters(),
        ])

      // 1. Process Filter Options
      if (filtersRes.status === 'fulfilled' && filtersRes.value) {
        const fData = filtersRes.value
        const rawMods = Array.isArray(fData.modules)
          ? fData.modules
          : Array.isArray(fData)
            ? fData
            : []
        const formatCleanModuleLabel = (str) => {
          if (!str) return str
          const lower = str.toLowerCase()
          if (lower.includes('tidel') || lower.includes('tidal')) {
            return 'Module 1 - Tidel Park'
          }
          if (lower.includes('module 2') || lower.includes('eo2')) {
            return 'Module 2 - Elcot Park'
          }
          if (lower.includes('module 1') || lower.includes('elcot')) {
            return 'Module 1 - Elcot Park'
          }
          return str
        }

        const parsedMods = rawMods
          .map((m, idx) => {
            if (typeof m === 'object' && m !== null) {
              const rawLabel = String(
                m.label ?? m.name ?? m.value ?? `Module ${idx + 1}`
              )
              return {
                value: String(
                  m.value ?? m.name ?? m.id ?? m.label ?? `module-${idx}`
                ),
                label: formatCleanModuleLabel(rawLabel),
              }
            }
            return {
              value: String(m),
              label: formatCleanModuleLabel(String(m)),
            }
          })
          .filter(
            (m) =>
              m.value.toLowerCase() !== 'all' &&
              !m.label.toLowerCase().includes('all module') &&
              m.value !== ''
          )

        // Strict order: 1. Tidel Park, 2. Elcot Module 1, 3. Elcot Module 2
        parsedMods.sort((a, b) => {
          const textA = (a.label + ' ' + a.value).toLowerCase()
          const textB = (b.label + ' ' + b.value).toLowerCase()

          const getRank = (text) => {
            if (text.includes('tidel') || text.includes('tidal')) return 1
            if (text.includes('module 2') || text.includes('eo2')) return 3
            if (text.includes('module 1') || text.includes('elcot')) return 2
            return 4
          }

          return getRank(textA) - getRank(textB)
        })

        const rawStatuses = Array.isArray(fData.statuses) ? fData.statuses : []
        const parsedStatuses = rawStatuses
          .map((s, idx) => {
            if (typeof s === 'object' && s !== null) {
              return {
                value: String(s.value ?? s.name ?? s.id ?? s.label ?? `status-${idx}`),
                label: String(s.label ?? s.name ?? s.value ?? `Status ${idx + 1}`),
              }
            }
            return { value: String(s), label: String(s) }
          })
          .filter(
            (s) =>
              s.value.toLowerCase() !== 'all' &&
              !s.label.toLowerCase().includes('all status') &&
              s.value !== ''
          )

        setFilterOptions({
          modules: parsedMods,
          statuses: parsedStatuses,
        })
      }

      // 2. Process Dashboard KPI Summary
      if (dashboardRes.status === 'fulfilled' && dashboardRes.value) {
        setDashboardData(dashboardRes.value)
      } else {
        setDashboardData(null)
      }

      // 3. Process Analytics Data
      if (analyticsRes.status === 'fulfilled' && analyticsRes.value) {
        setAnalyticsData(analyticsRes.value)
      } else {
        setAnalyticsData(null)
      }

      // 4. Process Records
      let rawList = []
      if (recordsRes.status === 'fulfilled' && recordsRes.value) {
        const rVal = recordsRes.value
        rawList = Array.isArray(rVal)
          ? rVal
          : rVal?.items || rVal?.records || rVal?.bookings || rVal?.data || []
      }

      const mapped = rawList.map((b, idx) => {
        const seatNum =
          typeof b.seat === 'object' && b.seat !== null
            ? b.seat.seatNumber || b.seat.name || b.seat.id || ''
            : b.seatNumber || b.seat || b.seatId || ''

        const resolvedModule =
          typeof b.module === 'object' && b.module !== null
            ? b.module.name || b.module.title || ''
            : b.module ||
            b.moduleName ||
            (String(seatNum).startsWith('WS-04')
              ? 'Module 1 - Tidel Park - CMB'
              : String(seatNum).includes('EO2')
                ? 'Module 2 - Elcot Park - CMB'
                : 'Module 1 - Elcot Park - CMB')

        const rawTimeStr =
          b.expectedCheckInTime ||
          b.expectedCheckIn ||
          b.startTime ||
          ''

        let timeStr = String(rawTimeStr).trim()
        if (timeStr.includes('-')) {
          const [startT, endT] = timeStr.split('-').map((s) => s.trim())
          timeStr = `${formatTime24(startT)} - ${formatTime24(endT)}`
        } else if (timeStr) {
          timeStr = formatTime24(timeStr)
        } else {
          timeStr = '-'
        }

        const rawDate =
          b.bookingDate ||
          b.date ||
          ''

        const employeeName =
          typeof b.user === 'object' && b.user !== null
            ? b.user.name || b.user.fullName || b.user.email || 'Employee'
            : b.employeeName || b.userName || b.requestedBy || b.user || 'Employee'

        const rawStatus =
          typeof b.status === 'object' && b.status !== null
            ? b.status.name || b.status.status || ''
            : b.status || b.bookingStatus || b.statusName || ''

        let statusStr = String(rawStatus).toUpperCase()
        if (
          b.cancelReason ||
          b.cancellationReason ||
          statusStr.includes('CANCEL') ||
          statusStr === 'REJECTED'
        ) {
          statusStr = 'CANCELLED'
        } else if (
          b.actualCheckInTime ||
          b.checkInTime ||
          statusStr.includes('CHECK')
        ) {
          statusStr = 'CHECKED IN'
        } else if (statusStr.includes('RELEASE')) {
          statusStr = 'RELEASED'
        } else if (statusStr.includes('EXPIR')) {
          statusStr = 'EXPIRED'
        } else {
          statusStr = 'CONFIRMED'
        }

        return {
          id: b.id || b.bookingId || idx + 1,
          bookingId: b.bookingId || b.id || idx + 1,
          employee: String(employeeName),
          seat: String(seatNum || '-'),
          module: String(resolvedModule),
          location: String(b.location || 'Coimbatore'),
          zone:
            b.zone ||
            b.office ||
            (String(seatNum).startsWith('WS-04')
              ? 'Tidel Park'
              : 'Elcot Park'),
          section: resolveFullSectionName(seatNum, resolvedModule),
          date: rawDate ? formatDateWithZeros(rawDate) : '-',
          isoDate: toStandardIsoDate(rawDate),
          expectedCheckIn: timeStr,
          status: statusStr,
          cancelReason: String(b.cancelReason || b.cancellationReason || ''),
        }
      })

      // Sort descending by ID / Date
      mapped.sort((a, b) => {
        const idA = Number(a.bookingId) || 0
        const idB = Number(b.bookingId) || 0
        if (idA !== idB) return idB - idA
        return String(b.date || '').localeCompare(String(a.date || ''))
      })

      setBookings(mapped)
    } catch (err) {
      console.error('Failed to load live hotseat data:', err)
      setError(
        err?.response?.data?.message ||
        'Unable to load live hotseat records from server.'
      )
      setBookings([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [timeFilter, moduleFilter, statusFilter])

  // =====================================================
  // Filtering Logic
  // =====================================================

  const filteredBookings = useMemo(() => {
    const now = new Date()
    const todayStr = now.toISOString().split('T')[0]

    const sevenDaysAgo = new Date(now)
    sevenDaysAgo.setDate(now.getDate() - 7)
    const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0]

    const thirtyDaysAgo = new Date(now)
    thirtyDaysAgo.setDate(now.getDate() - 30)
    const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0]

    return bookings.filter((b) => {
      const bDate = b.isoDate || toStandardIsoDate(b.date)

      // 1. Timeframe Filter
      if (timeFilter === 'Today') {
        if (bDate !== todayStr) return false
      } else if (timeFilter === 'This Week') {
        if (!bDate || bDate < sevenDaysAgoStr || bDate > todayStr) return false
      } else if (timeFilter === 'This Month') {
        if (!bDate || bDate < thirtyDaysAgoStr || bDate > todayStr) return false
      } else if (timeFilter === 'Past') {
        if (!bDate || bDate >= todayStr) return false
      } else if (timeFilter === 'Upcoming') {
        if (!bDate || bDate <= todayStr) return false
      }

      // 2. Module Filter
      if (moduleFilter !== 'All') {
        const modName = String(b.module || '').toLowerCase()
        const zoneName = String(b.zone || '').toLowerCase()
        const seatStr = String(b.seat || '').toUpperCase()
        const target = moduleFilter.toLowerCase()

        const isTidel = target.includes('tidel') || target.includes('tidal')
        const isElcotM2 = target.includes('module 2') || target.includes('eo2')
        const isElcotM1 =
          (target.includes('module 1') && target.includes('elcot')) ||
          (target.includes('elcot') && !target.includes('module 2'))

        let matches =
          modName.includes(target) ||
          target.includes(modName) ||
          target.includes(zoneName)

        if (isTidel) {
          matches =
            matches ||
            modName.includes('tidel') ||
            modName.includes('tidal') ||
            zoneName.includes('tidel') ||
            seatStr.startsWith('WS-04')
        } else if (isElcotM2) {
          matches =
            matches ||
            modName.includes('module 2') ||
            modName.includes('eo2') ||
            seatStr.includes('EO2')
        } else if (isElcotM1) {
          matches =
            matches ||
            ((modName.includes('module 1') || modName.includes('elcot')) &&
              !modName.includes('module 2') &&
              !modName.includes('tidel') &&
              !seatStr.includes('EO2') &&
              !seatStr.startsWith('WS-04'))
        }

        if (!matches) return false
      }

      // 3. Status Filter
      if (statusFilter !== 'All') {
        const st = String(b.status || '').toUpperCase()
        const target = statusFilter.toUpperCase()

        if (target === 'CONFIRMED') {
          if (!st.includes('CONFIRM') && st !== 'APPROVED' && st !== 'ACTIVE') {
            return false
          }
        } else if (target === 'CANCELLED' || target === 'CANCELED') {
          if (!st.includes('CANCEL') && st !== 'REJECTED') {
            return false
          }
        } else if (target.includes('CHECK')) {
          if (!st.includes('CHECK')) {
            return false
          }
        } else if (target === 'RELEASED') {
          if (!st.includes('RELEASE')) {
            return false
          }
        } else if (target === 'EXPIRED') {
          if (!st.includes('EXPIR')) {
            return false
          }
        } else {
          if (!st.includes(target) && !target.includes(st)) {
            return false
          }
        }
      }

      return true
    })
  }, [bookings, timeFilter, moduleFilter, statusFilter])

  // Filtered list for the modal search table
  const displayedTableBookings = useMemo(() => {
    if (!tableSearch.trim()) return filteredBookings

    const q = tableSearch.toLowerCase()
    return filteredBookings.filter((b) => {
      return (
        String(b.bookingId).toLowerCase().includes(q) ||
        String(b.employee).toLowerCase().includes(q) ||
        String(b.seat).toLowerCase().includes(q) ||
        String(b.module).toLowerCase().includes(q) ||
        String(b.section).toLowerCase().includes(q) ||
        String(b.status).toLowerCase().includes(q) ||
        String(b.date).toLowerCase().includes(q)
      )
    })
  }, [filteredBookings, tableSearch])

  // Paginated records for the modal table
  const totalPages = Math.max(
    1,
    Math.ceil(displayedTableBookings.length / ITEMS_PER_PAGE)
  )

  const paginatedBookings = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE
    return displayedTableBookings.slice(start, start + ITEMS_PER_PAGE)
  }, [displayedTableBookings, currentPage])

  useEffect(() => {
    setCurrentPage(1)
  }, [tableSearch, timeFilter, moduleFilter, statusFilter])

  // =====================================================
  // KPIs (Pure Dynamic from Backend or Live Bookings)
  // =====================================================

  const kpis = useMemo(() => {
    let liveConfirmed = 0
    let liveCancelled = 0
    let liveCheckedIn = 0
    let liveReleased = 0
    let liveExpired = 0

    filteredBookings.forEach((b) => {
      const st = String(b.status || '').toUpperCase()

      if (st.includes('RELEASE')) {
        liveReleased++
      } else if (st.includes('EXPIR')) {
        liveExpired++
      } else if (st.includes('CHECK') || st === 'CHECKED IN' || st === 'CHECKED-IN') {
        liveCheckedIn++
        liveConfirmed++
      } else if (st.includes('CANCEL') || st === 'REJECTED') {
        liveCancelled++
      } else {
        liveConfirmed++
      }
    })

    const raw = dashboardData || analyticsData
    const isGlobal = timeFilter === 'All' && moduleFilter === 'All' && statusFilter === 'All'

    if (raw && isGlobal) {
      const total =
        raw.totalReservations ??
        raw.totalBookings ??
        raw.totalBookingsAnalyzed ??
        filteredBookings.length

      const cancelled =
        raw.cancelledBookings ?? raw.cancelled ?? liveCancelled

      const cancellationRate =
        raw.cancelledRate ??
        (total > 0 ? Number(((cancelled / total) * 100).toFixed(1)) : 0)

      const confirmed = total >= cancelled ? total - cancelled : liveConfirmed

      const confirmedRate =
        raw.confirmedRate ??
        (total > 0 ? Number(((confirmed / total) * 100).toFixed(1)) : 0)

      const trendlineCheckIns = Array.isArray(raw.dailyOccupancyTrendline)
        ? raw.dailyOccupancyTrendline.reduce(
            (acc, curr) => acc + Number(curr.checkInsCount ?? curr.checkIns ?? 0),
            0
          )
        : 0

      const checkedIn =
        raw.checkedInBookings ??
        raw.checkedIn ??
        raw.totalCheckIns ??
        raw.checkInsCount ??
        (trendlineCheckIns > 0 ? trendlineCheckIns : liveCheckedIn)

      const checkedInRate =
        raw.checkedInRate ??
        (total > 0 ? Number(((checkedIn / total) * 100).toFixed(1)) : 0)

      const released =
        raw.releasedBookings ??
        raw.released ??
        raw.totalReleased ??
        liveReleased

      const releasedRate =
        raw.releasedRate ??
        (total > 0 ? Number(((released / total) * 100).toFixed(1)) : 0)

      const expired =
        raw.expiredBookings ??
        raw.expired ??
        raw.totalExpired ??
        liveExpired

      const expiredRate =
        raw.expiredRate ??
        (total > 0 ? Number(((expired / total) * 100).toFixed(1)) : 0)

      return {
        total,
        confirmed,
        confirmedRate,
        cancelled,
        cancellationRate,
        checkedIn,
        checkedInRate,
        released,
        releasedRate,
        expired,
        expiredRate,
        uniqueSeats: 453,
      }
    }

    // Dynamic metrics computed from filteredBookings when filtered
    const total = filteredBookings.length
    const confirmed = total >= liveCancelled ? total - liveCancelled : liveConfirmed
    const confirmedRate =
      total > 0 ? Number(((confirmed / total) * 100).toFixed(1)) : 0
    const cancellationRate =
      total > 0 ? Number(((liveCancelled / total) * 100).toFixed(1)) : 0
    const checkedInRate =
      total > 0 ? Number(((liveCheckedIn / total) * 100).toFixed(1)) : 0
    const releasedRate =
      total > 0 ? Number(((liveReleased / total) * 100).toFixed(1)) : 0
    const expiredRate =
      total > 0 ? Number(((liveExpired / total) * 100).toFixed(1)) : 0

    let uniqueSeats = 453
    if (moduleFilter.toLowerCase().includes('tidel')) {
      uniqueSeats = 224
    } else if (moduleFilter.toLowerCase().includes('module 2') || moduleFilter.toLowerCase().includes('eo2')) {
      uniqueSeats = 131
    } else if (moduleFilter.toLowerCase().includes('module 1') || moduleFilter.toLowerCase().includes('elcot')) {
      uniqueSeats = 98
    }

    return {
      total,
      confirmed,
      confirmedRate,
      cancelled: liveCancelled,
      cancellationRate,
      checkedIn: liveCheckedIn,
      checkedInRate,
      released: liveReleased,
      releasedRate,
      expired: liveExpired,
      expiredRate,
      uniqueSeats,
    }
  }, [dashboardData, analyticsData, filteredBookings, timeFilter, moduleFilter, statusFilter])

  // =====================================================
  // HOTSEAT VISUAL CHARTS DATA
  // =====================================================

  // 1. Module / Zone Workstation Distribution (Donut)
  const moduleDistributionData = useMemo(() => {
    const tidelItem = { name: 'Module 1 - Tidel Park', value: 0, color: '#0284C7' }
    const elcot1Item = { name: 'Module 1 - Elcot Park', value: 0, color: '#0D9488' }
    const elcot2Item = { name: 'Module 2 - Elcot Park', value: 0, color: '#6366F1' }

    filteredBookings.forEach((b) => {
      const mod = String(b.module || '').toLowerCase()
      const zone = String(b.zone || '').toLowerCase()
      const seat = String(b.seat || '').toLowerCase()
      if (mod.includes('tidel') || zone.includes('tidel') || seat.startsWith('ws-04')) {
        tidelItem.value += 1
      } else if (mod.includes('module 2') || mod.includes('eo2') || seat.includes('eo2')) {
        elcot2Item.value += 1
      } else {
        elcot1Item.value += 1
      }
    })

    return [tidelItem, elcot1Item, elcot2Item].filter((item) => item.value > 0)
  }, [filteredBookings])

  // 2. Floor Section Demand Breakdown
  const sectionDemandData = useMemo(() => {
    const map = {
      'Section A': 0,
      'Section B': 0,
      'Section C': 0,
      'Section D': 0,
    }

    filteredBookings.forEach((b) => {
      const sec = resolveSection(b.seat, b.module)
      if (map[sec] !== undefined) {
        map[sec] += 1
      } else {
        map['Section A'] += 1
      }
    })

    const isTidel =
      moduleFilter.toLowerCase().includes('tidel') ||
      (moduleFilter === 'All' &&
        filteredBookings.some((b) =>
          String(b.module || '').toLowerCase().includes('tidel')
        ))

    const sections = [
      {
        section: 'Section A',
        bookings: map['Section A'],
        color: SECTION_COLORS['Section A'],
      },
      {
        section: 'Section B',
        bookings: map['Section B'],
        color: SECTION_COLORS['Section B'],
      },
      {
        section: 'Section C',
        bookings: map['Section C'],
        color: SECTION_COLORS['Section C'],
      },
    ]

    // Only Tidel Park has Section D (Seats 165 - 224)
    if (isTidel) {
      sections.push({
        section: 'Section D',
        bookings: map['Section D'],
        color: SECTION_COLORS['Section D'],
      })
    }

    return sections
  }, [filteredBookings, moduleFilter])

  // 3. Most In-Demand Workstation Desks (Limit to Top 3 Only)
  const topDesksData = useMemo(() => {
    const rawList =
      analyticsData?.topInDemandDesks ||
      dashboardData?.topInDemandDesks ||
      analyticsData?.topDesks ||
      []

    if (rawList.length > 0) {
      return rawList.slice(0, 3).map((d) => ({
        name: d.deskNumber || d.seatNumber || d.name || `Seat #${d.seatId}`,
        bookings: Number(d.reservationCount ?? d.bookings ?? d.count ?? 0),
        module: d.moduleName || d.module || d.officeName || 'Hotseat',
      }))
    }

    const map = {}
    filteredBookings.forEach((b) => {
      const seat = b.seat
      if (!seat || seat === '-') return
      if (!map[seat]) {
        map[seat] = {
          name: seat,
          bookings: 0,
          module: b.module || 'Hotseat',
        }
      }
      map[seat].bookings += 1
    })

    return Object.values(map)
      .sort((a, b) => b.bookings - a.bookings)
      .slice(0, 3)
  }, [analyticsData, dashboardData, filteredBookings])

  // 4. Peak Hotseat Check-In Time Slots
  const timeSlotDistributionData = useMemo(() => {
    const rawList =
      analyticsData?.peakCheckInSlots ||
      dashboardData?.peakCheckInSlots ||
      analyticsData?.timeSlotDistribution ||
      []

    if (rawList.length > 0) {
      return rawList.map((s) => ({
        slot: s.timeSlot || `${s.startTime} - ${s.endTime}`,
        bookings: Number(s.checkInSlotsCount ?? s.bookings ?? s.count ?? 0),
      }))
    }

    const slotMap = new Map()

    filteredBookings.forEach((b) => {
      const raw = String(b.expectedCheckIn || '').trim()
      if (!raw || raw === '-') return
      let cleanSlot = raw
      if (raw.length > 13) cleanSlot = raw.slice(0, 13)
      slotMap.set(cleanSlot, (slotMap.get(cleanSlot) || 0) + 1)
    })

    return Array.from(slotMap.entries())
      .map(([slot, bookings]) => ({ slot, bookings }))
      .sort((a, b) => a.slot.localeCompare(b.slot))
      .slice(0, 7)
  }, [analyticsData, dashboardData, filteredBookings])

  // =====================================================
  // Export Handlers
  // =====================================================

  const handleExportCSV = async () => {
    try {
      setExporting(true)
      const filterDto = {
        timeframe: timeFilter,
        module: moduleFilter === 'All' ? null : moduleFilter,
        status: statusFilter === 'All' ? null : statusFilter,
      }

      const blobData = await exportHotseatCsv(filterDto)
      const blob = new Blob([blobData], { type: 'text/csv;charset=utf-8;' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.setAttribute(
        'download',
        `SpaceBook-Hotseat-Analytics-${new Date().toISOString().split('T')[0]}.csv`
      )
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      console.warn('Backend CSV export fallback to client data:', err)
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
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* =================================================
          PAGE HEADER
      ================================================= */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold">
            Hotseat Management
          </h1>
          <p className="text-sm text-slate">
            Executive workspace intelligence, desk utilization telemetry, and hotseat records.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={loadData}
            disabled={loading}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 shadow-xs"
          >
            <RefreshCw
              size={14}
              className={loading ? 'animate-spin text-sky-600' : 'text-slate-500'}
            />
            <span>Refresh</span>
          </Button>

          <Button
            size="sm"
            onClick={handleExportCSV}
            disabled={exporting || filteredBookings.length === 0}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-xs font-bold text-white shadow-md shadow-blue-700/20 whitespace-nowrap transition-all active:scale-95 border-0"
          >
            {exporting ? (
              <Loader2 size={14} className="animate-spin text-white" />
            ) : (
              <FileText size={14} className="text-blue-100" />
            )}
            <span className="text-white">
              {exporting ? 'Exporting...' : 'Export CSV'}
            </span>
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
              {filterOptions.modules.length > 0 ? (
                filterOptions.modules.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))
              ) : (
                <>
                  <option value="Module 1 - Tidel Park">
                    Module 1 - Tidel Park
                  </option>
                  <option value="Module 1 - Elcot Park">
                    Module 1 - Elcot Park
                  </option>
                  <option value="Module 2 - Elcot Park">
                    Module 2 - Elcot Park
                  </option>
                </>
              )}
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-xl border border-line bg-white px-3 py-1.5 text-xs font-medium text-ink outline-none focus:border-sky-500"
            >
              <option value="All">All Status</option>
              {filterOptions.statuses.length > 0 ? (
                filterOptions.statuses.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))
              ) : (
                <>
                  <option value="Confirmed">Confirmed Bookings</option>
                  <option value="Cancelled">Cancelled Bookings</option>
                </>
              )}
            </select>
          </div>

          <div className="flex items-center gap-2 text-xs font-semibold text-slate">
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            Analyzing {filteredBookings.length} total bookings
          </div>
        </div>
      </Card>

      {/* =================================================
          TOP 6 KPI CARDS
      ================================================= */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
        {/* Card 1: TOTAL RESERVATIONS */}
        <Card className="p-3 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate">
              TOTAL RESERVATIONS
            </span>
            <Calendar size={14} className="text-sky-600" />
          </div>
          <p className="mt-1 text-2xl font-extrabold text-ink leading-tight">
            {kpis.total}
          </p>
          <div className="mt-1 flex items-center justify-between text-[11px] text-slate">
            <span>{kpis.uniqueSeats} Total</span>
            <span className="font-semibold text-sky-700">100% Vol</span>
          </div>
          <div className="mt-1 h-1 w-full rounded-full bg-slate-100">
            <div className="h-1 rounded-full bg-sky-600 w-full" />
          </div>
        </Card>

        {/* Card 2: CONFIRMED BOOKINGS */}
        <Card className="p-3 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate">
              CONFIRMED BOOKINGS
            </span>
            <CheckCircle2 size={14} className="text-[#5c7a60]" />
          </div>
          <p className="mt-1 text-2xl font-extrabold text-[#5c7a60] leading-tight">
            {kpis.confirmed}
          </p>
          <div className="mt-1 flex items-center justify-between text-[11px] text-slate">
            <span>Successful</span>
            <span className="font-bold text-emerald-700">
              {kpis.confirmedRate}%
            </span>
          </div>
          <div className="mt-1 h-1 w-full rounded-full bg-slate-100">
            <div
              className="h-1 rounded-full bg-[#5c7a60] transition-all duration-500"
              style={{ width: `${kpis.confirmedRate}%` }}
            />
          </div>
        </Card>

        {/* Card 3: CHECKED IN */}
        <Card className="p-3 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate">
              CHECKED IN
            </span>
            <UserCheck size={14} className="text-[#0284c7]" />
          </div>
          <p className="mt-1 text-2xl font-extrabold text-[#0284c7] leading-tight">
            {kpis.checkedIn}
          </p>
          <div className="mt-1 flex items-center justify-between text-[11px] text-slate">
            <span>Occupied</span>
            <span className="font-bold text-sky-700">
              {kpis.checkedInRate}%
            </span>
          </div>
          <div className="mt-1 h-1 w-full rounded-full bg-slate-100">
            <div
              className="h-1 rounded-full bg-[#0284c7] transition-all duration-500"
              style={{ width: `${kpis.checkedInRate}%` }}
            />
          </div>
        </Card>

        {/* Card 4: RELEASED */}
        <Card className="p-3 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate">
              RELEASED
            </span>
            <LogOut size={14} className="text-[#8b5cf6]" />
          </div>
          <p className="mt-1 text-2xl font-extrabold text-[#8b5cf6] leading-tight">
            {kpis.released}
          </p>
          <div className="mt-1 flex items-center justify-between text-[11px] text-slate">
            <span>Released</span>
            <span className="font-bold text-purple-700">
              {kpis.releasedRate}%
            </span>
          </div>
          <div className="mt-1 h-1 w-full rounded-full bg-slate-100">
            <div
              className="h-1 rounded-full bg-[#8b5cf6] transition-all duration-500"
              style={{ width: `${kpis.releasedRate}%` }}
            />
          </div>
        </Card>

        {/* Card 5: EXPIRED */}
        <Card className="p-3 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate">
              EXPIRED
            </span>
            <AlertCircle size={14} className="text-[#f59e0b]" />
          </div>
          <p className="mt-1 text-2xl font-extrabold text-[#f59e0b] leading-tight">
            {kpis.expired}
          </p>
          <div className="mt-1 flex items-center justify-between text-[11px] text-slate">
            <span>Expired</span>
            <span className="font-bold text-amber-700">
              {kpis.expiredRate}%
            </span>
          </div>
          <div className="mt-1 h-1 w-full rounded-full bg-slate-100">
            <div
              className="h-1 rounded-full bg-[#f59e0b] transition-all duration-500"
              style={{ width: `${kpis.expiredRate}%` }}
            />
          </div>
        </Card>

        {/* Card 6: CANCELLED BOOKINGS */}
        <Card className="p-3 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate">
              CANCELLED BOOKINGS
            </span>
            <XCircle size={14} className="text-[#be534d]" />
          </div>
          <p className="mt-1 text-2xl font-extrabold text-[#be534d] leading-tight">
            {kpis.cancelled}
          </p>
          <div className="mt-1 flex items-center justify-between text-[11px] text-slate">
            <span>Cancelled</span>
            <span className="font-bold text-red-700">
              {kpis.cancellationRate}%
            </span>
          </div>
          <div className="mt-1 h-1 w-full rounded-full bg-slate-100">
            <div
              className="h-1 rounded-full bg-[#be534d] transition-all duration-500"
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
              Showing {filteredBookings.length} of {kpis.total} hotseat reservations matching active filters.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsAuditModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#0284c7] hover:bg-[#0369a1] text-white font-semibold text-xs rounded-xl shadow-sm transition-all active:scale-95 border-0"
          >
            <Eye size={12} />
            <span>View</span>
          </button>
        </div>
      </Card>

      {/* =================================================
          ROW 1: Hotseat Facility Distribution & Section Breakdown
      ================================================= */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* CHART 1: Module & Facility Distribution (Donut Chart) */}
        <Card className="p-5 shadow-sm">
          <div className="flex items-center justify-between border-b border-line pb-3">
            <div>
              <h2 className="font-display text-sm font-bold text-ink">
                Hotseat Volume by Facility & Zone
              </h2>
              <p className="text-xs text-slate">
                Workstation reservation share across Tidel Park and Elcot Park Modules.
              </p>
            </div>
            <MapPin size={16} className="text-sky-600" />
          </div>

          <div className="h-[300px] w-full pt-2">
            {moduleDistributionData.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-slate">
                No facility data available.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={moduleDistributionData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={65}
                    outerRadius={105}
                    paddingAngle={4}
                  >
                    {moduleDistributionData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.color || MODULE_COLORS[index % MODULE_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomChartTooltip />} />
                  <Legend
                    verticalAlign="bottom"
                    height={36}
                    formatter={(value) => (
                      <span className="text-xs text-slate-700 font-medium">
                        {value}
                      </span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        {/* CHART 2: Floor Section Demand Breakdown */}
        <Card className="p-5 shadow-sm">
          <div className="flex items-center justify-between border-b border-line pb-3">
            <div>
              <h2 className="font-display text-sm font-bold text-ink">
                Floor Section Demand Breakdown
              </h2>
              <p className="text-xs text-slate">
                Concentration of desk bookings across zoned quadrants.
              </p>
            </div>
            <Layers size={16} className="text-sky-600" />
          </div>

          <div className="h-[300px] w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={sectionDemandData}
                margin={{ top: 20, right: 20, left: -20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="section" tick={{ fill: '#475569', fontSize: 11 }} />
                <YAxis tick={{ fill: '#475569', fontSize: 11 }} allowDecimals={false} />
                <Tooltip content={<CustomChartTooltip />} />
                <Bar dataKey="bookings" name="Reserved Desks" radius={[6, 6, 0, 0]}>
                  {sectionDemandData.map((entry, index) => (
                    <Cell key={`sec-cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* =================================================
          ROW 2: Top In-Demand Desks & Peak Check-in Times
      ================================================= */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Ranked Top Desks */}
        <Card className="p-5 shadow-sm">
          <div className="flex items-center justify-between border-b border-line pb-3">
            <div>
              <h2 className="font-display text-sm font-bold text-ink">
                Most In-Demand Desks
              </h2>
              <p className="text-xs text-slate">
                Top individual hotseats with highest booking count.
              </p>
            </div>
            <Armchair size={16} className="text-sky-600" />
          </div>

          <div className="mt-4 space-y-3">
            {topDesksData.length === 0 ? (
              <p className="text-xs text-slate py-8 text-center">
                No desk reservation data available.
              </p>
            ) : (
              topDesksData.map((desk, idx) => (
                <div
                  key={desk.name}
                  className="flex items-center justify-between rounded-xl bg-slate-50/80 p-2.5 transition-colors hover:bg-slate-100/80"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-sky-100 text-xs font-bold text-sky-800">
                      #{idx + 1}
                    </span>
                    <div>
                      <p className="text-xs font-bold text-ink">{desk.name}</p>
                      <p className="text-[11px] text-slate">{desk.module}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-extrabold text-sky-950">
                      {desk.bookings}
                    </span>
                    <span className="text-[10px] text-slate ml-1">
                      {desk.bookings === 1 ? 'booking' : 'bookings'}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        {/* Peak Check-In Times */}
        <Card className="p-5 shadow-sm">
          <div className="flex items-center justify-between border-b border-line pb-3">
            <div>
              <h2 className="font-display text-sm font-bold text-ink">
                Peak Check-In Arrival Hours
              </h2>
              <p className="text-xs text-slate">
                Hourly frequency of employee hotseat occupancy.
              </p>
            </div>
            <Clock size={16} className="text-sky-600" />
          </div>

          <div className="h-[250px] w-full pt-4">
            {timeSlotDistributionData.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-slate">
                No arrival time data available.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={timeSlotDistributionData}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="slot" tick={{ fill: '#475569', fontSize: 11 }} />
                  <YAxis tick={{ fill: '#475569', fontSize: 11 }} allowDecimals={false} />
                  <Tooltip content={<CustomChartTooltip />} />
                  <Bar
                    dataKey="bookings"
                    name="Check-in Slots"
                    fill="#6366F1"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>
      </div>

      {/* =====================================================
          AUDIT TABLE MODAL (Pure Hotseat Records)
      ===================================================== */}
      {isAuditModalOpen &&
        createPortal(
          <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
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
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 py-2.5">
                <p className="text-xs text-slate-500">
                  Showing {displayedTableBookings.length} of {bookings.length} hotseat reservations matching active filters.
                </p>

                <div className="flex items-center gap-2">
                  <input
                    value={tableSearch}
                    onChange={(e) => setTableSearch(e.target.value)}
                    placeholder="Search hotseats, employees, sections..."
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
                        <th className="px-4 py-3 whitespace-nowrap">EMPLOYEE NAME</th>
                        <th className="px-4 py-3 whitespace-nowrap">SEAT</th>
                        <th className="px-4 py-3 whitespace-nowrap">MODULE</th>
                        <th className="px-4 py-3 whitespace-nowrap">SECTION</th>
                        <th className="px-4 py-3 whitespace-nowrap">DATE</th>
                        <th className="px-4 py-3 whitespace-nowrap">CHECK-IN</th>
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
                            No hotseat records match the active filter criteria.
                          </td>
                        </tr>
                      ) : (
                        paginatedBookings.map((booking) => (
                          <tr
                            key={booking.bookingId}
                            onClick={() => openDetailModal(booking)}
                            className="cursor-pointer transition-colors duration-150 hover:bg-slate-50/80"
                            title="Click to view full reservation details"
                          >
                            <td className="px-4 py-3.5 font-bold text-slate-900 whitespace-nowrap">
                              {booking.bookingId}
                            </td>
                            <td className="px-4 py-3.5 font-medium text-slate-800 whitespace-nowrap">
                              {booking.employee}
                            </td>
                            <td className="px-4 py-3.5 font-bold text-slate-900 whitespace-nowrap">
                              {booking.seat}
                            </td>
                            <td className="px-4 py-3.5 text-slate-600 whitespace-nowrap">
                              {booking.module}
                            </td>
                            <td className="px-4 py-3.5 text-slate-600 whitespace-nowrap">
                              {booking.section}
                            </td>
                            <td className="px-4 py-3.5 text-slate-600 whitespace-nowrap">
                              {booking.date}
                            </td>
                            <td className="px-4 py-3.5 text-slate-600 whitespace-nowrap">
                              {booking.expectedCheckIn || '10:00 AM'}
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

              {/* Modal Footer */}
              <div className="mt-4 flex flex-col gap-3 pt-1 border-t border-slate-100">
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

                <div className="flex items-center justify-between pt-1">
                  <p className="text-xs text-slate-400">
                    Total {bookings.length} bookings found
                  </p>
                  <button
                    type="button"
                    onClick={() => setIsAuditModalOpen(false)}
                    className="rounded-xl border border-slate-200 bg-white px-5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-xs"
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
          RESERVATION DETAIL MODAL
      ===================================================== */}
      {isDetailModalOpen && selectedBooking && (
        <Modal
          isOpen={isDetailModalOpen}
          onClose={closeDetailModal}
          title={`Hotseat Reservation #${selectedBooking.bookingId}`}
          className="max-w-md"
        >
          <div className="space-y-4">
            <div className="rounded-xl bg-slate-50 p-3.5">
              <p className="text-xs uppercase tracking-wider text-slate font-semibold">
                Reserved By
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
                <p className="font-bold text-sky-700 mt-0.5">
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
                  Expected Arrival
                </p>
                <p className="font-medium text-ink mt-0.5">
                  {selectedBooking.expectedCheckIn}
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

            {selectedBooking.cancelReason && (
              <div className="rounded-xl border border-red-200 bg-red-50/50 p-3">
                <p className="text-xs font-semibold text-red-800">
                  Cancellation Reason:
                </p>
                <p className="mt-0.5 text-xs text-red-700">
                  {selectedBooking.cancelReason}
                </p>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <Button variant="secondary" onClick={closeDetailModal}>
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
