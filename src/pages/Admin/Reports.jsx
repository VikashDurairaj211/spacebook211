import { useMemo, useRef, useState } from 'react'
import ReportFilters from '../../components/reports/ReportFilters'
import KPISection from '../../components/reports/KPISection'
import BookingTrendChart from '../../components/reports/BookingTrendChart'
import UtilizationChart from '../../components/reports/UtilizationChart'
import StatusChart from '../../components/reports/StatusChart'
import RoomUsageChart from '../../components/reports/RoomUsageChart'
import RecentActivityTable from '../../components/reports/RecentActivityTable'
import ExportActions from '../../components/reports/ExportActions'
import InsightsPanel from '../../components/reports/InsightsPanel'
import {
  reportTypes,
  moduleOptions,
  roomTypeOptions,
  statusOptions,
  defaultReportFilters,
  kpiMetrics,
  monthlyBookingTrend,
  weeklyBookingTrend,
  moduleUtilization,
  bookingStatusDistribution,
  roomTypeUsage,
  peakBookingHours,
  mostBookedRooms,
  leastUsedRooms,
  recentBookingActivity,
  reportInsights,
} from '../../data/reportsData'

export default function Reports() {
  const [filters, setFilters] = useState(defaultReportFilters)
  const [activeMetrics, setActiveMetrics] = useState(kpiMetrics)
  const reportRef = useRef(null)

  const exportSheets = useMemo(
    () => [
      {
        name: 'Summary Metrics',
        data: kpiMetrics.map((metric) => ({ Metric: metric.label, Value: metric.value })),
      },
      { name: 'Most Booked Rooms', data: mostBookedRooms },
      { name: 'Least Used Rooms', data: leastUsedRooms },
      { name: 'Recent Activity', data: recentBookingActivity },
    ],
    [],
  )

  function handleFilterChange(field, value) {
    setFilters((previous) => ({ ...previous, [field]: value }))
  }

  function handleApplyFilters() {
    setActiveMetrics(kpiMetrics)
  }

  function handleResetFilters() {
    setFilters(defaultReportFilters)
    setActiveMetrics(kpiMetrics)
  }

  return (
    <div ref={reportRef} className="report-print-area space-y-6">
      <ReportFilters
        filters={filters}
        reportTypes={reportTypes}
        moduleOptions={moduleOptions}
        roomTypeOptions={roomTypeOptions}
        statusOptions={statusOptions}
        onChange={handleFilterChange}
        onApply={handleApplyFilters}
        onReset={handleResetFilters}
      />

      <KPISection metrics={activeMetrics} />

      <div className="grid gap-4 xl:grid-cols-2">
        <BookingTrendChart title="Monthly Booking Trend" data={monthlyBookingTrend} xKey="month" chartType="bar" />
        <BookingTrendChart title="Weekly Booking Trend" data={weeklyBookingTrend} xKey="day" chartType="line" />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <UtilizationChart data={moduleUtilization} />
        <StatusChart data={bookingStatusDistribution} />
        <RoomUsageChart data={roomTypeUsage} />
      </div>

      <BookingTrendChart title="Peak Booking Hours" data={peakBookingHours} xKey="hour" chartType="area" />

      <RecentActivityTable
        recentBookings={recentBookingActivity}
        mostBookedRooms={mostBookedRooms}
        leastUsedRooms={leastUsedRooms}
      />

      <div className="grid gap-4 xl:grid-cols-2">
        <ExportActions reportRef={reportRef} exportSheets={exportSheets} csvRows={recentBookingActivity} />
        <InsightsPanel insights={reportInsights} />
      </div>
    </div>
  )
}
