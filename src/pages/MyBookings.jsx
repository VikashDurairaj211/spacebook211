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

  const load = async () => {
    try {
      setLoading(true);

      const data = await getMyBookings();

      const sorted = (data || []).sort(
        (a, b) => b.bookingId - a.bookingId
      );

      setBookings(sorted);
    } catch (err) {
      console.error("Error loading bookings:", err);
      setBookings([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const isUpcomingBooking = (booking) => {
    if (
      booking.status === "Cancelled" ||
      booking.status === "Rejected"
    ) {
      return false;
    }

    const today = new Date().toISOString().split("T")[0];

    return booking.bookingDate >= today;
  };

  const getDuration = (start, end) => {
    if (!start || !end) return "-";

    const startDate = new Date(`2000-01-01T${start}`);
    const endDate = new Date(`2000-01-01T${end}`);

    const hours = (endDate - startDate) / 3600000;

    return Number.isInteger(hours)
      ? `${hours}h`
      : `${hours.toFixed(2)}h`;
  };

  const getStatusBadgeClass = (status) => {
    const s = status?.toLowerCase() || "";

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

    if (s === "rejected" || s === "cancelled") {
      return "bg-[#B85450] text-white";
    }

    return "bg-slate-500 text-white";
  };

  async function cancel() {
    if (!selected) return;

    try {
      await cancelBooking(selected.bookingId);

      toast.addToast({
        type: "success",
        title: "Booking cancelled successfully.",
      });

      setMode(null);
      load();
    } catch (err) {
      toast.addToast({
        type: "error",
        title:
          err.response?.data?.message ||
          err.message ||
          "Unable to cancel booking.",
      });
    }
  }

  async function save(e) {
    e.preventDefault();

    if (!selected) return;

    if (selected.startTime >= selected.endTime) {
      toast.addToast({
        type: "error",
        title: "End time must be after start time.",
      });

      return;
    }

    try {
      const formatTime = (t) =>
        t && t.length === 5 ? `${t}:00` : t;

      const payload = {
        bookingDate: selected.bookingDate,
        startTime: formatTime(selected.startTime),
        endTime: formatTime(selected.endTime),
        purpose: selected.purpose || "Meeting",
        participantCount: 1,
      };

      await updateBooking(selected.bookingId, payload);

      toast.addToast({
        type: "success",
        title: "Booking updated successfully.",
      });

      setMode(null);
      load();
    } catch (err) {
      toast.addToast({
        type: "error",
        title:
          err.response?.data?.message ||
          "Unable to update booking.",
      });
    }
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-4xl font-semibold">
          My Bookings
        </h1>

        <p className="mt-2 text-slate-500">
          View, reschedule or cancel your workspace reservations.
        </p>
      </div>

      {/* Bookings Table */}
      <Card className="overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left font-mono text-[11px] uppercase tracking-wider text-slate">
              <th className="px-3 py-3">ID</th>
              <th className="px-3 py-3">Room</th>
              <th className="px-3 py-3">Purpose</th>
              <th className="px-3 py-3">Date</th>
              <th className="px-3 py-3">Time</th>
              <th className="px-3 py-3">Duration</th>
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
                  colSpan={8}
                  className="py-8 text-center text-slate-500"
                >
                  Loading bookings...
                </td>
              </tr>
            ) : bookings.length === 0 ? (
              <tr>
                <td
                  colSpan={8}
                  className="py-8 text-center text-slate-500"
                >
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
                    {b.roomName || `Room ${b.roomId}`}
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
                    {b.startTime
                      ? b.startTime.substring(0, 5)
                      : ""}
                    {" - "}
                    {b.endTime
                      ? b.endTime.substring(0, 5)
                      : ""}
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
                    {/* View */}
                    <button
                      className="mr-2.5 text-sm font-bold text-sky-600 hover:text-sky-800 hover:underline"
                      onClick={() => {
                        setSelected(b);
                        setMode("view");
                      }}
                    >
                      View
                    </button>

                    {/* Edit and Cancel */}
                    {isUpcomingBooking(b) && (
                      <>
                        <button
                          className="mr-2.5 text-sm font-bold text-emerald-600 hover:text-emerald-800 hover:underline"
                          onClick={() => {
                            setSelected({ ...b });
                            setMode("edit");
                          }}
                        >
                          Edit
                        </button>

                        <button
                          className="text-sm font-bold text-red-600 hover:text-red-800 hover:underline"
                          onClick={() => {
                            setSelected(b);
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

      {/* View Booking Modal */}
      <Modal
        open={mode === "view"}
        title="Booking Details"
        footer={
          <Button onClick={() => setMode(null)}>
            Back
          </Button>
        }
        className="max-w-lg h-fit"
      >
        {selected && (
          <dl className="grid grid-cols-2 gap-4 text-sm">
            <dt className="font-medium">Booking ID</dt>
            <dd>{selected.bookingId}</dd>

            <dt className="font-medium">Room</dt>
            <dd>{selected.roomName}</dd>

            <dt className="font-medium">Purpose</dt>
            <dd>
              {selected.purpose || "Reserved Workspace"}
            </dd>

            <dt className="font-medium">Date</dt>
            <dd>{selected.bookingDate}</dd>

            <dt className="font-medium">Time</dt>
            <dd>
              {selected.startTime
                ? selected.startTime.substring(0, 5)
                : ""}
              {" - "}
              {selected.endTime
                ? selected.endTime.substring(0, 5)
                : ""}
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

      {/* Cancel Booking Modal */}
      <Modal
        open={mode === "cancel"}
        title="Cancel Booking"
        className="max-w-md h-fit"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setMode(null)}
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

      {/* Edit Booking Modal */}
      <Modal
        open={mode === "edit"}
        title="Edit Booking"
        footer={null}
        className="max-w-xl h-fit"
      >
        {selected && (
          <form
            onSubmit={save}
            className="space-y-4"
          >
            <p className="text-xs text-slate-500">
              Booking #{selected.bookingId}
            </p>

            {/* Date */}
            <Field label="Date">
              <Input
                type="date"
                value={selected.bookingDate}
                onChange={(e) =>
                  setSelected({
                    ...selected,
                    bookingDate: e.target.value,
                  })
                }
              />
            </Field>

            {/* Start and End Time */}
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

            {/* Purpose */}
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

            {/* Buttons */}
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setMode(null)}
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