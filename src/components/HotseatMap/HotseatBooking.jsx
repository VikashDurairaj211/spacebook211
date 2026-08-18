import { useCallback, useEffect, useState, useRef } from "react";
import FloorMapModule1 from "./FloorMapModule1";
import FloorMapModule2 from "./FloorMapModule2";
import "../../index.css";
import {
  CheckCircle2,
  X,
  ChevronDown,
} from "lucide-react";

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

function getTodayKey() {
  return toDateKey(new Date());
}

function getTomorrowKey() {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return toDateKey(tomorrow);
}

// ---------------------------------------------------------------------------
// Dropdown Select Atom
// ---------------------------------------------------------------------------

function Select({ label, step, required, value, onChange, options, placeholder }) {
  const normalized = options.map((o) => (typeof o === "string" ? { value: o, label: o } : o));
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
          {normalized.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <ChevronDown size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Dual Column Time Picker (Hour / Min)
// ---------------------------------------------------------------------------

function CustomTimePicker({ value, onChange, selectedDate }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  const [selectedHour, selectedMin] = value ? value.split(":") : ["10", "00"];

  const hours = Array.from({ length: 11 }, (_, i) => String(i + 9).padStart(2, "0")); 
  const minutes = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, "0"));   

  const now = new Date();
  const todayKey = getTodayKey();
  const isToday = selectedDate === todayKey;
  const currentHour = now.getHours();
  const currentMin = now.getMinutes();

  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleHourSelect = (hr) => {
    if (isToday && parseInt(hr, 10) < currentHour) return;
    onChange(`${hr}:${selectedMin}`);
  };

  const handleMinSelect = (mn) => {
    if (isToday && parseInt(selectedHour, 10) === currentHour && parseInt(mn, 10) < currentMin) return;
    onChange(`${selectedHour}:${mn}`);
  };

  const displayTime = () => {
    if (!value) return "Select time";
    return `${selectedHour}:${selectedMin}`;
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
            <div>
              <div className="text-[11px] font-semibold text-slate-600 text-center py-1 border-b border-slate-100">
                Hour
              </div>
              <div className="max-h-44 overflow-y-auto pr-1 flex flex-col gap-1 mt-1 scrollbar-thin">
                {hours.map((hr) => {
                  const isPast = isToday && parseInt(hr, 10) < currentHour;
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
                          ? "text-slate-300 cursor-not-allowed"
                          : "text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      {hr}
                    </button>
                  );
                })}
              </div>
            </div>

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
                          ? "text-slate-300 cursor-not-allowed"
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
        <p className="font-bold text-slate-900 text-sm mb-0.5">{message}</p>
        {details && <p className="text-slate-600 leading-relaxed">{details}</p>}
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
// Main Hotseat Booking Component
// ---------------------------------------------------------------------------

const API_BASE = "https://spacebook-505h.onrender.com/api/Hotseat";

export default function HotseatBookingApp() {
  const [bookings, setBookings] = useState([]);
  const [modules, setModules] = useState([]);
  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(true);

  const getAuthHeaders = () => {
    const token = localStorage.getItem("spacebook_token") || ""; 
    return {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    };
  };

  const fetchOfficeData = async () => {
    try {
      setLoading(true);
      const [seatsRes, bookingsRes] = await Promise.all([
        fetch(API_BASE, { headers: getAuthHeaders() }),
        fetch(`${API_BASE}/my-bookings`, { headers: getAuthHeaders() })
      ]);

      if (seatsRes.ok) {
        const rawSeats = await seatsRes.json();
        
        const module1Seats = rawSeats.filter(s => s.seatNumber.includes("EO1")).map(s => ({
          id: s.seatNumber,
          label: `Seat ${s.seatNumber.split("-").pop()}`,
          number: parseInt(s.seatNumber.split("-").pop(), 10),
          type: "hotseat",
          status: s.status.toLowerCase()
        }));

        const module2Seats = rawSeats.filter(s => s.seatNumber.includes("EO2")).map(s => ({
          id: s.seatNumber,
          label: `Seat ${s.seatNumber.split("-").pop()}`,
          number: parseInt(s.seatNumber.split("-").pop(), 10),
          type: "hotseat",
          status: s.status.toLowerCase()
        }));

        setModules([
          { id: "module1", label: "Module 1", seats: module1Seats, rooms: [] },
          { id: "module2", label: "Module 2", seats: module2Seats, rooms: [] }
        ]);
      }

      if (bookingsRes.ok) {
        const myBookingsData = await bookingsRes.json();
        setBookings(myBookingsData);
      }
    } catch (err) {
      console.error("Failed to sync with backend:", err);
      showToast("Connection Error", "Could not reach the server.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOfficeData();
  }, []);

  const showToast = useCallback((message, details) => {
    setToast({ message, details });
  }, []);

  async function reserveItem({ item, targetDate, expectedCheckIn }) {
    try {
      const numericSeatId = parseInt(item.id.replace(/[^0-9]/g, "").slice(-3), 10);

      const response = await fetch(API_BASE, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          seatId: numericSeatId,
          bookingDate: targetDate,
          expectedCheckInTime: `${expectedCheckIn}:00`,
          request: {}
        }),
      });

      if (!response.ok) {
        return { ok: false, message: "Failed to reserve hotseat." };
      }

      showToast("Booking Confirmed!", `Successfully booked seat ${item.label} for ${targetDate}`);
      await fetchOfficeData(); 
      return { ok: true };
    } catch (err) {
      console.error(err);
      return { ok: false, message: "Network error during reservation." };
    }
  }

  async function editBooking(bookingId, changes) {
    try {
      const numericSeatId = parseInt(changes.seatId.replace(/[^0-9]/g, "").slice(-3), 10);

      const response = await fetch(`${API_BASE}/${bookingId}`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          seatId: numericSeatId,
          bookingDate: changes.date,
          expectedCheckInTime: `${changes.expectedCheckIn}:00`,
          request: {}
        }),
      });

      if (!response.ok) {
        return { ok: false, message: "Failed to update booking." };
      }

      showToast("Booking Updated", "Your reservation has been modified.");
      await fetchOfficeData();
      return { ok: true, message: "Booking updated." };
    } catch (err) {
      console.error(err);
      return { ok: false, message: "Network error during update." };
    }
  }

  async function cancelBooking(bookingId) {
    try {
      const response = await fetch(`${API_BASE}/${bookingId}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        return { ok: false, message: "Failed to cancel booking." };
      }

      showToast("Booking Cancelled", "The hotseat is now released.");
      await fetchOfficeData();
      return { ok: true, message: "Cancelled successfully." };
    } catch (err) {
      console.error(err);
      return { ok: false, message: "Network error while cancelling." };
    }
  }

  if (loading) {
    return <div className="p-10 text-center text-sm text-slate-500">Loading office space map...</div>;
  }

  return (
    <div className="w-full pb-10 relative">
      {toast && (
        <Toast
          message={toast.message}
          details={toast.details}
          onClose={() => setToast(null)}
        />
      )}

      <OfficeMapTab
        modules={modules}
        bookings={bookings}
        onReserve={reserveItem}
        onEdit={editBooking}
        onCancel={cancelBooking}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Office Map Tab & Color Indicators
// ---------------------------------------------------------------------------

function OfficeMapTab({ modules, bookings, onReserve, onEdit, onCancel }) {
  const [location, setLocation] = useState("");
  const [zone, setZone] = useState("");
  const [moduleId, setModuleId] = useState("");
  const [active, setActive] = useState(null);
  const [bookingResult, setBookingResult] = useState(null);
  const today = getTodayKey();
  const tomorrow = getTomorrowKey();
  const [targetDate, setTargetDate] = useState(tomorrow);

  const LOCATIONS = ["Coimbatore"];
  const ZONES = ["Elcot Park", "Tidel Park"];

  const currentModule = modules.find((m) => m.id === moduleId);
  const readyForModule = location && zone;

  const myBookedSeatId = bookings.find(
    (b) => b.bookingDate === targetDate
  )?.seatNumber;

  const currentSeats = (currentModule?.seats || []).map((seat) => {
    if (seat.id === active?.id) {
      return { ...seat, status: "selected" };
    }
    if (seat.id === myBookedSeatId) {
      return { ...seat, status: "my-booked" };
    }
    return seat; 
  });

  function handleSelectSeat(seat) {
    if (seat.status === "occupied" && seat.id !== myBookedSeatId) return;
    setActive(seat);
  }

  async function handleReserve(item, expectedCheckIn) {
    const result = await onReserve({
      item,
      targetDate,
      expectedCheckIn,
    });
    setBookingResult(result);
    if (result.ok) setActive(null);
  }

  return (
    <div className="office-map-tab">
      <h1 className="text-xl font-bold text-slate-900 mb-1">Hotseat Reservation</h1>
      <p className="text-sm text-slate-500 mb-5">
        Book one hotseat for today or tomorrow, then check in during your expected arrival window.
      </p>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          <Select
            step="1"
            label="SELECT LOCATION"
            required
            value={location}
            onChange={(v) => { setLocation(v); setModuleId(""); setActive(null); }}
            options={LOCATIONS}
            placeholder="Select Location"
          />

          <Select
            step="2"
            label="SELECT OFFICE / ZONE"
            required
            value={zone}
            onChange={(v) => { setZone(v); setModuleId(""); setActive(null); }}
            options={ZONES}
            placeholder="Select Office"
          />

          <Select
            step="3"
            label="SELECT MODULE"
            required
            value={moduleId}
            onChange={(v) => { setModuleId(v); setActive(null); }}
            options={readyForModule ? modules.map((m) => ({ value: m.id, label: m.label })) : []}
            placeholder={readyForModule ? "Select Module" : "Choose Office First"}
          />

          <Select
            step="4"
            label="BOOKING DATE"
            value={targetDate}
            onChange={(value) => { setTargetDate(value); setActive(null); }}
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

          {active && (
            <BookingDialog
              item={active}
              booking={bookings.find((b) => b.seatNumber === active.id)}
              currentModuleLabel={currentModule.label}
              targetDate={targetDate}
              onClose={() => setActive(null)}
              onCreate={(details) => handleReserve(details.item, details.expectedCheckIn)}
              onUpdate={onEdit}
              onCancel={onCancel}
              onResult={(result) => {
                setBookingResult(result);
                if (result.ok) setActive(null);
              }}
            />
          )}

          {bookingResult && !bookingResult.ok && (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
              {bookingResult.message}
            </div>
          )}

          {/* Color Legend Bar */}
          <div className="flex flex-wrap items-center gap-6 mt-4 text-[11px] font-semibold text-slate-600">
            <span className="flex items-center gap-2">
              <span style={{ background: "#22c55e", width: "12px", height: "12px", borderRadius: "3px", display: "inline-block" }} /> AVAILABLE
            </span>
            <span className="flex items-center gap-2">
              <span style={{ background: "#ef4444", width: "12px", height: "12px", borderRadius: "3px", display: "inline-block" }} /> BOOKED
            </span>
            <span className="flex items-center gap-2">
              <span style={{ background: "#3b82f6", width: "12px", height: "12px", borderRadius: "3px", display: "inline-block" }} /> SELECTED
            </span>
            <span className="ml-auto text-slate-400 font-normal">
              Click a green available seat to reserve
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

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
  const [expectedCheckIn, setExpectedCheckIn] = useState(booking?.expectedCheckInTime || "10:00");
  const [confirmation, setConfirmation] = useState(null);
  const [error, setError] = useState("");

  function requestSave(event) {
    event.preventDefault();
    setError("");
    setConfirmation(isEditing ? "update" : "create");
  }

  async function confirm() {
    let result;
    if (confirmation === "create") {
      result = await onCreate({ item, expectedCheckIn, date });
    } else if (confirmation === "update") {
      result = await onUpdate(booking.id, {
        date,
        expectedCheckIn,
        seatId: item.id,
      });
    } else {
      result = await onCancel(booking.id);
    }
    onResult?.(result);
    if (!result.ok) {
      setError(result.message);
      setConfirmation(null);
    }
  }

  return (
    <Dialog title={isEditing ? "Edit booking" : "Book Hotseat"} onClose={onClose}>
      {confirmation ? (
        <div>
          <p className="text-sm text-slate-600">Are you sure you want to proceed?</p>
          <div className="mt-6 flex justify-end gap-3">
            <button type="button" onClick={() => setConfirmation(null)} className="rounded-lg px-4 py-2 text-sm text-slate-600">Back</button>
            <button type="button" onClick={confirm} className="rounded-lg bg-[#2F6FE0] px-4 py-2 text-sm text-white">Confirm</button>
          </div>
        </div>
      ) : (
        <form onSubmit={requestSave}>
          <div className="mb-4">
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Selected Hotseat</label>
            <div className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm font-medium text-slate-700">
              {currentModuleLabel} · {item.label}
            </div>
          </div>

          <div className="mb-2">
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Expected check-in time</label>
            <CustomTimePicker value={expectedCheckIn} onChange={setExpectedCheckIn} selectedDate={date} />
          </div>

          {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

          <div className="mt-6 flex items-center justify-between gap-3">
            {isEditing ? (
              <button type="button" onClick={() => setConfirmation("cancel")} className="text-sm font-semibold text-red-600">Cancel Booking</button>
            ) : (
              <button type="button" onClick={onClose} className="rounded-lg px-3 py-2 text-sm text-slate-600">Close</button>
            )}
            <button type="submit" className="rounded-lg bg-[#2F6FE0] px-5 py-2 text-sm text-white">{isEditing ? "Update" : "Book"}</button>
          </div>
        </form>
      )}
    </Dialog>
  );
}

function Dialog({ title, children, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-sm p-4" role="dialog">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-5 flex items-start justify-between gap-4">
          <h2 className="text-lg font-bold text-slate-900">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Close dialog"><X size={20} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}