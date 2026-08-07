import { useEffect, useState } from "react";
import {
  getMyBookings,
  cancelBooking,
  updateBooking,
} from "../api/bookings";

import Card from "../components/common/Card";
import StatusTag from "../components/common/StatusTag";
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
      // Ensure data is sorted by newest bookingId first
      const sorted = (data || []).sort((a, b) => b.bookingId - a.bookingId);
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
    if (booking.status === "Cancelled" || booking.status === "Rejected") {
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
    return `${hours}h`;
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
        title: err.response?.data?.message || err.message || "Unable to cancel booking.",
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
      const formatTime = (t) => (t && t.length === 5 ? `${t}:00` : t);

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
        title: err.response?.data?.message || "Unable to update booking.",
      });
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl font-semibold">My Bookings</h1>
        <p className="text-slate-500 mt-2">
          View, reschedule or cancel your workspace reservations.
        </p>
      </div>

      <Card className="overflow-x-auto p-0">
        <table className="w-full min-w-[760px] text-sm">
          <thead>
            <tr className="border-b border-line text-left font-mono text-[11px] uppercase tracking-wider text-slate">
              <th className="px-4 py-3">Booking ID</th>
              <th className="px-4 py-3">Room</th>
              <th className="px-4 py-3">Purpose</th>
              <th className="px-4 py-3">Date / Time</th>
              <th className="px-4 py-3">Duration</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-slate-500">
                  Loading bookings...
                </td>
              </tr>
            ) : bookings.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-slate-500">
                  No bookings found.
                </td>
              </tr>
            ) : (
              bookings.map((b) => (
                <tr
                  key={b.bookingId}
                  className="border-b border-line last:border-0"
                >
                  <td className="px-4 py-4 font-mono">{b.bookingId}</td>

                  <td className="px-4 py-4">
                    <div className="font-semibold">
                      {b.roomName || `Room ${b.roomId}`}
                    </div>
                  </td>

                  <td className="px-4 py-4">
                    {b.purpose && b.purpose.trim() ? b.purpose : "Reserved Workspace"}
                  </td>

                  <td className="px-4 py-4">
                    <div>{b.bookingDate}</div>
                    <div className="text-xs text-slate-500">
                      {b.startTime ? b.startTime.substring(0, 5) : ""} -{" "}
                      {b.endTime ? b.endTime.substring(0, 5) : ""}
                    </div>
                  </td>

                  <td className="px-4 py-4">
                    {getDuration(b.startTime, b.endTime)}
                  </td>

                  <td className="px-4 py-4">
                    <StatusTag status={b.status} />
                  </td>

                  <td className="px-4 py-4 whitespace-nowrap">
                    <button
                      className="mr-3 text-blue-600 hover:underline font-medium"
                      onClick={() => {
                        setSelected(b);
                        setMode("view");
                      }}
                    >
                      View
                    </button>

                    {isUpcomingBooking(b) && (
                      <>
                        <button
                          className="mr-3 text-blue-600 hover:underline font-medium"
                          onClick={() => {
                            setSelected({ ...b });
                            setMode("edit");
                          }}
                        >
                          Edit
                        </button>

                        <button
                          className="text-red-600 hover:underline font-medium"
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
        footer={<Button onClick={() => setMode(null)}>Back</Button>}
      >
        {selected && (
          <dl className="grid grid-cols-2 gap-4 text-sm">
            <dt className="font-medium">Booking ID</dt>
            <dd>{selected.bookingId}</dd>

            <dt className="font-medium">Room</dt>
            <dd>{selected.roomName}</dd>

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
              <StatusTag status={selected.status} />
            </dd>
          </dl>
        )}
      </Modal>

      {/* Cancel Booking Modal */}
      <Modal
        open={mode === "cancel"}
        title="Cancel Booking"
        footer={
          <>
            <Button variant="secondary" onClick={() => setMode(null)}>
              No
            </Button>
            <Button onClick={cancel}>Yes</Button>
          </>
        }
      >
        <p>Are you sure you want to cancel this booking?</p>
      </Modal>

      {/* Edit Booking Modal */}
      <Modal open={mode === "edit"} title="Edit Booking" footer={null}>
        {selected && (
          <form onSubmit={save} className="space-y-4">
            <p className="text-xs text-slate-500">
              Booking #{selected.bookingId}
            </p>

            <Field label="Date">
              <Input
                type="date"
                value={selected.bookingDate}
                onChange={(e) =>
                  setSelected({ ...selected, bookingDate: e.target.value })
                }
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Start Time">
                <Input
                  type="time"
                  value={
                    selected.startTime ? selected.startTime.substring(0, 5) : ""
                  }
                  onChange={(e) =>
                    setSelected({ ...selected, startTime: e.target.value })
                  }
                />
              </Field>

              <Field label="End Time">
                <Input
                  type="time"
                  value={
                    selected.endTime ? selected.endTime.substring(0, 5) : ""
                  }
                  onChange={(e) =>
                    setSelected({ ...selected, endTime: e.target.value })
                  }
                />
              </Field>
            </div>

            <Field label="Purpose">
              <Input
                value={selected.purpose || ""}
                onChange={(e) =>
                  setSelected({ ...selected, purpose: e.target.value })
                }
              />
            </Field>

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setMode(null)}
              >
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