import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Card from "../components/common/Card";
import DashboardCard from "../components/cards/DashboardCard";
import Button from "../components/common/Button";
import Modal from "../components/common/Modal";
import { useToast } from "../components/common/ToastProvider";
import { CheckCircle2, AlertCircle, Clock } from "lucide-react";
import * as employeeApi from "../api/employee";
import { getMyBookings } from "../api/bookings";
import { getMyHotseatBookings } from "../api/hotseat";

// Format a booking time for display.
const formatTime = (value) => {
  if (!value) {
    return "";
  }

  const text = String(value).trim();
  let timePart = text;

  if (text.includes("T")) {
    timePart = text.split("T")[1] || "";
  }

  const parts = timePart.split(":");
  if (parts.length >= 2) {
    const h = String(parts[0]).padStart(2, "0");
    const m = String(parts[1]).padStart(2, "0");
    return `${h}:${m}`;
  }

  return timePart.substring(0, 5);
};

const padNumber = (value) => String(value).padStart(2, "0");

const getTodayDateString = (date = new Date()) => {
  return `${date.getFullYear()}-${padNumber(date.getMonth() + 1)}-${padNumber(date.getDate())}`;
};

const isBookingToday = (booking) => {
  if (!booking) return false;
  const rawDate = String(
    booking.bookingDate ||
    booking.date ||
    ""
  );
  const datePart = rawDate.includes("T")
    ? rawDate.split("T")[0]
    : rawDate.substring(0, 10);
  const today = getTodayDateString(new Date());
  return datePart === today;
};

const HOTSEAT_API_BASE = "https://spacebook-505h.onrender.com/api/Hotseat";

