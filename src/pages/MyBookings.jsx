import { useEffect, useState } from "react";

import {
  getMyBookings,
  cancelBooking,
  updateBooking,
} from "../api/bookings";
import {
  getMyHotseatBookings,
  cancelHotseatBooking,
} from "../api/hotseat";

import Card from "../components/common/Card";
import Button from "../components/common/Button";
import Modal from "../components/common/Modal";
import { Field, Input } from "../components/common/Input";
import { useToast } from "../components/common/ToastProvider";

export default function MyBookings() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [mode, setMode] = useState(null);

  const toast = useToast();

  // =====================================================
  // GET ROOM ID
  // =====================================================

  const getRoomId = (booking) => {
    if (!booking) return null;

    return (
      booking.roomId ??
      booking.RoomId ??
      booking.roomID ??
      booking.RoomID ??
      booking.room?.roomId ??
      booking.room?.RoomId ??
      booking.room?.id ??
      booking.room?.Id ??
      null
    );
  };

  // =====================================================
  // GET MODULE
  // =====================================================

  const getBookingModule = (booking) => {
    if (!booking) return "-";

    const mod =
      booking.module ||
      booking.Module ||
      booking.room?.module ||
      booking.room?.Module;

    return mod && String(mod).trim() !== "" ? mod : "-";
  };

  // =====================================================
  // LOAD BOOKINGS
  // =====================================================

  const load = async () => {
    try {
      setLoading(true);

      const [roomResult, hotseatResult] = await Promise.allSettled([
        getMyBookings(),
        getMyHotseatBookings(),
      ]);

      let roomBookings = [];
      let hotseatBookings = [];

      // =====================================================
      // ROOM BOOKINGS
      // =====================================================

      if (roomResult.status === "fulfilled") {
        const data = roomResult.value;

        console.log("My Room Bookings API Response:", data);

        const bookingList = Array.isArray(data)
          ? data
          : data?.bookings || [];

        roomBookings = bookingList.map((booking) => ({
          ...booking,

          bookingId:
            booking.bookingId ??
            booking.id ??
            booking.Id,

          roomId: getRoomId(booking),

          isHotseat: false,
        }));
      } else {
        console.error("Room bookings error:", roomResult.reason);
      }

      // =====================================================
      // HOTSEAT BOOKINGS
      // =====================================================

      if (hotseatResult.status === "fulfilled") {
        const data = hotseatResult.value;

        console.log("My Hotseat Bookings API Response:", data);

        const bookingList = Array.isArray(data)
          ? data
          : data?.bookings || [];

        hotseatBookings = bookingList.map((booking) => ({
          ...booking,

          bookingId:
            booking.bookingId ??
            booking.id ??
            booking.Id,

          isHotseat: true,

          bookingDate:
            booking.bookingDate ??
            booking.date ??
            "",

          startTime:
            booking.startTime ??
            booking.expectedCheckIn ??
            "",

          endTime:
            booking.endTime ??
            booking.expectedCheckIn ??
            "",

          roomName:
            booking.roomName ||
            (booking.seatNumber
              ? `Hot Seat ${booking.seatNumber}`
              : "Hot Seat"),

          module:
            booking.module ??
            booking.Module ??
            "-",

          purpose:
            booking.purpose ||
            "Hotseat Booking",

          roomId: null,

          seatId: booking.seatId,
          seatNumber: booking.seatNumber,

          expectedCheckIn:
            booking.expectedCheckIn ??
            booking.expectedCheckInTime ??
            "",

          checkInTime:
            booking.checkInTime ?? null,

          releasedOn:
            booking.releasedOn ?? null,
        }));
      } else {
        console.error(
          "Hotseat bookings error:",
          hotseatResult.reason
        );
      }

      // =====================================================
      // COMBINE BOOKINGS
      // =====================================================

      const combinedBookings = [
        ...roomBookings,
        ...hotseatBookings,
      ];

      const sorted = [...combinedBookings].sort(
        (a, b) =>
          Number(b.bookingId || 0) -
          Number(a.bookingId || 0)
      );

      setBookings(sorted);

      if (
        roomResult.status === "rejected" &&
        hotseatResult.status === "rejected"
      ) {
        toast.addToast({
          type: "error",
          title: "Unable to load bookings.",
        });
      }
    } catch (err) {
      console.error("Error loading bookings:", err);

      setBookings([]);

      toast.addToast({
        type: "error",
        title: "Unable to load bookings.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  // =====================================================
  // DATE HELPERS
  // =====================================================

  const getTodayString = () => {
    const now = new Date();

    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  };

  const todayString = getTodayString();

  // =====================================================
  // CHECK WHETHER BOOKING CAN BE EDITED / CANCELLED
  // =====================================================

  const canModifyBooking = (booking) => {
    const status = booking?.status?.toLowerCase() || "";

    if (
      status === "cancelled" ||
      status === "rejected"
    ) {
      return false;
    }

    if (
      !booking?.bookingDate ||
      !booking?.startTime
    ) {
      return false;
    }

    const startTime = formatDisplayTime(
      booking.startTime
    );

    const bookingStart = new Date(
      `${booking.bookingDate}T${startTime}:00`
    );

    return bookingStart > new Date();
  };

  // =====================================================
  // GET DURATION
  // =====================================================

  const getDuration = (booking) => {
    if (!booking) return "-";

    // HOTSEAT
    if (booking.isHotseat) {
      if (
        booking.checkInTime &&
        booking.releasedOn
      ) {
        const start = new Date(
          booking.checkInTime
        );

        const end = new Date(
          booking.releasedOn
        );

        const diffMins = Math.round(
          (end - start) / (1000 * 60)
        );

        if (diffMins <= 0) return "-";

        const hrs = Math.floor(
          diffMins / 60
        );

        const mins = diffMins % 60;

        return hrs > 0
          ? `${hrs}h${mins > 0 ? ` ${mins}m` : ""}`
          : `${mins}m`;
      }

      return "Full Day";
    }

    // ROOM BOOKING
    const start = booking.startTime;
    const end = booking.endTime;

    if (!start || !end) return "-";

    const startTimeStr =
      formatDisplayTime(start);

    const endTimeStr =
      formatDisplayTime(end);

    const [startH, startM] =
      startTimeStr.split(":").map(Number);

    const [endH, endM] =
      endTimeStr.split(":").map(Number);

    if (
      isNaN(startH) ||
      isNaN(endH)
    ) {
      return "-";
    }

    let diffMins =
      endH * 60 +
      (endM || 0) -
      (startH * 60 + (startM || 0));

    if (diffMins < 0) {
      diffMins += 24 * 60;
    }

    const hours = Math.floor(
      diffMins / 60
    );

    const minutes = diffMins % 60;

    if (hours > 0 && minutes > 0) {
      return `${hours}h ${minutes}m`;
    }

    if (hours > 0) {
      return `${hours}h`;
    }

    return `${minutes}m`;
  };

  // =====================================================
  // STATUS BADGE
  // =====================================================

  const getStatusBadgeClass = (status) => {
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
      s === "cancelled" ||
      s === "expired"
    ) {
      return "bg-[#B85450] text-white";
    }

    return "bg-slate-500 text-white";
  };

  // =====================================================
  // MODAL ACTIONS
  // =====================================================

  const handleView = (booking) => {
    setSelected({
      ...booking,
      roomId: getRoomId(booking),
    });

    setMode("view");
  };

  const handleEdit = (booking) => {
    if (booking?.isHotseat) {
      toast.addToast({
        type: "error",
        title:
          "Hotseat bookings cannot be edited here.",
      });

      return;
    }

    setSelected({
      ...booking,
      roomId: getRoomId(booking),
    });

    setMode("edit");
  };

  const closeModal = () => {
    setMode(null);
    setSelected(null);
  };

  // =====================================================
  // CANCEL BOOKING
  // =====================================================

  async function cancel() {
    if (!selected?.bookingId) return;

    try {
      if (selected.isHotseat) {
        await cancelHotseatBooking(
          selected.bookingId
        );

        toast.addToast({
          type: "success",
          title:
            "Hotseat booking cancelled successfully.",
        });
      } else {
        await cancelBooking(
          selected.bookingId
        );

        toast.addToast({
          type: "success",
          title:
            "Booking cancelled successfully.",
        });
      }

      closeModal();

      await load();
    } catch (err) {
      console.error(
        "Cancel booking error:",
        err
      );

      toast.addToast({
        type: "error",
        title:
          err.response?.data?.message ||
          err.response?.data?.title ||
          err.message ||
          "Unable to cancel booking.",
      });
    }
  }

  // =====================================================
  // FORMAT DISPLAY TIME
  // =====================================================

  const formatDisplayTime = (time) => {
    if (!time) return "";

    const value = String(time);

    if (value.includes("T")) {
      const timePart =
        value.split("T")[1] || "";

      return timePart.substring(0, 5);
    }

    return value.substring(0, 5);
  };

  // =====================================================
  // FORMAT API TIME
  // =====================================================

  const formatApiTime = (time) => {
    if (!time) return "";

    const value = String(time);

    if (value.includes("T")) {
      const timePart =
        value.split("T")[1] || "";

      return timePart.length === 5
        ? `${timePart}:00`
        : timePart;
    }

    return value.length === 5
      ? `${value}:00`
      : value;
  };

  // =====================================================
  // VALIDATE EDIT DATE
  // =====================================================

  const validateBookingDate = (date) => {
    if (!date) {
      toast.addToast({
        type: "error",
        title: "Booking date is required.",
      });

      return false;
    }

    if (date < todayString) {
      toast.addToast({
        type: "error",
        title:
          "You cannot select a past date.",
      });

      return false;
    }

    const selectedDate = new Date(
      `${date}T00:00:00`
    );

    const day =
      selectedDate.getDay();

    if (day === 0 || day === 6) {
      toast.addToast({
        type: "error",
        title:
          "Bookings are not allowed on Saturdays and Sundays.",
      });

      return false;
    }

    return true;
  };

  // =====================================================
  // VALIDATE EDIT TIME
  // OFFICE HOURS = 10:00 AM TO 7:00 PM
  // =====================================================

  const validateBookingTime = (
    date,
    startTime,
    endTime
  ) => {
    if (!startTime || !endTime) {
      toast.addToast({
        type: "error",
        title:
          "Start time and end time are required.",
      });

      return false;
    }

    const OFFICE_START = "10:00";
    const OFFICE_END = "19:00";

    // Start cannot be before 10 AM
    if (startTime < OFFICE_START) {
      toast.addToast({
        type: "error",
        title:
          "Start time cannot be before 10:00 AM.",
      });

      return false;
    }

    // End cannot be after 7 PM
    if (endTime > OFFICE_END) {
      toast.addToast({
        type: "error",
        title:
          "End time cannot be after 7:00 PM.",
      });

      return false;
    }

    // End must be after start
    if (startTime >= endTime) {
      toast.addToast({
        type: "error",
        title:
          "End time must be after start time.",
      });

      return false;
    }

    // If booking is for today,
    // start time must be in the future.
    if (date === todayString) {
      const now = new Date();

      const currentHours =
        now.getHours();

      const currentMinutes =
        now.getMinutes();

      const currentTimeMinutes =
        currentHours * 60 +
        currentMinutes;

      const [startHour, startMinute] =
        startTime.split(":").map(Number);

      const startTotalMinutes =
        startHour * 60 +
        startMinute;

      if (
        startTotalMinutes <=
        currentTimeMinutes
      ) {
        toast.addToast({
          type: "error",
          title:
            "You cannot select a past time for today's booking.",
        });

        return false;
      }
    }

    return true;
  };

  // =====================================================
  // SAVE / UPDATE BOOKING
  // =====================================================

  async function save(e) {
    e.preventDefault();

    if (!selected) return;

    const roomId =
      getRoomId(selected);

    if (!selected.bookingId) {
      toast.addToast({
        type: "error",
        title:
          "Booking ID is missing.",
      });

      return;
    }

    if (
      roomId === null ||
      roomId === undefined ||
      roomId === ""
    ) {
      toast.addToast({
        type: "error",
        title:
          "Room ID is missing from this booking.",
      });

      return;
    }

    // =====================================================
    // DATE VALIDATION
    // =====================================================

    if (
      !validateBookingDate(
        selected.bookingDate
      )
    ) {
      return;
    }

    // =====================================================
    // TIME VALIDATION
    // =====================================================

    const startTime =
      formatDisplayTime(
        selected.startTime
      );

    const endTime =
      formatDisplayTime(
        selected.endTime
      );

    if (
      !validateBookingTime(
        selected.bookingDate,
        startTime,
        endTime
      )
    ) {
      return;
    }

    // =====================================================
    // API PAYLOAD
    // =====================================================

    const payload = {
      roomId: Number(roomId),

      bookingDate:
        selected.bookingDate,

      startTime:
        formatApiTime(startTime),

      endTime:
        formatApiTime(endTime),

      purpose:
        selected.purpose?.trim() ||
        "Meeting",

      participantCount:
        Number(
          selected.participantCount || 1
        ),
    };

    try {
      await updateBooking(
        selected.bookingId,
        payload
      );

      toast.addToast({
        type: "success",
        title:
          "Booking updated successfully.",
      });

      closeModal();

      await load();
    } catch (err) {
      console.error(
        "Update booking error:",
        err
      );

      toast.addToast({
        type: "error",
        title:
          err.response?.data?.message ||
          err.response?.data?.title ||
          err.message ||
          "Unable to update booking.",
      });
    }
  }

  // =====================================================
  // RENDER
  // =====================================================

  return (
    <div className="space-y-6">

      {/* PAGE HEADER */}

      <div>
        <h1 className="text-4xl font-semibold">
          My Bookings
        </h1>

        <p className="mt-2 text-slate-500">
          View, edit or cancel your workspace reservations.
        </p>
      </div>

      {/* BOOKINGS TABLE */}

      <Card className="overflow-x-auto p-0">

        <table className="w-full text-sm">

          <thead>
            <tr className="border-b border-line text-left font-mono text-[11px] uppercase tracking-wider text-slate">

              <th className="px-3 py-3">
                ID
              </th>

              <th className="px-3 py-3">
                Room
              </th>

              <th className="px-3 py-3">
                Module
              </th>

              <th className="px-3 py-3">
                Purpose
              </th>

              <th className="px-3 py-3">
                Date
              </th>

              <th className="px-3 py-3">
                Time
              </th>

              <th className="px-3 py-3">
                Duration
              </th>

              <th className="px-3 py-3 text-center">
                Status
              </th>

              <th className="px-3 py-3 text-center">
                Actions
              </th>

            </tr>
          </thead>

          <tbody>

            {loading ? (

              <tr>
                <td
                  colSpan={9}
                  className="py-8 text-center text-slate-500"
                >
                  Loading bookings...
                </td>
              </tr>

            ) : bookings.length === 0 ? (

              <tr>
                <td
                  colSpan={9}
                  className="py-8 text-center text-slate-500"
                >
                  No bookings found.
                </td>
              </tr>

            ) : (

              bookings.map((b) => (

                <tr
                  key={`${b.isHotseat ? "hotseat" : "room"}-${b.bookingId}`}
                  className="border-b border-line last:border-0"
                >

                  {/* BOOKING ID */}
                  {/* Displays 111, NOT #111 */}

                  <td className="px-3 py-4 font-mono whitespace-nowrap">
                    {String(
                      b.bookingId ?? ""
                    ).replace(/^#/, "")}
                  </td>

                  <td className="px-3 py-4 whitespace-nowrap font-semibold">

                    {b.isHotseat
                      ? b.roomName ||
                        "Hot Seat"
                      : b.roomName ||
                        `Room ${
                          getRoomId(b) || ""
                        }`}

                  </td>

                  <td className="px-3 py-4 whitespace-nowrap text-slate-600">
                    {getBookingModule(b)}
                  </td>

                  <td className="max-w-[140px] truncate px-3 py-4">
                    {b.purpose &&
                    b.purpose.trim()
                      ? b.purpose
                      : "Reserved Workspace"}
                  </td>

                  <td className="px-3 py-4 whitespace-nowrap">
                    {b.bookingDate}
                  </td>

                  <td className="px-3 py-4 whitespace-nowrap text-slate-600">

                    {b.isHotseat
                      ? formatDisplayTime(
                          b.startTime
                        )
                      : `${formatDisplayTime(
                          b.startTime
                        )} - ${formatDisplayTime(
                          b.endTime
                        )}`}

                  </td>

                  <td className="px-3 py-4 whitespace-nowrap">
                    {getDuration(b)}
                  </td>

                  <td className="px-3 py-4 text-center whitespace-nowrap">

                    <span
                      className={`inline-block w-24 rounded-full py-1 text-center text-xs font-bold uppercase tracking-wider ${getStatusBadgeClass(
                        b.status
                      )}`}
                    >
                      {b.status}
                    </span>

                  </td>

                  <td className="px-3 py-4 text-center whitespace-nowrap">

                    <button
                      className="mr-2.5 text-sm font-bold text-sky-600 hover:text-sky-800 hover:underline"
                      onClick={() =>
                        handleView(b)
                      }
                    >
                      View
                    </button>

                    {canModifyBooking(b) && (
                      <>
                        {!b.isHotseat && (
                          <button
                            className="mr-2.5 text-sm font-bold text-emerald-600 hover:text-emerald-800 hover:underline"
                            onClick={() =>
                              handleEdit(b)
                            }
                          >
                            Edit
                          </button>
                        )}

                        <button
                          className="text-sm font-bold text-red-600 hover:text-red-800 hover:underline"
                          onClick={() => {
                            setSelected({
                              ...b,
                              roomId:
                                getRoomId(b),
                            });

                            setMode("cancel");
                          }}
                        >
                          Cancel
                        </button>
                      </>
                    )}

                  </td>

                </tr>

              ))

            )}

          </tbody>

        </table>

      </Card>

      {/* VIEW BOOKING MODAL */}

      <Modal
        open={mode === "view"}
        title="Booking Details"
        footer={
          <Button onClick={closeModal}>
            Back
          </Button>
        }
        className="max-w-lg h-fit"
      >

        {selected && (

          <dl className="grid grid-cols-2 gap-4 text-sm">

            <dt className="font-medium">
              Booking ID
            </dt>

            <dd>
              {String(
                selected.bookingId ?? ""
              ).replace(/^#/, "")}
            </dd>

            <dt className="font-medium">
              {selected.isHotseat
                ? "Seat"
                : "Room"}
            </dt>

            <dd>
              {selected.isHotseat
                ? selected.seatNumber ||
                  selected.roomName ||
                  "Hot Seat"
                : selected.roomName ||
                  `Room ${
                    getRoomId(selected) ||
                    ""
                  }`}
            </dd>

            <dt className="font-medium">
              Module
            </dt>

            <dd>
              {getBookingModule(selected)}
            </dd>

            {selected.isHotseat && (
              <>
                <dt className="font-medium">
                  Seat Number
                </dt>

                <dd>
                  {selected.seatNumber ||
                    "-"}
                </dd>

                <dt className="font-medium">
                  Check-in Time
                </dt>

                <dd>
                  {selected.expectedCheckIn
                    ? formatDisplayTime(
                        selected.expectedCheckIn
                      )
                    : selected.startTime
                    ? formatDisplayTime(
                        selected.startTime
                      )
                    : "-"}
                </dd>
              </>
            )}

            <dt className="font-medium">
              Purpose
            </dt>

            <dd>
              {selected.purpose ||
                "Reserved Workspace"}
            </dd>

            <dt className="font-medium">
              Date
            </dt>

            <dd>
              {selected.bookingDate}
            </dd>

            <dt className="font-medium">
              Time
            </dt>

            <dd>
              {selected.isHotseat
                ? formatDisplayTime(
                    selected.startTime
                  )
                : `${formatDisplayTime(
                    selected.startTime
                  )} - ${formatDisplayTime(
                    selected.endTime
                  )}`}
            </dd>

            <dt className="font-medium">
              Duration
            </dt>

            <dd>
              {getDuration(selected)}
            </dd>

            <dt className="font-medium">
              Status
            </dt>

            <dd>
              <span
                className={`inline-block w-28 rounded-full py-1 text-center text-xs font-bold uppercase tracking-wider ${getStatusBadgeClass(
                  selected.status
                )}`}
              >
                {selected.status}
              </span>
            </dd>

          </dl>

        )}

      </Modal>

      {/* CANCEL BOOKING MODAL */}

      <Modal
        open={mode === "cancel"}
        title="Cancel Booking"
        className="max-w-md h-fit"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={closeModal}
            >
              No
            </Button>

            <Button onClick={cancel}>
              Yes
            </Button>
          </>
        }
      >

        <p>
          Are you sure you want to cancel this booking?
        </p>

      </Modal>

      {/* EDIT BOOKING MODAL */}

      <Modal
        open={mode === "edit"}
        title="Edit Booking"
        footer={null}
        className="max-w-xl h-fit"
      >

        {selected &&
          !selected.isHotseat && (

            <form
              onSubmit={save}
              className="space-y-4"
            >

              <p className="text-xs text-slate-500">
                Booking{" "}
                {String(
                  selected.bookingId ?? ""
                ).replace(/^#/, "")}
              </p>

              {/* DATE */}

              <Field label="Date">

                <Input
                  type="date"
                  min={todayString}
                  value={
                    selected.bookingDate || ""
                  }
                  onChange={(e) =>
                    setSelected({
                      ...selected,
                      bookingDate:
                        e.target.value,
                    })
                  }
                />

              </Field>

              {/* TIME */}

              <div className="grid grid-cols-2 gap-3">

                <Field label="Start Time">

                  <Input
                    type="time"
                    min="10:00"
                    max="19:00"
                    value={formatDisplayTime(
                      selected.startTime
                    )}
                    onChange={(e) =>
                      setSelected({
                        ...selected,
                        startTime:
                          e.target.value,
                      })
                    }
                  />

                </Field>

                <Field label="End Time">

                  <Input
                    type="time"
                    min="10:00"
                    max="19:00"
                    value={formatDisplayTime(
                      selected.endTime
                    )}
                    onChange={(e) =>
                      setSelected({
                        ...selected,
                        endTime:
                          e.target.value,
                      })
                    }
                  />

                </Field>

              </div>

              {/* OFFICE HOURS MESSAGE */}

              <p className="text-xs text-slate-500">
                Booking hours:{" "}
                <span className="font-semibold">
                  10:00 AM - 7:00 PM
                </span>
              </p>

              {/* PURPOSE */}

              <Field label="Purpose">

                <Input
                  value={
                    selected.purpose || ""
                  }
                  onChange={(e) =>
                    setSelected({
                      ...selected,
                      purpose:
                        e.target.value,
                    })
                  }
                />

              </Field>

              {/* BUTTONS */}

              <div className="flex justify-end gap-2 pt-2">

                <Button
                  type="button"
                  variant="secondary"
                  onClick={closeModal}
                >
                  Cancel
                </Button>

                <Button type="submit">
                  Save Changes
                </Button>

              </div>

            </form>

          )}

      </Modal>

    </div>
  );
}