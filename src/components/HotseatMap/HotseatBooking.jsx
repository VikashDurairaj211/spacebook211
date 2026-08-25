import { useCallback, useEffect, useState, useRef } from "react";
import FloorMapModule1 from "./FloorMapModule1";
import FloorMapModule2 from "./FloorMapModule2";
import FloorMapTidalParkModule1 from "./FloorMapModule1Tidal";
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
import ScrollableTimePicker from "../../components/common/ScrollableTimePicker";
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
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          className="w-full appearance-none rounded-md border border-slate-300 bg-white px-3.5 py-2.5 pr-8 text-sm text-slate-800 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
        >
          {!value && placeholder && <option value="">{placeholder}</option>}

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

  const today = getTodayKey();
  const [targetDate, setTargetDate] = useState(today);
  const [location, setLocation] = useState("Coimbatore");
  const [zone, setZone] = useState("Tidel Park");
  const [moduleId, setModuleId] = useState("module1");

  const getAuthHeaders = () => {
    let token =
      localStorage.getItem("spacebook_token") ||
      localStorage.getItem("token") ||
      "";
    if (token && !token.startsWith("Bearer ")) {
      token = `Bearer ${token}`;
    }

    return {
      "Content-Type": "application/json",
      ...(token ? { Authorization: token } : {}),
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

        // Strictly isolate Elcot Module 1 seats (EO1)
        const module1Seats = seatArray
          .filter((s) => {
            const sn = String(s.seatNumber || "").toUpperCase();
            return sn.startsWith("EO1") || sn.includes("EO1");
          })
          .map((s) => {
            const num = parseInt(String(s.seatNumber).split("-").pop(), 10);
            return {
              id: s.seatNumber,
              seatNumber: s.seatNumber,
              seatId: s.seatId ?? s.id ?? num,
              label: `Seat ${num}`,
              number: num,
              modulePrefix: "EO1",
              type: "hotseat",
              status: String(s.status || "available").toLowerCase(),
              bookedByUserId: s.bookedByUserId || s.userId || null,
            };
          });

        // Strictly isolate Elcot Module 2 seats (EO2)
        const module2Seats = seatArray
          .filter((s) => {
            const sn = String(s.seatNumber || "").toUpperCase();
            return sn.startsWith("EO2") || sn.includes("EO2");
          })
          .map((s) => {
            const num = parseInt(String(s.seatNumber).split("-").pop(), 10);
            return {
              id: s.seatNumber,
              seatNumber: s.seatNumber,
              seatId: s.seatId ?? s.id ?? (num + 98),
              label: `Seat ${num}`,
              number: num,
              modulePrefix: "EO2",
              type: "hotseat",
              status: String(s.status || "available").toLowerCase(),
              bookedByUserId: s.bookedByUserId || s.userId || null,
            };
          });

        // Strictly isolate Tidel Park Module 1 seats (WS-04-001 to WS-04-224)
        // Must NEVER match against EO1 or EO2 seats!
        const tidalSeats = Array.from({ length: 224 }, (_, i) => {
          const num = i + 1;
          const pad3 = `WS-04-${String(num).padStart(3, "0")}`;
          const pad2 = `WS-04-${String(num).padStart(2, "0")}`;
          const pad1 = `WS-04-${num}`;

          const found = seatArray.find((s) => {
            const sn = String(s.seatNumber || "").trim().toUpperCase();
            // Disallow any Elcot seat from matching Tidel Park
            if (sn.includes("EO1") || sn.includes("EO2")) {
              return false;
            }
            return (
              sn === pad3 ||
              sn === pad2 ||
              sn === pad1 ||
              (sn.startsWith("WS") && parseInt(sn.split("-").pop(), 10) === num) ||
              (sn.includes("TIDEL") && parseInt(sn.replace(/[^0-9]/g, ""), 10) === num)
            );
          });

          return {
            id: found?.seatNumber || pad3,
            seatNumber: found?.seatNumber || pad3,
            seatId: found?.seatId ?? found?.id ?? 0,
            label: `Seat ${num}`,
            number: num,
            modulePrefix: "WS-04",
            type: "hotseat",
            status: found ? String(found.status || "available").toLowerCase() : "available",
            bookedByUserId: found?.bookedByUserId || found?.userId || null,
          };
        });

        setModules([
          { id: "module1", label: "Module 1", office: "Elcot Park", seats: module1Seats, rooms: [] },
          { id: "module2", label: "Module 2", office: "Elcot Park", seats: module2Seats, rooms: [] },
          { id: "tidel-module1", label: "Module 1", office: "Tidel Park", seats: tidalSeats, rooms: [] },
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
      let resolvedSeatNumber = item.seatNumber || item.id || `WS-04-${String(item.number || 1).padStart(3, "0")}`;
      const numFromId =
        parseInt(String(resolvedSeatNumber).split("-").pop(), 10) ||
        item.number ||
        1;

      let resolvedSeatId = item.seatId;
      if (resolvedSeatId === undefined || resolvedSeatId === null) {
        if (item.modulePrefix === "EO2" || String(resolvedSeatNumber).includes("EO2")) {
          resolvedSeatId = numFromId + 98;
        } else if (item.modulePrefix === "WS-04" || String(resolvedSeatNumber).startsWith("WS")) {
          resolvedSeatId = 0;
        } else {
          resolvedSeatId = numFromId;
        }
      }

      const rawTime = String(expectedCheckIn || "10:00");
      const formattedTime = rawTime.length === 5 ? `${rawTime}:00` : rawTime.slice(0, 8);

      const formattedBookingDate = targetDate.includes("T")
        ? targetDate.substring(0, 10)
        : targetDate;

      // Check if backend returned a matching seat in the latest API check
      try {
        const latestSeatsResponse = await fetch(
          `${API_BASE}?date=${formattedBookingDate}`,
          {
            headers: getAuthHeaders(),
          }
        );

        if (latestSeatsResponse.ok) {
          const latestSeatsData = await latestSeatsResponse.json();
          const latestSeats = Array.isArray(latestSeatsData)
            ? latestSeatsData
            : latestSeatsData?.seats || [];

          const latestSeat = latestSeats.find((seat) => {
            const sn = String(seat.seatNumber || "").trim().toUpperCase();
            const targetSn = String(resolvedSeatNumber).trim().toUpperCase();
            if (targetSn && sn === targetSn) return true;

            const isTidel = isTidelPark || String(item.modulePrefix).startsWith("WS") || String(item.id).startsWith("WS");
            const isMod2 = moduleId === "module2" || String(item.modulePrefix).includes("EO2") || String(item.id).includes("EO2");
            const isMod1 = !isTidel && !isMod2;

            if (isTidel) {
              if (sn.includes("EO1") || sn.includes("EO2")) return false;
              return parseInt(sn.split("-").pop(), 10) === numFromId;
            }
            if (isMod2) {
              if (!sn.includes("EO2")) return false;
              return parseInt(sn.split("-").pop(), 10) === numFromId;
            }
            if (isMod1) {
              if (!sn.includes("EO1")) return false;
              return parseInt(sn.split("-").pop(), 10) === numFromId;
            }
            return false;
          });

          if (latestSeat) {
            if (latestSeat.seatId !== undefined && latestSeat.seatId !== null) {
              resolvedSeatId = latestSeat.seatId;
            } else if (latestSeat.id !== undefined && latestSeat.id !== null) {
              resolvedSeatId = latestSeat.id;
            }
            if (latestSeat.seatNumber) {
              resolvedSeatNumber = latestSeat.seatNumber;
            }

            const latestStatus = String(latestSeat.status || "").toLowerCase();
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
        }
      } catch (err) {
        console.warn("Seat availability pre-check failed (continuing to booking):", err);
      }

      const payload = {
        seatId: Number(resolvedSeatId) || 0,
        seatNumber: resolvedSeatNumber,
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
        `Successfully booked ${resolvedSeatNumber} for ${targetDate}`
      );

      window.dispatchEvent(new Event("booking-updated"));
      await fetchOfficeData();

      // Reconcile the just-booked seat locally so the map becomes RED immediately
      setModules((currentModules) =>
        currentModules.map((module) => ({
          ...module,
          seats: (module.seats || []).map((seat) =>
            seat.id === item.id || seat.seatNumber === resolvedSeatNumber
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
      const rawTime = String(changes.expectedCheckIn || "10:00");
      const formattedTime = rawTime.length === 5 ? `${rawTime}:00` : rawTime.slice(0, 8);

      const formattedBookingDate = changes.date.includes("T")
        ? changes.date.substring(0, 10)
        : changes.date;

      const numFromId =
        parseInt(String(changes.seatId || "").split("-").pop(), 10) || 1;

      let resolvedSeatId = changes.seatIdNumber;
      if (resolvedSeatId === undefined || resolvedSeatId === null) {
        if (String(changes.seatId).includes("EO2")) {
          resolvedSeatId = numFromId + 98;
        } else if (String(changes.seatId).startsWith("WS")) {
          resolvedSeatId = 0;
        } else {
          resolvedSeatId = numFromId;
        }
      }

      const payload = {
        seatId: Number(resolvedSeatId) || 0,
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

  if (loading && modules.length === 0) {
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
        location={location}
        setLocation={setLocation}
        zone={zone}
        setZone={setZone}
        moduleId={moduleId}
        setModuleId={setModuleId}
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
  location,
  setLocation,
  zone,
  setZone,
  moduleId,
  setModuleId,
}) {
  const [active, setActive] = useState(null);
  const [bookingResult, setBookingResult] = useState(null);

  const today = getTodayKey();
  const tomorrow = getTomorrowKey();

  const LOCATIONS = ["Coimbatore"];
  const ZONES = ["Tidel Park", "Elcot Park"];

  const isTidelPark =
    String(zone).toLowerCase().includes("tidel") ||
    String(zone).toLowerCase().includes("tidal");

  const availableModuleOptions = isTidelPark
    ? [{ value: "module1", label: "Module 1" }]
    : [
        { value: "module1", label: "Module 1" },
        { value: "module2", label: "Module 2" },
      ];

  const currentModule = isTidelPark
    ? modules.find((m) => m.office === "Tidel Park" || m.office === "Tidal Park") || {
        id: "tidel-module1",
        label: "Module 1",
        office: "Tidel Park",
        seats: Array.from({ length: 224 }, (_, i) => ({
          id: `WS-04-${String(i + 1).padStart(3, "0")}`,
          label: `Seat ${i + 1}`,
          number: i + 1,
          modulePrefix: "WS-04",
          type: "hotseat",
          status: "available",
        })),
      }
    : modules.find((m) => m.id === moduleId && m.office === "Elcot Park") ||
      modules.find((m) => m.id === moduleId);

  const readyForModule = location && zone;

  const myBookingForDate = bookings.find((b) => {
    const bookingDateStr = normalizeDateKey(b.bookingDate || b.date || b.expectedCheckIn);
    const status = b.status?.toLowerCase();
    const bSeat = String(b.seatNumber || b.seat || "").toUpperCase();
    const bMod = String(b.module || "").toLowerCase();

    // Verify that the booking belongs strictly to the currently viewed module
    let belongsToCurrentModule = false;
    if (isTidelPark) {
      belongsToCurrentModule = bSeat.startsWith("WS") || bMod.includes("tidel") || bMod.includes("tidal");
    } else if (moduleId === "module2") {
      belongsToCurrentModule = bSeat.includes("EO2") || bMod.includes("module 2") || bMod.includes("eo2");
    } else {
      belongsToCurrentModule = bSeat.includes("EO1") || (!bSeat.includes("EO2") && !bSeat.startsWith("WS") && (bMod.includes("module 1") || !bMod));
    }

    return (
      bookingDateStr === targetDate &&
      status !== "cancelled" &&
      status !== "rejected" &&
      status !== "expired" &&
      belongsToCurrentModule
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
      const bSeat = String(b.seatNumber || b.seat || "").toUpperCase();
      const bMod = String(b.module || "").toLowerCase();

      let belongsToCurrentModule = false;
      if (isTidelPark) {
        belongsToCurrentModule = bSeat.startsWith("WS") || bMod.includes("tidel") || bMod.includes("tidal");
      } else if (moduleId === "module2") {
        belongsToCurrentModule = bSeat.includes("EO2") || bMod.includes("module 2") || bMod.includes("eo2");
      } else {
        belongsToCurrentModule = bSeat.includes("EO1") || (!bSeat.includes("EO2") && !bSeat.startsWith("WS") && (bMod.includes("module 1") || !bMod));
      }

      return (
        bookingDateStr === targetDate &&
        status !== "cancelled" &&
        status !== "rejected" &&
        status !== "expired" &&
        belongsToCurrentModule &&
        bSeat.toLowerCase() !== String(seat.id || seat.seatNumber || "").toLowerCase()
      );
    });

    if (existingUserBooking && !seat.isMyBooking) {
      setConflictData({
        message: "You already have a hotseat booking in this module for this date.",
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
      <Card className="p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          <Select
            step="1"
            label="SELECT LOCATION"
            required
            value={location}
            onChange={(v) => {
              setLocation(v);
              setModuleId("module1");
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
              setModuleId("module1");
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
            options={readyForModule ? availableModuleOptions : []}
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
      </Card>

      {!readyForModule && (
        <Card className="p-10 text-center text-sm text-slate-400">
          Select a location and zone to load the Hotseat reservation.
        </Card>
      )}

      {readyForModule && !currentModule && (
        <Card className="p-10 text-center text-sm text-slate-400">
          Select a module to view seats and rooms.
        </Card>
      )}

      {/* FLOOR MAP */}
      {currentModule && (
        <Card className="office-map-active p-6">
          {isTidelPark && moduleId === "module1" && (
            <FloorMapTidalParkModule1
              seats={currentSeats}
              onSelect={handleSelectSeat}
              activeSeatId={active?.id}
            />
          )}

          {!isTidelPark && moduleId === "module1" && (
            <FloorMapModule1
              seats={currentSeats}
              onSelect={handleSelectSeat}
              activeSeatId={active?.id}
            />
          )}

          {!isTidelPark && moduleId === "module2" && (
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
        </Card>
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
    getTimeString(rawExistingTime) || "10:00"
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

            <ScrollableTimePicker
              value={expectedCheckIn}
              onChange={setExpectedCheckIn}
              selectedDate={date}
              placeholder="Select time (10:00 AM - 10:00 PM)"
            />

            <p className="mt-1 text-[11px] text-slate-500">
              Check-in window: <span className="font-semibold text-slate-700">10:00 AM – 10:00 PM</span>
            </p>
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