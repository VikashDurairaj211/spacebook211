import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Card from "../components/common/Card";
import DashboardCard from "../components/cards/DashboardCard";
import * as employeeApi from "../api/employee";
import { getMyBookings } from "../api/bookings";
import { getMyHotseatBookings } from "../api/hotseat";

// Format a booking time for display.
const formatTime = (value) => {
  if (!value) {
    return "";
  }

  const text = String(value);

  if (text.includes("T")) {
    const timePart = text.split("T")[1];

    return timePart
      ? timePart.substring(0, 5)
      : "";
  }

  return text.substring(0, 5);
};

const HOTSEAT_API_BASE = "https://spacebook-505h.onrender.com/api/Hotseat";

export default function Dashboard() {
  const { user } = useAuth();

  const [dashboard, setDashboard] = useState(null);
  const [roomBookings, setRoomBookings] = useState([]);
  const [hotseatBookings, setHotseatBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [checkingInId, setCheckingInId] = useState(null);

  const getAuthHeaders = () => {
    const token = localStorage.getItem("spacebook_token") || "";

    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    };
  };

  const loadDashboard = async () => {
    try {
      setLoading(true);

      const [dashboardData, roomData, hotseatData] =
        await Promise.all([
          employeeApi.getDashboard(),
          getMyBookings(),
          getMyHotseatBookings(),
        ]);

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
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const normalizeStatus = (status) =>
    String(status || "")
      .toLowerCase()
      .replace(/\\s+/g, "");

  const getCheckInDeadline = (booking) => {
    const rawExpected =
      booking?.expectedCheckIn ||
      booking?.expectedCheckInTime ||
      booking?.time;

    if (!rawExpected) return null;

    const expected = new Date(rawExpected);

    if (Number.isNaN(expected.getTime())) {
      const date = String(booking?.date || "").substring(0, 10);
      const time = String(rawExpected).substring(0, 5);

      if (!date || !time) return null;

      const fallback = new Date(`${date}T${time}:00`);

      if (Number.isNaN(fallback.getTime())) return null;

      return new Date(fallback.getTime() + 30 * 60 * 1000);
    }

    return new Date(expected.getTime() + 30 * 60 * 1000);
  };

  const releaseHotseat = async (bookingId) => {
    try {
      const response = await fetch(`${HOTSEAT_API_BASE}/${bookingId}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        let errData = null;

        try {
          errData = await response.json();
        } catch {
          errData = null;
        }

        console.error(
          "HOTSEAT RELEASE FAILED:",
          response.status,
          errData
        );

        return false;
      }

      return true;
    } catch (err) {
      console.error("HOTSEAT RELEASE ERROR:", err);
      return false;
    }
  };

  async function handleCheckIn(booking) {
    if (checkingInId) return;
    if (!booking?.isHotseat) return;

    const bookingId = booking.rawId || booking.bookingId;
    if (!bookingId) return;

    const status = normalizeStatus(booking.status);

    if (status === "checkedin") return;

    if (!["confirmed", "approved"].includes(status)) return;

    const deadline = getCheckInDeadline(booking);

    if (deadline && new Date() > deadline) {
      setCheckingInId(bookingId);

      try {
        const released = await releaseHotseat(bookingId);

        if (released) {
          alert(
            "The 30-minute check-in window has expired. The hotseat has been released."
          );
          await loadDashboard();
        } else {
          alert(
            "The check-in window has expired, but the hotseat could not be released automatically."
          );
        }
      } finally {
        setCheckingInId(null);
      }

      return;
    }

    try {
      setCheckingInId(bookingId);

      const response = await fetch(
        `${HOTSEAT_API_BASE}/${bookingId}/check-in`,
        {
          method: "POST",
          headers: getAuthHeaders(),
        }
      );

      if (!response.ok) {
        let errData = null;

        try {
          errData = await response.json();
        } catch {
          errData = null;
        }

        alert(
          errData?.message ||
            errData?.title ||
            "Failed to check in."
        );

        return;
      }

      alert("Checked in successfully!");
      await loadDashboard();
    } catch (err) {
      console.error("CHECK-IN ERROR:", err);
      alert("Network error during check-in.");
    } finally {
      setCheckingInId(null);
    }
  }

  // Automatically check for expired confirmed hotseat bookings.
  // This runs once per minute while the Dashboard is open.
  useEffect(() => {
    if (!hotseatBookings.length) return;

    let cancelled = false;

    const releaseExpiredHotseats = async () => {
      const now = new Date();

      const expiredBookings = hotseatBookings.filter((booking) => {
        const status = normalizeStatus(booking.status);

        if (!["confirmed", "approved"].includes(status)) {
          return false;
        }

        const deadline = getCheckInDeadline(booking);

        return deadline && now > deadline;
      });

      if (!expiredBookings.length) return;

      for (const booking of expiredBookings) {
        if (cancelled) return;

        const bookingId = booking.bookingId || booking.id;
        if (!bookingId) continue;

        const released = await releaseHotseat(bookingId);

        if (released) {
          console.log(
            `Hotseat booking ${bookingId} released after the 30-minute check-in window.`
          );
        }
      }

      if (!cancelled) {
        await loadDashboard();
      }
    };

    releaseExpiredHotseats();

    const timer = setInterval(
      releaseExpiredHotseats,
      60 * 1000
    );

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [hotseatBookings]);

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

  const normalizedRoomBookings = roomBookings.map((booking) => ({
    ...booking,
    isHotseat: false,
    bookingId: booking.bookingId || booking.id,

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
    bookingId: booking.bookingId || booking.id,

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

  const allBookings = [
    ...normalizedRoomBookings,
    ...normalizedHotseatBookings,
  ];

  const pad = (value) => String(value).padStart(2, "0");

  const getLocalDateString = (date = new Date()) => {
    return `${date.getFullYear()}-${pad(
      date.getMonth() + 1
    )}-${pad(date.getDate())}`;
  };

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

    if (rawTime.includes("T")) {
      const isoDateTime = new Date(rawTime);

      if (!Number.isNaN(isoDateTime.getTime())) {
        return isoDateTime;
      }
    }

    if (rawDate.includes("T")) {
      const dateTime = new Date(rawDate);

      if (!Number.isNaN(dateTime.getTime())) {
        return dateTime;
      }
    }

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

  const totalBookings = allBookings.length;

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

  const hotseatBookingCount =
    normalizedHotseatBookings.filter(
      (booking) => !isInactiveStatus(booking.status)
    ).length;

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

  const getDisplayStatus = (booking) => {
    const status = String(booking?.status || "")
      .toLowerCase()
      .replace(/\s+/g, "");

    if (
      status === "cancelled" ||
      status === "canceled"
    ) {
      return "CANCELLED";
    }

    if (
      status === "checkedin" ||
      booking?.checkInTime ||
      booking?.checkedIn === true ||
      booking?.isCheckedIn === true
    ) {
      return "CHECKED IN";
    }

    if (
      status === "approved" ||
      status === "confirmed"
    ) {
      return "APPROVED";
    }

    return booking?.status || "APPROVED";
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

      rawId: booking.bookingId,

      roomName: booking.displayName,

      bookingDate: booking.date,

      startTime: booking.time,

      endTime: booking.endTime || booking.time,

      status: getDisplayStatus(booking),

      isHotseat: booking.isHotseat,
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
                <th className="py-3">ACTION</th>
              </tr>
            </thead>

            <tbody>
              {activeAndEarlyReservations.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
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

                    <td className="py-4">
                      {booking.isHotseat ? (
                        normalizeStatus(booking.status) === "checkedin" ? (
                          <span className="text-xs font-semibold text-[#658362]">
                            ✓ Checked In
                          </span>
                        ) : ["confirmed", "approved"].includes(
                            normalizeStatus(booking.status)
                          ) ? (
                          <button
                            type="button"
                            disabled={checkingInId === booking.rawId}
                            onClick={() => handleCheckIn(booking)}
                            className="rounded-lg bg-[#2F6FE0] px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
                          >
                            {checkingInId === booking.rawId
                              ? "Checking in..."
                              : "Check-In"}
                          </button>
                        ) : null
                      ) : null}
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
