import {
  CalendarDays,
  Clock3,
  MapPin,
  Users,
} from "lucide-react";

import StatusTag from "../common/StatusTag";
import Button from "../common/Button";

// =====================================================
// CONVERT TIME TO MINUTES
// =====================================================

const toMinutes = (time) => {
  if (!time) return 0;

  const [hours, minutes] =
    time.split(":").map(Number);

  return hours * 60 + minutes;
};

// =====================================================
// FORMAT TIME
// =====================================================

function formatTime(time) {
  if (!time) return "";

  const [hour, minute] =
    time.split(":").map(Number);

  const suffix =
    hour >= 12
      ? "PM"
      : "AM";

  return `${hour % 12 || 12}:${String(
    minute
  ).padStart(2, "0")} ${suffix}`;
}

// =====================================================
// FORMAT DATE
// =====================================================

function formatDate(date) {
  if (!date) return "";

  return new Intl.DateTimeFormat(
    "en-GB",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }
  ).format(
    new Date(`${date}T12:00:00`)
  );
}

// =====================================================
// GET FLOOR
// =====================================================

function getFloor(room) {
  const match =
    room.module?.match(/\d+/) ||
    room.floor?.toString().match(/\d+/);

  return `Floor ${
    match?.[0] || room.floor || "1"
  }`;
}

// =====================================================
// GET SLOT STATUS
// =====================================================

function getSlotStatus(room, slot) {
  // -----------------------------------------------
  // If backend directly sends a status
  // -----------------------------------------------

  if (slot.status) {
    const status =
      String(slot.status)
        .trim()
        .toLowerCase();

    if (status === "available") {
      return "Available";
    }

    if (status === "pending") {
      return "Pending";
    }

    if (status === "completed") {
      return "Completed";
    }

    if (
      status === "booked" ||
      status === "approved" ||
      status === "confirmed"
    ) {
      return "Booked";
    }
  }

  // -----------------------------------------------
  // BACKEND SAYS SLOT IS BOOKED
  // -----------------------------------------------

  if (slot.isBooked === true) {
    const bookingStatus =
      room.currentBooking?.status ||
      room.booking?.status ||
      slot.booking?.status ||
      "";

    const normalizedStatus =
      String(bookingStatus)
        .trim()
        .toLowerCase();

    if (normalizedStatus === "pending") {
      return "Pending";
    }

    if (normalizedStatus === "completed") {
      return "Completed";
    }

    return "Booked";
  }

  // -----------------------------------------------
  // BACKEND SAYS AVAILABLE
  // -----------------------------------------------

  return "Available";
}

// =====================================================
// NORMALIZE FACILITIES
// =====================================================

function getFacilities(room) {
  const facilities =
    room.facilities ||
    room.roomFacilities ||
    [];

  if (!Array.isArray(facilities)) {
    return [];
  }

  return facilities.map((facility) => {
    if (typeof facility === "string") {
      return facility;
    }

    return (
      facility.name ||
      facility.facilityName ||
      String(facility)
    );
  });
}

// =====================================================
// AVAILABILITY GRID
// =====================================================

