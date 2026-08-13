import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";

import Button from "../components/common/Button";
import Modal from "../components/common/Modal";
import AvailabilityGrid from "../components/calendar/AvailabilityGrid";
import { getRoomAvailability } from "../api/rooms";
import { Select } from "../components/common/Input";

const ROOM_TYPE_OPTIONS = [
  "All Rooms",
  "Conference",
  "Discussion",
  "Training",
];

// =====================================================
// GET LOCAL DATE
// =====================================================

function localDate(value = new Date()) {
  const offset = value.getTimezoneOffset() * 60000;

  return new Date(value.getTime() - offset)
    .toISOString()
    .slice(0, 10);
}

// =====================================================
// GET CURRENT TIME IN MINUTES
// Example: 16:30 => 990
// =====================================================

function getNowMinutes() {
  const now = new Date();

  return now.getHours() * 60 + now.getMinutes();
}

// =====================================================
// CONVERT TIME TO MINUTES
// Example: "15:30" => 930
// Example: "15:30:00" => 930
// =====================================================

function timeToMinutes(time) {
  if (!time) return 0;

  const [hours, minutes] = time.split(":").map(Number);

  return hours * 60 + minutes;
}

// =====================================================
// CHECK WHETHER DATE IS SATURDAY OR SUNDAY
// Sunday = 0
// Saturday = 6
// =====================================================

function isWeekend(dateString) {
  const date = new Date(`${dateString}T12:00:00`);
  const day = date.getDay();

  return day === 0 || day === 6;
}

// =====================================================
// GET NEXT/PREVIOUS WORKING DAY
// Skips Saturday and Sunday
// =====================================================

function getWorkingDay(dateString, delta) {
  const next = new Date(`${dateString}T12:00:00`);

  do {
    next.setDate(next.getDate() + delta);
  } while (
    next.getDay() === 0 ||
    next.getDay() === 6
  );

  return localDate(next);
}

// =====================================================
// AVAILABILITY CALENDAR
// =====================================================

