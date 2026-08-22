import { useCallback, useEffect, useState, useRef } from "react";
import FloorMapModule1 from "./FloorMapModule1";
import FloorMapModule2 from "./FloorMapModule2";
import "../../index.css";
import {
  CheckCircle2,
  X,
  ChevronDown,
  AlertTriangle,
} from "lucide-react";
import Card from "../../components/common/Card";
import Button from "../../components/common/Button";
import Modal from "../../components/common/Modal";
import { Field, Input } from "../../components/common/Input";
import { useToast } from "../../components/common/ToastProvider";
import {
  getMyBookings,
  cancelBooking,
  updateBooking,
} from "../../api/bookings";
import {
  getMyHotseatBookings,
  cancelHotseatBooking,
} from "../../api/hotseat";

// ---------------------------------------------------------------------------
// Helpers & Dates
// ---------------------------------------------------------------------------

function toDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatDate(dateKey) {
  if (!dateKey) return "";

  const [year, month, day] = dateKey.split("-");

  return `${month}-${day}-${year}`;
}

function isWeekend(dateKey) {
  if (!dateKey) return false;
  const [year, month, day] = dateKey.split("-");
  const date = new Date(year, month - 1, day);
  const dayOfWeek = date.getDay();
  return dayOfWeek === 0 || dayOfWeek === 6; // 0 = Sunday, 6 = Saturday
}

function getTodayKey() {
  return toDateKey(new Date());
}

function getTomorrowKey() {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  return toDateKey(tomorrow);
}

function normalizeDateKey(value) {
  if (!value) return "";

  const text = String(value);

  if (text.length >= 10) {
    return text.substring(0, 10);
  }

  return text;
}

// ---------------------------------------------------------------------------
// Dropdown Select Atom
// ---------------------------------------------------------------------------

