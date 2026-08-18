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
// Dynamic Module + Seat Generation
// ---------------------------------------------------------------------------

function statusForIndex(i, offset) {
  const n = (i + offset) % 9;
  if (n === 0 || n === 4) return "occupied";
  if (n === 2 || n === 7) return "reserved";
  return "vacant";
}

function buildModule(moduleId, label, offset, seatCount) {
  const seats = [];
  for (let i = 1; i <= seatCount; i++) {
    seats.push({
      id: `${moduleId}-HS-${String(i).padStart(3, "0")}`,
      label: `Seat ${String(i).padStart(3, "0")}`,
      number: i,
      type: "hotseat",
      status: statusForIndex(i, offset),
    });
  }

  const rooms = [
    {
      id: `${moduleId}-CR-1`,
      label: offset === 0 ? "Amsterdam" : "Lisbon",
      sub: "Conference Room",
      type: "conference",
      capacity: 8,
      status: offset === 0 ? "vacant" : "reserved",
    },
    {
      id: `${moduleId}-TR-1`,
      label: offset === 0 ? "Berlin" : "Oslo",
      sub: "Training Room",
      type: "training",
      capacity: 20,
      status: offset === 0 ? "occupied" : "vacant",
    },
  ];

  return { id: moduleId, label, seats, rooms };
}

const MODULES = [
  buildModule("module1", "Module 1", 0, 98),
  buildModule("module2", "Module 2", 3, 131),
];

const LOCATIONS = ["Coimbatore"];
const ZONES = ["Elcot Park", "Tidel Park"];
const INITIAL_BOOKINGS = [];

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

  const hours = Array.from({ length: 11 }, (_, i) => String(i + 9).padStart(2, "0")); // 09 to 19
  const minutes = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, "0"));   // 00 to 59

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

