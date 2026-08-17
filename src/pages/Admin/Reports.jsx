import { useEffect, useState } from "react";
import { Download, RefreshCw } from "lucide-react";

import BookingTrendChart from "../../components/reports/BookingTrendChart";
import StatusChart from "../../components/reports/StatusChart";
import RoomUsageChart from "../../components/reports/RoomUsageChart";
import Button from "../../components/common/Button";

import {
  getBookingTrendReport,
  getBookingStatusReport,
  getRoomUsageReport,
} from "../../api/adminReports";

const CHART_VIEWS = [
  { id: 0, title: "Booking Analytics Trend" },
  { id: 1, title: "Status Distribution" },
  { id: 2, title: "Room Type Usage" },
];

const MODULE_OPTIONS = [
  "All",
  "Module 1 - Elcot Park - CMB",
  "Module 2 - Elcot Park - CMB",
];

const ROOM_TYPES = [
  { id: "", name: "All Room Types" },
  { id: 1, name: "Conference" },
  { id: 2, name: "Training" },
  { id: 3, name: "Discussion" },
];

const STATUS_OPTIONS = [
  "All",
  "Confirmed",
  "Pending",
  "Cancelled",
  "Rejected",
];

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
];

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function Reports() {
  const [filters, setFilters] = useState({
    reportType: "Monthly",
    module: "All",
    roomTypeId: "",
    status: "All",
  });

  const [activeGraphIndex, setActiveGraphIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [trendData, setTrendData] = useState([]);
  const [statusDistribution, setStatusDistribution] = useState([]);
  const [roomTypeUsage, setRoomTypeUsage] = useState([]);
  const [summary, setSummary] = useState({
    totalBookings: 0,
    uniqueRooms: 0,
    confirmedRate: "0%",
    avgDuration: "0h 00m",
  });

  const handleGenerateReport = async () => {
    try {
      setLoading(true);
      setError(null);

      const filterDto = {
        reportType: filters.reportType,
        module: filters.module === "All" ? null : filters.module,
        roomTypeId: filters.roomTypeId ? Number(filters.roomTypeId) : null,
        status: filters.status === "All" ? null : filters.status,
      };

      const [trendRes, statusRes, usageRes] = await Promise.all([
        getBookingTrendReport(filterDto),
        getBookingStatusReport(filterDto),
        getRoomUsageReport(filterDto),
      ]);

      console.log("Trend Response:", trendRes);
      console.log("Status Response:", statusRes);
      console.log("Usage Response:", usageRes);

      // 1. Process Trend & Summary
      if (trendRes) {
        setSummary({
          totalBookings: trendRes.totalBookings ?? trendRes.totalCount ?? 0,
          uniqueRooms: trendRes.uniqueRooms ?? trendRes.totalRooms ?? 0,
          confirmedRate:
            trendRes.confirmedRate !== undefined
              ? String(trendRes.confirmedRate).includes("%")
                ? trendRes.confirmedRate
                : `${trendRes.confirmedRate}%`
              : "0%",
          avgDuration: trendRes.avgDuration || "0h 00m",
        });

        // Extract trend array from any common backend property
        const rawTrendList =
          trendRes.monthlyData ||
          trendRes.weeklyData ||
          trendRes.trends ||
          trendRes.trendData ||
          trendRes.bookingTrends ||
          trendRes.data ||
          trendRes.result ||
          (Array.isArray(trendRes) ? trendRes : []);

        if (filters.reportType === "Weekly") {
          const formattedWeekly = DAY_NAMES.map((dayName, index) => {
            const found = rawTrendList.find((item) => {
              const val = String(item.day || item.dayName || item.label || item.name || item.date || "").toLowerCase();
              return val.includes(dayName.toLowerCase()) || Number(item.dayOfWeek ?? item.dayIndex) === index;
            });

            return {
              day: dayName,
              bookings: Number(
                found?.count ??
                found?.bookings ??
                found?.bookingCount ??
                found?.totalBookings ??
                found?.total ??
                found?.value ??
                0
              ),
            };
          });
          setTrendData(formattedWeekly);
        } else {
          const formattedMonthly = MONTH_NAMES.map((monthName, index) => {
            const monthNumber = index + 1;
            const found = rawTrendList.find((item) => {
              const rawMonth = item.month ?? item.monthName ?? item.monthNumber ?? item.label ?? item.name ?? item.period ?? item.date ?? "";
              
              // Handle numeric month (e.g. 8 or "08" or "8")
              if (!isNaN(rawMonth) && rawMonth !== "") {
                return Number(rawMonth) === monthNumber;
              }

              // Handle string month (e.g. "August", "Aug", "2026-08")
              const strMonth = String(rawMonth).toLowerCase();
              return (
                strMonth.includes(monthName.toLowerCase()) ||
                strMonth === String(monthNumber).padStart(2, "0")
              );
            });

            return {
              month: monthName,
              bookings: Number(
                found?.count ??
                found?.bookings ??
                found?.bookingCount ??
                found?.totalBookings ??
                found?.total ??
                found?.value ??
                0
              ),
            };
          });
          setTrendData(formattedMonthly);
        }
      }

      // 2. Process Status Distribution
      if (statusRes) {
        const rawStatus =
          statusRes.statusData ||
          statusRes.statuses ||
          statusRes.data ||
          (Array.isArray(statusRes) ? statusRes : []);

        setStatusDistribution(
          rawStatus.map((item) => ({
            name: item.status || item.statusName || item.name || item.label || "Unknown",
            value: Number(item.count ?? item.value ?? item.total ?? 0),
          }))
        );
      }

      // 3. Process Room Type Usage
      if (usageRes) {
        const rawUsage =
          usageRes.usageData ||
          usageRes.roomUsage ||
          usageRes.roomTypeUsage ||
          usageRes.data ||
          (Array.isArray(usageRes) ? usageRes : []);

        setRoomTypeUsage(
          rawUsage.map((item) => ({
            name: item.roomType || item.roomTypeName || item.name || item.label || "Unknown",
            value: Number(item.count ?? item.value ?? item.total ?? 0),
          }))
        );
      }
    } catch (err) {
      console.error("Failed to fetch reports:", err);
      setError("Unable to load report analytics from server.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    handleGenerateReport();
  }, []);

  const handleExportCSV = () => {
    let headers = [];
    let rows = [];

    if (activeGraphIndex === 0) {
      headers = [filters.reportType === "Weekly" ? "Day" : "Month", "Bookings"];
      rows = trendData.map((d) => [
        filters.reportType === "Weekly" ? d.day : d.month,
        d.bookings,
      ]);
    } else if (activeGraphIndex === 1) {
      headers = ["Status", "Count"];
      rows = statusDistribution.map((d) => [d.name, d.value]);
    } else {
      headers = ["Room Type", "Count"];
      rows = roomTypeUsage.map((d) => [d.name, d.value]);
    }

    const summaryRows = [
      ["Metric", "Value"],
      ["Total Bookings", summary.totalBookings],
      ["Unique Rooms", summary.uniqueRooms],
      ["Confirmed Rate", summary.confirmedRate],
      ["Avg Duration", summary.avgDuration],
      [],
    ];

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [
        ...summaryRows.map((e) => e.join(",")),
        headers.join(","),
        ...rows.map((e) => e.join(",")),
      ].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `${CHART_VIEWS[activeGraphIndex].title.replace(/\s+/g, "_")}_${filters.reportType}_Report.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const kpiMetrics = [
    { label: "Total Bookings", value: summary.totalBookings },
    { label: "Unique Rooms", value: summary.uniqueRooms },
    { label: "Confirmed Rate", value: summary.confirmedRate },
    { label: "Avg. Duration", value: summary.avgDuration },
  ];

  const handleFilterChange = (field, value) => {
    setFilters((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handlePrevGraph = () => {
    setActiveGraphIndex((prev) =>
      prev === 0 ? CHART_VIEWS.length - 1 : prev - 1
    );
  };

  const handleNextGraph = () => {
    setActiveGraphIndex((prev) =>
      prev === CHART_VIEWS.length - 1 ? 0 : prev + 1
    );
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="rounded-2xl border border-ink bg-white p-5">
        <h1 className="font-display text-xl font-bold text-ink">
          Reports & Review
        </h1>
        <p className="mt-2 text-sm text-slate">
          Generate workspace utilization reports, analyze booking trends, and export analytics for optimization insights.
        </p>
      </div>

      <div className="space-y-6 rounded-2xl border border-line bg-white p-6 shadow-sm">
        {/* Controls, Generate & Export Action Row */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line pb-4">
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={filters.reportType}
              onChange={(e) =>
                handleFilterChange("reportType", e.target.value)
              }
              className="rounded-xl border border-line bg-white px-3 py-2 text-xs text-ink outline-none"
            >
              <option value="Monthly">Monthly</option>
              <option value="Weekly">Weekly</option>
            </select>

            <select
              value={filters.module}
              onChange={(e) =>
                handleFilterChange("module", e.target.value)
              }
              className="rounded-xl border border-line bg-white px-3 py-2 text-xs text-ink outline-none"
            >
              {MODULE_OPTIONS.map((mod) => (
                <option key={mod} value={mod}>
                  {mod}
                </option>
              ))}
            </select>

            <select
              value={filters.roomTypeId}
              onChange={(e) =>
                handleFilterChange("roomTypeId", e.target.value)
              }
              className="rounded-xl border border-line bg-white px-3 py-2 text-xs text-ink outline-none"
            >
              {ROOM_TYPES.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.name}
                </option>
              ))}
            </select>

            <select
              value={filters.status}
              onChange={(e) =>
                handleFilterChange("status", e.target.value)
              }
              className="rounded-xl border border-line bg-white px-3 py-2 text-xs text-ink outline-none"
            >
              {STATUS_OPTIONS.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>

            <Button
              size="sm"
              onClick={handleGenerateReport}
              disabled={loading}
              className="flex items-center gap-1.5 text-xs"
            >
              <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
              {loading ? "Generating..." : "Generate"}
            </Button>

            <Button
              size="sm"
              variant="secondary"
              onClick={handleExportCSV}
              disabled={loading}
              className="flex items-center gap-1.5 text-xs"
            >
              <Download size={13} />
              Export
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={handlePrevGraph}
              className="text-xs"
            >
              ← Prev Graph
            </Button>
            <span className="px-2 font-mono text-xs text-slate">
              {activeGraphIndex + 1} / {CHART_VIEWS.length}
            </span>
            <Button
              size="sm"
              variant="secondary"
              onClick={handleNextGraph}
              className="text-xs"
            >
              Next Graph →
            </Button>
          </div>
        </div>

        {/* KPI Metrics Bar */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {kpiMetrics.map((kpi, idx) => (
            <div
              key={idx}
              className="rounded-xl border border-line bg-portal-bg p-3"
            >
              <p className="font-mono text-[11px] uppercase tracking-wider text-slate">
                {kpi.label}
              </p>
              <p className="mt-1 text-2xl font-bold text-ink">{kpi.value}</p>
            </div>
          ))}
        </div>

        {/* Dynamic Graph Section */}
        <div className="min-h-[400px] pt-2">
          <h2 className="mb-4 font-display text-xs font-bold uppercase tracking-wider text-slate">
            {CHART_VIEWS[activeGraphIndex].title}
          </h2>

          {loading ? (
            <div className="flex h-64 items-center justify-center text-sm text-slate">
              Generating report analytics...
            </div>
          ) : error ? (
            <div className="flex h-64 items-center justify-center text-sm text-red-600">
              {error}
            </div>
          ) : (
            <>
              {activeGraphIndex === 0 && (
                <BookingTrendChart
                  data={trendData}
                  xKey={filters.reportType === "Weekly" ? "day" : "month"}
                  chartType={filters.reportType === "Weekly" ? "line" : "bar"}
                  hasData={trendData.some((item) => item.bookings > 0)}
                />
              )}

              {activeGraphIndex === 1 && (
                <div className="w-full">
                  <StatusChart data={statusDistribution} />
                </div>
              )}

              {activeGraphIndex === 2 && (
                <div className="w-full">
                  <RoomUsageChart data={roomTypeUsage} />
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}