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

import {
  downloadCSV,
  exportToExcel,
} from '../../utils/exportHelpers'

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

function isCancelledStatus(status) {
  const normalized = normalizeStatus(status)

  return (
    normalized === 'CANCELLED' ||
    normalized === 'REJECTED'
  )
}

function isConfirmedStatus(status) {
  const normalized = normalizeStatus(status)

  return (
    normalized === 'CONFIRMED' ||
    normalized === 'APPROVED' ||
    normalized === 'BOOKED'
  )
}

// =====================================================
// STATUS BADGE
// =====================================================

function CustomStatusTag({ status }) {
  const normalized = normalizeStatus(status)

  let bgClass = 'bg-[#658362] text-white'

  if (
    normalized === 'PENDING' ||
    normalized === 'MAINTENANCE'
  ) {
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
      className={`inline-block w-28 py-1 rounded-full text-xs font-bold tracking-wider uppercase text-center ${bgClass}`}
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

function CustomChartTooltip({
  active,
  payload,
  label,
}) {
  if (!active || !payload || !payload.length) {
    return null
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white/95 p-3 shadow-xl backdrop-blur-sm">
      <p className="font-semibold text-xs text-slate-800">
        {label}
      </p>

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
                  backgroundColor:
                    item.color || item.fill,
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

  // =====================================================
  // DATA
  // =====================================================

  const [bookings, setBookings] = useState([])

  const [trendData, setTrendData] = useState([])
  const [statusDistribution, setStatusDistribution] = useState([])
  const [roomTypeUsage, setRoomTypeUsage] = useState([])
  const [dashboardMetrics, setDashboardMetrics] = useState(null)

  // =====================================================
  // FILTERS
  // =====================================================

  const [timeFilter, setTimeFilter] = useState('All')
  const [moduleFilter, setModuleFilter] = useState('All')
  const [statusFilter, setStatusFilter] = useState('All')
  const [trendPeriod, setTrendPeriod] = useState('Monthly')

  // =====================================================
  // MODAL / SEARCH
  // =====================================================

  const [selectedBooking, setSelectedBooking] = useState(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [tableSearch, setTableSearch] = useState('')

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

    /*
     * IMPORTANT:
     *
     * MeetingTitle MUST come from the backend MeetingTitle field.
     *
     * Do NOT use Purpose / Reason / Description as MeetingTitle.
     */

    const meetingTitle =
      b.meetingTitle ??
      b.MeetingTitle ??
      b.meeting_title ??
      null

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
      (b.roomId != null
        ? `Room ${b.roomId}`
        : 'Room')

    const module =
      b.module ??
      b.Module ??
      b.moduleName ??
      b.ModuleName ??
      b.room?.module ??
      b.room?.moduleName ??
      b.Room?.Module ??
      'Module 1'

    const roomType =
      b.roomType ??
      b.RoomType ??
      b.room?.type ??
      b.room?.roomType?.name ??
      b.Room?.RoomType?.Name ??
      'Conference'

    const status = normalizeStatus(
      b.status ??
      b.Status
    )

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

      /*
       * Actual backend MeetingTitle.
       */
      title:
        meetingTitle !== null &&
        String(meetingTitle).trim()
          ? String(meetingTitle).trim()
          : '-',

      meetingTitle:
        meetingTitle !== null &&
        String(meetingTitle).trim()
          ? String(meetingTitle).trim()
          : '-',

      employeeId:
        b.employeeId ??
        b.EmployeeId ??
        b.employee?.employeeId ??
        null,

      createdBy: employeeName,

      roomId:
        b.roomId ??
        b.RoomId ??
        b.room?.roomId ??
        b.Room?.RoomId ??
        null,

      roomName,

      module,

      roomType,

      date: formatDisplayDate(
        b.bookingDate ??
        b.BookingDate ??
        b.date
      ),

      startTime: formatDisplayTime(
        b.startTime ??
        b.StartTime ??
        b.start_time ??
        b.start
      ),

      endTime: formatDisplayTime(
        b.endTime ??
        b.EndTime ??
        b.end_time ??
        b.end
      ),

      participantCount:
        b.participantCount ??
        b.ParticipantCount ??
        b.participants ??
        0,

      status,

      cancelReason:
        cancellationReason
          ? String(cancellationReason).trim()
          : '',

      createdAt:
        b.bookedOn ??
        b.BookedOn ??
        b.createdAt ??
        b.CreatedAt ??
        '',
    }
  }

  // =====================================================
  // LOAD DATA
  // =====================================================

  const loadData = async () => {
    try {
      setLoading(true)
      setError(null)

      /*
       * IMPORTANT:
       *
       * Reports now use /admin/bookings as the single source
       * of truth for booking records.
       *
       * We no longer call /employee/mybookings to find
       * MeetingTitle.
       */

      const [
        bookingsRes,
        trendRes,
        statusRes,
        usageRes,
        dashRes,
      ] = await Promise.allSettled([
        client.get('/admin/bookings'),

        getBookingTrendReport({
          reportType: trendPeriod,
        }),

        getBookingStatusReport({}),

        getRoomUsageReport({}),

        client.get('/admin/dashboard'),
      ])

      // =====================================================
      // DASHBOARD METRICS
      // =====================================================

      if (
        dashRes.status === 'fulfilled' &&
        dashRes.value?.data
      ) {
        setDashboardMetrics(dashRes.value.data)
      }

      // =====================================================
      // ADMIN BOOKINGS
      // =====================================================

      if (bookingsRes.status === 'fulfilled') {
        const responseData = bookingsRes.value?.data

        let rawData = []

        if (Array.isArray(responseData)) {
          rawData = responseData
        } else if (
          Array.isArray(responseData?.data)
        ) {
          rawData = responseData.data
        } else if (
          Array.isArray(responseData?.bookings)
        ) {
          rawData = responseData.bookings
        } else if (
          Array.isArray(responseData?.items)
        ) {
          rawData = responseData.items
        }

        const mappedBookings = rawData.map(
          (booking, index) =>
            normalizeBooking(
              booking,
              index
            )
        )

        setBookings(mappedBookings)

        console.log(
          'Admin bookings received:',
          rawData
        )

        console.log(
          'Normalized report bookings:',
          mappedBookings
        )

        /*
         * This helps verify the backend value.
         *
         * Example:
         *
         * MeetingTitle: "Team Meeting"
         *
         * If this shows null here, the issue is BACKEND
         * /admin/bookings DTO/projection, not React.
         */
        console.log(
          'Meeting titles:',
          mappedBookings.map((b) => ({
            bookingId: b.bookingId,
            meetingTitle: b.meetingTitle,
          }))
        )
      } else {
        console.error(
          'Failed to load /admin/bookings:',
          bookingsRes.reason
        )
      }

      // =====================================================
      // TREND REPORT
      // =====================================================

      if (
        trendRes.status === 'fulfilled' &&
        trendRes.value?.chart
      ) {
        const list =
          trendRes.value.chart.map((item) => ({
            name:
              item.label ||
              item.Label ||
              'Unknown',

            bookings: Number(
              item.count ??
              item.Count ??
              0
            ),
          }))

        setTrendData(list)
      }

      // =====================================================
      // STATUS DISTRIBUTION
      // =====================================================

      if (
        statusRes.status === 'fulfilled' &&
        statusRes.value
      ) {
        const raw =
          Array.isArray(statusRes.value)
            ? statusRes.value
            : Array.isArray(
                statusRes.value.data
              )
            ? statusRes.value.data
            : []

        setStatusDistribution(
          raw.map((item) => ({
            name:
              item.status ??
              item.Status ??
              'Unknown',

            value: Number(
              item.count ??
              item.Count ??
              0
            ),
          }))
        )
      }

      // =====================================================
      // ROOM TYPE USAGE
      // =====================================================

      if (
        usageRes.status === 'fulfilled' &&
        usageRes.value
      ) {
        const raw =
          Array.isArray(usageRes.value)
            ? usageRes.value
            : Array.isArray(
                usageRes.value.data
              )
            ? usageRes.value.data
            : []

        setRoomTypeUsage(
          raw.map((item) => ({
            name:
              item.roomType ??
              item.RoomType ??
              'Unknown',

            value: Number(
              item.count ??
              item.Count ??
              0
            ),
          }))
        )
      }
    } catch (err) {
      console.error(
        'Failed to load visual analytics:',
        err
      )

      setError(
        'Unable to load live reports data.'
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [trendPeriod])

  // =====================================================
  // FILTERED BOOKINGS
  // =====================================================

  const filteredBookings = useMemo(() => {
    const now = new Date()

    const formatLocalDate = (d) =>
      `${d.getFullYear()}-${String(
        d.getMonth() + 1
      ).padStart(2, '0')}-${String(
        d.getDate()
      ).padStart(2, '0')}`

    const todayStr =
      formatLocalDate(now)

    const sevenDaysAgo =
      new Date(now)

    sevenDaysAgo.setDate(
      now.getDate() - 7
    )

    const sevenDaysAgoStr =
      formatLocalDate(
        sevenDaysAgo
      )

    const thirtyDaysAgo =
      new Date(now)

    thirtyDaysAgo.setDate(
      now.getDate() - 30
    )

    const thirtyDaysAgoStr =
      formatLocalDate(
        thirtyDaysAgo
      )

    return bookings.filter((b) => {
      // ===================================================
      // MODULE
      // ===================================================

      if (moduleFilter !== 'All') {
        const bMod = String(
          b.module || ''
        ).toLowerCase()

        if (
          moduleFilter === 'Module 1'
        ) {
          const isMod1 =
            bMod.includes('module 1') ||
            bMod.includes('eo1') ||
            bMod.includes('e01') ||
            (
              bMod.includes('1') &&
              !bMod.includes('2')
            )

          if (!isMod1) {
            return false
          }
        }

        if (
          moduleFilter === 'Module 2'
        ) {
          const isMod2 =
            bMod.includes('module 2') ||
            bMod.includes('eo2') ||
            bMod.includes('e02') ||
            (
              bMod.includes('2') &&
              !bMod.includes('1')
            )

          if (!isMod2) {
            return false
          }
        }
      }

      // ===================================================
      // STATUS
      // ===================================================

      if (statusFilter !== 'All') {
        const status =
          normalizeStatus(
            b.status
          )

        if (
          statusFilter ===
          'Confirmed'
        ) {
          if (
            isCancelledStatus(status)
          ) {
            return false
          }
        }

        if (
          statusFilter ===
          'Cancelled'
        ) {
          if (
            !isCancelledStatus(
              status
            )
          ) {
            return false
          }
        }
      }

      // ===================================================
      // DATE
      // ===================================================

      const bDate = String(
        b.date || ''
      ).substring(0, 10)

      if (
        timeFilter === 'Today'
      ) {
        if (bDate !== todayStr) {
          return false
        }
      }

      if (
        timeFilter === 'This Week'
      ) {
        if (
          bDate <
          sevenDaysAgoStr
        ) {
          return false
        }
      }

      if (
        timeFilter === 'This Month'
      ) {
        if (
          bDate <
          thirtyDaysAgoStr
        ) {
          return false
        }
      }

      if (
        timeFilter === 'Past'
      ) {
        if (
          bDate >= todayStr
        ) {
          return false
        }
      }

      if (
        timeFilter === 'Upcoming'
      ) {
        if (
          bDate < todayStr
        ) {
          return false
        }
      }

      return true
    })
  }, [
    bookings,
    moduleFilter,
    statusFilter,
    timeFilter,
  ])

  // =====================================================
  // TABLE SEARCH
  // =====================================================

  const displayedTableBookings =
    useMemo(() => {
      if (!tableSearch.trim()) {
        return filteredBookings
      }

      const query =
        tableSearch
          .toLowerCase()
          .trim()

      return filteredBookings.filter(
        (b) =>
          String(
            b.bookingId || ''
          )
            .toLowerCase()
            .includes(query) ||

          String(
            b.meetingTitle || ''
          )
            .toLowerCase()
            .includes(query) ||

          String(
            b.roomName || ''
          )
            .toLowerCase()
            .includes(query) ||

          String(
            b.module || ''
          )
            .toLowerCase()
            .includes(query) ||

          String(
            b.createdBy || ''
          )
            .toLowerCase()
            .includes(query) ||

          String(
            b.date || ''
          )
            .toLowerCase()
            .includes(query) ||

          String(
            b.status || ''
          )
            .toLowerCase()
            .includes(query)
      )
    }, [
      filteredBookings,
      tableSearch,
    ])

  // =====================================================
  // KPI
  // =====================================================

  const kpis = useMemo(() => {
    const total =
      filteredBookings.length

    let confirmed = 0
    let cancelled = 0

    const userSet = new Set()
    const roomSet = new Set()

    filteredBookings.forEach((b) => {
      if (b.createdBy) {
        userSet.add(b.createdBy)
      }

      if (b.roomName) {
        roomSet.add(b.roomName)
      }

      if (
        isCancelledStatus(
          b.status
        )
      ) {
        cancelled += 1
      } else if (
        isConfirmedStatus(
          b.status
        )
      ) {
        confirmed += 1
      } else {
        confirmed += 1
      }
    })

    const confirmedRate =
      total > 0
        ? Math.round(
            (confirmed / total) *
              100
          )
        : 0

    const cancellationRate =
      total > 0
        ? Math.round(
            (cancelled / total) *
              100
          )
        : 0

    let utilization = '0.0'

    if (
      dashboardMetrics?.utilization !==
        undefined &&
      dashboardMetrics?.utilization !==
        null
    ) {
      utilization =
        Number(
          dashboardMetrics.utilization
        ).toFixed(1)
    }

    return {
      total,
      confirmed,
      cancelled,
      uniqueUsers:
        userSet.size,
      uniqueRooms:
        roomSet.size,
      confirmedRate,
      cancellationRate,
      utilization,
    }
  }, [
    filteredBookings,
    dashboardMetrics,
  ])

  // =====================================================
  // STATUS DONUT
  // =====================================================

  const visualStatusData =
    useMemo(() => {
      if (kpis.total === 0) {
        return []
      }

      return [
        {
          name: 'Confirmed',
          value: kpis.confirmed,
          color: '#10B981',
        },
        {
          name: 'Cancelled',
          value: kpis.cancelled,
          color: '#EF4444',
        },
      ]
    }, [kpis])

  // =====================================================
  // EMPLOYEE COMPARISON
  // =====================================================

  const employeeComparisonData =
    useMemo(() => {
      const map = {}

      filteredBookings.forEach(
        (b) => {
          const name =
            b.createdBy ||
            'Employee'

          if (!map[name]) {
            map[name] = {
              name,
              confirmed: 0,
              cancelled: 0,
              total: 0,
            }
          }

          map[name].total += 1

          if (
            isCancelledStatus(
              b.status
            )
          ) {
            map[name].cancelled += 1
          } else {
            map[name].confirmed += 1
          }
        }
      )

      return Object.values(map)
        .sort(
          (a, b) =>
            b.total - a.total
        )
        .slice(0, 7)
    }, [filteredBookings])

  // =====================================================
  // ROOM POPULARITY
  // =====================================================

  const roomPopularityData =
    useMemo(() => {
      const map = {}

      filteredBookings.forEach(
        (b) => {
          const room =
            b.roomName ||
            'Room'

          if (!map[room]) {
            map[room] = {
              name: room,
              bookings: 0,
              confirmed: 0,
              cancelled: 0,
            }
          }

          map[room].bookings += 1

          if (
            isCancelledStatus(
              b.status
            )
          ) {
            map[room].cancelled += 1
          } else {
            map[room].confirmed += 1
          }
        }
      )

      return Object.values(map)
        .sort(
          (a, b) =>
            b.bookings - a.bookings
        )
        .slice(0, 6)
    }, [filteredBookings])

  // =====================================================
  // CANCELLATION REASONS
  // =====================================================

  const cancellationReasonsData =
    useMemo(() => {
      const map = {}
      let totalCancelled = 0

      filteredBookings.forEach(
        (b) => {
          if (
            isCancelledStatus(
              b.status
            )
          ) {
            const reason =
              b.cancelReason
                ? b.cancelReason.trim()
                : 'General Schedule Conflict'

            map[reason] =
              (map[reason] || 0) +
              1

            totalCancelled += 1
          }
        }
      )

      return Object.entries(map)
        .map(
          ([reason, count]) => ({
            reason,
            count,
            percentage:
              totalCancelled > 0
                ? Math.round(
                    (count /
                      totalCancelled) *
                      100
                  )
                : 0,
          })
        )
        .sort(
          (a, b) =>
            b.count - a.count
        )
        .slice(0, 5)
    }, [filteredBookings])

  // =====================================================
  // HOURLY DISTRIBUTION
  // =====================================================

  const hourlyDistributionData =
    useMemo(() => {
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

      filteredBookings.forEach(
        (b) => {
          if (b.startTime) {
            const hour =
              b.startTime.substring(
                0,
                2
              ) + ':00'

            if (
              slots[hour] !==
              undefined
            ) {
              slots[hour] += 1
            }
          }
        }
      )

      return Object.entries(
        slots
      ).map(
        ([time, count]) => ({
          time,
          bookings: count,
        })
      )
    }, [filteredBookings])

  // =====================================================
  // TIMELINE
  // =====================================================

  const timelineData =
    useMemo(() => {
      if (
        trendData &&
        trendData.length > 0
      ) {
        return trendData
      }

      const monthMap = {}

      filteredBookings.forEach(
        (b) => {
          const month =
            String(
              b.date || ''
            ).substring(
              0,
              7
            ) || 'Current'

          monthMap[month] =
            (monthMap[month] || 0) +
            1
        }
      )

      const list =
        Object.entries(
          monthMap
        ).map(
          ([name, bookings]) => ({
            name,
            bookings,
          })
        )

      return list.length > 0
        ? list
        : [
            {
              name:
                'Current Month',
              bookings:
                kpis.total,
            },
          ]
    }, [
      trendData,
      filteredBookings,
      kpis.total,
    ])

  // =====================================================
  // EXPORT EXCEL
  // =====================================================

  const handleExportExcel = () => {
    const auditData =
      filteredBookings.map(
        (b) => ({
          'Booking ID':
            b.bookingId,

          'Meeting Title':
            b.meetingTitle,

          'Employee ID':
            b.employeeId ??
            'N/A',

          'Employee Name':
            b.createdBy,

          'Room ID':
            b.roomId ??
            'N/A',

          'Room Name':
            b.roomName,

          Module:
            b.module,

          'Room Type':
            b.roomType,

          'Participant Count':
            b.participantCount,

          'Booking Date':
            b.date,

          'Start Time':
            b.startTime,

          'End Time':
            b.endTime,

          Status:
            b.status,

          'Cancellation Reason':
            b.cancelReason ||
            'N/A - Active Booking',

          'Created On':
            b.createdAt,
        })
      )

    const employeeData =
      employeeComparisonData.map(
        (emp) => ({
          'Employee Name':
            emp.name,

          'Total Bookings':
            emp.total,

          'Confirmed Bookings':
            emp.confirmed,

          'Cancelled Bookings':
            emp.cancelled,

          'Cancellation Rate (%)':
            emp.total > 0
              ? `${Math.round(
                  (emp.cancelled /
                    emp.total) *
                    100
                )}%`
              : '0%',
        })
      )

    const cancellationData =
      cancellationReasonsData.map(
        (c) => ({
          'Cancellation Reason':
            c.reason,

          'Frequency Count':
            c.count,

          'Percentage (%)':
            `${c.percentage}%`,
        })
      )

    const roomData =
      roomPopularityData.map(
        (r) => ({
          'Room Name':
            r.name,

          'Total Bookings':
            r.bookings,

          Confirmed:
            r.confirmed,

          Cancelled:
            r.cancelled,
        })
      )

    exportToExcel(
      [
        {
          name:
            'Bookings Detailed Audit',
          data: auditData,
        },
        {
          name:
            'Employee Breakdown',
          data: employeeData,
        },
        {
          name:
            'Cancellation Insights',
          data: cancellationData,
        },
        {
          name:
            'Room Utilization',
          data: roomData,
        },
      ],
      `SpaceBook-Executive-Analytics-${
        new Date()
          .toISOString()
          .split('T')[0]
      }.xlsx`
    )
  }

  // =====================================================
  // EXPORT CSV
  // =====================================================

  const handleExportCSV =
    async () => {
      try {
        const params = {}

        if (
          moduleFilter &&
          moduleFilter !== 'All'
        ) {
          params.module =
            moduleFilter
        }

        if (
          statusFilter &&
          statusFilter !== 'All'
        ) {
          params.status =
            statusFilter
        }

        if (
          timeFilter &&
          timeFilter !== 'All'
        ) {
          params.period =
            timeFilter
        }

        const blobData =
          await exportBookingsCsv(
            params
          )

        const blob =
          blobData instanceof Blob
            ? blobData
            : new Blob(
                [blobData],
                {
                  type: 'text/csv;charset=utf-8;',
                }
              )

        const link =
          document.createElement(
            'a'
          )

        link.href =
          URL.createObjectURL(
            blob
          )

        const fileName =
          `SpaceBook-Analytics-${
            new Date()
              .toISOString()
              .split('T')[0]
          }.csv`

        link.setAttribute(
          'download',
          fileName
        )

        document.body.appendChild(
          link
        )

        link.click()

        document.body.removeChild(
          link
        )

        URL.revokeObjectURL(
          link.href
        )
      } catch (err) {
        console.warn(
          'API CSV export failed, using client-side CSV:',
          err
        )

        const csvData =
          filteredBookings.map(
            (b) => ({
              'Booking ID':
                b.bookingId,

              'Meeting Title':
                b.meetingTitle,

              'Employee ID':
                b.employeeId ??
                'N/A',

              'Employee Name':
                b.createdBy,

              'Room ID':
                b.roomId ??
                'N/A',

              'Room Name':
                b.roomName,

              Module:
                b.module,

              'Room Type':
                b.roomType,

              'Participant Count':
                b.participantCount,

              Date:
                b.date,

              'Start Time':
                b.startTime,

              'End Time':
                b.endTime,

              Status:
                b.status,

              'Cancellation Reason':
                b.cancelReason ||
                'N/A',
            })
          )

        downloadCSV(
          csvData,
          `SpaceBook-Analytics-${
            new Date()
              .toISOString()
              .split('T')[0]
          }.csv`
        )
      }
    }

  // =====================================================
  // RENDER
  // =====================================================

  return (
    <div className="space-y-6 pb-8">

      {/* =================================================
          HEADER
      ================================================= */}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-xl font-700 text-ink">
            Dashboard
          </h1>

          <p className="mt-1 text-sm text-slate">
            Executive visual insights on room utilization,
            workplace reservations, employee habits, and audit records.
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
              className={
                loading
                  ? 'animate-spin text-sky-600'
                  : 'text-slate-600'
              }
            />

            <span>
              {loading
                ? 'Refreshing...'
                : 'Refresh'}
            </span>
          </Button>

          <Button
            size="sm"
            onClick={handleExportCSV}
            disabled={
              filteredBookings.length ===
              0
            }
            className="flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-xs font-bold text-white shadow-md shadow-blue-700/20 whitespace-nowrap transition-all active:scale-95 border-0"
          >
            <FileText
              size={14}
              className="text-blue-100"
            />

            <span className="text-white">
              Export CSV
            </span>
          </Button>

          <Button
            size="sm"
            onClick={
              handleExportExcel
            }
            disabled={
              filteredBookings.length ===
              0
            }
            className="flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-xs font-bold text-white shadow-md shadow-emerald-700/20 whitespace-nowrap transition-all active:scale-95 border-0"
          >
            <FileSpreadsheet
              size={14}
              className="text-emerald-100"
            />

            <span>
              Export Excel (.xlsx)
            </span>
          </Button>
        </div>
      </div>

      {/* =================================================
          ERROR
      ================================================= */}

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
              Filters:
            </span>

            <select
              value={timeFilter}
              onChange={(e) =>
                setTimeFilter(
                  e.target.value
                )
              }
              className="rounded-xl border border-line bg-white px-3 py-1.5 text-xs font-medium text-ink outline-none focus:border-sky-500"
            >
              <option value="All">
                All Time
              </option>

              <option value="Today">
                Today
              </option>

              <option value="This Week">
                Past 7 Days
              </option>

              <option value="This Month">
                Past 30 Days
              </option>

              <option value="Past">
                Past Dates
              </option>

              <option value="Upcoming">
                Upcoming
              </option>
            </select>

            <select
              value={moduleFilter}
              onChange={(e) =>
                setModuleFilter(
                  e.target.value
                )
              }
              className="rounded-xl border border-line bg-white px-3 py-1.5 text-xs font-medium text-ink outline-none focus:border-sky-500"
            >
              <option value="All">
                All Modules
              </option>

              <option value="Module 1">
                Module 1 - Elcot Park
              </option>

              <option value="Module 2">
                Module 2 - Elcot Park
              </option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(
                  e.target.value
                )
              }
              className="rounded-xl border border-line bg-white px-3 py-1.5 text-xs font-medium text-ink outline-none focus:border-sky-500"
            >
              <option value="All">
                All Statuses
              </option>

              <option value="Confirmed">
                Confirmed Bookings
              </option>

              <option value="Cancelled">
                Cancelled Bookings
              </option>
            </select>
          </div>

          <div className="flex items-center gap-2 text-xs font-semibold text-slate">

            <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />

            Analyzing{' '}
            {filteredBookings.length}{' '}
            total bookings
          </div>
        </div>
      </Card>

      {/* =================================================
          KPI CARDS
      ================================================= */}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">

        {/* TOTAL */}

        <Card className="p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate">
              Total Reservations
            </span>

            <Calendar
              size={16}
              className="text-sky-600"
            />
          </div>

          <p className="mt-2 text-3xl font-extrabold text-ink">
            {kpis.total}
          </p>

          <div className="mt-2 flex items-center justify-between text-xs text-slate">
            <span>
              {kpis.uniqueRooms}{' '}
              Active Rooms
            </span>

            <span className="font-semibold text-sky-700">
              100% Volume
            </span>
          </div>

          <div className="mt-1.5 h-1.5 w-full rounded-full bg-slate-100">
            <div className="h-1.5 rounded-full bg-sky-600 w-full" />
          </div>
        </Card>

        {/* UTILIZATION */}

        <Card className="p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate">
              Utilization
            </span>

            <Activity
              size={16}
              className="text-sky-600"
            />
          </div>

          <p className="mt-2 text-3xl font-extrabold text-ink">
            {kpis.utilization}%
          </p>

          <div className="mt-2 flex items-center justify-between text-xs text-slate">
            <span>
              Approximate occupancy
            </span>

            <span className="font-semibold text-sky-700">
              {kpis.utilization}%
            </span>
          </div>

          <div className="mt-1.5 h-1.5 w-full rounded-full bg-slate-100">
            <div
              className="h-1.5 rounded-full bg-sky-600 transition-all duration-500"
              style={{
                width: `${Math.min(
                  100,
                  Math.max(
                    0,
                    Number(
                      kpis.utilization
                    ) || 0
                  )
                )}%`,
              }}
            />
          </div>
        </Card>

        {/* CONFIRMED */}

        <Card className="p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate">
              Confirmed Bookings
            </span>

            <CheckCircle2
              size={16}
              className="text-[#658362]"
            />
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
            <span>
              Successful Occupancy
            </span>

            <span className="font-bold text-emerald-700">
              {kpis.confirmedRate}%
            </span>
          </div>

          <div className="mt-1.5 h-1.5 w-full rounded-full bg-slate-100">
            <div
              className="h-1.5 rounded-full bg-[#658362] transition-all duration-500"
              style={{
                width: `${kpis.confirmedRate}%`,
              }}
            />
          </div>
        </Card>

        {/* CANCELLED */}

        <Card className="p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate">
              Cancelled Bookings
            </span>

            <XCircle
              size={16}
              className="text-[#B85450]"
            />
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
            <span>
              Cancellation Impact
            </span>

            <span className="font-bold text-red-700">
              {kpis.cancellationRate}%
            </span>
          </div>

          <div className="mt-1.5 h-1.5 w-full rounded-full bg-slate-100">
            <div
              className="h-1.5 rounded-full bg-[#B85450] transition-all duration-500"
              style={{
                width: `${kpis.cancellationRate}%`,
              }}
            />
          </div>
        </Card>
      </div>

      {/* =================================================
          BOOKING TABLE
      ================================================= */}

      <Card className="overflow-hidden shadow-sm">

        <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between border-b border-line bg-portal-bg/40">

          <div>
            <h2 className="font-display text-sm font-bold text-ink">
              Workplace Reservation Records & Audit
            </h2>

            <p className="text-xs text-slate">
              Showing{' '}
              {displayedTableBookings.length}{' '}
              of{' '}
              {bookings.length}{' '}
              reservations matching active filters.

              {(timeFilter !== 'All' ||
                moduleFilter !== 'All' ||
                statusFilter !== 'All' ||
                tableSearch) && (
                <button
                  type="button"
                  onClick={() => {
                    setTimeFilter(
                      'All'
                    )
                    setModuleFilter(
                      'All'
                    )
                    setStatusFilter(
                      'All'
                    )
                    setTableSearch(
                      ''
                    )
                  }}
                  className="ml-2 font-bold text-sky-600 hover:underline"
                >
                  Reset all filters
                </button>
              )}
            </p>
          </div>

          <div className="flex items-center gap-2">

            <input
              value={tableSearch}
              onChange={(e) =>
                setTableSearch(
                  e.target.value
                )
              }
              placeholder="Search bookings, meeting titles, rooms..."
              className="w-full sm:w-72 rounded-xl border border-line bg-white px-3 py-1.5 text-xs text-ink outline-none focus:border-sky-500"
            />

            {tableSearch && (
              <button
                type="button"
                onClick={() =>
                  setTableSearch('')
                }
                className="text-xs font-bold text-slate hover:text-ink px-1"
                title="Clear search"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        <div className="overflow-x-auto p-4">

          <table className="w-full min-w-[950px] text-left text-xs">

            <thead>
              <tr className="border-b border-line text-[11px] font-extrabold uppercase tracking-wider text-black">

                <th className="px-3 py-2.5 whitespace-nowrap">
                  Booking ID
                </th>

                <th className="px-3 py-2.5 whitespace-nowrap">
                  Meeting Title
                </th>

                <th className="px-3 py-2.5 whitespace-nowrap">
                  Room
                </th>

                <th className="px-3 py-2.5 whitespace-nowrap">
                  Module
                </th>

                <th className="px-3 py-2.5 whitespace-nowrap">
                  Date
                </th>

                <th className="px-3 py-2.5 whitespace-nowrap">
                  Time
                </th>

                <th className="px-3 py-2.5 whitespace-nowrap">
                  Created By
                </th>

                <th className="px-3 py-2.5 text-center whitespace-nowrap">
                  Status
                </th>

              </tr>
            </thead>

            <tbody className="divide-y divide-line">

              {loading ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-3 py-8 text-center text-slate"
                  >
                    Loading booking records...
                  </td>
                </tr>
              ) : displayedTableBookings.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-3 py-8 text-center text-slate"
                  >
                    No booking records match the active filter criteria.
                  </td>
                </tr>
              ) : (
                displayedTableBookings.map(
                  (booking) => (
                    <tr
                      key={
                        booking.bookingId
                      }
                      onClick={() =>
                        openViewModal(
                          booking
                        )
                      }
                      className="cursor-pointer transition-colors duration-150 hover:bg-sky-50/70"
                      title="Click to view full reservation details"
                    >

                      <td className="px-3 py-3 font-sans text-xs font-semibold text-ink whitespace-nowrap">
                        {booking.bookingId}
                      </td>

                      <td className="px-3 py-3 font-medium text-ink whitespace-nowrap">
                        {booking.meetingTitle}
                      </td>

                      <td className="px-3 py-3 text-slate whitespace-nowrap">
                        {booking.roomName}
                      </td>

                      <td className="px-3 py-3 text-slate whitespace-nowrap">
                        {booking.module}
                      </td>

                      <td className="px-3 py-3 text-slate whitespace-nowrap">
                        {booking.date}
                      </td>

                      <td className="px-3 py-3 font-sans text-xs text-slate whitespace-nowrap">
                        {booking.startTime &&
                        booking.endTime
                          ? `${booking.startTime} - ${booking.endTime}`
                          : booking.startTime ||
                            '-'}
                      </td>

                      <td className="px-3 py-3 text-slate whitespace-nowrap">
                        {booking.createdBy}
                      </td>

                      <td className="px-3 py-3 text-center whitespace-nowrap">
                        <CustomStatusTag
                          status={
                            booking.status
                          }
                        />
                      </td>

                    </tr>
                  )
                )
              )}

            </tbody>
          </table>
        </div>
      </Card>

      {/* =================================================
          EMPLOYEE VS CANCELLATION
      ================================================= */}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">

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

            <Users
              size={16}
              className="text-sky-600"
            />
          </div>

          <div className="h-[300px] w-full pt-4">

            {employeeComparisonData.length ===
            0 ? (
              <div className="flex h-full items-center justify-center text-sm text-slate">
                No employee activity data available.
              </div>
            ) : (
              <ResponsiveContainer
                width="100%"
                height="100%"
              >
                <BarChart
                  data={
                    employeeComparisonData
                  }
                  margin={{
                    top: 10,
                    right: 10,
                    left: -20,
                    bottom: 20,
                  }}
                >

                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#f1f5f9"
                  />

                  <XAxis
                    dataKey="name"
                    tick={{
                      fill: '#475569',
                      fontSize: 11,
                    }}
                    angle={-20}
                    textAnchor="end"
                    interval={0}
                  />

                  <YAxis
                    tick={{
                      fill: '#475569',
                      fontSize: 11,
                    }}
                    allowDecimals={false}
                  />

                  <Tooltip
                    content={
                      <CustomChartTooltip />
                    }
                  />

                  <Legend
                    verticalAlign="top"
                    height={36}
                  />

                  <Bar
                    name="Confirmed"
                    dataKey="confirmed"
                    fill="#10B981"
                    radius={[
                      4,
                      4,
                      0,
                      0,
                    ]}
                  />

                  <Bar
                    name="Cancelled"
                    dataKey="cancelled"
                    fill="#EF4444"
                    radius={[
                      4,
                      4,
                      0,
                      0,
                    ]}
                  />

                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        {/* =================================================
            STATUS DONUT
        ================================================= */}

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

            <Sparkles
              size={16}
              className="text-emerald-600"
            />
          </div>

          <div className="h-[300px] w-full pt-2">

            {visualStatusData.length ===
            0 ? (
              <div className="flex h-full items-center justify-center text-sm text-slate">
                No status data available.
              </div>
            ) : (
              <ResponsiveContainer
                width="100%"
                height="100%"
              >
                <PieChart>

                  <Pie
                    data={
                      visualStatusData
                    }
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={105}
                    paddingAngle={4}
                  >

                    {visualStatusData.map(
                      (
                        entry,
                        index
                      ) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={
                            entry.color
                          }
                        />
                      )
                    )}

                  </Pie>

                  <Tooltip
                    content={
                      <CustomChartTooltip />
                    }
                  />

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
          TREND + ROOM POPULARITY
      ================================================= */}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">

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
                onClick={() =>
                  setTrendPeriod(
                    'Monthly'
                  )
                }
                className={`rounded-md px-2.5 py-1 font-bold ${
                  trendPeriod ===
                  'Monthly'
                    ? 'bg-white text-ink shadow-sm'
                    : 'text-slate hover:text-ink'
                }`}
              >
                Monthly
              </button>

              <button
                onClick={() =>
                  setTrendPeriod(
                    'Weekly'
                  )
                }
                className={`rounded-md px-2.5 py-1 font-bold ${
                  trendPeriod ===
                  'Weekly'
                    ? 'bg-white text-ink shadow-sm'
                    : 'text-slate hover:text-ink'
                }`}
              >
                Weekly
              </button>

            </div>
          </div>

          <div className="h-[280px] w-full pt-4">

            <ResponsiveContainer
              width="100%"
              height="100%"
            >

              <AreaChart
                data={timelineData}
                margin={{
                  top: 10,
                  right: 10,
                  left: -20,
                  bottom: 0,
                }}
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
                      stopOpacity={0}
                    />
                  </linearGradient>
                </defs>

                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#f1f5f9"
                />

                <XAxis
                  dataKey="name"
                  tick={{
                    fill: '#475569',
                    fontSize: 11,
                  }}
                />

                <YAxis
                  tick={{
                    fill: '#475569',
                    fontSize: 11,
                  }}
                  allowDecimals={false}
                />

                <Tooltip
                  content={
                    <CustomChartTooltip />
                  }
                />

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

        {/* ROOM POPULARITY */}

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

            <Building2
              size={16}
              className="text-sky-600"
            />
          </div>

          <div className="h-[280px] w-full pt-4">

            {roomPopularityData.length ===
            0 ? (
              <div className="flex h-full items-center justify-center text-sm text-slate">
                No room usage records found.
              </div>
            ) : (
              <ResponsiveContainer
                width="100%"
                height="100%"
              >

                <BarChart
                  data={
                    roomPopularityData
                  }
                  layout="vertical"
                  margin={{
                    top: 5,
                    right: 20,
                    left: 30,
                    bottom: 5,
                  }}
                >

                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#f1f5f9"
                  />

                  <XAxis
                    type="number"
                    tick={{
                      fill: '#475569',
                      fontSize: 11,
                    }}
                    allowDecimals={false}
                  />

                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{
                      fill: '#0f172a',
                      fontSize: 11,
                      fontWeight: 600,
                    }}
                    width={110}
                  />

                  <Tooltip
                    content={
                      <CustomChartTooltip />
                    }
                  />

                  <Bar
                    dataKey="bookings"
                    name="Reservations"
                    fill="#0284C7"
                    radius={[
                      0,
                      6,
                      6,
                      0,
                    ]}
                  >

                    {roomPopularityData.map(
                      (
                        entry,
                        index
                      ) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={
                            ROOM_COLORS[
                              index %
                                ROOM_COLORS.length
                            ]
                          }
                        />
                      )
                    )}

                  </Bar>

                </BarChart>

              </ResponsiveContainer>
            )}
          </div>
        </Card>
      </div>

      {/* =================================================
          CANCELLATION + HOURS
      ================================================= */}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">

        <Card className="p-5 shadow-sm">

          <div className="flex items-center justify-between border-b border-line pb-3">

            <div>
              <h2 className="font-display text-sm font-700 text-ink">
                Top Cancellation Reasons & Drivers
              </h2>

              <p className="text-xs text-slate">
                Visual breakdown of why employees cancelled their room reservations.
              </p>
            </div>

            <AlertTriangle
              size={16}
              className="text-[#B85450]"
            />
          </div>

          <div className="pt-4">

            {cancellationReasonsData.length ===
            0 ? (
              <p className="py-12 text-center text-sm text-slate">
                No cancellations recorded under the active filters.
              </p>
            ) : (
              <div className="space-y-4">

                {cancellationReasonsData.map(
                  (
                    item,
                    idx
                  ) => (
                    <div
                      key={idx}
                      className="space-y-1.5"
                    >

                      <div className="flex items-center justify-between text-xs">

                        <span className="font-semibold text-ink">
                          "{item.reason}"
                        </span>

                        <span className="font-bold text-red-700">
                          {item.count}{' '}
                          {item.count ===
                          1
                            ? 'time'
                            : 'times'}{' '}
                          (
                          {
                            item.percentage
                          }
                          %)
                        </span>

                      </div>

                      <div className="h-2 w-full rounded-full bg-red-100">

                        <div
                          className="h-2 rounded-full bg-red-500 transition-all duration-500"
                          style={{
                            width: `${item.percentage}%`,
                          }}
                        />

                      </div>

                    </div>
                  )
                )}

              </div>
            )}
          </div>
        </Card>

        {/* PEAK HOURS */}

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

            <Clock
              size={16}
              className="text-sky-600"
            />
          </div>

          <div className="h-[250px] w-full pt-4">

            <ResponsiveContainer
              width="100%"
              height="100%"
            >

              <BarChart
                data={
                  hourlyDistributionData
                }
                margin={{
                  top: 10,
                  right: 10,
                  left: -20,
                  bottom: 0,
                }}
              >

                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#f1f5f9"
                />

                <XAxis
                  dataKey="time"
                  tick={{
                    fill: '#475569',
                    fontSize: 11,
                  }}
                />

                <YAxis
                  tick={{
                    fill: '#475569',
                    fontSize: 11,
                  }}
                  allowDecimals={false}
                />

                <Tooltip
                  content={
                    <CustomChartTooltip />
                  }
                />

                <Bar
                  dataKey="bookings"
                  name="Bookings at Hour"
                  fill="#6366F1"
                  radius={[
                    4,
                    4,
                    0,
                    0,
                  ]}
                />

              </BarChart>

            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* =================================================
          BOOKING DETAILS MODAL
      ================================================= */}

      {selectedBooking && (
        <Modal
          open={isModalOpen}
          onClose={closeModal}
          title="Reservation Details"
          footer={
            <div className="flex w-full items-center justify-end">
              <Button
                size="sm"
                variant="secondary"
                onClick={closeModal}
              >
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
                  {
                    selectedBooking.bookingId
                  }
                </p>
              </div>

              <div>
                <p className="text-xs uppercase tracking-wider text-slate font-semibold">
                  Status
                </p>

                <div className="mt-1">
                  <CustomStatusTag
                    status={
                      selectedBooking.status
                    }
                  />
                </div>
              </div>

            </div>

            {/* =================================================
                ACTUAL MEETING TITLE
            ================================================= */}

            <div className="rounded-xl border border-sky-200 bg-sky-50 p-3">

              <p className="text-xs uppercase tracking-wider text-sky-700 font-bold">
                Meeting Title
              </p>

              <p className="font-bold text-slate-900 text-base mt-1">
                {
                  selectedBooking.meetingTitle
                }
              </p>

            </div>

            <div className="grid gap-3 sm:grid-cols-2">

              <div>
                <p className="text-xs uppercase tracking-wider text-slate font-semibold">
                  Employee
                </p>

                <p className="font-medium text-ink mt-0.5">
                  {
                    selectedBooking.createdBy
                  }
                </p>
              </div>

              <div>
                <p className="text-xs uppercase tracking-wider text-slate font-semibold">
                  Employee ID
                </p>

                <p className="font-medium text-ink mt-0.5">
                  {
                    selectedBooking.employeeId ??
                    'N/A'
                  }
                </p>
              </div>

              <div>
                <p className="text-xs uppercase tracking-wider text-slate font-semibold">
                  Room
                </p>

                <p className="font-medium text-ink mt-0.5">
                  {
                    selectedBooking.roomName
                  }
                </p>
              </div>

              <div>
                <p className="text-xs uppercase tracking-wider text-slate font-semibold">
                  Module
                </p>

                <p className="font-medium text-ink mt-0.5">
                  {
                    selectedBooking.module
                  }
                </p>
              </div>

              <div>
                <p className="text-xs uppercase tracking-wider text-slate font-semibold">
                  Date
                </p>

                <p className="font-medium text-ink mt-0.5">
                  {
                    selectedBooking.date
                  }
                </p>
              </div>

              <div>
                <p className="text-xs uppercase tracking-wider text-slate font-semibold">
                  Time
                </p>

                <p className="font-medium text-ink mt-0.5">
                  {
                    selectedBooking.startTime
                  }{' '}
                  {selectedBooking.endTime
                    ? `– ${selectedBooking.endTime}`
                    : ''}
                </p>
              </div>

              <div>
                <p className="text-xs uppercase tracking-wider text-slate font-semibold">
                  Room Type
                </p>

                <p className="font-medium text-ink mt-0.5">
                  {
                    selectedBooking.roomType
                  }
                </p>
              </div>

              <div>
                <p className="text-xs uppercase tracking-wider text-slate font-semibold">
                  Participants
                </p>

                <p className="font-medium text-ink mt-0.5">
                  {
                    selectedBooking.participantCount ??
                    0
                  }
                </p>
              </div>

            </div>

            {selectedBooking.cancelReason && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-3">

                <p className="text-xs font-bold uppercase tracking-wider text-red-800">
                  Cancellation Reason
                </p>

                <p className="mt-1 text-sm font-medium text-red-900">
                  &ldquo;
                  {
                    selectedBooking.cancelReason
                  }
                  &rdquo;
                </p>

              </div>
            )}

          </div>

        </Modal>
      )}

    </div>
  )
}