export default function HotseatBookingApp() {
  const [bookings, setBookings] = useState(INITIAL_BOOKINGS);
  const [modules, setModules] = useState(MODULES);
  const [toast, setToast] = useState(null);

  const showToast = useCallback((message, details) => {
    setToast({ message, details });
  }, []);

  const updateSeatStatus = useCallback((moduleId, seatId, status) => {
    setModules((prev) => prev.map((module) => (
      module.id !== moduleId
        ? module
        : { ...module, seats: module.seats.map((seat) => (seat.id === seatId ? { ...seat, status } : seat)) }
    )));
  }, []);

  const expireMissedBookings = useCallback(() => {
    const now = new Date();
    const today = getTodayKey();
    const expired = [];
    setBookings((prev) => prev.map((booking) => {
      if (booking.status !== "RESERVED" || booking.date > today) return booking;
      const deadline = new Date(`${booking.date}T${booking.expectedCheckIn}:00`);
      deadline.setMinutes(deadline.getMinutes() + 30);
      if (now > deadline) {
        expired.push(booking);
        return { ...booking, status: "EXPIRED" };
      }
      return booking;
    }));
    expired.forEach((booking) => updateSeatStatus(booking.moduleId, booking.seatId, "vacant"));
  }, [updateSeatStatus]);

  useEffect(() => {
    const intervalId = window.setInterval(expireMissedBookings, 60_000);
    return () => window.clearInterval(intervalId);
  }, [expireMissedBookings]);

  function reserveItem({ moduleId, item, targetDate, expectedCheckIn, location, office }) {
    expireMissedBookings();

    const now = new Date();
    const todayKey = getTodayKey();
    if (targetDate === todayKey) {
      const selectedTime = new Date(`${todayKey}T${expectedCheckIn}:00`);
      if (selectedTime < now) {
        return { ok: false, message: "Cannot book a check-in time in the past." };
      }
    }

    const currentSeat = modules.find((module) => module.id === moduleId)?.seats.find((seat) => seat.id === item.id);
    if (!currentSeat || currentSeat.status !== "vacant") {
      return { ok: false, message: "This seat is no longer vacant." };
    }
    if (![getTodayKey(), getTomorrowKey()].includes(targetDate)) {
      return { ok: false, message: "Seats can only be booked for valid dates." };
    }
    if (bookings.some((booking) => booking.date === targetDate && ["RESERVED", "OCCUPIED"].includes(booking.status))) {
      return { ok: false, message: "Only one seat can be booked per day." };
    }

    const moduleLabel = modules.find((module) => module.id === moduleId)?.label || moduleId;
    
    // Marked as reserved
    updateSeatStatus(moduleId, item.id, "reserved");

    const booking = {
      id: Date.now(),
      name: item.label,
      seatId: item.id,
      moduleId,
      module: moduleLabel,
      location,
      office,
      type: item.type,
      date: targetDate,
      expectedCheckIn,
      time: expectedCheckIn,
      status: "RESERVED",
    };

    setBookings((prev) => [booking, ...prev]);
    showToast(
      "Booking Confirmed!",
      `${formatDate(booking.date)} · ${booking.location} · ${booking.office} · ${booking.module} · ${booking.name}`
    );
    return { ok: true, booking };
  }

  function editBooking(bookingId, changes) {
    const booking = bookings.find((entry) => entry.id === bookingId);
    if (!booking || booking.status !== "RESERVED") return { ok: false, message: "Only active reservations can be edited." };

    const now = new Date();
    const todayKey = getTodayKey();
    if (changes.date === todayKey) {
      const selectedTime = new Date(`${todayKey}T${changes.expectedCheckIn}:00`);
      if (selectedTime < now) {
        return { ok: false, message: "Cannot set a check-in time in the past." };
      }
    }

    const hasConflict = bookings.some((entry) => entry.id !== bookingId && entry.date === changes.date && ["RESERVED", "OCCUPIED"].includes(entry.status));
    if (hasConflict) return { ok: false, message: "Only one seat can be booked per day." };

    const nextModule = modules.find((module) => module.id === changes.moduleId);
    const nextSeat = nextModule?.seats.find((seat) => seat.id === changes.seatId);
    if (!nextSeat) return { ok: false, message: "Selected seat not found." };

    const movingSeat = booking.seatId !== nextSeat.id;
    if (movingSeat && nextSeat.status !== "vacant") return { ok: false, message: "That hotseat is no longer available." };

    if (movingSeat) {
      updateSeatStatus(booking.moduleId, booking.seatId, "vacant");
      updateSeatStatus(nextModule.id, nextSeat.id, "reserved");
    }

    setBookings((prev) => prev.map((entry) => (
      entry.id === bookingId
        ? { ...entry, ...changes, module: nextModule.label, name: nextSeat.label, type: nextSeat.type, time: changes.expectedCheckIn }
        : entry
    )));

    showToast("Booking Updated", "Your reservation has been successfully updated.");
    return { ok: true, message: "Booking updated." };
  }

  function cancelBooking(bookingId) {
    const booking = bookings.find((entry) => entry.id === bookingId);
    if (!booking || !["RESERVED", "OCCUPIED"].includes(booking.status)) {
      return { ok: false, message: "This booking can no longer be cancelled." };
    }
    updateSeatStatus(booking.moduleId, booking.seatId, "vacant");
    setBookings((prev) => prev.filter((entry) => entry.id !== bookingId));
    return { ok: true, message: "Booking cancelled. The hotseat is now available." };
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
// Office Map Tab
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

  const currentModule = modules.find((m) => m.id === moduleId);
  const readyForModule = location && zone;

  // Derive user's booked seat ID for the currently selected date and module
  const myBookedSeatId = bookings.find(
    (b) => b.moduleId === moduleId && b.date === targetDate && ["RESERVED", "OCCUPIED"].includes(b.status)
  )?.seatId;

  // Inject 'my-booked' status for user's own seat on the current view
  const currentSeats = (currentModule?.seats || []).map((seat) => {
    if (seat.id === myBookedSeatId) {
      return { ...seat, status: "my-booked" };
    }
    return seat;
  });

  function handleSelectSeat(seat) {
    if (seat.status !== "vacant" && seat.status !== "my-booked") return;
    setActive(seat);
  }

  function handleReserve(item, expectedCheckIn, reservationModuleId = moduleId, bookingDate = targetDate) {
    const result = onReserve({
      moduleId: reservationModuleId,
      item,
      targetDate: bookingDate,
      expectedCheckIn,
      location,
      office: zone,
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

      {/* Filter Card */}
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
              booking={bookings.find((booking) => booking.seatId === active.id && ["RESERVED", "OCCUPIED"].includes(booking.status))}
              modules={modules}
              currentModuleLabel={currentModule.label}
              targetDate={targetDate}
              location={location}
              office={zone}
              onClose={() => setActive(null)}
              onCreate={(details) =>
                handleReserve(details.item, details.expectedCheckIn, details.moduleId, details.date)
              }
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

          <div className="flex flex-wrap items-center gap-5 mt-4 text-[11px] text-slate-500">
            <span className="flex items-center gap-1.5">
              <span className="seat-legend-box my-booked" style={{ background: "#1B3A66", width: "12px", height: "12px", borderRadius: "3px", display: "inline-block" }} /> SELECTED
            </span>
            <span className="flex items-center gap-1.5">
              <span className="seat-legend-box vacant" /> AVAILABLE
            </span>
            <span className="flex items-center gap-1.5">
              <span className="seat-legend-box occupied" /> BOOKED
            </span>
            <span className="flex items-center gap-1.5">
              <span className="seat-legend-box reserved" /> PENDING CHECK-IN
            </span>
            <span className="ml-auto text-slate-400">
              Click a vacant seat to reserve
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Booking Dialog Component
// ---------------------------------------------------------------------------

function BookingDialog({
  item,
  booking,
  modules,
  currentModuleLabel,
  targetDate,
  location,
  office,
  onClose,
  onCreate,
  onUpdate,
  onCancel,
  onResult,
}) {
  const isEditing = Boolean(booking);
  const [date, setDate] = useState(booking?.date || targetDate);
  const [expectedCheckIn, setExpectedCheckIn] = useState(booking?.expectedCheckIn || "10:00");
  const [confirmation, setConfirmation] = useState(null);
  const [error, setError] = useState("");

  const today = getTodayKey();
  const tomorrow = getTomorrowKey();
  const moduleId = item.id.split("-")[0];

  function requestSave(event) {
    event.preventDefault();

    const now = new Date();
    if (date === today) {
      const selectedTime = new Date(`${today}T${expectedCheckIn}:00`);
      if (selectedTime < now) {
        setError("Please choose a future check-in time.");
        return;
      }
    }

    setError("");
    setConfirmation(isEditing ? "update" : "create");
  }

  function confirm() {
    let result;
    if (confirmation === "create") {
      result = onCreate({ item, expectedCheckIn, moduleId, date });
    } else if (confirmation === "update") {
      result = onUpdate(booking.id, {
        date,
        expectedCheckIn,
        moduleId,
        seatId: item.id,
      });
    } else {
      result = onCancel(booking.id);
    }
    onResult?.(result);
    if (!result.ok) {
      setError(result.message);
      setConfirmation(null);
    }
  }

  return (
    <Dialog
      title={
        confirmation === "cancel"
          ? "Cancel booking"
          : isEditing
          ? "Edit booking"
          : "Book Hotseat"
      }
      onClose={onClose}
    >
      {confirmation ? (
        <div>
          <p className="text-sm text-slate-600">
            {confirmation === "create"
              ? "Are you sure you want to confirm this booking?"
              : confirmation === "update"
              ? "Are you sure you want to update this booking?"
              : "Are you sure you want to cancel this booking?"}
          </p>
          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setConfirmation(null)}
              className="rounded-lg px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100"
            >
              Back
            </button>
            <button
              type="button"
              onClick={confirm}
              className="rounded-lg bg-[#2F6FE0] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1B3A66]"
            >
              {confirmation === "create"
                ? "Confirm Booking"
                : confirmation === "update"
                ? "Confirm Update"
                : "Confirm Cancel"}
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={requestSave}>
          <p className="mb-4 text-sm text-slate-500">
            {isEditing
              ? "Update your reservation details."
              : `Reserve ${currentModuleLabel} · ${item.label}`}
          </p>

          {/* Selected Seat */}
          <div className="mb-4">
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">
              Selected Hotseat
            </label>
            <div className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm font-medium text-slate-700">
              {currentModuleLabel} · {item.label}
            </div>
          </div>

          {/* Date Selector */}
          <label className="mb-4 block text-xs font-semibold text-slate-600">
            Date
            <div className="relative mt-1.5">
              <select
                value={date}
                onChange={(event) => setDate(event.target.value)}
                className="w-full appearance-none rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 pr-8 text-sm text-slate-700 focus:border-[#2F6FE0] focus:outline-none"
              >
                <option value={today}>{formatDate(today)}</option>
                <option value={tomorrow}>{formatDate(tomorrow)}</option>
              </select>
              <ChevronDown
                size={15}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none"
              />
            </div>
          </label>

          {/* Dual Column Time Picker */}
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

          <p className="mt-3 text-xs text-slate-500">
            {location && `${location} · `}
            {office && `${office} · `}
            {currentModuleLabel} · {item.label}
          </p>

          {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

          <div className="mt-6 flex items-center justify-between gap-3">
            {isEditing ? (
              <button
                type="button"
                onClick={() => setConfirmation("cancel")}
                className="text-sm font-semibold text-red-600 hover:text-red-800"
              >
                Cancel Booking
              </button>
            ) : (
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100"
              >
                Close
              </button>
            )}

            <button
              type="submit"
              className="rounded-lg bg-[#2F6FE0] px-5 py-2 text-sm font-semibold text-white hover:bg-[#1B3A66] transition-colors"
            >
              {isEditing ? "Update booking" : "Book"}
            </button>
          </div>
        </form>
      )}
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Modal Dialog Shell
// ---------------------------------------------------------------------------

function Dialog({ title, children, onClose }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-5 flex items-start justify-between gap-4">
          <h2 className="text-lg font-bold text-slate-900">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700"
            aria-label="Close dialog"
          >
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}