export default function AvailabilityGrid({
  rooms = [],
  date,
  isToday,
  nowMinutes,
  onSelectSlot,
}) {

  // ===================================================
  // CREATE CARDS
  // ===================================================

  const cards = rooms
    .flatMap((room) => {

      const timeSlots =
        room.timeSlots ||
        room.slots ||
        [];

      return timeSlots

        // ---------------------------------------------
        // REMOVE PAST SLOTS FOR TODAY
        // ---------------------------------------------

        .filter((slot) => {
          if (!isToday) {
            return true;
          }

          const startTime =
            slot.start ||
            slot.startTime ||
            slot.fromTime;

          return (
            toMinutes(startTime) >
            nowMinutes
          );
        })

        // ---------------------------------------------
        // CREATE CARD
        // ---------------------------------------------

        .map((slot) => {
          const start =
            slot.start ||
            slot.startTime ||
            slot.fromTime ||
            "";

          const end =
            slot.end ||
            slot.endTime ||
            slot.toTime ||
            "";

          const status =
            getSlotStatus(
              room,
              slot
            );

          return {
            room,
            slot: {
              ...slot,
              start,
              end,
            },
            status,
            booking:
              slot.booking ||
              room.currentBooking ||
              room.booking ||
              null,
          };
        });
    })

    // =================================================
    // SORT BY TIME AND ROOM NAME
    // =================================================

    .sort((a, b) => {
      const timeDifference =
        toMinutes(a.slot.start) -
        toMinutes(b.slot.start);

      if (timeDifference !== 0) {
        return timeDifference;
      }

      return (
        a.room.name ||
        a.room.roomName ||
        ""
      ).localeCompare(
        b.room.name ||
        b.room.roomName ||
        ""
      );
    });

  // ===================================================
  // DEBUG
  // ===================================================

  console.log(
    "AvailabilityGrid Rooms:",
    rooms
  );

  console.log(
    "AvailabilityGrid Cards:",
    cards
  );

  // ===================================================
  // NO RESULTS
  // ===================================================

  if (!cards.length) {
    return (
      <div className="rounded-2xl border border-dashed border-line bg-white p-10 text-center">

        <p className="font-display text-lg font-700 text-ink">
          No rooms available for the selected criteria.
        </p>

        <p className="mt-2 text-sm text-slate">
          Try changing the date or room type.
        </p>

      </div>
    );
  }

  // ===================================================
  // GRID
  // ===================================================

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">

      {cards.map(
        ({
          room,
          slot,
          status,
          booking,
        }) => {

          const facilities =
            getFacilities(room);

          return (
            <article
              key={`${room.id}-${slot.start}`}
              className="group flex min-h-[350px] flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-lg"
            >

              {/* HEADER */}

              <div className="flex items-start justify-between gap-3">

                <div>

                  <h2 className="font-display text-base font-700 text-ink">
                    {room.name ||
                      room.roomName}
                  </h2>

                  <p className="mt-1 text-sm text-slate">
                    {room.type ||
                      room.roomType}
                  </p>

                </div>

                <StatusTag
                  status={status}
                />

              </div>

              {/* ROOM DETAILS */}

              <div className="mt-5 space-y-3 border-y border-slate-100 py-4 text-sm text-slate">

                <p className="flex items-center gap-2">

                  <CalendarDays
                    size={16}
                    className="text-brand-blue"
                  />

                  {formatDate(date)}

                </p>

                <p className="flex items-center gap-2">

                  <Clock3
                    size={16}
                    className="text-brand-blue"
                  />

                  {formatTime(slot.start)}

                  {" - "}

                  {formatTime(slot.end)}

                </p>

                <p className="flex items-center gap-2">

                  <Users
                    size={16}
                    className="text-brand-blue"
                  />

                  Capacity:{" "}
                  {room.capacity}

                </p>

                <p className="flex items-center gap-2">

                  <MapPin
                    size={16}
                    className="text-brand-blue"
                  />

                  {getFloor(room)}

                </p>

              </div>

              {/* FACILITIES */}

              <div className="mt-4 flex-1">

                <p className="font-mono text-[11px] uppercase tracking-wider text-slate">
                  Facilities
                </p>

                {facilities.length > 0 ? (

                  <ul className="mt-2 space-y-1 text-sm text-ink">

                    {facilities.map(
                      (facility, index) => (

                        <li
                          key={`${facility}-${index}`}
                        >
                          • {facility}
                        </li>

                      )
                    )}

                  </ul>

                ) : (

                  <p className="mt-2 text-sm text-slate">
                    No facilities listed
                  </p>

                )}

              </div>

              {/* BUTTON */}

              <Button
                className="mt-5 w-full"
                variant={
                  status === "Available"
                    ? "primary"
                    : "secondary"
                }
                onClick={() =>
                  onSelectSlot({
                    room,
                    slot,
                    status,
                    booking,
                  })
                }
              >

                {status === "Available"
                  ? "Book Now"
                  : status === "Pending"
                  ? "Pending Approval"
                  : status === "Completed"
                  ? "View History"
                  : "View Details"}

              </Button>

            </article>
          );
        }
      )}

    </div>
  );
}