export default function Dashboard() {
  const { user } = useAuth();
  const toast = useToast();

  const [dashboard, setDashboard] = useState(null);
  const [roomBookings, setRoomBookings] = useState([]);
  const [hotseatBookings, setHotseatBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [checkingInId, setCheckingInId] = useState(null);

  const [modalState, setModalState] = useState({
    open: false,
    type: "confirm", // "confirm" | "success" | "warning" | "error"
    title: "",
    message: "",
    booking: null,
  });

  const closeModal = () => {
    setModalState((prev) => ({ ...prev, open: false }));
  };

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
      .replace(/[\s_-]+/g, "");

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

  function handleCheckIn(booking) {
    if (!booking?.isHotseat) return;
    if (checkingInId) return;

    const bookingId = booking.rawId || booking.bookingId;
    if (!bookingId) return;

    const status = normalizeStatus(booking.status);
    if (status === "checkedin") return;
    if (!["confirmed", "approved"].includes(status)) return;

    if (!isBookingToday(booking)) {
      setModalState({
        open: true,
        type: "warning",
        title: "Check-In Not Permitted",
        message: "Check-in is only permitted on the day of the reservation.",
        booking: null,
      });
      return;
    }

    const deadline = getCheckInDeadline(booking);

    if (deadline && new Date() > deadline) {
      handleReleaseExpiredHotseat(bookingId);
      return;
    }

    // Open application confirmation popup modal
    setModalState({
      open: true,
      type: "confirm",
      title: "Confirm Hotseat Check-In",
      message: `Are you ready to check in to ${booking.roomName || booking.displayName || "Hot Seat"}?`,
      booking,
    });
  }

  async function handleReleaseExpiredHotseat(bookingId) {
    setCheckingInId(bookingId);
    try {
      const released = await releaseHotseat(bookingId);
      if (released) {
        setModalState({
          open: true,
          type: "warning",
          title: "Check-In Window Expired",
          message: "The 30-minute check-in window has expired. The hotseat reservation has been released for other team members.",
          booking: null,
        });
        await loadDashboard();
      } else {
        setModalState({
          open: true,
          type: "error",
          title: "Check-In Window Expired",
          message: "The check-in window has expired, but the hotseat could not be released automatically.",
          booking: null,
        });
      }
    } finally {
      setCheckingInId(null);
    }
  }

  async function performCheckIn(booking) {
    const bookingId = booking?.rawId || booking?.bookingId;
    if (!bookingId) return;

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

        setModalState({
          open: true,
          type: "error",
          title: "Check-In Failed",
          message: errData?.message || errData?.title || "Failed to check in. Please try again.",
          booking: null,
        });
        return;
      }

      // Optimistically update hotseat booking status in local state
      setHotseatBookings((prev) =>
        prev.map((b) => {
          const bId = b.bookingId || b.id;
          if (String(bId) === String(bookingId) || `hotseat-${bId}` === String(bookingId)) {
            return {
              ...b,
              status: "CHECKED IN",
              isCheckedIn: true,
              checkInTime: new Date().toISOString(),
            };
          }
          return b;
        })
      );

      setModalState({
        open: true,
        type: "success",
        title: "Checked In Successfully!",
        message: `You are now checked in to ${booking.roomName || booking.displayName || "your hotseat"} for today. Have a productive day!`,
        booking: null,
      });

      toast.addToast({
        type: "success",
        title: "Checked in successfully!",
        message: `${booking.roomName || booking.displayName || "Hot Seat"} is confirmed.`,
      });

      window.dispatchEvent(new Event("booking-updated"));
      await loadDashboard();
    } catch (err) {
      console.error("CHECK-IN ERROR:", err);
      setModalState({
        open: true,
        type: "error",
        title: "Network Error",
        message: "Unable to connect to the server. Please check your network connection.",
        booking: null,
      });
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
    return <Navigate to="/admin/reports" replace />;
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

  const hotseatIdSet = new Set(
    hotseatBookings.map((h) => String(h.bookingId || h.id))
  );

  const pureRoomBookings = roomBookings.filter((booking) => {
    const id = String(booking.bookingId || booking.id);
    if (hotseatIdSet.has(id)) return false;
    if (booking.seatId || booking.seatNumber || booking.isHotseat === true) return false;
    const name = String(booking.roomName || booking.displayName || "").toLowerCase();
    if (name.includes("hot seat") || name.includes("hotseat")) return false;
    const purpose = String(booking.purpose || "").toLowerCase();
    if (purpose.includes("hotseat")) return false;
    return true;
  });

  const normalizedRoomBookings = pureRoomBookings.map((booking) => ({
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

  const uniqueHotseatMap = new Map();
  hotseatBookings.forEach((b) => {
    const id = String(b.bookingId || b.id || "");
    if (id) {
      uniqueHotseatMap.set(id, b);
    } else {
      uniqueHotseatMap.set(`${b.seatNumber}-${b.bookingDate || b.date}`, b);
    }
  });

  const normalizedHotseatBookings = Array.from(uniqueHotseatMap.values()).map((booking) => ({
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
        booking.time ||
        ""
    ),

    displayName:
      booking.seatNumber
        ? `Hot Seat ${booking.seatNumber}`
        : booking.roomName || "Hot Seat",

    status: booking.status || "",

    endTime: formatTime(
      booking.expectedCheckIn ||
        booking.expectedCheckInTime ||
        booking.checkInTime ||
        booking.endTime ||
        ""
    ),
  }));

  const allBookingsMap = new Map();
  normalizedRoomBookings.forEach((b) => {
    if (b.bookingId) allBookingsMap.set(`room-${b.bookingId}`, b);
  });
  normalizedHotseatBookings.forEach((b) => {
    if (b.bookingId) allBookingsMap.set(`hotseat-${b.bookingId}`, b);
  });

  const allBookings = Array.from(allBookingsMap.values());

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

  // Today's Meetings only counts meeting rooms (excluding hotseat desk reservations)
  const bookingsToday = allBookings.filter((booking) => {
    if (isInactiveStatus(booking.status)) {
      return false;
    }

    if (booking.isHotseat) {
      return false;
    }

    return (
      String(booking.date || "").substring(0, 10) ===
      today
    );
  }).length;

  // Hotseat Bookings counts active hotseats for today & upcoming
  const hotseatBookingCount =
    normalizedHotseatBookings.filter((booking) => {
      if (isInactiveStatus(booking.status)) {
        return false;
      }

      const bookingDateStr = String(booking.date || "").substring(0, 10);
      return !bookingDateStr || bookingDateStr >= today;
    }).length;

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
      .replace(/[\s_-]+/g, "");

    if (
      status === "cancelled" ||
      status === "canceled"
    ) {
      return "CANCELLED";
    }

    if (
      status === "checkedin" ||
      status === "checkin" ||
      booking?.checkInTime ||
      booking?.checkedInTime ||
      booking?.checkedInAt ||
      booking?.checkInDate ||
      booking?.checkedIn === true ||
      booking?.isCheckedIn === true ||
      booking?.isCheckIn === true
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
    <div className="space-y-3.5">
      {/* Welcome Banner */}
      <Card className="rounded-2xl border border-slate-200 bg-white px-7 py-5 shadow-xs w-full">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
          {new Date().toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
          })}
        </p>

        <h1 className="mt-1.5 text-3xl font-bold text-slate-900 tracking-tight">
          Welcome, {user?.name}
        </h1>

        <p className="mt-1 text-sm text-slate-600">
          Find and reserve a workspace for your next meeting.
        </p>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <DashboardCard
          title="Upcoming"
          value={upcomingCount}
        />

        <DashboardCard
          title="Today's Meetings"
          value={bookingsToday}
        />
      </div>

      {/* Active & Upcoming Reservations */}
      <Card className="p-4 rounded-2xl shadow-xs">
        <div className="mb-2.5 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900">
            Active & Upcoming Reservations
          </h2>

          <Link
            to="/my-bookings"
            className="text-xs font-semibold text-sky-600 hover:text-sky-800 hover:underline"
          >
            View all
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                <th className="py-2">ROOM</th>
                <th className="py-2">DATE</th>
                <th className="py-2">TIME</th>
                <th className="py-2">STATUS</th>
                <th className="py-2">ACTION</th>
              </tr>
            </thead>

            <tbody>
              {activeAndEarlyReservations.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="py-4 text-center text-slate-500 text-xs"
                  >
                    No active or upcoming reservations found.
                  </td>
                </tr>
              ) : (
                activeAndEarlyReservations.map((booking) => (
                  <tr
                    key={booking.bookingId}
                    className="border-b last:border-0 hover:bg-slate-50 text-xs transition-colors"
                  >
                    <td className="py-2.5 font-medium text-slate-900">
                      {booking.roomName ||
                        "Reserved Workspace"}
                    </td>

                    <td className="py-2.5 text-slate-600">
                      {booking.bookingDate}
                    </td>

                    <td className="py-2.5 text-slate-600">
                      {formatTime(booking.startTime)}

                      {booking.endTime &&
                      formatTime(booking.endTime) !==
                        formatTime(booking.startTime)
                        ? ` - ${formatTime(
                            booking.endTime
                          )}`
                        : ""}
                    </td>

                    <td className="py-2.5">
                      <span
                        className={`inline-block w-24 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase text-center ${getStatusBadgeClass(
                          booking.status
                        )}`}
                      >
                        {booking.status}
                      </span>
                    </td>

                    <td className="py-2.5">
                      {booking.isHotseat ? (
                        normalizeStatus(booking.status) === "checkedin" ? (
                          <span className="text-[11px] font-semibold text-[#658362]">
                            ✓ Checked In
                          </span>
                        ) : ["confirmed", "approved"].includes(
                            normalizeStatus(booking.status)
                          ) && isBookingToday(booking) ? (
                          <button
                            type="button"
                            disabled={checkingInId === (booking.rawId || booking.bookingId)}
                            onClick={() => handleCheckIn(booking)}
                            className="rounded-md bg-[#2F6FE0] px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-2xs"
                          >
                            {checkingInId === (booking.rawId || booking.bookingId)
                              ? "Checking in..."
                              : "Check-In"}
                          </button>
                        ) : ["confirmed", "approved"].includes(
                            normalizeStatus(booking.status)
                          ) ? (
                          <span className="text-[11px] text-slate-400 font-medium select-none">
                            Available on day
                          </span>
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
      {/* CHECK-IN APPLICATION POPUP MODAL */}
      <Modal
        open={modalState.open}
        title={modalState.title}
        onClose={closeModal}
        className="max-w-md"
        footer={
          modalState.type === "confirm" ? (
            <>
              <Button
                variant="secondary"
                onClick={closeModal}
                disabled={Boolean(checkingInId)}
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  if (modalState.booking) {
                    performCheckIn(modalState.booking);
                  }
                }}
                disabled={Boolean(checkingInId)}
                className="bg-[#2F6FE0] text-white hover:bg-blue-700 font-semibold"
              >
                {checkingInId ? "Checking In..." : "Confirm Check-In"}
              </Button>
            </>
          ) : (
            <Button
              variant="primary"
              onClick={closeModal}
              className="w-full justify-center sm:w-auto"
            >
              Done
            </Button>
          )
        }
      >
        <div className="space-y-4">
          {modalState.type === "success" && (
            <div className="flex items-start gap-3 rounded-xl border border-green-200 bg-green-50 p-4 text-green-800">
              <CheckCircle2 className="h-6 w-6 shrink-0 text-green-600 mt-0.5" />
              <p className="text-sm font-medium leading-relaxed">{modalState.message}</p>
            </div>
          )}

          {modalState.type === "warning" && (
            <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-800">
              <Clock className="h-6 w-6 shrink-0 text-amber-600 mt-0.5" />
              <p className="text-sm font-medium leading-relaxed">{modalState.message}</p>
            </div>
          )}

          {modalState.type === "error" && (
            <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-red-800">
              <AlertCircle className="h-6 w-6 shrink-0 text-red-600 mt-0.5" />
              <p className="text-sm font-medium leading-relaxed">{modalState.message}</p>
            </div>
          )}

          {modalState.type === "confirm" && (
            <div className="space-y-4">
              <p className="text-sm text-slate-600">
                {modalState.message}
              </p>
              {modalState.booking && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-xs space-y-2 text-slate-700">
                  <div className="flex justify-between">
                    <span className="font-semibold text-slate-500">Seat / Room:</span>
                    <span className="font-medium text-slate-900">{modalState.booking.roomName || modalState.booking.displayName || "Hot Seat"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-semibold text-slate-500">Location:</span>
                    <span>{modalState.booking.module || "Module 1 - Elcot Park - CMB"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-semibold text-slate-500">Date:</span>
                    <span>{modalState.booking.bookingDate || modalState.booking.date}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-semibold text-slate-500">Arrival Time:</span>
                    <span>{formatTime(modalState.booking.startTime || modalState.booking.time) || "16:00"}</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
