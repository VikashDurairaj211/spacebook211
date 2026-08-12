import { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";

import { searchRooms } from "../api/rooms";
import { getMyBookings } from "../api/bookings";

import { Field, Input, Select } from "../components/common/Input";
import Button from "../components/common/Button";
import Card from "../components/common/Card";
import Loader from "../components/common/Loader";
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

// =====================================================
// SCROLLABLE TIME PICKER COMPONENT (HOURS & MINUTES)
// =====================================================
function ScrollableTimePicker({ label, value, onChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  const [hours = "09", minutes = "00"] = value ? value.split(":") : ["09", "00"];

  const hoursList = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
  const minutesList = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, "0")); // Full 00 to 59 minutes scroll

  const handleTimeChange = (newHours, newMinutes) => {
    onChange(`${newHours}:${newMinutes}`);
  };

  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={containerRef}>
      <Field label={label}>
        <div
          onClick={() => setIsOpen(!isOpen)}
          className="flex h-10 w-full cursor-pointer items-center justify-between rounded-lg border border-slate-300 bg-white px-3 text-sm shadow-sm hover:border-slate-400"
        >
          <span className={value ? "text-slate-900" : "text-slate-400"}>
            {value ? `${hours}:${minutes}` : "Select time"}
          </span>
          <svg className="h-4 w-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </Field>

      {isOpen && (
        <div className="absolute z-50 mt-1 flex w-full rounded-lg border border-slate-200 bg-white shadow-lg">
          {/* Hours Column with Scroll */}
          <div className="max-h-52 flex-1 overflow-y-auto border-r border-slate-100 p-1 text-center scrollbar-thin">
            <div className="sticky top-0 bg-slate-50 py-1 text-xs font-semibold text-slate-500">Hour</div>
            {hoursList.map((h) => (
              <div
                key={h}
                onClick={() => handleTimeChange(h, minutes)}
                className={`cursor-pointer rounded px-2 py-1.5 text-sm hover:bg-blue-50 ${
                  hours === h ? "bg-blue-600 font-bold text-white" : "text-slate-700"
                }`}
              >
                {h}
              </div>
            ))}
          </div>

          {/* Minutes Column with Scroll */}
          <div className="max-h-52 flex-1 overflow-y-auto p-1 text-center scrollbar-thin">
            <div className="sticky top-0 bg-slate-50 py-1 text-xs font-semibold text-slate-500">Min</div>
            {minutesList.map((m) => (
              <div
                key={m}
                onClick={() => handleTimeChange(hours, m)}
                className={`cursor-pointer rounded px-2 py-1.5 text-sm hover:bg-blue-50 ${
                  minutes === m ? "bg-blue-600 font-bold text-white" : "text-slate-700"
                }`}
              >
                {m}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function SearchRooms() {
  const [filters, setFilters] = useState(INITIAL_FILTERS);

  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState("");

  const [bookings, setBookings] = useState([]);

  const [resultsOpen, setResultsOpen] = useState(false);

  const [selectedRoom, setSelectedRoom] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  // =====================================================
  // Load bookings
  // =====================================================

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

  // =====================================================
  // Search Validation
  // ANY ONE FIELD IS ENOUGH
  // =====================================================

  const hasAnySearchCriteria =
    Boolean(filters.module) ||
    Boolean(filters.roomTypeId) ||
    Boolean(filters.capacity) ||
    Boolean(filters.date) ||
    Boolean(filters.startTime) ||
    Boolean(filters.endTime);

  const canSearch = hasAnySearchCriteria;

  // =====================================================
  // Filter Dependencies
  // =====================================================

  const canChooseType = Boolean(filters.module);

  // =====================================================
  // Update Filter
  // =====================================================

  function updateFilter(key, value) {
    setFilters((current) => {
      const next = {
        ...current,
        [key]: value,
      };

      // Changing module clears room type
      if (key === "module") {
        next.roomTypeId = "";
      }

      // Changing date clears times
      if (key === "date") {
        next.startTime = "";
        next.endTime = "";
      }

      // Changing start time clears end time
      if (key === "startTime") {
        next.endTime = "";
      }

      return next;
    });

    setError("");
  }

  // =====================================================
  // Search Rooms
  // =====================================================

  async function handleSearch(e) {
    e.preventDefault();

    if (!canSearch) {
      setError("Please select or enter at least one search criteria.");
      return;
    }

    if (
      filters.startTime &&
      filters.endTime &&
      filters.startTime >= filters.endTime
    ) {
      setError("End time must be after start time.");
      return;
    }

    if (filters.date) {
      const selectedDate = new Date(`${filters.date}T00:00:00`);

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const maxAllowedDate = new Date();
      maxAllowedDate.setDate(maxAllowedDate.getDate() + 7);
      maxAllowedDate.setHours(0, 0, 0, 0);

      if (selectedDate < today) {
        setError("Cannot search rooms for past dates.");
        return;
      }

      if (selectedDate > maxAllowedDate) {
        setError("Rooms can only be searched up to 1 week in advance.");
        return;
      }
    }

    setLoading(true);
    setError("");

    try {
      const searchPayload = {
        module: filters.module || undefined,
        roomTypeId: filters.roomTypeId
          ? Number(filters.roomTypeId)
          : undefined,
        participantCount: filters.capacity
          ? Number(filters.capacity)
          : undefined,
        facilityIds: [],
        bookingDate: filters.date || undefined,
        startTime: filters.startTime
          ? `${filters.startTime}:00`
          : undefined,
        endTime: filters.endTime
          ? `${filters.endTime}:00`
          : undefined,
      };

      const data = await searchRooms(searchPayload);

      setResults(Array.isArray(data) ? data : []);
      setResultsOpen(true);
      setSearched(true);
    } catch (err) {
      console.error(err);

      setError(
        err?.response?.data?.message ||
          "Unable to search rooms."
      );
    } finally {
      setLoading(false);
    }
  }

  // =====================================================
  // Room Details
  // =====================================================

  function handleOpenDetails(room) {
    setSelectedRoom(room);
    setDetailsOpen(true);
  }

  // =====================================================
  // Booking Link
  // =====================================================

  function bookRoomLink(roomId) {
    const params = new URLSearchParams();

    params.set("roomId", roomId);

    if (filters.date) {
      params.set("date", filters.date);
    }

    if (filters.startTime) {
      params.set("startTime", filters.startTime);
    }

    if (filters.endTime) {
      params.set("endTime", filters.endTime);
    }

    if (filters.capacity) {
      params.set("attendees", filters.capacity);
    }

    return `/book-room?${params.toString()}`;
  }

  // =====================================================
  // Status Badge
  // =====================================================

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

    if (
      s === "rejected" ||
      s === "cancelled"
    ) {
      return "bg-[#B85450] text-white";
    }

    return "bg-slate-500 text-white";
  };

  // =====================================================
  // Date Limits
  // =====================================================

  const todayStr = new Date()
    .toISOString()
    .slice(0, 10);

  const maxDateObj = new Date();

  maxDateObj.setDate(
    maxDateObj.getDate() + 7
  );

  const maxDateStr = maxDateObj
    .toISOString()
    .slice(0, 10);

  // =====================================================
  // UI
  // =====================================================

  return (
    <div className="space-y-6">

      {/* =================================================
          HEADER
      ================================================= */}

      <div>
        <h1 className="font-display text-3xl font-bold">
          Search Rooms
        </h1>

        <p className="mt-2 text-slate-600">
          Enter any search criteria to find available rooms.
        </p>
      </div>

      {/* =================================================
          SEARCH FORM
      ================================================= */}

      <Card>
        <form
          onSubmit={handleSearch}
          className="space-y-5"
        >

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">

            {/* 1. MODULE */}

            <Field label="1. Select Module">

              <Select
                value={filters.module}
                onChange={(e) =>
                  updateFilter(
                    "module",
                    e.target.value
                  )
                }
              >
                <option value="">
                  Select Module
                </option>

                {MODULES.map((module) => (
                  <option
                    key={module}
                    value={module}
                  >
                    {module}
                  </option>
                ))}
              </Select>

            </Field>

            {/* 2. ROOM TYPE */}

            <Field label="2. Select Room Type">

              <Select
                disabled={!canChooseType}
                value={filters.roomTypeId}
                onChange={(e) =>
                  updateFilter(
                    "roomTypeId",
                    e.target.value
                  )
                }
              >

                <option value="">
                  {canChooseType
                    ? "Select Room Type"
                    : "Choose Module First"}
                </option>

                {ROOM_TYPES.map((type) => (
                  <option
                    key={type.id}
                    value={type.id}
                  >
                    {type.name}
                  </option>
                ))}

              </Select>

            </Field>

            {/* 3. PARTICIPANTS */}

            <Field label="3. Number of Participants">

              <Input
                type="number"
                min="1"
                value={filters.capacity}
                placeholder="Enter count"
                onChange={(e) =>
                  updateFilter(
                    "capacity",
                    e.target.value
                  )
                }
              />

            </Field>

            {/* 4. DATE */}

            <Field label="4. Booking Date">

              <Input
                type="date"
                min={todayStr}
                max={maxDateStr}
                value={filters.date}
                onChange={(e) =>
                  updateFilter(
                    "date",
                    e.target.value
                  )
                }
              />

            </Field>

            {/* 5. START TIME */}

            <ScrollableTimePicker
              label="5. Start Time"
              value={filters.startTime}
              onChange={(val) => updateFilter("startTime", val)}
            />

            {/* 6. END TIME */}

            <ScrollableTimePicker
              label="6. End Time"
              value={filters.endTime}
              onChange={(val) => updateFilter("endTime", val)}
            />

          </div>

          {/* ERROR */}

          {error && (
            <div className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* SEARCH BUTTON */}

          <Button
            type="submit"
            disabled={!canSearch || loading}
          >
            {loading
              ? "Searching..."
              : "Search Available Rooms"}
          </Button>

        </form>
      </Card>

      {/* =================================================
          MY BOOKINGS
      ================================================= */}

      <Card className="overflow-hidden p-0">

        <div className="flex items-center justify-between border-b border-line px-5 py-4">

          <div>

            <h2 className="text-lg font-semibold">
              My Bookings
            </h2>

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

          <div className="p-5 text-sm text-slate-500">
            No bookings found.
          </div>

        ) : (

          <div className="divide-y">

            {bookings
              .slice(0, 3)
              .map((booking) => (

                <div
                  key={booking.bookingId}
                  className="flex items-center justify-between p-4"
                >

                  <div>

                    <p className="font-semibold">
                      {booking.roomName}
                    </p>

                    <p className="text-sm text-slate-500">

                      {booking.bookingDate}

                      {" • "}

                      {booking.startTime
                        ? booking.startTime.substring(
                            0,
                            5
                          )
                        : ""}

                      {" - "}

                      {booking.endTime
                        ? booking.endTime.substring(
                            0,
                            5
                          )
                        : ""}

                    </p>

                  </div>

                  <span
                    className={`inline-block w-28 rounded-full py-1 text-center text-xs font-bold tracking-wider uppercase ${getStatusBadgeClass(
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

      {/* =================================================
          LOADER
      ================================================= */}

      {loading && (
        <Loader label="Searching available rooms..." />
      )}

      {/* =================================================
          RESULTS MODAL
      ================================================= */}

      <Modal
        open={resultsOpen && !loading}
        title="Available Rooms"
        footer={
          <Button
            variant="secondary"
            onClick={() =>
              setResultsOpen(false)
            }
          >
            Close
          </Button>
        }
      >

        <p className="mb-4 text-sm text-slate-600">

          {results.length} room
          {results.length !== 1 ? "s" : ""}
          {" "}found.

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

                    <h3 className="text-lg font-semibold">
                      {room.roomName}
                    </h3>

                    <p className="text-sm text-slate-500">
                      {room.module}
                    </p>

                  </div>

                  <span
                    className={`inline-block w-28 rounded-full py-1 text-center text-xs font-bold tracking-wider uppercase ${getStatusBadgeClass(
                      "Available"
                    )}`}
                  >
                    Available
                  </span>

                </div>

                <div className="mt-4 space-y-2 text-sm">

                  <p>
                    <span className="font-medium">
                      Room Type:
                    </span>{" "}
                    {room.roomType}
                  </p>

                  <p>
                    <span className="font-medium">
                      Capacity:
                    </span>{" "}
                    {room.capacity}
                  </p>

                  <p>
                    <span className="font-medium">
                      Facilities:
                    </span>{" "}
                    {room.facilities?.length
                      ? room.facilities.join(", ")
                      : "None"}
                  </p>

                </div>

                <div className="mt-5 flex gap-3">

                  <Button
                    variant="secondary"
                    className="flex-1"
                    onClick={() =>
                      handleOpenDetails(room)
                    }
                  >
                    View Details
                  </Button>

                  <Link
                    to={bookRoomLink(
                      room.roomId
                    )}
                    className="flex-1"
                    onClick={() =>
                      setResultsOpen(false)
                    }
                  >
                    <Button className="w-full">
                      Book Now
                    </Button>
                  </Link>

                </div>

              </Card>

            ))}

          </div>

        )}

      </Modal>

      {/* =================================================
          ROOM DETAILS MODAL
      ================================================= */}

      <Modal
        open={detailsOpen}
        title={
          selectedRoom
            ? selectedRoom.roomName
            : "Room Details"
        }
        footer={
          <Button
            variant="secondary"
            onClick={() =>
              setDetailsOpen(false)
            }
          >
            Back
          </Button>
        }
      >

        {selectedRoom && (

          <div className="space-y-4 text-sm">

            <div className="flex items-center justify-between">

              <div>

                <p className="text-base font-bold text-slate-900">
                  {selectedRoom.roomName}
                </p>

                <p className="text-slate-500">
                  {selectedRoom.module}
                </p>

              </div>

              <span
                className={`inline-block rounded-full px-3 py-1 text-center text-xs font-bold tracking-wider uppercase ${getStatusBadgeClass(
                  "Available"
                )}`}
              >
                Available
              </span>

            </div>

            <div className="space-y-2 border-t border-line pt-3">

              <p>
                <span className="font-medium text-slate-700">
                  Room Type:
                </span>{" "}
                {selectedRoom.roomType}
              </p>

              <p>
                <span className="font-medium text-slate-700">
                  Capacity:
                </span>{" "}
                {selectedRoom.capacity} People
              </p>

              <p>

                <span className="font-medium text-slate-700">
                  Facilities:
                </span>{" "}

                {selectedRoom.facilities?.length
                  ? selectedRoom.facilities.join(", ")
                  : "None"}

              </p>

              {filters.date && (
                <p>
                  <span className="font-medium text-slate-700">
                    Selected Date:
                  </span>{" "}
                  {filters.date}
                </p>
              )}

              {(filters.startTime ||
                filters.endTime) && (

                <p>

                  <span className="font-medium text-slate-700">
                    Time Slot:
                  </span>{" "}

                  {filters.startTime || "--:--"}
                  {" - "}
                  {filters.endTime || "--:--"}

                </p>

              )}

            </div>

            <div className="pt-2">

              <Link
                to={bookRoomLink(
                  selectedRoom.roomId
                )}
                onClick={() => {
                  setDetailsOpen(false);
                  setResultsOpen(false);
                }}
              >

                <Button className="w-full">
                  Proceed to Book
                </Button>

              </Link>

            </div>

          </div>

        )}

      </Modal>

      {/* =================================================
          RESULTS GRID
      ================================================= */}

      {searched &&
        !loading &&
        !resultsOpen &&
        results.length > 0 && (

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">

            {results.map((room) => (

              <Card key={room.roomId}>

                <div className="mb-3 flex items-start justify-between">

                  <div>

                    <h3 className="font-semibold">
                      {room.roomName}
                    </h3>

                    <p className="text-sm text-slate-500">
                      {room.module}
                    </p>

                  </div>

                  <span
                    className={`inline-block w-28 rounded-full py-1 text-center text-xs font-bold tracking-wider uppercase ${getStatusBadgeClass(
                      "Available"
                    )}`}
                  >
                    Available
                  </span>

                </div>

                <p className="text-sm">
                  <strong>Room Type:</strong>{" "}
                  {room.roomType}
                </p>

                <p className="text-sm">
                  <strong>Capacity:</strong>{" "}
                  {room.capacity}
                </p>

                <p className="mb-4 text-sm">
                  <strong>Facilities:</strong>{" "}
                  {room.facilities?.length
                    ? room.facilities.join(", ")
                    : "None"}
                </p>

                <div className="flex gap-2">

                  <Button
                    variant="secondary"
                    className="flex-1 py-2 text-xs"
                    onClick={() =>
                      handleOpenDetails(room)
                    }
                  >
                    Details
                  </Button>

                  <Link
                    to={bookRoomLink(
                      room.roomId
                    )}
                    className="flex-1"
                  >

                    <Button className="w-full py-2 text-xs">
                      Book Room
                    </Button>

                  </Link>

                </div>

              </Card>

            ))}

          </div>

        )}

    </div>
  );
}