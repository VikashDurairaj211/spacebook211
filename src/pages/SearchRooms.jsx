import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { searchRooms } from "../api/rooms";
import { getMyBookings } from "../api/bookings";

import { Field, Input, Select } from "../components/common/Input";
import Button from "../components/common/Button";
import Card from "../components/common/Card";
import Loader from "../components/common/Loader";
import StatusTag from "../components/common/StatusTag";
import Modal from "../components/common/Modal";

const MODULES = [
  
  "Module 2",
  "Module 1",
];

const ROOM_TYPES = [
  { id: 1, name: "Conference" },
  { id: 2, name: "Training" },
  { id: 3, name: "Discussion" },
  { id: 4, name: "Meeting" },
];

const INITIAL_FILTERS = {
  module: "",
  roomTypeId: "",
  capacity: "",
  date: "",
  startTime: "",
  endTime: "",
};

export default function SearchRooms() {
  const [filters, setFilters] = useState(INITIAL_FILTERS);

  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState("");

  const [bookings, setBookings] = useState([]);

  const [resultsOpen, setResultsOpen] = useState(false);

  useEffect(() => {
    loadBookings();
  }, []);

  async function loadBookings() {
    try {
      const data = await getMyBookings();
      setBookings(data);
    } catch {
      setBookings([]);
    }
  }

  const canChooseType = Boolean(filters.module);

  const canChooseDetails = canChooseType && Boolean(filters.roomTypeId);

  const canSearch =
    canChooseDetails &&
    filters.date &&
    filters.startTime &&
    filters.endTime &&
    Number(filters.capacity) > 0;

  function updateFilter(key, value) {
    setFilters((current) => {
      const next = {
        ...current,
        [key]: value,
      };

      if (key === "module") {
        next.roomTypeId = "";
      }

      return next;
    });

    setError("");
  }

  async function handleSearch(e) {
    e.preventDefault();

    if (!canSearch) {
      setError("Complete all fields.");
      return;
    }

    if (filters.startTime >= filters.endTime) {
      setError("End time must be after start time.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const data = await searchRooms({
        module: filters.module,
        roomTypeId: Number(filters.roomTypeId),
        participantCount: Number(filters.capacity),
        facilityIds: [],
        bookingDate: filters.date,
        startTime: filters.startTime + ":00",
        endTime: filters.endTime + ":00",
      });

      setResults(data);
      setResultsOpen(true);
      setSearched(true);
    } catch (err) {
      console.error(err);
      setError("Unable to search rooms.");
    } finally {
      setLoading(false);
    }
  }

  function roomDetailsLink(roomId) {
    const params = new URLSearchParams({
      roomId,
      date: filters.date,
      startTime: filters.startTime,
      endTime: filters.endTime,
      attendees: filters.capacity,
    });

    return `/room-details?${params.toString()}`;
  }

  function bookRoomLink(roomId) {
    const params = new URLSearchParams({
      roomId,
      date: filters.date,
      startTime: filters.startTime,
      endTime: filters.endTime,
      attendees: filters.capacity,
    });

    return `/book-room?${params.toString()}`;
  }

  // Helper function matching the exact color scheme used previously
  const getStatusBadgeClass = (status) => {
    const s = status?.toLowerCase() || "";
    if (s === "approved" || s === "confirmed" || s === "available") {
      return "bg-[#658362] text-white"; // Muted green matching the design
    }
    if (s === "pending") {
      return "bg-[#E09F3E] text-white"; // Warm amber/orange matching the design
    }
    if (s === "rejected" || s === "cancelled") {
      return "bg-[#B85450] text-white"; // Terracotta red matching the design
    }
    return "bg-slate-500 text-white";
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold">Search Rooms</h1>
        <p className="mt-2 text-slate-600">
          Set your meeting requirements to find available rooms.
        </p>
      </div>

      <Card>
        <form onSubmit={handleSearch} className="space-y-5">
          {/* 6 Fields mapped into a clean 3-column grid */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {/* 1. SELECT MODULE */}
            <Field label="1. Select Module">
              <Select
                value={filters.module}
                onChange={(e) => updateFilter("module", e.target.value)}
              >
                <option value="">Select Module</option>
                {MODULES.map((module) => (
                  <option key={module} value={module}>
                    {module}
                  </option>
                ))}
              </Select>
            </Field>

            {/* 2. SELECT ROOM TYPE */}
            <Field label="2. Select Room Type">
              <Select
                disabled={!canChooseType}
                value={filters.roomTypeId}
                onChange={(e) => updateFilter("roomTypeId", e.target.value)}
              >
                <option value="">
                  {canChooseType ? "Select Room Type" : "Choose Module First"}
                </option>
                {ROOM_TYPES.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.name}
                  </option>
                ))}
              </Select>
            </Field>

            {/* 3. NUMBER OF PARTICIPANTS */}
            <Field label="3. Number of Participants">
              <Input
                type="number"
                min="1"
                disabled={!canChooseDetails}
                value={filters.capacity}
                placeholder="Enter count"
                onChange={(e) => updateFilter("capacity", e.target.value)}
              />
            </Field>

            {/* 4. BOOKING DATE */}
            <Field label="4. Booking Date">
              <Input
                type="date"
                min={new Date().toISOString().slice(0, 10)}
                disabled={!canChooseDetails}
                value={filters.date}
                onChange={(e) => updateFilter("date", e.target.value)}
              />
            </Field>

            {/* 5. START TIME */}
            <Field label="5. Start Time">
              <Input
                type="time"
                disabled={!filters.date}
                value={filters.startTime}
                onChange={(e) => updateFilter("startTime", e.target.value)}
              />
            </Field>

            {/* 6. END TIME */}
            <Field label="6. End Time">
              <Input
                type="time"
                disabled={!filters.startTime}
                value={filters.endTime}
                onChange={(e) => updateFilter("endTime", e.target.value)}
              />
            </Field>
          </div>

          {error && (
            <div className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <Button type="submit" disabled={!canSearch || loading}>
            {loading ? "Searching..." : "Search Available Rooms"}
          </Button>
        </form>
      </Card>

      {/* My Bookings Preview Card */}
      <Card className="overflow-hidden p-0">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold">My Bookings</h2>
            <p className="text-sm text-slate-500">
              Your recent workspace reservations.
            </p>
          </div>

          <Link
            to="/my-bookings"
            className="text-sm font-medium text-blue-600 hover:underline"
          >
            View All
          </Link>
        </div>

        {bookings.length === 0 ? (
          <div className="p-5 text-sm text-slate-500">No bookings found.</div>
        ) : (
          <div className="divide-y">
            {bookings.slice(0, 3).map((booking) => (
              <div
                key={booking.bookingId}
                className="flex items-center justify-between p-4"
              >
                <div>
                  <p className="font-semibold">{booking.roomName}</p>
                  <p className="text-sm text-slate-500">
                    {booking.bookingDate}
                    {" • "}
                    {booking.startTime
                      ? booking.startTime.substring(0, 5)
                      : ""}
                    {" - "}
                    {booking.endTime ? booking.endTime.substring(0, 5) : ""}
                  </p>
                </div>

                <span
                  className={`inline-block w-28 py-1 rounded-full text-xs font-bold tracking-wider uppercase text-center ${getStatusBadgeClass(
                    booking.status
                  )}`}
                >
                  {booking.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>

      {loading && <Loader label="Searching available rooms..." />}

      {/* Results Modal */}
      <Modal
        open={resultsOpen && !loading}
        title="Available Rooms"
        footer={
          <Button variant="secondary" onClick={() => setResultsOpen(false)}>
            Close
          </Button>
        }
      >
        <p className="mb-4 text-sm text-slate-600">
          {results.length} room{results.length !== 1 ? "s" : ""} found.
        </p>

        {results.length === 0 ? (
          <p className="text-sm text-slate-500">
            No rooms are available for the selected criteria.
          </p>
        ) : (
          <div className="max-h-[60vh] space-y-4 overflow-y-auto pr-1">
            {results.map((room) => (
              <Card key={room.roomId}>
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-semibold">{room.roomName}</h3>
                    <p className="text-sm text-slate-500">{room.module}</p>
                  </div>

                  <span
                    className={`inline-block w-28 py-1 rounded-full text-xs font-bold tracking-wider uppercase text-center ${getStatusBadgeClass(
                      "Available"
                    )}`}
                  >
                    Available
                  </span>
                </div>

                <div className="mt-4 space-y-2 text-sm">
                  <p>
                    <span className="font-medium">Room Type:</span>{" "}
                    {room.roomType}
                  </p>
                  <p>
                    <span className="font-medium">Capacity:</span>{" "}
                    {room.capacity}
                  </p>
                  <p>
                    <span className="font-medium">Facilities:</span>{" "}
                    {room.facilities?.length
                      ? room.facilities.join(", ")
                      : "None"}
                  </p>
                </div>

                <div className="mt-5 flex gap-3">
                  <Link
                    to={roomDetailsLink(room.roomId)}
                    className="flex-1"
                  >
                    <Button variant="secondary" className="w-full">
                      View Details
                    </Button>
                  </Link>

                  <Link
                    to={bookRoomLink(room.roomId)}
                    className="flex-1"
                    onClick={() => setResultsOpen(false)}
                  >
                    <Button className="w-full">Book Now</Button>
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        )}
      </Modal>

      {/* Results Grid below form */}
      {searched && !loading && !resultsOpen && results.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {results.map((room) => (
            <Card key={room.roomId}>
              <div className="mb-3 flex items-start justify-between">
                <div>
                  <h3 className="font-semibold">{room.roomName}</h3>
                  <p className="text-sm text-slate-500">{room.module}</p>
                </div>

                <span
                  className={`inline-block w-28 py-1 rounded-full text-xs font-bold tracking-wider uppercase text-center ${getStatusBadgeClass(
                    "Available"
                  )}`}
                >
                  Available
                </span>
              </div>

              <p className="text-sm">
                <strong>Room Type:</strong> {room.roomType}
              </p>
              <p className="text-sm">
                <strong>Capacity:</strong> {room.capacity}
              </p>
              <p className="mb-4 text-sm">
                <strong>Facilities:</strong>{" "}
                {room.facilities?.length
                  ? room.facilities.join(", ")
                  : "None"}
              </p>

              <Link to={bookRoomLink(room.roomId)}>
                <Button className="w-full">Book Room</Button>
              </Link>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}