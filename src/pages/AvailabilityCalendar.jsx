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

  return new Date(
    value.getTime() - offset
  )
    .toISOString()
    .slice(0, 10);
}

// =====================================================
// GET CURRENT TIME IN MINUTES
// =====================================================

function getNowMinutes() {
  const now = new Date();

  return (
    now.getHours() * 60 +
    now.getMinutes()
  );
}

// =====================================================
// CONVERT TIME TO MINUTES
// Example: "15:30" => 930
// =====================================================

function timeToMinutes(time) {
  if (!time) return 0;

  const [hours, minutes] = time
    .split(":")
    .map(Number);

  return (
    hours * 60 +
    minutes
  );
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

      setNowMinutes(
        getNowMinutes()
      );

    }, 60000);

    return () =>
      clearInterval(timer);

  }, []);

  // =====================================================
  // FETCH ROOM AVAILABILITY
  // =====================================================

  useEffect(() => {

    let isMounted = true;

    setLoading(true);

    setError(null);

    getRoomAvailability(selectedDate)

      .then((data) => {

        if (!isMounted) return;

        const mappedRooms =
          (data || []).map((room) => ({

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

      // -----------------------------------------------
      // ROOM TYPE FILTER
      // -----------------------------------------------

      if (
        filters.type !==
          "All Rooms" &&
        room.type !==
          filters.type
      ) {
        return false;
      }

      // -----------------------------------------------
      // CAPACITY FILTER
      // -----------------------------------------------

      if (
        filters.capacity &&
        room.capacity <
          Number(
            filters.capacity
          )
      ) {
        return false;
      }

      return true;

    });

  }, [
    filters,
    rooms,
  ]);

  // =====================================================
  // REMOVE PAST TIME SLOTS FOR TODAY
  // =====================================================
  //
  // This assumes each room contains an availabilitySlots
  // or slots array. We filter those slots before sending
  // rooms to AvailabilityGrid.
  //
  // Past slots will not be visible.
  // =====================================================

  const roomsWithFutureSlots =
    useMemo(() => {

      // Future dates:
      // show all slots

      if (!selectedDateIsToday) {

        return filteredRooms;

      }

      return filteredRooms
        .map((room) => {

          // Support possible backend property names

          const roomSlots =
            room.slots ||
            room.availabilitySlots ||
            room.availableSlots ||
            [];

          // Filter only future slots

          const futureSlots =
            roomSlots.filter((slot) => {

              if (
                !slot?.start
              ) {
                return true;
              }

              const slotStartMinutes =
                timeToMinutes(
                  slot.start
                );

              // Only future time slots
              return (
                slotStartMinutes >
                nowMinutes
              );

            });

          return {

            ...room,

            // Preserve whichever property
            // AvailabilityGrid uses

            slots:
              room.slots !== undefined
                ? futureSlots
                : room.slots,

            availabilitySlots:
              room.availabilitySlots !==
              undefined
                ? futureSlots
                : room.availabilitySlots,

            availableSlots:
              room.availableSlots !==
              undefined
                ? futureSlots
                : room.availableSlots,

          };

        })

        // Remove rooms that have no
        // future slots remaining

        .filter((room) => {

          const slots =
            room.slots ||
            room.availabilitySlots ||
            room.availableSlots;

          // If slots property doesn't exist,
          // keep the room because AvailabilityGrid
          // may generate slots differently

          if (!slots) {
            return true;
          }

          return (
            slots.length > 0
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

  function updateFilter(
    key,
    value
  ) {

    setFilters((current) => ({

      ...current,

      [key]: value,

    }));

  }

  // =====================================================
  // CHANGE DAY
  // =====================================================

  function changeDays(delta) {

    const next =
      new Date(
        `${selectedDate}T12:00:00`
      );

    next.setDate(
      next.getDate() + delta
    );

    const nextDate =
      localDate(next);

    if (
      nextDate >= today
    ) {

      setSelectedDate(
        nextDate
      );

      // Close selected slot
      setSelectedSlot(null);

    }

  }

  // =====================================================
  // DATE CHANGE
  // =====================================================

  function handleDateChange(value) {

    if (
      value >= today
    ) {

      setSelectedDate(value);

      setSelectedSlot(null);

    }

  }

  // =====================================================
  // SELECT SLOT
  // EXTRA SAFETY CHECK
  // =====================================================

  function handleSelectSlot(slot) {

    if (
      selectedDateIsToday &&
      slot?.status ===
        "Available"
    ) {

      const slotStartMinutes =
        timeToMinutes(
          slot.slot.start
        );

      // Prevent selecting past/current slot

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

    const params =
      new URLSearchParams({

        roomId:
          slot.room.id,

        date:
          selectedDate,

        startTime:
          slot.slot.start,

        endTime:
          slot.slot.end,

        attendees:
          String(
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
        status?.toLowerCase() ||
        "";

      if (
        s === "approved" ||
        s === "confirmed" ||
        s === "available"
      ) {

        return "bg-[#658362] text-white";

      }

      if (
        s === "pending"
      ) {

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

      {/* ===============================================
          HEADER
      ================================================ */}

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

          {/* PREVIOUS DAY */}

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

          {/* NEXT DAY */}

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

      {/* ===============================================
          LOADING
      ================================================ */}

      {loading && (

        <div className="p-8 text-center text-sm text-slate">
          Loading calendar schedule...
        </div>

      )}

      {/* ===============================================
          ERROR
      ================================================ */}

      {error && (

        <div className="p-8 text-center text-sm text-red-500">
          {error}
        </div>

      )}

      {/* ===============================================
          AVAILABILITY GRID
      ================================================ */}

      {!loading &&
        !error && (

          <AvailabilityGrid

            rooms={
              roomsWithFutureSlots
            }

            bookings={[]}

            date={
              selectedDate
            }

            isToday={
              selectedDateIsToday
            }

            nowMinutes={
              nowMinutes
            }

            onSelectSlot={
              handleSelectSlot
            }

          />

        )}

      {/* ===============================================
          SLOT MODAL
      ================================================ */}

      <Modal
        open={
          Boolean(selectedSlot)
        }
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

              {selectedSlot.slot.start}

              {" - "}

              {selectedSlot.slot.end}

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