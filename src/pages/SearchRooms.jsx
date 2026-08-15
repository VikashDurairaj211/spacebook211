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
  "Module 2 - Elcot Park - CMB",
  "Module 1 - Elcot Park - CMB",
];

const ROOM_TYPES = [
  { id: 1, name: "Conference" },
  { id: 2, name: "Training" },
  { id: 3, name: "Discussion" },
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
// OFFICE HOURS
// =====================================================

const OFFICE_START_TIME = "10:00";
const OFFICE_END_TIME = "19:00";

// =====================================================
// SCROLLABLE TIME PICKER
// =====================================================

function ScrollableTimePicker({
  label,
  value,
  onChange,
  selectedDate,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  const [hours = "10", minutes = "00"] =
    value
      ? value.split(":")
      : ["10", "00"];

  // =====================================================
  // OFFICE HOURS: 10:00 AM TO 07:00 PM
  // =====================================================

  const hoursList = Array.from(
    { length: 10 },
    (_, i) =>
      String(i + 10).padStart(2, "0")
  );

  const minutesList = Array.from(
    { length: 60 },
    (_, i) =>
      String(i).padStart(2, "0")
  );

  // =====================================================
  // CURRENT DATE AND TIME
  // =====================================================

  const now = new Date();

  const todayStr = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("-");

  const isToday =
    selectedDate === todayStr;

  const currentHour =
    now.getHours();

  const currentMinute =
    now.getMinutes();

  // =====================================================
  // DISABLE PAST HOURS
  // =====================================================

  const isHourDisabled = (hour) => {
    if (!isToday) {
      return false;
    }

    return Number(hour) < currentHour;
  };

  // =====================================================
  // DISABLE PAST MINUTES
  // =====================================================

  const isMinuteDisabled = (
    hour,
    minute
  ) => {
    if (!isToday) {
      return false;
    }

    const selectedHour =
      Number(hour);

    const selectedMinute =
      Number(minute);

    if (
      selectedHour < currentHour
    ) {
      return true;
    }

    if (
      selectedHour > currentHour
    ) {
      return false;
    }

    return (
      selectedMinute <= currentMinute
    );
  };

  // =====================================================
  // HANDLE TIME CHANGE
  // =====================================================

  const handleTimeChange = (
    newHours,
    newMinutes
  ) => {
    // Do not allow a past time for today
    if (
      isMinuteDisabled(
        newHours,
        newMinutes
      )
    ) {
      return;
    }

    // Do not allow time outside office hours
    const selectedTime =
      `${newHours}:${newMinutes}`;

    if (
      selectedTime <
        OFFICE_START_TIME ||
      selectedTime >
        OFFICE_END_TIME
    ) {
      return;
    }

    onChange(selectedTime);
  };

  // =====================================================
  // CLOSE ON OUTSIDE CLICK
  // =====================================================

  useEffect(() => {
    function handleClickOutside(event) {
      if (
        containerRef.current &&
        !containerRef.current.contains(
          event.target
        )
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener(
      "mousedown",
      handleClickOutside
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleClickOutside
      );
    };
  }, []);

  return (
    <div
      className="relative"
      ref={containerRef}
    >
      <Field label={label}>
        <div
          onClick={() =>
            setIsOpen(!isOpen)
          }
          className="flex h-10 w-full cursor-pointer items-center justify-between rounded-lg border border-slate-300 bg-white px-3 text-sm shadow-sm hover:border-slate-400"
        >
          <span
            className={
              value
                ? "text-slate-900"
                : "text-slate-400"
            }
          >
            {value
              ? `${hours}:${minutes}`
              : "Select time"}
          </span>

          <svg
            className="h-4 w-4 text-slate-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </div>
      </Field>

      {isOpen && (
        <div className="absolute z-50 mt-1 flex w-full rounded-lg border border-slate-200 bg-white shadow-lg">

          {/* HOURS */}

          <div className="max-h-52 flex-1 overflow-y-auto border-r border-slate-100 p-1 text-center">

            <div className="sticky top-0 bg-slate-50 py-1 text-xs font-semibold text-slate-500">
              Hour
            </div>

            {hoursList.map((h) => {
              const disabled =
                isHourDisabled(h);

              return (
                <div
                  key={h}
                  onClick={() => {
                    if (!disabled) {
                      handleTimeChange(
                        h,
                        "00"
                      );
                    }
                  }}
                  className={`rounded px-2 py-1.5 text-sm ${
                    disabled
                      ? "cursor-not-allowed bg-slate-100 text-slate-300 opacity-50"
                      : hours === h
                      ? "cursor-pointer bg-blue-600 font-bold text-white"
                      : "cursor-pointer text-slate-700 hover:bg-blue-50"
                  }`}
                >
                  {h}
                </div>
              );
            })}

          </div>

          {/* MINUTES */}

          <div className="max-h-52 flex-1 overflow-y-auto p-1 text-center">

            <div className="sticky top-0 bg-slate-50 py-1 text-xs font-semibold text-slate-500">
              Min
            </div>

            {minutesList.map((m) => {
              const disabled =
                isMinuteDisabled(
                  hours,
                  m
                );

              return (
                <div
                  key={m}
                  onClick={() => {
                    if (!disabled) {
                      handleTimeChange(
                        hours,
                        m
                      );
                    }
                  }}
                  className={`rounded px-2 py-1.5 text-sm ${
                    disabled
                      ? "cursor-not-allowed bg-slate-100 text-slate-300 opacity-50"
                      : minutes === m
                      ? "cursor-pointer bg-blue-600 font-bold text-white"
                      : "cursor-pointer text-slate-700 hover:bg-blue-50"
                  }`}
                >
                  {m}
                </div>
              );
            })}

          </div>

        </div>
      )}
    </div>
  );
}

// =====================================================
// SEARCH ROOMS PAGE
// =====================================================

export default function SearchRooms() {

  const [filters, setFilters] =
    useState(INITIAL_FILTERS);

  const [results, setResults] =
    useState([]);

  const [loading, setLoading] =
    useState(false);

  const [searched, setSearched] =
    useState(false);

  const [error, setError] =
    useState("");

  const [bookings, setBookings] =
    useState([]);

  const [resultsOpen, setResultsOpen] =
    useState(false);

  const [selectedRoom, setSelectedRoom] =
    useState(null);

  const [detailsOpen, setDetailsOpen] =
    useState(false);

  // =====================================================
  // SEARCH RESULT MESSAGE
  // =====================================================

  const [searchMessage, setSearchMessage] =
    useState("");

  const [capacityExceeded, setCapacityExceeded] =
    useState(false);

  // =====================================================
  // LOAD BOOKINGS
  // =====================================================

  useEffect(() => {
    loadBookings();
  }, []);

  async function loadBookings() {
    try {
      const data =
        await getMyBookings();

      setBookings(
        Array.isArray(data)
          ? data
          : []
      );
    } catch {
      setBookings([]);
    }
  }

  // =====================================================
  // SEARCH CRITERIA
  // =====================================================

  const hasAnySearchCriteria =
    Boolean(filters.module) ||
    Boolean(filters.roomTypeId) ||
    Boolean(filters.capacity) ||
    Boolean(filters.date) ||
    Boolean(filters.startTime) ||
    Boolean(filters.endTime);

  const canSearch =
    hasAnySearchCriteria;

  const canChooseType =
    Boolean(filters.module);

  // =====================================================
  // UPDATE FILTER
  // =====================================================

  function updateFilter(
    key,
    value
  ) {
    setFilters((current) => {
      const next = {
        ...current,
        [key]: value,
      };

      if (key === "module") {
        next.roomTypeId = "";
      }

      if (key === "date") {
        next.startTime = "";
        next.endTime = "";
      }

      if (key === "startTime") {
        next.endTime = "";
      }

      return next;
    });

    setCapacityExceeded(false);
    setSearchMessage("");
    setError("");
  }

  // =====================================================
  // SEARCH ROOMS
  // =====================================================

  async function handleSearch(e) {

    e.preventDefault();

    // Reset previous search state
    setCapacityExceeded(false);
    setSearchMessage("");
    setResults([]);

    if (!canSearch) {
      setError(
        "Please select or enter at least one search criteria."
      );
      return;
    }

    // =================================================
    // PARTICIPANT COUNT VALIDATION
    // =================================================

    if (
      filters.capacity &&
      Number(filters.capacity) < 1
    ) {
      setError(
        "Number of participants must be at least 1."
      );
      return;
    }

    // =================================================
    // START / END TIME VALIDATION
    // =================================================

    if (
      filters.startTime &&
      filters.endTime &&
      filters.startTime >= filters.endTime
    ) {
      setError(
        "End time must be after start time."
      );
      return;
    }

    // =================================================
    // OFFICE HOURS VALIDATION
    // =================================================

    if (
      filters.startTime &&
      filters.startTime < OFFICE_START_TIME
    ) {
      setError(
        "Bookings are allowed only during office hours: 10:00 AM to 07:00 PM."
      );
      return;
    }

    if (
      filters.endTime &&
      filters.endTime > OFFICE_END_TIME
    ) {
      setError(
        "Bookings are allowed only during office hours: 10:00 AM to 07:00 PM."
      );
      return;
    }

    // =================================================
    // DATE VALIDATION
    // =================================================

    if (filters.date) {

      const selectedDate =
        new Date(
          `${filters.date}T00:00:00`
        );

      const today =
        new Date();

      today.setHours(
        0,
        0,
        0,
        0
      );

      const maxAllowedDate =
        new Date();

      maxAllowedDate.setDate(
        maxAllowedDate.getDate() + 7
      );

      maxAllowedDate.setHours(
        0,
        0,
        0,
        0
      );

      if (
        selectedDate < today
      ) {
        setError(
          "Cannot search rooms for past dates."
        );
        return;
      }

      if (
        selectedDate >
        maxAllowedDate
      ) {
        setError(
          "Rooms can only be searched up to 1 week in advance."
        );
        return;
      }

      const now =
        new Date();

      const todayStr = [
        now.getFullYear(),
        String(
          now.getMonth() + 1
        ).padStart(2, "0"),
        String(
          now.getDate()
        ).padStart(2, "0"),
      ].join("-");

      if (
        filters.date === todayStr
      ) {

        const currentTime =
          `${String(
            now.getHours()
          ).padStart(2, "0")}:${String(
            now.getMinutes()
          ).padStart(2, "0")}`;

        if (
          filters.startTime &&
          filters.startTime <= currentTime
        ) {
          setError(
            "The selected start time has already passed. Please select a future time."
          );
          return;
        }

        if (
          filters.endTime &&
          filters.endTime <= currentTime
        ) {
          setError(
            "The selected end time has already passed. Please select a future time."
          );
          return;
        }
      }
    }

    // =================================================
    // CALL API
    // =================================================

    setLoading(true);
    setError("");

    try {

      const searchPayload = {
        module:
          filters.module ||
          undefined,

        roomTypeId:
          filters.roomTypeId
            ? Number(
                filters.roomTypeId
              )
            : undefined,

        participantCount:
          filters.capacity
            ? Number(
                filters.capacity
              )
            : undefined,

        facilityIds: [],

        bookingDate:
          filters.date ||
          undefined,

        startTime:
          filters.startTime
            ? `${filters.startTime}:00`
            : undefined,

        endTime:
          filters.endTime
            ? `${filters.endTime}:00`
            : undefined,
      };

      const data =
        await searchRooms(
          searchPayload
        );

      // ===============================================
      // BACKEND RESPONSE HANDLING
      // ===============================================

      let searchResults = [];

      if (
        Array.isArray(data)
      ) {
        // Backward compatibility:
        // API directly returns an array
        searchResults = data;

      } else if (
        data &&
        Array.isArray(data.rooms)
      ) {
        // New backend response
        searchResults =
          data.rooms;

        setSearchMessage(
          data.message || ""
        );

        setCapacityExceeded(
          data.capacityExceeded === true
        );

      } else {

        searchResults = [];

        if (
          data?.message
        ) {
          setSearchMessage(
            data.message
          );
        }

        if (
          data?.capacityExceeded === true
        ) {
          setCapacityExceeded(
            true
          );
        }
      }

      setResults(
        searchResults
      );

      setResultsOpen(true);

      setSearched(true);

    } catch (err) {

      console.error(err);

      setError(
        err?.response?.data?.message ||
        err?.response?.data?.Message ||
        "Unable to search rooms."
      );

    } finally {

      setLoading(false);

    }
  }

  // =====================================================
  // ROOM DETAILS
  // =====================================================

  function handleOpenDetails(room) {
    setSelectedRoom(room);
    setDetailsOpen(true);
  }

  // =====================================================
  // BOOKING LINK
  // =====================================================

  function bookRoomLink(roomId) {

    const params =
      new URLSearchParams();

    params.set(
      "roomId",
      roomId
    );

    if (filters.date) {
      params.set(
        "date",
        filters.date
      );
    }

    if (filters.startTime) {
      params.set(
        "startTime",
        filters.startTime
      );
    }

    if (filters.endTime) {
      params.set(
        "endTime",
        filters.endTime
      );
    }

    if (filters.capacity) {
      params.set(
        "attendees",
        filters.capacity
      );
    }

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
  // DATE LIMITS
  // =====================================================

  const today =
    new Date();

  const todayStr = [
    today.getFullYear(),
    String(
      today.getMonth() + 1
    ).padStart(2, "0"),
    String(
      today.getDate()
    ).padStart(2, "0"),
  ].join("-");

  const maxDateObj =
    new Date();

  maxDateObj.setDate(
    maxDateObj.getDate() + 7
  );

  const maxDateStr = [
    maxDateObj.getFullYear(),
    String(
      maxDateObj.getMonth() + 1
    ).padStart(2, "0"),
    String(
      maxDateObj.getDate()
    ).padStart(2, "0"),
  ].join("-");

  // =====================================================
  // UI
  // =====================================================

  return (
    <div className="space-y-6">

      <div>

        <h1 className="font-display text-3xl font-bold">
          Search Rooms
        </h1>

        <p className="mt-2 text-slate-600">
          Enter any search criteria to find available rooms.
        </p>

      </div>

      {/* SEARCH FORM */}

      <Card>

        <form
          onSubmit={handleSearch}
          className="space-y-5"
        >

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">

            {/* MODULE */}

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

                {MODULES.map(
                  (module) => (
                    <option
                      key={module}
                      value={module}
                    >
                      {module}
                    </option>
                  )
                )}

              </Select>

            </Field>

            {/* ROOM TYPE */}

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

                {ROOM_TYPES.map(
                  (type) => (
                    <option
                      key={type.id}
                      value={type.id}
                    >
                      {type.name}
                    </option>
                  )
                )}

              </Select>

            </Field>

            {/* PARTICIPANTS */}

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

            {/* DATE */}

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

            {/* START TIME */}

            <ScrollableTimePicker
              label="5. Start Time"
              value={filters.startTime}
              selectedDate={filters.date}
              onChange={(val) =>
                updateFilter(
                  "startTime",
                  val
                )
              }
            />

            {/* END TIME */}

            <ScrollableTimePicker
              label="6. End Time"
              value={filters.endTime}
              selectedDate={filters.date}
              onChange={(val) =>
                updateFilter(
                  "endTime",
                  val
                )
              }
            />

          </div>

          {/* OFFICE HOURS INFORMATION */}

          <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-700">
            Office hours: <strong>10:00 AM to 07:00 PM</strong>
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
            disabled={
              !canSearch ||
              loading
            }
          >
            {loading
              ? "Searching..."
              : "Search Available Rooms"}
          </Button>

        </form>

      </Card>

      {/* MY BOOKINGS */}

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
                        ? booking.startTime.substring(0, 5)
                        : ""}

                      {" - "}

                      {booking.endTime
                        ? booking.endTime.substring(0, 5)
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

      {/* LOADER */}

      {loading && (
        <Loader
          label="Searching available rooms..."
        />
      )}

      {/* RESULTS MODAL */}

      <Modal
        open={
          resultsOpen &&
          !loading
        }
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

          {results.length !== 1
            ? "s"
            : ""}{" "}

          found.

        </p>

        {/* NO RESULTS */}

        {results.length === 0 ? (

          <div className="space-y-2">

            {capacityExceeded ? (

              <>
                <p className="text-sm font-medium text-red-600">
                  {searchMessage ||
                    "No room can accommodate the selected number of participants."}
                </p>

                <p className="text-sm text-slate-500">
                  Please enter a smaller number of participants and search again.
                </p>
              </>

            ) : (

              <p className="text-sm text-slate-500">
                {searchMessage ||
                  "No rooms are available for the selected criteria."}
              </p>

            )}

          </div>

        ) : (

          <div className="max-h-[60vh] space-y-4 overflow-y-auto pr-1">

            {results.map(
              (room) => (

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

              )
            )}

          </div>

        )}

      </Modal>

      {/* ROOM DETAILS MODAL */}

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

                  {filters.startTime ||
                    "--:--"}

                  {" - "}

                  {filters.endTime ||
                    "--:--"}

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

      {/* RESULTS GRID */}

      {searched &&
        !loading &&
        !resultsOpen &&
        results.length > 0 && (

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">

            {results.map(
              (room) => (

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

                    <strong>
                      Room Type:
                    </strong>{" "}

                    {room.roomType}

                  </p>

                  <p className="text-sm">

                    <strong>
                      Capacity:
                    </strong>{" "}

                    {room.capacity}

                  </p>

                  <p className="mb-4 text-sm">

                    <strong>
                      Facilities:
                    </strong>{" "}

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

              )
            )}

          </div>

        )}

    </div>
  );
}