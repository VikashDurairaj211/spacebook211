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
// Supports:
// "09:00"
// "09:00:00"
// =====================================================

const toMinutes = (time) => {
  if (!time) return 0;

  const [hours, minutes] =
    time.split(":").map(Number);

  return hours * 60 + minutes;
};


// =====================================================
// FORMAT TIME
// "09:00:00" -> "9:00 AM"
// =====================================================

function formatTime(time) {
  if (!time) return "";

  const [hour, minute] =
    time.split(":").map(Number);

  const suffix =
    hour >= 12 ? "PM" : "AM";

  return `${hour % 12 || 12}:${String(
    minute
  ).padStart(2, "0")} ${suffix}`;
}


// =====================================================
// FORMAT DATE
// =====================================================

function formatDate(date) {
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
// GET FLOOR / MODULE
// =====================================================

function floor(room) {
  const match =
    room.module?.match(/\d+/);

  return `Floor ${
    match?.[0] || "1"
  }`;
}


// =====================================================
// GET SLOT STATUS FROM BACKEND
// =====================================================

function getSlotStatus(slot, room) {
  // Backend says slot is booked

  if (slot.isBooked) {
    const booking =
      room.currentBooking;

    if (
      booking?.status === "Pending"
    ) {
      return {
        status: "Pending",
        booking,
      };
    }

    if (
      booking?.status === "Completed"
    ) {
      return {
        status: "Completed",
        booking,
      };
    }

    return {
      status: "Booked",
      booking,
    };
  }

  // Slot is available

  return {
    status: "Available",
    booking: null,
  };
}


// =====================================================
// AVAILABILITY GRID
// =====================================================

export default function AvailabilityGrid({
  rooms,
  date,
  isToday,
  nowMinutes,
  onSelectSlot,
}) {

  // ===================================================
  // CREATE CARDS USING BACKEND timeSlots
  // ===================================================

  const cards =
    rooms
      .flatMap((room) => {

        const timeSlots =
          room.timeSlots || [];

        return timeSlots

          // Remove past slots for today

          .filter((slot) => {
            if (!isToday) {
              return true;
            }

            const startTime =
              slot.start ||
              slot.startTime;

            return (
              toMinutes(startTime) >
              nowMinutes
            );
          })

          .map((slot) => {

            const start =
              slot.start ||
              slot.startTime;

            const end =
              slot.end ||
              slot.endTime;

            const normalizedSlot = {
              ...slot,
              start,
              end,
            };

            return {
              room,
              slot: normalizedSlot,
              ...getSlotStatus(
                normalizedSlot,
                room
              ),
            };
          });
      })

      // Sort by time and room name

      .sort(
        (a, b) =>
          toMinutes(a.slot.start) -
            toMinutes(b.slot.start) ||
          a.room.name.localeCompare(
            b.room.name
          )
      );


  // ===================================================
  // NO ROOMS
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
  // UI
  // ===================================================

  return (

    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">

      {cards.map(
        ({
          room,
          slot,
          status,
          booking,
        }) => (

          <article
            key={`${room.id}-${slot.start}`}
            className="group flex min-h-[350px] flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-lg"
          >

            {/* HEADER */}

            <div className="flex items-start justify-between gap-3">

              <div>

                <h2 className="font-display text-base font-700 text-ink">
                  {room.name}
                </h2>

                <p className="mt-1 text-sm text-slate">
                  {room.type}
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

                Capacity:
                {" "}
                {room.capacity}

              </p>


              <p className="flex items-center gap-2">

                <MapPin
                  size={16}
                  className="text-brand-blue"
                />

                {room.module || floor(room)}

              </p>

            </div>


            {/* FACILITIES */}

            <div className="mt-4 flex-1">

              <p className="font-mono text-[11px] uppercase tracking-wider text-slate">
                Facilities
              </p>


              {room.facilities?.length > 0 ? (

                <ul className="mt-2 space-y-1 text-sm text-ink">

                  {room.facilities.map(
                    (facility) => (

                      <li key={facility}>
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

        )
      )}

    </div>

  );
}