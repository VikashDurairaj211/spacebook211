import { useMemo, useState } from "react";

import BookingTrendChart from "../../components/reports/BookingTrendChart";
import StatusChart from "../../components/reports/StatusChart";
import RoomUsageChart from "../../components/reports/RoomUsageChart";
import Button from "../../components/common/Button";

import {
  moduleOptions,
  roomTypeOptions,
  statusOptions,
  defaultReportFilters,
  bookingStatusDistribution,
  roomTypeUsage,
  recentBookingActivity,
} from "../../data/reportsData";

const CHART_VIEWS = [
  { id: 0, title: "Booking Analytics Trend" },
  { id: 1, title: "Status Distribution" },
  { id: 2, title: "Room Type Usage" },
];

export default function Reports() {
  const [filters, setFilters] = useState(defaultReportFilters);
  const [activeGraphIndex, setActiveGraphIndex] = useState(0);

  const filteredData = useMemo(
    () =>
      recentBookingActivity.filter((booking) => {
        if (filters.module !== "All" && booking.module !== filters.module)
          return false;
        if (filters.roomType !== "All" && booking.roomType !== filters.roomType)
          return false;
        if (filters.status !== "All" && booking.status !== filters.status)
          return false;
        return true;
      }),
    [filters]
  );

  const filteredStatusDistribution = useMemo(() => {
    const counts = {};

    filteredData.forEach((booking) => {
      counts[booking.status] = (counts[booking.status] || 0) + 1;
    });

    const data = Object.entries(counts).map(([name, value]) => ({
      name,
      value,
    }));

    return data.length ? data : bookingStatusDistribution;
  }, [filteredData]);

  const filteredRoomTypeUsage = useMemo(() => {
    const counts = {};

    filteredData.forEach((booking) => {
      counts[booking.roomType] = (counts[booking.roomType] || 0) + 1;
    });

    const data = Object.entries(counts).map(([name, value]) => ({
      name,
      value,
    }));

    return data.length ? data : roomTypeUsage;
  }, [filteredData]);

  const filteredMonthlyTrend = useMemo(() => {
    const months = [
      "Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
    ];

    const counts = {};

    filteredData.forEach((booking) => {
      const date = new Date(booking.date);
      if (Number.isNaN(date.getTime())) return;

      const month = months[date.getMonth()];
      counts[month] = (counts[month] || 0) + 1;
    });

    return months.map((month) => ({
      month,
      bookings: counts[month] || 0,
    }));
  }, [filteredData]);

  const filteredWeeklyTrend = useMemo(() => {
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    const counts = {};

    filteredData.forEach((booking) => {
      const date = new Date(booking.date);
      if (Number.isNaN(date.getTime())) return;

      const day = days[date.getDay()];
      counts[day] = (counts[day] || 0) + 1;
    });

    return days.map((day) => ({
      day,
      bookings: counts[day] || 0,
    }));
  }, [filteredData]);

  const reportTrendData =
    filters.reportType === "Weekly"
      ? filteredWeeklyTrend
      : filteredMonthlyTrend;

  const totalBookings = filteredData.length;
  const uniqueRooms = new Set(filteredData.map((booking) => booking.room)).size;
  const confirmedRate =
    !filteredData.length
      ? "0%"
      : `${Math.round(
          (filteredData.filter((booking) => booking.status === "Confirmed").length /
            filteredData.length) *
            100
        )}%`;

  const avgDuration = (() => {
    if (!filteredData.length) return "0h 0m";

    const totalMinutes = filteredData.reduce((sum, booking) => {
      const match = booking.duration?.match(/(\d+)h\s*(\d+)m/);
      if (!match) return sum;
      return sum + parseInt(match[1], 10) * 60 + parseInt(match[2], 10);
    }, 0);

    const average = Math.round(totalMinutes / filteredData.length);
    const hours = Math.floor(average / 60);
    const minutes = average % 60;
    return `${hours}h ${minutes.toString().padStart(2, "0")}m`;
  })();

  const kpiMetrics = [
    { label: "Total Bookings", value: totalBookings },
    { label: "Unique Rooms", value: uniqueRooms },
    { label: "Confirmed Rate", value: confirmedRate },
    { label: "Avg. Duration", value: avgDuration },
  ];

  const handleFilterChange = (field, value) => {
    setFilters((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handlePrevGraph = () => {
    setActiveGraphIndex((prev) => (prev === 0 ? CHART_VIEWS.length - 1 : prev - 1));
  };

  const handleNextGraph = () => {
    setActiveGraphIndex((prev) => (prev === CHART_VIEWS.length - 1 ? 0 : prev + 1));
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="rounded-2xl border border-ink bg-white p-5">
        <h1 className="font-display text-xl font-700 text-ink">Reports & Analytics</h1>
        <p className="mt-2 text-sm text-slate">
          Analyze room utilization, booking trends, and status distribution across workspace modules.
        </p>
      </div>

      {/* Persistent Analytics Container */}
      <div className="rounded-2xl border border-line bg-white p-6 shadow-sm space-y-6">
        
        {/* Controls & Graph Switcher Row */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line pb-4">
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={filters.reportType}
              onChange={(e) => handleFilterChange("reportType", e.target.value)}
              className="rounded-xl border border-line bg-white px-3 py-2 text-xs text-ink outline-none"
            >
              <option value="Monthly">Monthly</option>
              <option value="Weekly">Weekly</option>
            </select>
            <select
              value={filters.module}
              onChange={(e) => handleFilterChange("module", e.target.value)}
              className="rounded-xl border border-line bg-white px-3 py-2 text-xs text-ink outline-none"
            >
              {(moduleOptions || []).map((mod) => (
                <option key={mod} value={mod}>{mod}</option>
              ))}
            </select>
            <select
              value={filters.roomType}
              onChange={(e) => handleFilterChange("roomType", e.target.value)}
              className="rounded-xl border border-line bg-white px-3 py-2 text-xs text-ink outline-none"
            >
              {(roomTypeOptions || []).map((type) => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange("status", e.target.value)}
              className="rounded-xl border border-line bg-white px-3 py-2 text-xs text-ink outline-none"
            >
              {(statusOptions || []).map((st) => (
                <option key={st} value={st}>{st}</option>
              ))}
            </select>
          </div>

          {/* Graph Next / Prev Switcher */}
          <div className="flex items-center gap-2">
            <Button size="sm" variant="secondary" onClick={handlePrevGraph} className="text-xs">
              ← Prev Graph
            </Button>
            <span className="text-xs font-mono text-slate px-2">
              {activeGraphIndex + 1} / {CHART_VIEWS.length}
            </span>
            <Button size="sm" variant="secondary" onClick={handleNextGraph} className="text-xs">
              Next Graph →
            </Button>
          </div>
        </div>

        {/* KPI Metrics Bar */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {kpiMetrics.map((kpi, idx) => (
            <div key={idx} className="rounded-xl border border-line bg-portal-bg p-3">
              <p className="font-mono text-[11px] uppercase tracking-wider text-slate">{kpi.label}</p>
              <p className="mt-1 text-2xl font-bold text-ink">{kpi.value}</p>
            </div>
          ))}
        </div>

        {/* Dynamic Graph Section (ONLY THIS CANVAS CHANGES) */}
        <div className="pt-2 min-h-[400px]">
          <h2 className="mb-4 font-display text-xs font-bold text-slate uppercase tracking-wider">
            {CHART_VIEWS[activeGraphIndex].title}
          </h2>

          {activeGraphIndex === 0 && (
            <BookingTrendChart
              data={reportTrendData}
              xKey={filters.reportType === "Weekly" ? "day" : "month"}
              chartType={filters.reportType === "Weekly" ? "line" : "bar"}
              hasData={reportTrendData.some((item) => item.bookings > 0)}
            />
          )}

          {activeGraphIndex === 1 && (
            <div className="w-full">
              <StatusChart data={filteredStatusDistribution} />
            </div>
          )}

          {activeGraphIndex === 2 && (
            <div className="w-full">
              <RoomUsageChart data={filteredRoomTypeUsage} />
            </div>
          )}
        </div>

      </div>
    </div>
  );
}