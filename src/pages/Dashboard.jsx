import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Card from "../components/common/Card";
import DashboardCard from "../components/cards/DashboardCard";
import * as employeeApi from "../api/employee";
import { getMyBookings } from "../api/bookings";
import { getMyHotseatBookings } from "../api/hotseat";

// Format a booking time for display.
// Handles both:
//   10:00:00
//   2026-08-20T10:00:00
const formatTime = (value) => {
  if (!value) {
    return "";
  }

  const text = String(value);

  // ISO DateTime returned by an API.
  if (text.includes("T")) {
    const timePart = text.split("T")[1];

    return timePart
      ? timePart.substring(0, 5)
      : "";
  }

  // Normal TimeOnly value.
  return text.substring(0, 5);
};

export default function Dashboard() {
  const { user } = useAuth();

  const [dashboard, setDashboard] = useState(null);
  const [roomBookings, setRoomBookings] = useState([]);
  const [hotseatBookings, setHotseatBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboard() {
      try {
        setLoading(true);

        const [dashboardData, roomData, hotseatData] =
          await Promise.all([
            employeeApi.getDashboard(),
            getMyBookings(),
            getMyHotseatBookings(),
          ]);

        console.log("Dashboard Data:", dashboardData);
        console.log("Room Bookings:", roomData);
        console.log("Hotseat Bookings:", hotseatData);

        setDashboard(dashboardData);

        const roomList = Array.isArray(roomData)
          ? roomData
          : roomData?.bookings || [];

        const hotseatList = Array.isArray(hotseatData)
          ? hotseatData
          : hotseatData?.bookings || [];

        setRoomBookings(roomList);
        setHotseatBookings(hotseatList);
      } catch (err) {
        console.error("Dashboard Error:", err);
      } finally {
        setLoading(false);
      }
    }

    loadDashboard();
  }, []);

  if (user?.role === "Admin") {
    return <Navigate to="/admin/dashboard" replace />;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-600">
        Loading dashboard...
      </div>
    );
  }

  // =====================================================
  // STATUS
  // =====================================================

  const isInactiveStatus = (status) => {
    const s = String(status || "")
      .toLowerCase()
      .replace(/\s+/g, "");

    return [
      "cancelled",
      "canceled",
      "rejected",
      "released",
      "expired",
    ].includes(s);
  };

  // =====================================================
  // NORMALIZE ROOM + HOTSEAT BOOKINGS
  // =====================================================

  const normalizedRoomBookings = roomBookings.map((booking) => ({
    ...booking,
    isHotseat: false,

    date:
      booking.bookingDate ||
      booking.date ||
      "",

    time: formatTime(
      booking.startTime ||
        booking.time ||
        ""
    ),

    displayName:
      booking.roomName ||
      booking.room?.roomName ||
      "Reserved Workspace",

    status: booking.status || "",

    endTime: formatTime(
      booking.endTime ||
        ""
    ),
  }));

  const normalizedHotseatBookings = hotseatBookings.map((booking) => ({
    ...booking,
    isHotseat: true,

    date:
      booking.bookingDate ||
      booking.date ||
      "",

    time: formatTime(
      booking.expectedCheckIn ||
        booking.expectedCheckInTime ||
        booking.checkInTime ||
        ""
    ),

    displayName:
      booking.seatNumber
        ? `Hot Seat ${booking.seatNumber}`
        : "Hot Seat",

    status: booking.status || "",

    endTime: formatTime(
      booking.expectedCheckIn ||
        booking.expectedCheckInTime ||
        booking.checkInTime ||
        ""
    ),
  }));

  // One common list containing BOTH room and Hotseat bookings.
  const allBookings = [
    ...normalizedRoomBookings,
    ...normalizedHotseatBookings,
  ];

  // =====================================================
  // DATE / TIME HELPERS
  // =====================================================

  const pad = (value) => String(value).padStart(2, "0");

  // Local date in YYYY-MM-DD format.
  const getLocalDateString = (date = new Date()) => {
    return `${date.getFullYear()}-${pad(
      date.getMonth() + 1
    )}-${pad(date.getDate())}`;
  };

  /*
   * Converts a booking's date + time into a JavaScript Date.
   *
   * Handles:
   * 1. date = "2026-08-20", time = "10:00"
   * 2. date = "2026-08-20", time = "10:00:00"
   * 3. time/date values returned as ISO DateTime strings
   */
  const parseBookingDateTime = (booking) => {
    if (!booking?.date) {
      return null;
    }

    const rawDate = String(booking.date);
    const datePart = rawDate.substring(0, 10);

    if (!datePart) {
      return null;
    }

    const rawTime = String(booking.time || "");

    // If the API already returned a full ISO DateTime.
    if (rawTime.includes("T")) {
      const isoDateTime = new Date(rawTime);

      if (!Number.isNaN(isoDateTime.getTime())) {
        return isoDateTime;
      }
    }

    // If the booking date itself contains a time.
    if (rawDate.includes("T")) {
      const dateTime = new Date(rawDate);

      if (!Number.isNaN(dateTime.getTime())) {
        return dateTime;
      }
    }

    // Normal time-only value such as 10:00 or 10:00:00.
    const timePart = rawTime.substring(0, 8);

    if (!timePart) {
      const dateOnly = new Date(
        `${datePart}T00:00:00`
      );

      return Number.isNaN(dateOnly.getTime())
        ? null
        : dateOnly;
    }

    const parsed = new Date(
      `${datePart}T${timePart}`
    );

    return Number.isNaN(parsed.getTime())
      ? null
      : parsed;
  };

  const now = new Date();

  // =====================================================
  // DASHBOARD COUNTS
  // =====================================================

  /*
   * TOTAL BOOKINGS
   *
   * Total = Room bookings + Hotseat bookings.
   *
   * Past bookings are still bookings, so they remain
   * included in the total.
   */
  const totalBookings = allBookings.length;

  /*
   * UPCOMING
   *
   * Only active bookings whose actual date/time has NOT
   * passed are counted.
   *
   * Example:
   * Aug 18 -> past -> NOT counted
   * Aug 19 08:00 when current time is 10:00 -> NOT counted
   * Aug 19 14:00 -> counted
   * Aug 20 -> counted
   */
  const upcomingBookings = allBookings.filter((booking) => {
    if (isInactiveStatus(booking.status)) {
      return false;
    }

    const bookingDateTime =
      parseBookingDateTime(booking);

    if (!bookingDateTime) {
      return false;
    }

    return bookingDateTime > now;
  });

  const upcomingCount = upcomingBookings.length;

  /*
   * BOOKINGS TODAY
   *
   * Room bookings today + Hotseat bookings today.
   * Cancelled/rejected/released/expired bookings are
   * excluded.
   */
  const today = getLocalDateString();

  const bookingsToday = allBookings.filter((booking) => {
    if (isInactiveStatus(booking.status)) {
      return false;
    }

    return (
      String(booking.date || "").substring(0, 10) ===
      today
    );
  }).length;

  /*
   * HOTSEAT BOOKINGS
   *
   * Active Hotseat bookings only.
   */
  const hotseatBookingCount =
    normalizedHotseatBookings.filter(
      (booking) => !isInactiveStatus(booking.status)
    ).length;

  // =====================================================
  // STATUS BADGE
  // =====================================================

  const getStatusBadgeClass = (status) => {
    const s = status?.toLowerCase() || "";

    if (
      s === "approved" ||
      s === "confirmed" ||
      s === "checkedin" ||
      s === "checked in"
    ) {
      return "bg-[#658362] text-white";
    }

    if (s === "pending") {
      return "bg-[#E09F3E] text-white";
    }

    if (
      s === "rejected" ||
      s === "cancelled" ||
      s === "canceled"
    ) {
      return "bg-[#B85450] text-white";
    }

    return "bg-slate-500 text-white";
  };

  // =====================================================
  // ACTIVE & UPCOMING RESERVATIONS (ASCENDING CHRONOLOGICAL ORDER)
  // =====================================================

  /*
   * Shows all active reservations (rooms and hotseats) scheduled for today
   * and upcoming dates, sorted in ascending order (earliest first).
   */
  const activeAndEarlyReservations = allBookings
    .filter((booking) => {
      if (isInactiveStatus(booking.status)) {
        return false;
      }

      const bookingDateStr = String(booking.date || "").substring(0, 10);
      if (!bookingDateStr || bookingDateStr < today) {
        return false;
      }

      return true;
    })
    .map((booking) => ({
      bookingId: booking.isHotseat
        ? `hotseat-${booking.bookingId}`
        : booking.bookingId,

      roomName: booking.displayName,

      bookingDate: booking.date,

      startTime: booking.time,

      endTime: booking.endTime || booking.time,

      status: booking.status || "Confirmed",
    }))
    .sort((a, b) => {
      const dateA = String(a.bookingDate || "").substring(0, 10);
      const dateB = String(b.bookingDate || "").substring(0, 10);
      const dateCompare = dateA.localeCompare(dateB);
      if (dateCompare !== 0) return dateCompare;

      const timeA = a.startTime || "";
      const timeB = b.startTime || "";
      return timeA.localeCompare(timeB);
    });

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <Card className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-xs uppercase tracking-[0.25em] text-slate-500">
          {new Date().toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
          })}
        </p>

        <h1 className="mt-2 text-4xl font-bold">
          Welcome, {user?.name}
        </h1>

        <p className="mt-3 text-slate-600">
          Find and reserve a workspace for your next meeting.
        </p>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
        <DashboardCard
          title="Total Bookings"
          value={totalBookings}
          tone="warning"
        />

        <DashboardCard
          title="Upcoming"
          value={upcomingCount}
        />

        <DashboardCard
          title="Hotseat Bookings"
          value={hotseatBookingCount}
        />

        <DashboardCard
          title="Today's Meetings"
          value={bookingsToday}
        />
      </div>

      {/* Active & Upcoming Reservations */}
      <Card className="p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            Active & Upcoming Reservations
          </h2>

          <Link
            to="/my-bookings"
            className="text-sm text-blue-600 hover:underline"
          >
            View all
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <th className="py-3">ROOM</th>
                <th className="py-3">DATE</th>
                <th className="py-3">TIME</th>
                <th className="py-3">STATUS</th>
              </tr>
            </thead>

            <tbody>
              {activeAndEarlyReservations.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="py-6 text-center text-slate-500 text-sm"
                  >
                    No active or upcoming reservations found.
                  </td>
                </tr>
              ) : (
                activeAndEarlyReservations.map((booking) => (
                  <tr
                    key={booking.bookingId}
                    className="border-b hover:bg-slate-50 text-sm transition-colors"
                  >
                    <td className="py-4 font-medium text-slate-900">
                      {booking.roomName ||
                        "Reserved Workspace"}
                    </td>

                    <td className="text-slate-600">
                      {booking.bookingDate}
                    </td>

                    <td className="text-slate-600">
                      {formatTime(booking.startTime)}

                      {booking.endTime &&
                      formatTime(booking.endTime) !==
                        formatTime(booking.startTime)
                        ? ` - ${formatTime(
                            booking.endTime
                          )}`
                        : ""}
                    </td>

                    <td className="py-4">
                      <span
                        className={`inline-block w-28 py-1 rounded-full text-xs font-bold tracking-wider uppercase text-center ${getStatusBadgeClass(
                          booking.status
                        )}`}
                      >
                        {booking.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