export default function AvailabilityCalendar() {
  const today = localDate();

  const [selectedDate, setSelectedDate] =
    useState(today);

  const [rooms, setRooms] =
    useState([]);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState(null);

  const [filters, setFilters] =
    useState({
      type: "All Rooms",
      capacity: "",
      startTime: "",
      endTime: "",
    });

  const [selectedSlot, setSelectedSlot] =
    useState(null);

  const [nowMinutes, setNowMinutes] =
    useState(getNowMinutes());

  // =====================================================
  // UPDATE CURRENT TIME EVERY MINUTE
  // =====================================================

  useEffect(() => {
    const timer = setInterval(() => {
      setNowMinutes(getNowMinutes());
    }, 60000);

    return () => clearInterval(timer);
  }, []);

  // =====================================================
  // FETCH ROOM AVAILABILITY
  // =====================================================

  useEffect(() => {
    let isMounted = true;

    // Extra safety: never fetch weekend availability
    if (isWeekend(selectedDate)) {
      setRooms([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    getRoomAvailability(selectedDate)
      .then((data) => {
        if (!isMounted) return;

        // Supports either:
        // API returns array directly
        // OR API returns { date, rooms }

        const availabilityRooms =
          Array.isArray(data)
            ? data
            : data?.rooms || [];

        const mappedRooms =
          availabilityRooms.map((room) => ({
            ...room,

            id: room.roomId,

            name: room.roomName,

            type: room.roomType,

            facilities:
              room.facilities || [],
          }));

        setRooms(mappedRooms);
      })

      .catch((err) => {
        if (isMounted) {
          setError(
            "Failed to load room availability."
          );
        }

        console.error(
          "Availability fetch error:",
          err
        );
      })

      .finally(() => {
        if (isMounted) {
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [selectedDate]);

  // =====================================================
  // CHECK IF SELECTED DATE IS TODAY
  // =====================================================

  const selectedDateIsToday =
    selectedDate === today;

  // =====================================================
  // FILTER ROOMS
  // =====================================================

  const filteredRooms = useMemo(() => {
    return rooms.filter((room) => {
      // ROOM TYPE FILTER

      if (
        filters.type !== "All Rooms" &&
        room.type !== filters.type
      ) {
        return false;
      }

      // CAPACITY FILTER

      if (
        filters.capacity &&
        room.capacity <
          Number(filters.capacity)
      ) {
        return false;
      }

      return true;
    });
  }, [filters, rooms]);

  // =====================================================
  // REMOVE PAST TIME SLOTS FOR TODAY
  // =====================================================
  //
  // Backend uses:
  // timeSlots
  //
  // Example:
  // {
  //   startTime: "15:00:00",
  //   endTime: "16:00:00",
  //   isBooked: false
  // }
  // =====================================================

  const roomsWithFutureSlots =
    useMemo(() => {
      // Future dates show all slots

      if (!selectedDateIsToday) {
        return filteredRooms;
      }

      return filteredRooms
        .map((room) => {
          const timeSlots =
            room.timeSlots || [];

          // Only keep slots that have not yet started

          const futureSlots =
            timeSlots.filter((slot) => {
              const slotStart =
                slot.startTime ||
                slot.start;

              const slotStartMinutes =
                timeToMinutes(slotStart);

              return (
                slotStartMinutes >
                nowMinutes
              );
            });

          return {
            ...room,

            timeSlots:
              futureSlots,
          };
        })

        // Remove rooms with no future slots

        .filter((room) => {
          return (
            room.timeSlots.length > 0
          );
        });
    }, [
      filteredRooms,
      selectedDateIsToday,
      nowMinutes,
    ]);

  // =====================================================
  // UPDATE FILTER
  // =====================================================

  function updateFilter(key, value) {
    setFilters((current) => ({
      ...current,
      [key]: value,
    }));
  }

  // =====================================================
  // CHANGE DAY
  // SKIP SATURDAY AND SUNDAY
  // =====================================================

  function changeDays(delta) {
    const nextDate =
      getWorkingDay(
        selectedDate,
        delta
      );

    // Do not allow going before today

    if (nextDate < today) {
      return;
    }

    setSelectedDate(nextDate);

    // Close selected slot

    setSelectedSlot(null);
  }

  // =====================================================
  // DATE CHANGE
  // BLOCK SATURDAY AND SUNDAY
  // =====================================================

  function handleDateChange(value) {
    // Do not allow past dates

    if (value < today) {
      return;
    }

    // Block Saturday and Sunday

    if (isWeekend(value)) {
      alert(
        "Room booking is not available on Saturdays and Sundays."
      );

      return;
    }

    setSelectedDate(value);

    setSelectedSlot(null);
  }

  // =====================================================
  // SELECT SLOT
  // EXTRA SAFETY CHECK
  // =====================================================

  function handleSelectSlot(slot) {
    // Block weekend selection

    if (isWeekend(selectedDate)) {
      alert(
        "Room booking is not available on Saturdays and Sundays."
      );

      return;
    }

    // Block past slots for today

    if (
      selectedDateIsToday &&
      slot?.status === "Available"
    ) {
      const slotStart =
        slot.slot.start ||
        slot.slot.startTime;

      const slotStartMinutes =
        timeToMinutes(slotStart);

      if (
        slotStartMinutes <=
        nowMinutes
      ) {
        alert(
          "Cannot select or book a time slot in the past for today."
        );

        return;
      }
    }

    setSelectedSlot(slot);
  }

  // =====================================================
  // BOOKING LINK
  // =====================================================

  function bookingLink(slot) {
    const startTime =
      slot.slot.start ||
      slot.slot.startTime;

    const endTime =
      slot.slot.end ||
      slot.slot.endTime;

    const params =
      new URLSearchParams({
        roomId: slot.room.id,

        date: selectedDate,

        startTime,

        endTime,

        attendees: String(
          filters.capacity || 1
        ),
      });

    return `/book-room?${params.toString()}`;
  }

  // =====================================================
  // STATUS BADGE
  // =====================================================

  const getStatusBadgeClass =
    (status) => {
      const s =
        status?.toLowerCase() || "";

      if (
        s === "approved" ||
        s === "confirmed" ||
        s === "available"
      ) {
        return "bg-[#658362] text-white";
      }

      if (s === "pending") {
        return "bg-[#E09F3E] text-white";
      }

      if (
        s === "rejected" ||
        s === "cancelled"
      ) {
        return "bg-[#B85450] text-white";
      }

      return "bg-slate-500 text-white";
    };

  // =====================================================
  // MODAL TITLE
  // =====================================================

  const modalTitle =
    selectedSlot?.status ===
    "Available"
      ? "Book this room"
      : selectedSlot?.status ===
        "Pending"
      ? "Pending approval"
      : selectedSlot?.status ===
        "Completed"
      ? "Booking history"
      : "Booking details";

  // =====================================================
  // UI
  // =====================================================

  return (
    <div className="space-y-6">

      {/* HEADER */}

      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

        <div>
          <h1 className="font-display text-2xl font-700 text-ink">
            Room Availability
          </h1>

          <p className="mt-1 text-sm text-slate">
            Find the right workspace and book an available time slot.
          </p>
        </div>

        <div className="flex flex-nowrap items-center gap-3">

          {/* PREVIOUS WORKING DAY */}

          <Button
            variant="secondary"
            onClick={() =>
              changeDays(-1)
            }
            disabled={
              selectedDate <= today
            }
            aria-label="Previous day"
          >
            <ChevronLeft size={16} />
          </Button>

          {/* DATE */}

          <input
            type="date"
            min={today}
            value={selectedDate}
            onChange={(event) =>
              handleDateChange(
                event.target.value
              )
            }
            className="min-w-[170px] rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink"
          />

          {/* NEXT WORKING DAY */}

          <Button
            variant="secondary"
            onClick={() =>
              changeDays(1)
            }
            aria-label="Next day"
          >
            <ChevronRight size={16} />
          </Button>

          {/* ROOM TYPE */}

          <Select
            value={filters.type}
            onChange={(event) =>
              updateFilter(
                "type",
                event.target.value
              )
            }
            className="w-auto min-w-[170px] max-w-[220px] rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink"
          >
            {ROOM_TYPE_OPTIONS.map(
              (type) => (
                <option
                  key={type}
                  value={type}
                >
                  {type}
                </option>
              )
            )}
          </Select>

        </div>
      </div>

      {/* LOADING */}

      {loading && (
        <div className="p-8 text-center text-sm text-slate">
          Loading calendar schedule...
        </div>
      )}

      {/* ERROR */}

      {error && (
        <div className="p-8 text-center text-sm text-red-500">
          {error}
        </div>
      )}

      {/* AVAILABILITY GRID */}

      {!loading && !error && (
        <AvailabilityGrid
          rooms={roomsWithFutureSlots}
          bookings={[]}
          date={selectedDate}
          isToday={selectedDateIsToday}
          nowMinutes={nowMinutes}
          onSelectSlot={
            handleSelectSlot
          }
        />
      )}

      {/* SLOT MODAL */}

      <Modal
        open={Boolean(selectedSlot)}
        title={modalTitle}
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() =>
                setSelectedSlot(null)
              }
            >
              Close
            </Button>

            {selectedSlot?.status ===
              "Available" && (
              <Link
                to={bookingLink(
                  selectedSlot
                )}
              >
                <Button
                  onClick={() =>
                    setSelectedSlot(null)
                  }
                >
                  Continue to booking
                </Button>
              </Link>
            )}
          </>
        }
      >
        {selectedSlot && (
          <div className="space-y-3">

            <p className="font-display text-base font-700 text-ink">
              {selectedSlot.room.name}
            </p>

            <p>
              {selectedSlot.room.type}
              {" · "}
              Capacity{" "}
              {selectedSlot.room.capacity}
            </p>

            <p>
              {selectedDate}
              {", "}

              {selectedSlot.slot.start ||
                selectedSlot.slot.startTime}

              {" - "}

              {selectedSlot.slot.end ||
                selectedSlot.slot.endTime}
            </p>

            <p>
              Facilities:{" "}

              {selectedSlot.room.facilities?.join(
                ", "
              ) || "None"}
            </p>

            <div className="flex items-center gap-2">

              <span>
                Status:
              </span>

              <span
                className={`inline-block w-28 rounded-full py-1 text-center text-xs font-bold tracking-wider uppercase ${getStatusBadgeClass(
                  selectedSlot.status
                )}`}
              >
                {selectedSlot.status}
              </span>

            </div>

            {selectedSlot.booking && (
              <p>
                Booking:{" "}

                {selectedSlot.booking.title ||
                  "Reserved workspace"}
              </p>
            )}

          </div>
        )}
      </Modal>

    </div>
  );
}