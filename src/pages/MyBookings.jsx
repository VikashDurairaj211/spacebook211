import { useEffect, useState } from "react";

import {
  getMyBookings,
  cancelBooking,
  updateBooking,
} from "../api/bookings";
import { getMyHotseatBookings, cancelHotseatBooking } from "../api/hotseat";

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

      // Load normal room bookings and Hotseat bookings separately.
      const [roomResult, hotseatResult] = await Promise.allSettled([
        getMyBookings(),
        getMyHotseatBookings(),
      ]);

      let roomBookings = [];
      let hotseatBookings = [];

      if (roomResult.status === "fulfilled") {
        const data = roomResult.value;

        console.log("My Room Bookings API Response:", data);

        const bookingList = Array.isArray(data)
          ? data
          : data?.bookings || [];

        roomBookings = bookingList.map((booking) => ({
          ...booking,
          roomId: getRoomId(booking),
          isHotseat: false,
        }));
      } else {
        console.error("Room bookings error:", roomResult.reason);
      }

      if (hotseatResult.status === "fulfilled") {
        const data = hotseatResult.value;

        console.log("My Hotseat Bookings API Response:", data);

        const bookingList = Array.isArray(data)
          ? data
          : data?.bookings || [];

        hotseatBookings = bookingList.map((booking) => ({
          ...booking,

          // Keep the original Hotseat ID.
          bookingId:
            booking.bookingId ??
            booking.id ??
            booking.Id,

          // Mark this row so room-booking APIs are never used for it.
          isHotseat: true,

          // Hotseat uses "date" instead of "bookingDate".
          bookingDate:
            booking.bookingDate ??
            booking.date ??
            "",

          // Hotseat has an expected check-in time instead of a
          // room booking start/end range.
          startTime:
            booking.startTime ??
            booking.expectedCheckIn ??
            "",

          endTime:
            booking.endTime ??
            booking.expectedCheckIn ??
            "",

          // Display the seat as the workspace/room column.
          roomName:
            booking.roomName ||
            (booking.seatNumber
              ? `Hot Seat ${booking.seatNumber}`
              : "Hot Seat"),

          // Hotseat API already returns module.
          module:
            booking.module ??
            booking.Module ??
            "-",

          // Give Hotseat bookings a clear purpose.
          purpose:
            booking.purpose ||
            "Hotseat Booking",

          // Hotseat has no room ID.
          roomId: null,

          // Preserve the useful Hotseat fields.
          seatId: booking.seatId,
          seatNumber: booking.seatNumber,
          expectedCheckIn:
            booking.expectedCheckIn ??
            booking.expectedCheckInTime ??
            "",
          checkInTime: booking.checkInTime ?? null,
          releasedOn: booking.releasedOn ?? null,
        }));
      } else {
        console.error("Hotseat bookings error:", hotseatResult.reason);
      }

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
  // CHECK WHETHER BOOKING CAN BE EDITED / CANCELLED
  // =====================================================

  const canModifyBooking = (booking) => {
    const status = booking?.status?.toLowerCase() || "";

    if (status === "cancelled" || status === "rejected") {
      return false;
    }

    if (!booking?.bookingDate || !booking?.startTime) {
      return false;
    }

    const bookingStart = new Date(
      `${booking.bookingDate}T${booking.startTime}`
    );

    return bookingStart > new Date();
  };

  // =====================================================
  // GET DURATION
  // =====================================================

  const getDuration = (booking) => {
    if (!booking) return "-";

    // Case A: Hot Seat session completed (checkInTime & releasedOn available)
    if (booking.isHotseat) {
      if (booking.checkInTime && booking.releasedOn) {
        const start = new Date(booking.checkInTime);
        const end = new Date(booking.releasedOn);
        const diffMins = Math.round((end - start) / (1000 * 60));

        if (diffMins <= 0) return "-";
        const hrs = Math.floor(diffMins / 60);
        const mins = diffMins % 60;
        return hrs > 0 ? `${hrs}h${mins > 0 ? ` ${mins}m` : ""}` : `${mins}m`;
      }
      return "Full Day";
    }

    // Case B: Room Bookings with Start & End Time
    const start = booking.startTime;
    const end = booking.endTime;

    if (!start || !end) return "-";

    const cleanTime = (t) =>
      String(t).includes("T") ? String(t).split("T")[1].substring(0, 5) : String(t).substring(0, 5);

    const startTimeStr = cleanTime(start);
    const endTimeStr = cleanTime(end);

    const [startH, startM] = startTimeStr.split(":").map(Number);
    const [endH, endM] = endTimeStr.split(":").map(Number);

    if (isNaN(startH) || isNaN(endH)) return "-";

    let diffMins = endH * 60 + (endM || 0) - (startH * 60 + (startM || 0));
    if (diffMins < 0) diffMins += 24 * 60;

    const hours = Math.floor(diffMins / 60);
    const minutes = diffMins % 60;

    if (hours > 0 && minutes > 0) return `${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h`;
    return `${minutes}m`;
  };

  // =====================================================
  // STATUS BADGE
  // =====================================================

  const getStatusBadgeClass = (status) => {
    const s = status?.toLowerCase() || "";

    if (s === "approved" || s === "confirmed" || s === "available") {
      return "bg-[#658362] text-white";
    }

    if (s === "pending") {
      return "bg-[#E09F3E] text-white";
    }

    if (s === "rejected" || s === "cancelled" || s === "expired") {
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
    // Hotseat bookings use their own API and are not editable
    // through the normal room-booking update endpoint.
    if (booking?.isHotseat) {
      toast.addToast({
        type: "error",
        title: "Hotseat bookings cannot be edited here.",
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
        await cancelHotseatBooking(selected.bookingId);

        toast.addToast({
          type: "success",
          title: "Hotseat booking cancelled successfully.",
        });
      } else {
        await cancelBooking(selected.bookingId);

        toast.addToast({
          type: "success",
          title: "Booking cancelled successfully.",
        });
      }

      closeModal();
      await load();
    } catch (err) {
      console.error("Cancel booking error:", err);
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
  // FORMAT TIME
  // =====================================================

  // Hotseat can return a normal time such as 10:00:00
  // or an ISO DateTime such as 2026-08-20T10:00:00.
  // Always display only HH:mm in the UI.
  const formatDisplayTime = (time) => {
    if (!time) return "";

    const value = String(time);

    if (value.includes("T")) {
      const timePart = value.split("T")[1] || "";
      return timePart.substring(0, 5);
    }

    return value.substring(0, 5);
  };

  // Used only when sending normal room-booking updates.
  const formatApiTime = (time) => {
    if (!time) return "";

    const value = String(time);

    if (value.includes("T")) {
      const timePart = value.split("T")[1] || "";
      return timePart.length === 5
        ? `${timePart}:00`
        : timePart;
    }

    return value.length === 5
      ? `${value}:00`
      : value;
  };

  // =====================================================
  // SAVE / UPDATE BOOKING
  // =====================================================

  async function save(e) {
    e.preventDefault();
    if (!selected) return;

    const roomId = getRoomId(selected);

    if (!selected.bookingId) {
      toast.addToast({
        type: "error",
        title: "Booking ID is missing.",
      });
      return;
    }

    if (roomId === null || roomId === undefined || roomId === "") {
      toast.addToast({
        type: "error",
        title: "Room ID is missing from this booking.",
      });
      return;
    }

    if (!selected.bookingDate) {
      toast.addToast({
        type: "error",
        title: "Booking date is required.",
      });
      return;
    }

    if (!selected.startTime || !selected.endTime) {
      toast.addToast({
        type: "error",
        title: "Start time and end time are required.",
      });
      return;
    }

    const startTime = formatApiTime(selected.startTime);
    const endTime = formatApiTime(selected.endTime);

    if (startTime >= endTime) {
      toast.addToast({
        type: "error",
        title: "End time must be after start time.",
      });
      return;
    }

    const payload = {
      roomId: Number(roomId),
      bookingDate: selected.bookingDate,
      startTime,
      endTime,
      purpose: selected.purpose?.trim() || "Meeting",
      participantCount: Number(selected.participantCount || 1),
    };

    try {
      await updateBooking(selected.bookingId, payload);

      toast.addToast({
        type: "success",
        title: "Booking updated successfully.",
      });

      closeModal();
      await load();
    } catch (err) {
      console.error("Update booking error:", err);
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

  return (
    <div className="space-y-6">
      {/* PAGE HEADER */}
      <div>
        <h1 className="text-4xl font-semibold">My Bookings</h1>
        <p className="mt-2 text-slate-500">
          View, edit or cancel your workspace reservations.
        </p>
      </div>

      {/* BOOKINGS TABLE */}
      <Card className="overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left font-mono text-[11px] uppercase tracking-wider text-slate">
              <th className="px-3 py-3">ID</th>
              <th className="px-3 py-3">Room</th>
              <th className="px-3 py-3">Module</th>
              <th className="px-3 py-3">Purpose</th>
              <th className="px-3 py-3">Date</th>
              <th className="px-3 py-3">Time</th>
              <th className="px-3 py-3">Duration</th>
              <th className="px-3 py-3 text-center">Status</th>
              <th className="px-3 py-3 text-center">Actions</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan={9} className="py-8 text-center text-slate-500">
                  Loading bookings...
                </td>
              </tr>
            ) : bookings.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-8 text-center text-slate-500">
                  No bookings found.
                </td>
              </tr>
            ) : (
              bookings.map((b) => (
                <tr
                  key={b.bookingId}
                  className="border-b border-line last:border-0"
                >
                  <td className="px-3 py-4 font-mono whitespace-nowrap">
                    {b.bookingId}
                  </td>
                  <td className="px-3 py-4 whitespace-nowrap font-semibold">
                    {b.isHotseat
                      ? b.roomName || "Hot Seat"
                      : b.roomName || `Room ${getRoomId(b) || ""}`}
                  </td>
                  <td className="px-3 py-4 whitespace-nowrap text-slate-600">
                    {getBookingModule(b)}
                  </td>
                  <td className="max-w-[140px] truncate px-3 py-4">
                    {b.purpose && b.purpose.trim()
                      ? b.purpose
                      : "Reserved Workspace"}
                  </td>
                  <td className="px-3 py-4 whitespace-nowrap">
                    {b.bookingDate}
                  </td>
                  <td className="px-3 py-4 whitespace-nowrap text-slate-600">
                    {b.isHotseat
                      ? formatDisplayTime(b.startTime)
                      : `${formatDisplayTime(b.startTime)} - ${formatDisplayTime(
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
                      onClick={() => handleView(b)}
                    >
                      View
                    </button>

                    {canModifyBooking(b) && (
                      <>
                        {!b.isHotseat && (
                          <button
                            className="mr-2.5 text-sm font-bold text-emerald-600 hover:text-emerald-800 hover:underline"
                            onClick={() => handleEdit(b)}
                          >
                            Edit
                          </button>
                        )}
                        <button
                          className="text-sm font-bold text-red-600 hover:text-red-800 hover:underline"
                          onClick={() => {
                            setSelected({
                              ...b,
                              roomId: getRoomId(b),
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
        footer={<Button onClick={closeModal}>Back</Button>}
        className="max-w-lg h-fit"
      >
        {selected && (
          <dl className="grid grid-cols-2 gap-4 text-sm">
            <dt className="font-medium">Booking ID</dt>
            <dd>{selected.bookingId}</dd>

            <dt className="font-medium">
              {selected.isHotseat ? "Seat" : "Room"}
            </dt>
            <dd>
              {selected.isHotseat
                ? selected.seatNumber || selected.roomName || "Hot Seat"
                : selected.roomName || `Room ${getRoomId(selected) || ""}`}
            </dd>

            <dt className="font-medium">Module</dt>
            <dd>{getBookingModule(selected)}</dd>

            {selected.isHotseat && (
              <>
                <dt className="font-medium">Seat Number</dt>
                <dd>{selected.seatNumber || "-"}</dd>

                <dt className="font-medium">Check-in Time</dt>
                <dd>
                  {selected.expectedCheckIn
                    ? formatDisplayTime(selected.expectedCheckIn)
                    : selected.startTime
                    ? formatDisplayTime(selected.startTime)
                    : "-"}
                </dd>
              </>
            )}

            <dt className="font-medium">Purpose</dt>
            <dd>{selected.purpose || "Reserved Workspace"}</dd>

            <dt className="font-medium">Date</dt>
            <dd>{selected.bookingDate}</dd>

            <dt className="font-medium">Time</dt>
            <dd>
              {selected.isHotseat
                ? formatDisplayTime(selected.startTime)
                : `${formatDisplayTime(selected.startTime)} - ${formatDisplayTime(
                    selected.endTime
                  )}`}
            </dd>

            <dt className="font-medium">Duration</dt>
            <dd>{getDuration(selected)}</dd>

            <dt className="font-medium">Status</dt>
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
            <Button variant="secondary" onClick={closeModal}>
              No
            </Button>
            <Button onClick={cancel}>Yes</Button>
          </>
        }
      >
        <p>Are you sure you want to cancel this booking?</p>
      </Modal>

      {/* EDIT BOOKING MODAL */}
      <Modal
        open={mode === "edit"}
        title="Edit Booking"
        footer={null}
        className="max-w-xl h-fit"
      >
        {selected && !selected.isHotseat && (
          <form onSubmit={save} className="space-y-4">
            <p className="text-xs text-slate-500">
              Booking #{selected.bookingId}
            </p>

            <Field label="Date">
              <Input
                type="date"
                value={selected.bookingDate || ""}
                onChange={(e) =>
                  setSelected({
                    ...selected,
                    bookingDate: e.target.value,
                  })
                }
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Start Time">
                <Input
                  type="time"
                  value={
                    formatDisplayTime(selected.startTime)
                  }
                  onChange={(e) =>
                    setSelected({
                      ...selected,
                      startTime: e.target.value,
                    })
                  }
                />
              </Field>

              <Field label="End Time">
                <Input
                  type="time"
                  value={
                    formatDisplayTime(selected.endTime)
                  }
                  onChange={(e) =>
                    setSelected({
                      ...selected,
                      endTime: e.target.value,
                    })
                  }
                />
              </Field>
            </div>

            <Field label="Purpose">
              <Input
                value={selected.purpose || ""}
                onChange={(e) =>
                  setSelected({
                    ...selected,
                    purpose: e.target.value,
                  })
                }
              />
            </Field>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="secondary" onClick={closeModal}>
                Cancel
              </Button>
              <Button type="submit">Save Changes</Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}