import { useEffect, useState } from "react";

import {
  getMyBookings,
  cancelBooking,
  updateBooking,
} from "../api/bookings";

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

      const data = await getMyBookings();

      console.log("My Bookings API Response:", data);

      const bookingList = Array.isArray(data)
        ? data
        : data?.bookings || [];

      const normalizedBookings = bookingList.map((booking) => ({
        ...booking,
        roomId: getRoomId(booking),
      }));

      const sorted = [...normalizedBookings].sort(
        (a, b) =>
          Number(b.bookingId || 0) -
          Number(a.bookingId || 0)
      );

      setBookings(sorted);
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

  const getDuration = (start, end) => {
    if (!start || !end) return "-";

    const startDate = new Date(`2000-01-01T${start}`);
    const endDate = new Date(`2000-01-01T${end}`);

    const milliseconds = endDate - startDate;
    if (milliseconds < 0) return "-";

    const hours = milliseconds / 3600000;
    return Number.isInteger(hours) ? `${hours}h` : `${hours.toFixed(2)}h`;
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

    if (s === "rejected" || s === "cancelled") {
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
      await cancelBooking(selected.bookingId);

      toast.addToast({
        type: "success",
        title: "Booking cancelled successfully.",
      });

      closeModal();
      await load();
    } catch (err) {
      console.error("Cancel booking error:", err);
      toast.addToast({
        type: "error",
        title:
          err.response?.data?.message ||
          err.message ||
          "Unable to cancel booking.",
      });
    }
  }

  // =====================================================
  // FORMAT TIME
  // =====================================================

  const formatTime = (time) => {
    if (!time) return "";
    return time.length === 5 ? `${time}:00` : time;
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

    const startTime = formatTime(selected.startTime);
    const endTime = formatTime(selected.endTime);

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
                    {b.roomName || `Room ${getRoomId(b) || ""}`}
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
                    {b.startTime ? b.startTime.substring(0, 5) : ""} -{" "}
                    {b.endTime ? b.endTime.substring(0, 5) : ""}
                  </td>
                  <td className="px-3 py-4 whitespace-nowrap">
                    {getDuration(b.startTime, b.endTime)}
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
                        <button
                          className="mr-2.5 text-sm font-bold text-emerald-600 hover:text-emerald-800 hover:underline"
                          onClick={() => handleEdit(b)}
                        >
                          Edit
                        </button>
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

            <dt className="font-medium">Room</dt>
            <dd>{selected.roomName || `Room ${getRoomId(selected) || ""}`}</dd>

            <dt className="font-medium">Module</dt>
            <dd>{getBookingModule(selected)}</dd>

            <dt className="font-medium">Purpose</dt>
            <dd>{selected.purpose || "Reserved Workspace"}</dd>

            <dt className="font-medium">Date</dt>
            <dd>{selected.bookingDate}</dd>

            <dt className="font-medium">Time</dt>
            <dd>
              {selected.startTime ? selected.startTime.substring(0, 5) : ""} -{" "}
              {selected.endTime ? selected.endTime.substring(0, 5) : ""}
            </dd>

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
        {selected && (
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
                    selected.startTime
                      ? selected.startTime.substring(0, 5)
                      : ""
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
                    selected.endTime
                      ? selected.endTime.substring(0, 5)
                      : ""
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