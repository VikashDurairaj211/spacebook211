import { useMemo, useState } from "react";

import BookingTrendChart from "../../components/reports/BookingTrendChart";
import StatusChart from "../../components/reports/StatusChart";
import RoomUsageChart from "../../components/reports/RoomUsageChart";

import {
  moduleOptions,
  roomTypeOptions,
  statusOptions,
  defaultReportFilters,
  bookingStatusDistribution,
  roomTypeUsage,
  recentBookingActivity,
} from "../../data/reportsData";

export default function Reports() {
  const [filters, setFilters] = useState(defaultReportFilters);

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
    [filters],
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

  // Room Usage Chart
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

  // Monthly Trend
  const filteredMonthlyTrend = useMemo(() => {
    const months = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
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

  // Weekly Trend
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

  const xKey = filters.reportType === "Weekly" ? "day" : "month";
  const chartType = filters.reportType === "Weekly" ? "line" : "bar";

  const totalBookings = filteredData.length;
  const uniqueRooms = new Set(filteredData.map((booking) => booking.room)).size;
  const confirmedRate =
    !filteredData.length
      ? "0%"
      : `${Math.round(
          (filteredData.filter((booking) => booking.status === "Confirmed").length /
            filteredData.length) *
            100,
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

  return (
    <div className="mx-auto max-w-7xl space-y-2 px-4 pt-2 pb-4 sm:px-6 lg:px-8">
      <div className="rounded-[28px] border border-gray-200 bg-white px-5 py-3 shadow-sm">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Reports</h1>
      </div>

      <div className="grid gap-6">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <BookingTrendChart
            title="Booking Analytics"
            data={reportTrendData}
            xKey={filters.reportType === "Weekly" ? "day" : "month"}
            chartType={filters.reportType === "Weekly" ? "line" : "bar"}
            reportType={filters.reportType}
            moduleOptions={moduleOptions}
            roomTypeOptions={roomTypeOptions}
            statusOptions={statusOptions}
            selectedModule={filters.module}
            selectedRoomType={filters.roomType}
            selectedStatus={filters.status}
            onReportTypeChange={(value) => handleFilterChange("reportType", value)}
            onModuleChange={(value) => handleFilterChange("module", value)}
            onRoomTypeChange={(value) => handleFilterChange("roomType", value)}
            onStatusChange={(value) => handleFilterChange("status", value)}
            kpiMetrics={kpiMetrics}
            hasData={reportTrendData.some((item) => item.bookings > 0)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <StatusChart data={filteredStatusDistribution} />
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <RoomUsageChart data={filteredRoomTypeUsage} />
        </div>
      </div>
    </div>
  );
}