function Select({
  label,
  step,
  required,
  value,
  onChange,
  options,
  placeholder,
}) {
  const normalized = options.map((o) =>
    typeof o === "string" ? { value: o, label: o } : o
  );

  return (
    <div className="flex flex-col gap-1.5 w-full">
      {label && (
        <label
          className="uppercase tracking-wider font-semibold select-none"
          style={{
            fontFamily: '"IBM Plex Mono", monospace',
            fontSize: "11px",
            color: "#5C6470",
          }}
        >
          {step && <span>{step}. </span>}
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}

      <div className="relative w-full">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full appearance-none rounded-md border border-slate-300 bg-white px-3.5 py-2.5 pr-8 text-sm text-slate-800 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
        >
          <option value="">{placeholder}</option>

          {normalized.map((o) => {
            const disabledWeekend = isWeekend(o.value);
            return (
              <option key={o.value} value={o.value} disabled={disabledWeekend}>
                {o.label} {disabledWeekend ? "(Weekend)" : ""}
              </option>
            );
          })}
        </select>

        <ChevronDown
          size={15}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none"
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Dual Column Time Picker (Starts at 10:00 AM)
// ---------------------------------------------------------------------------

function CustomTimePicker({ value, onChange, selectedDate }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  const now = new Date();
  const todayKey = getTodayKey();
  const isToday = selectedDate === todayKey;

  const currentHour = now.getHours();
  const currentMin = now.getMinutes();

  const [selectedHour, selectedMin] = value && value.includes(":")
    ? value.split(":")
    : ["", ""];

  const hours = Array.from(
    { length: 13 },
    (_, i) => String(i + 10).padStart(2, "0")
  );

  const minutes = Array.from(
    { length: 60 },
    (_, i) => String(i).padStart(2, "0")
  );

  useEffect(() => {
    function handleClickOutside(e) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target)
      ) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);

    return () =>
      document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleHourSelect = (hr) => {
    if (isToday && parseInt(hr, 10) < currentHour) {
      return;
    }

    onChange(`${hr}:${selectedMin || "00"}`);
  };

  const handleMinSelect = (mn) => {
    if (
      isToday &&
      parseInt(selectedHour, 10) === currentHour &&
      parseInt(mn, 10) < currentMin
    ) {
      return;
    }

    onChange(`${selectedHour || "10"}:${mn}`);
  };

  const displayTime = () => {
    if (!value || !value.includes(":")) {
      return "Select time";
    }

    return value;
  };

  return (
    <div className="relative w-full" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 focus:border-[#2F6FE0] focus:outline-none transition-colors"
      >
        <span>{displayTime()}</span>

        <ChevronDown size={16} className="text-slate-500" />
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1 w-full z-50 rounded-xl border border-slate-200 bg-white p-2 shadow-xl">
          <div className="grid grid-cols-2 gap-2">

            {/* HOURS */}
            <div>
              <div className="text-[11px] font-semibold text-slate-600 text-center py-1 border-b border-slate-100">
                Hour
              </div>

              <div className="max-h-44 overflow-y-auto pr-1 flex flex-col gap-1 mt-1 scrollbar-thin">
                {hours.map((hr) => {
                  const isPast =
                    isToday &&
                    parseInt(hr, 10) < currentHour;

                  const isSelected = hr === selectedHour;

                  return (
                    <button
                      key={hr}
                      type="button"
                      disabled={isPast}
                      onClick={() => handleHourSelect(hr)}
                      className={`w-full py-1.5 rounded text-xs font-semibold transition-colors text-center ${
                        isSelected
                          ? "bg-[#2F6FE0] text-white"
                          : isPast
                          ? "text-slate-300 bg-slate-50 cursor-not-allowed opacity-50"
                          : "text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      {hr}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* MINUTES */}
            <div>
              <div className="text-[11px] font-semibold text-slate-600 text-center py-1 border-b border-slate-100">
                Min
              </div>

              <div className="max-h-44 overflow-y-auto pr-1 flex flex-col gap-1 mt-1 scrollbar-thin">
                {minutes.map((mn) => {
                  const isPast =
                    isToday &&
                    parseInt(selectedHour, 10) === currentHour &&
                    parseInt(mn, 10) < currentMin;

                  const isSelected = mn === selectedMin;

                  return (
                    <button
                      key={mn}
                      type="button"
                      disabled={isPast}
                      onClick={() => handleMinSelect(mn)}
                      className={`w-full py-1.5 rounded text-xs font-semibold transition-colors text-center ${
                        isSelected
                          ? "bg-[#2F6FE0] text-white"
                          : isPast
                          ? "text-slate-300 bg-slate-50 cursor-not-allowed opacity-50"
                          : "text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      {mn}
                    </button>
                  );
                })}
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Toast Notification
// ---------------------------------------------------------------------------

function Toast({ message, details, onClose }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 4500);

    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="fixed top-5 right-5 z-[9999] flex items-start gap-3 bg-white border border-emerald-300 text-slate-800 px-4 py-3.5 rounded-xl shadow-2xl transition-all duration-300 max-w-sm">
      <div className="rounded-full bg-emerald-100 p-1.5 text-emerald-600 mt-0.5 shrink-0">
        <CheckCircle2 size={18} />
      </div>

      <div className="flex-1 text-xs">
        <p className="font-bold text-slate-900 text-sm mb-0.5">
          {message}
        </p>

        {details && (
          <p className="text-slate-600 leading-relaxed">
            {details}
          </p>
        )}
      </div>

      <button
        type="button"
        onClick={onClose}
        className="text-slate-400 hover:text-slate-600 transition-colors -mt-0.5 -mr-1"
        aria-label="Dismiss toast"
      >
        <X size={16} />
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Conflict Modal
// ---------------------------------------------------------------------------

function ConflictModal({ conflictData, onClose }) {
  if (!conflictData) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-4">
        <div className="flex items-center gap-3 text-amber-600">
          <div className="rounded-full bg-amber-100 p-2">
            <AlertTriangle size={20} />
          </div>
          <h2 className="text-lg font-bold text-slate-900">Booking Conflict</h2>
        </div>

        <div className="rounded-lg bg-amber-50 border border-amber-200 p-3.5 text-xs text-amber-900 leading-relaxed font-medium">
          {conflictData.message || "You already have an active hotseat booking for this date."}
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 space-y-2 text-xs">
          {conflictData.existingBookingId && (
            <div className="flex justify-between">
              <span className="text-slate-500 font-medium">Existing Booking ID:</span>
              <span className="font-mono font-semibold text-slate-800">
                #{conflictData.existingBookingId}
              </span>
            </div>
          )}

          {conflictData.seatId && (
            <div className="flex justify-between">
              <span className="text-slate-500 font-medium">Reserved Seat ID:</span>
              <span className="font-semibold text-slate-800">
                Seat #{conflictData.seatId}
              </span>
            </div>
          )}

          <div className="flex justify-between items-center">
            <span className="text-slate-500 font-medium">Status:</span>
            <span className="bg-[#658362] text-white text-[10px] font-bold uppercase px-2 py-0.5 rounded-full">
              {conflictData.bookingStatus || "Confirmed"}
            </span>
          </div>
        </div>

        <p className="text-xs text-slate-500 leading-normal">
          You can only hold one hotseat reservation per day. Please cancel your existing reservation if you wish to choose another seat.
        </p>

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            Close
          </button>
          <a
            href="/my-bookings"
            className="rounded-lg bg-[#2F6FE0] px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 text-center"
          >
            View My Bookings
          </a>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Hotseat Booking Component
// ---------------------------------------------------------------------------

const API_BASE = "https://spacebook-505h.onrender.com/api/Hotseat";

export default function HotseatBookingApp() {
  const [bookings, setBookings] = useState([]);
  const [modules, setModules] = useState([]);
  const [toastState, setToastState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [conflictData, setConflictData] = useState(null);
  const toast = useToast();

  const tomorrow = getTomorrowKey();
  const [targetDate, setTargetDate] = useState(isWeekend(tomorrow) ? getTodayKey() : tomorrow);

  const getAuthHeaders = () => {
    const token = localStorage.getItem("spacebook_token") || "";

    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    };
  };

  const fetchOfficeData = async () => {
    try {
      setLoading(true);

      const [seatsRes, bookingsRes] = await Promise.all([
        fetch(`${API_BASE}?date=${targetDate}`, { headers: getAuthHeaders() }),
        fetch(`${API_BASE}/my-bookings`, { headers: getAuthHeaders() }),
      ]);

      if (seatsRes.ok) {
        const rawSeats = await seatsRes.json();
        const seatArray = Array.isArray(rawSeats) ? rawSeats : rawSeats?.seats || [];

        const module1Seats = seatArray
          .filter((s) => s.seatNumber?.includes("EO1"))
          .map((s) => ({
            id: s.seatNumber,
            label: `Seat ${s.seatNumber.split("-").pop()}`,
            number: parseInt(s.seatNumber.split("-").pop(), 10),
            modulePrefix: "EO1",
            type: "hotseat",
            status: String(s.status || "available").toLowerCase(),
            bookedByUserId: s.bookedByUserId || s.userId || null,
          }));

        const module2Seats = seatArray
          .filter((s) => s.seatNumber?.includes("EO2"))
          .map((s) => ({
            id: s.seatNumber,
            label: `Seat ${s.seatNumber.split("-").pop()}`,
            number: parseInt(s.seatNumber.split("-").pop(), 10),
            modulePrefix: "EO2",
            type: "hotseat",
            status: String(s.status || "available").toLowerCase(),
            bookedByUserId: s.bookedByUserId || s.userId || null,
          }));

        setModules([
          { id: "module1", label: "Module 1", seats: module1Seats, rooms: [] },
          { id: "module2", label: "Module 2", seats: module2Seats, rooms: [] },
        ]);
      }

      if (bookingsRes.ok) {
        const myBookingsData = await bookingsRes.json();
        setBookings(Array.isArray(myBookingsData) ? myBookingsData : myBookingsData?.bookings || []);
      }
    } catch (err) {
      console.error("Failed to sync with backend:", err);
      showCustomToast("Connection Error", "Could not reach the server.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isWeekend(targetDate)) {
      fetchOfficeData();
    }
  }, [targetDate]);

  const showCustomToast = useCallback((message, details) => {
    setToastState({ message, details });
  }, []);

  async function reserveItem({ item, targetDate, expectedCheckIn }) {
    if (isWeekend(targetDate)) {
      return { ok: false, message: "Hotseat bookings are not allowed on weekends." };
    }

    try {
      const numericSeatId = parseInt(item.id.replace(/[^0-9]/g, "").slice(-3), 10);
      
      const rawTime = String(expectedCheckIn || "10:00");
      const formattedTime = rawTime.length === 5 ? `${rawTime}:00` : rawTime.slice(0, 8);

      const actualSeatId =
        item.modulePrefix === "EO2"
          ? numericSeatId + 98
          : numericSeatId;

      const formattedBookingDate = targetDate.includes("T")
        ? targetDate.substring(0, 10)
        : targetDate;

      // Always fetch the freshest office seats right before attempting to reserve.
      const latestSeatsResponse = await fetch(
        `${API_BASE}/seats?date=${formattedBookingDate}`,
        {
          headers: getAuthHeaders(),
        }
      );

      if (latestSeatsResponse.ok) {
        const latestSeatsData = await latestSeatsResponse.json();
        const latestSeats = Array.isArray(latestSeatsData)
          ? latestSeatsData
          : latestSeatsData?.seats || [];

        const latestSeat = latestSeats.find(
          (seat) =>
            String(seat.seatNumber || "").toLowerCase() ===
            String(item.id || "").toLowerCase()
        );

        const latestStatus = String(
          latestSeat?.status || ""
        ).toLowerCase();

        if (
          latestStatus === "booked" ||
          latestStatus === "occupied" ||
          latestStatus === "reserved"
        ) {
          await fetchOfficeData();

          return {
            ok: false,
            message:
              "This seat was just booked by another user. Please choose another seat.",
          };
        }
      }

      const payload = {
        seatId: actualSeatId,
        seatNumber: item.id,
        bookingDate: formattedBookingDate,
        expectedCheckInTime: formattedTime,
      };

      const response = await fetch(API_BASE, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });

      let responseData = null;
      try {
        responseData = await response.json();
      } catch {
        responseData = null;
      }

      if (!response.ok) {
        if (response.status === 409) {
          await fetchOfficeData();

          const conflictMessage =
            responseData?.message ||
            "This seat was just booked by another user. Please choose another seat.";

          if (
            responseData?.existingBookingId ||
            conflictMessage
              .toLowerCase()
              .includes("already have a hotseat booking")
          ) {
            setConflictData({
              ...responseData,
              message: conflictMessage,
            });

            return {
              ok: false,
              message: conflictMessage,
            };
          }

          return {
            ok: false,
            message: conflictMessage,
          };
        }

        let errorMessage = "Failed to reserve hotseat.";
        if (responseData?.errors) {
          errorMessage = Object.entries(responseData.errors)
            .map(([field, messages]) => `${field}: ${Array.isArray(messages) ? messages.join(", ") : messages}`)
            .join(" | ");
        } else if (responseData?.title || responseData?.message) {
          errorMessage = responseData.title || responseData.message;
        }

        return { ok: false, message: errorMessage };
      }

      showCustomToast(
        "Booking Confirmed!",
        `Successfully booked ${item.label} for ${targetDate}`
      );

      window.dispatchEvent(new Event("booking-updated"));
      await fetchOfficeData();

      // Some API responses expose the booking immediately in /my-bookings
      // while the seat endpoint can briefly return its old status. Reconcile
      // the just-booked seat locally so the map becomes RED immediately.
      setModules((currentModules) =>
        currentModules.map((module) => ({
          ...module,
          seats: (module.seats || []).map((seat) =>
            seat.id === item.id
              ? {
                  ...seat,
                  status: "occupied",
                  isMyBooking: true,
                }
              : seat
          ),
        }))
      );

      return { ok: true };
    } catch (err) {
      console.error("BOOKING ERROR:", err);
      return { ok: false, message: "Network error during reservation." };
    }
  }

  async function editBookingTime(bookingId, changes) {
    if (isWeekend(changes.date)) {
      return { ok: false, message: "Hotseat bookings are not allowed on weekends." };
    }

    try {
      const numericSeatId = parseInt(changes.seatId.replace(/[^0-9]/g, "").slice(-3), 10);
      const rawTime = String(changes.expectedCheckIn || "10:00");
      const formattedTime = rawTime.length === 5 ? `${rawTime}:00` : rawTime.slice(0, 8);

      const actualSeatId = changes.seatId.includes("EO2")
        ? numericSeatId + 98
        : numericSeatId;

      const formattedBookingDate = changes.date.includes("T")
        ? changes.date.substring(0, 10)
        : changes.date;

      const payload = {
        seatId: actualSeatId,
        seatNumber: changes.seatId,
        bookingDate: formattedBookingDate,
        expectedCheckInTime: formattedTime,
      };

      const response = await fetch(`${API_BASE}/${bookingId}`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });

      let responseData = null;
      try {
        responseData = await response.json();
      } catch {
        responseData = null;
      }

      if (!response.ok) {
        if (response.status === 409) {
          await fetchOfficeData();

          const conflictMessage =
            responseData?.message ||
            "This booking conflicts with another reservation.";

          return {
            ok: false,
            message: conflictMessage,
          };
        }

        let errorMessage = "Failed to update booking.";
        if (responseData?.errors) {
          errorMessage = Object.entries(responseData.errors)
            .map(([field, messages]) => `${field}: ${Array.isArray(messages) ? messages.join(", ") : messages}`)
            .join(" | ");
        } else if (responseData?.title || responseData?.message) {
          errorMessage = responseData.title || responseData.message;
        }

        return { ok: false, message: errorMessage };
      }

      showCustomToast("Booking Updated", "Your reservation has been modified.");
      window.dispatchEvent(new Event("booking-updated"));
      await fetchOfficeData();

      return { ok: true, message: "Booking updated." };
    } catch (err) {
      console.error("UPDATE ERROR:", err);
      return { ok: false, message: "Network error during update." };
    }
  }

  async function cancelHotseat(bookingId) {
    try {
      const response = await fetch(`${API_BASE}/${bookingId}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });

      let responseData = null;
      try {
        responseData = await response.json();
      } catch {
        responseData = null;
      }

      if (!response.ok) {
        return {
          ok: false,
          message: responseData?.title || "Failed to cancel booking.",
        };
      }

      showCustomToast("Booking Cancelled", "The hotseat is now released.");
      window.dispatchEvent(new Event("booking-updated"));
      await fetchOfficeData();

      return { ok: true, message: "Cancelled successfully." };
    } catch (err) {
      console.error("CANCEL ERROR:", err);
      return { ok: false, message: "Network error while cancelling." };
    }
  }

  if (loading) {
    return (
      <div className="p-10 text-center text-sm text-slate-500">
        Loading office space map...
      </div>
    );
  }

  return (
    <div className="w-full pb-10 relative">
      {toastState && (
        <Toast
          message={toastState.message}
          details={toastState.details}
          onClose={() => setToastState(null)}
        />
      )}

      <ConflictModal
        conflictData={conflictData}
        onClose={() => setConflictData(null)}
      />

      <OfficeMapTab
        modules={modules}
        bookings={bookings}
        onReserve={reserveItem}
        onEdit={editBookingTime}
        onCancel={cancelHotseat}
        setConflictData={setConflictData}
        targetDate={targetDate}
        setTargetDate={setTargetDate}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Office Map Tab
// ---------------------------------------------------------------------------

function OfficeMapTab({
  modules,
  bookings,
  onReserve,
  onEdit,
  onCancel,
  setConflictData,
  targetDate,
  setTargetDate,
}) {
  const [location, setLocation] = useState("Coimbatore");
  const [zone, setZone] = useState("Elcot Park");
  const [moduleId, setModuleId] = useState("module1");
  const [active, setActive] = useState(null);
  const [bookingResult, setBookingResult] = useState(null);

  const today = getTodayKey();
  const tomorrow = getTomorrowKey();

  const LOCATIONS = ["Coimbatore"];
  const ZONES = ["Elcot Park"];

  const currentModule = modules.find((m) => m.id === moduleId);
  const readyForModule = location && zone;

  const myBookingForDate = bookings.find((b) => {
    const bookingDateStr = normalizeDateKey(b.bookingDate || b.date || b.expectedCheckIn);
    const status = b.status?.toLowerCase();
    return (
      bookingDateStr === targetDate &&
      status !== "cancelled" &&
      status !== "rejected" &&
      status !== "expired"
    );
  });

  const myBookedSeatNumber = myBookingForDate?.seatNumber;

  const currentSeats = (currentModule?.seats || []).map((seat) => {
    const isMine = Boolean(
      myBookingForDate &&
      myBookedSeatNumber &&
      seat.id &&
      myBookedSeatNumber.toLowerCase() === seat.id.toLowerCase()
    );

    if (seat.id === active?.id) {
      return { ...seat, status: "selected", isMyBooking: isMine };
    }

    if (isMine) {
      return { ...seat, status: "occupied", isMyBooking: true };
    }

    const normalizedStatus = String(seat.status || "").toLowerCase();

    const isBooked =
      normalizedStatus === "occupied" ||
      normalizedStatus === "booked" ||
      normalizedStatus === "confirmed";

    if (isBooked) {
      return { ...seat, status: "occupied", isMyBooking: false };
    }

    if (normalizedStatus === "reserved") {
      return { ...seat, status: "reserved", isMyBooking: false };
    }

    return { ...seat, status: "available", isMyBooking: false };
  });

  function handleSelectSeat(seat) {
    if (seat.status === "occupied" && !seat.isMyBooking) {
      return;
    }

    const existingUserBooking = bookings.find((b) => {
      const bookingDateStr = normalizeDateKey(b.bookingDate || b.date || b.expectedCheckIn);
      const status = b.status?.toLowerCase();
      const seatNum = b.seatNumber || "";
      return (
        bookingDateStr === targetDate &&
        status !== "cancelled" &&
        status !== "rejected" &&
        status !== "expired" &&
        seatNum.toLowerCase() !== seat.id.toLowerCase()
      );
    });

    if (existingUserBooking && !seat.isMyBooking) {
      setConflictData({
        message: "You already have a hotseat booking for this date.",
        existingBookingId: existingUserBooking.bookingId || existingUserBooking.id,
        seatId: existingUserBooking.seatId || existingUserBooking.seatNumber,
        bookingStatus: existingUserBooking.status || "Confirmed"
      });
      return;
    }

    setBookingResult(null);
    setActive(seat);
  }

  async function handleReserve(item, expectedCheckIn, date) {
    const result = await onReserve({
      item,
      targetDate: date || targetDate,
      expectedCheckIn,
    });

    setBookingResult(result);
    if (result.ok) setActive(null);

    return result;
  }

  return (
    <div className="office-map-tab">
      <h1 className="text-xl font-bold text-slate-900 mb-1">
        Hotseat Reservation
      </h1>

      <p className="text-sm text-slate-500 mb-5">
        Book one hotseat for today or tomorrow, then check in during your expected arrival window.
      </p>

      {/* FILTERS */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          <Select
            step="1"
            label="SELECT LOCATION"
            required
            value={location}
            onChange={(v) => {
              setLocation(v);
              setModuleId("");
              setActive(null);
            }}
            options={LOCATIONS}
            placeholder="Select Location"
          />

          <Select
            step="2"
            label="SELECT OFFICE / ZONE"
            required
            value={zone}
            onChange={(v) => {
              setZone(v);
              setModuleId("");
              setActive(null);
            }}
            options={ZONES}
            placeholder="Select Office"
          />

          <Select
            step="3"
            label="SELECT MODULE"
            required
            value={moduleId}
            onChange={(v) => {
              setModuleId(v);
              setActive(null);
            }}
            options={
              readyForModule
                ? modules.map((m) => ({
                    value: m.id,
                    label: m.label,
                  }))
                : []
            }
            placeholder={readyForModule ? "Select Module" : "Choose Office First"}
          />

          <Select
            step="4"
            label="BOOKING DATE"
            value={targetDate}
            onChange={(value) => {
              if (isWeekend(value)) return;
              setTargetDate(value);
              setActive(null);
              setBookingResult(null);
            }}
            options={[
              { value: today, label: formatDate(today) },
              { value: tomorrow, label: formatDate(tomorrow) },
            ]}
            placeholder="Select date"
          />
        </div>
      </div>

      {!readyForModule && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-10 text-center text-sm text-slate-400">
          Select a location and zone to load the Hotseat reservation.
        </div>
      )}

      {readyForModule && !currentModule && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-10 text-center text-sm text-slate-400">
          Select a module to view seats and rooms.
        </div>
      )}

      {/* FLOOR MAP */}
      {currentModule && (
        <div className="office-map-active">
          {moduleId === "module1" && (
            <FloorMapModule1
              seats={currentSeats}
              onSelect={handleSelectSeat}
              activeSeatId={active?.id}
            />
          )}

          {moduleId === "module2" && (
            <FloorMapModule2
              seats={currentSeats}
              onSelect={handleSelectSeat}
              activeSeatId={active?.id}
            />
          )}

          {/* BOOKING DIALOG */}
          {active && (
            <BookingDialog
              item={active}
              booking={bookings.find(
                (b) =>
                  b.seatNumber?.toLowerCase() === active.id?.toLowerCase() &&
                  normalizeDateKey(b.bookingDate || b.date) === targetDate &&
                  b.status?.toLowerCase() !== "cancelled"
              )}
              currentModuleLabel={currentModule.label}
              targetDate={targetDate}
              onClose={() => setActive(null)}
              onCreate={(details) =>
                handleReserve(details.item, details.expectedCheckIn, details.date)
              }
              onUpdate={onEdit}
              onCancel={onCancel}
              onResult={(result) => {
                setBookingResult(result);
                if (result.ok) setActive(null);
              }}
            />
          )}

          {/* ERROR DISPLAY */}
          {bookingResult && !bookingResult.ok && (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
              {bookingResult.message}
            </div>
          )}

          {/* SIMPLIFIED LEGEND */}
          <div className="flex flex-wrap items-center gap-6 mt-4 text-[11px] font-semibold text-slate-600">
            <span className="flex items-center gap-2">
              <span
                style={{
                  background: "#22c55e",
                  width: "12px",
                  height: "12px",
                  borderRadius: "3px",
                  display: "inline-block",
                }}
              />
              AVAILABLE
            </span>

            <span className="flex items-center gap-2">
              <span
                style={{
                  background: "#2563eb",
                  width: "12px",
                  height: "12px",
                  borderRadius: "3px",
                  display: "inline-block",
                }}
              />
              SELECTED
            </span>

            <span className="flex items-center gap-2">
              <span
                style={{
                  background: "#ef4444",
                  width: "12px",
                  height: "12px",
                  borderRadius: "3px",
                  display: "inline-block",
                }}
              />
              BOOKED
            </span>

            {/* Added Unavailable Legend Item */}
            <span className="flex items-center gap-2">
              <span
                style={{
                  background: "#94a3b8",
                  border: "1px solid #64748b",
                  width: "12px",
                  height: "12px",
                  borderRadius: "3px",
                  display: "inline-block",
                }}
              />
              UNAVAILABLE
            </span>

            <span className="ml-auto text-slate-400 font-normal">
              Click an available seat to reserve
            </span>

          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Booking Dialog
// ---------------------------------------------------------------------------

function BookingDialog({
  item,
  booking,
  currentModuleLabel,
  targetDate,
  onClose,
  onCreate,
  onUpdate,
  onCancel,
  onResult,
}) {
  const isEditing = Boolean(booking);

  const [date, setDate] = useState(booking?.bookingDate || targetDate);

  const getTimeString = (val) => {
    if (!val) return "";
    const str = String(val);
    if (str.includes("T")) {
      return str.split("T")[1].substring(0, 5);
    }
    return str.substring(0, 5);
  };

  const rawExistingTime = 
    booking?.expectedCheckInTime || 
    booking?.expectedCheckIn || 
    booking?.startTime || 
    booking?.time || 
    "";

  const [expectedCheckIn, setExpectedCheckIn] = useState(
    getTimeString(rawExistingTime)
  );

  const [confirmation, setConfirmation] = useState(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  function requestSave(event) {
    event.preventDefault();
    if (isWeekend(date)) {
      setError("Hotseat bookings are not allowed on weekends.");
      return;
    }
    setError("");
    setConfirmation(isEditing ? "update" : "create");
  }

  async function confirm() {
    if (saving) return;

    setSaving(true);
    setError("");

    try {
      let result;

      if (confirmation === "create") {
        result = await onCreate({ item, expectedCheckIn, date });
      } else if (confirmation === "update") {
        const bookingId = booking?.bookingId || booking?.id || booking?.hotseatBookingId;
        result = await onUpdate(bookingId, {
          date,
          expectedCheckIn,
          seatId: item.id,
        });
      } else {
        const bookingId = booking?.bookingId || booking?.id || booking?.hotseatBookingId;
        result = await onCancel(bookingId);
      }

      if (!result) {
        result = { ok: false, message: "No response received from server." };
      }

      onResult?.(result);

      if (!result.ok) {
        setError(result.message || "Something went wrong.");
        setConfirmation(null);
      }
    } catch (err) {
      console.error("CONFIRM ERROR:", err);
      setError("Something went wrong. Please try again.");
      setConfirmation(null);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog
      title={isEditing ? "Edit booking time" : "Book Hotseat"}
      onClose={onClose}
    >
      {confirmation ? (
        <div>
          <p className="text-sm text-slate-600">
            Are you sure you want to proceed?
          </p>

          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              disabled={saving}
              onClick={() => setConfirmation(null)}
              className="rounded-lg px-4 py-2 text-sm text-slate-600 disabled:opacity-50"
            >
              Back
            </button>

            <button
              type="button"
              disabled={saving}
              onClick={confirm}
              className="rounded-lg bg-[#2F6FE0] px-4 py-2 text-sm text-white disabled:opacity-50"
            >
              {saving ? "Processing..." : "Confirm"}
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={requestSave}>
          <div className="mb-4">
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">
              Selected Hotseat
            </label>

            <div className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm font-medium text-slate-700">
              {currentModuleLabel} · {item.label}
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">
              Booking Date
            </label>

            <select
              value={date}
              onChange={(e) => {
                if (isWeekend(e.target.value)) return;
                setDate(e.target.value);
              }}
              className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 focus:border-[#2F6FE0] focus:outline-none"
            >
              <option value={getTodayKey()} disabled={isWeekend(getTodayKey())}>
                {formatDate(getTodayKey())} {isWeekend(getTodayKey()) ? "(Weekend)" : ""}
              </option>
              <option value={getTomorrowKey()} disabled={isWeekend(getTomorrowKey())}>
                {formatDate(getTomorrowKey())} {isWeekend(getTomorrowKey()) ? "(Weekend)" : ""}
              </option>
            </select>
          </div>

          <div className="mb-2">
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">
              Expected check-in time
            </label>

            <CustomTimePicker
              value={expectedCheckIn}
              onChange={setExpectedCheckIn}
              selectedDate={date}
            />
          </div>

          {error && (
            <p className="mt-3 text-sm text-red-600">{error}</p>
          )}

          <div className="mt-6 flex items-center justify-between gap-3">
            {isEditing ? (
              <button
                type="button"
                onClick={() => setConfirmation("cancel")}
                className="text-sm font-semibold text-red-600"
              >
                Cancel Booking
              </button>
            ) : (
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg px-3 py-2 text-sm text-slate-600"
              >
                Close
              </button>
            )}

            <button
              type="submit"
              className="rounded-lg bg-[#2F6FE0] px-5 py-2 text-sm text-white"
            >
              {isEditing ? "Update Time" : "Book"}
            </button>
          </div>
        </form>
      )}
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Dialog
// ---------------------------------------------------------------------------

function Dialog({ title, children, onClose }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-sm p-4"
      role="dialog"
    >
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-5 flex items-start justify-between gap-4">
          <h2 className="text-lg font-bold text-slate-900">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Close dialog">
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}