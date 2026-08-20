import { useEffect, useState, useMemo } from "react";
import { useSearchParams } from "react-router-dom";

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
  const [searchParams, setSearchParams] = useSearchParams();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [mode, setMode] = useState(null);

  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState("All");

  useEffect(() => {
    const searchFromUrl =
      searchParams.get("search") ||
      searchParams.get("q") ||
      "";
    setSearch(searchFromUrl);
  }, [searchParams]);

  const handleSearchChange = (val) => {
    setSearch(val);
    const newParams = new URLSearchParams(searchParams);
    if (val && val.trim()) {
      newParams.set("search", val);
    } else {
      newParams.delete("search");
    }
    setSearchParams(newParams, { replace: true });
  };

  const toast = useToast();

  // =====================================================
  // ROOM ID
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
  // MODULE
  // =====================================================

  const getBookingModule = (booking) => {
    if (!booking) return "-";

    const mod =
      booking.module ||
      booking.Module ||
      booking.room?.module ||
      booking.room?.Module;

    return mod && String(mod).trim() !== ""
      ? mod
      : "-";
  };

  // =====================================================
  // FORMAT DISPLAY TIME
  // =====================================================

  const formatDisplayTime = (time) => {
    if (!time) return "";

    const value = String(time);

    if (value.includes("T")) {
      const timePart = value.split("T")[1] || "";
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
  // TODAY
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
  // LOAD ALL BOOKINGS
  // =====================================================

  const load = async () => {
    try {
      setLoading(true);

      const [roomResult, hotseatResult] =
        await Promise.allSettled([
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
        console.error(
          "Room bookings error:",
          roomResult.reason
        );
      }

      // =====================================================
      // HOTSEAT BOOKINGS
      // =====================================================

      if (hotseatResult.status === "fulfilled") {
        const data = hotseatResult.value;

        console.log(
          "My Hotseat Bookings API Response:",
          data
        );

        const bookingList = Array.isArray(data)
          ? data
          : data?.bookings || [];

        hotseatBookings = bookingList.map((booking) => {
          const hotseatTime =
            booking.expectedCheckIn ??
            booking.expectedCheckInTime ??
            booking.startTime ??
            "";

          return {
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
              booking.expectedCheckInTime ??
              "",

            endTime:
              booking.endTime ??
              booking.expectedCheckIn ??
              booking.expectedCheckInTime ??
              "",

            expectedCheckIn: hotseatTime,

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

            seatNumber:
              booking.seatNumber,

            checkInTime:
              booking.checkInTime ?? null,

            releasedOn:
              booking.releasedOn ?? null,
          };
        });
      } else {
        console.error(
          "Hotseat bookings error:",
          hotseatResult.reason
        );
      }

      // =====================================================
      // COMBINE
      // =====================================================

      const combinedBookings = [
        ...roomBookings,
        ...hotseatBookings,
      ];

      // =====================================================
      // SORT BY BOOKING ID DESC
      // =====================================================

      const sorted = [...combinedBookings].sort(
        (a, b) =>
          Number(b.bookingId || 0) -
          Number(a.bookingId || 0)
      );

      setBookings(sorted);
    } catch (err) {
      console.error(
        "Error loading bookings:",
        err
      );

      setBookings([]);

      toast.addToast({
        type: "error",
        title: "Unable to load bookings.",
      });
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // INITIAL LOAD
  // =====================================================

  useEffect(() => {
    load();

    const handleRefresh = () => {
      load();
    };

    window.addEventListener(
      "booking-updated",
      handleRefresh
    );

    return () => {
      window.removeEventListener(
        "booking-updated",
        handleRefresh
      );
    };
  }, []);

  // =====================================================
  // CHECK WHETHER BOOKING CAN BE MODIFIED
  // =====================================================

  const canModifyBooking = (booking) => {
    if (!booking) return false;

    const status =
      booking.status?.toLowerCase() || "";

    if (
      status === "cancelled" ||
      status === "rejected" ||
      status === "expired"
    ) {
      return false;
    }

    if (!booking.bookingDate) {
      return false;
    }

    // -----------------------------------------------------
    // DATE CHECK
    // -----------------------------------------------------

    if (booking.bookingDate > todayString) {
      return true;
    }

    if (booking.bookingDate < todayString) {
      return false;
    }

    // -----------------------------------------------------
    // TODAY
    // -----------------------------------------------------

    const bookingTime =
      booking.isHotseat
        ? booking.expectedCheckIn ||
          booking.startTime
        : booking.startTime;

    if (!bookingTime) {
      return true;
    }

    const time = formatDisplayTime(
      bookingTime
    );

    if (!time) {
      return true;
    }

    const [hours, minutes] =
      time.split(":").map(Number);

    if (
      Number.isNaN(hours) ||
      Number.isNaN(minutes)
    ) {
      return true;
    }

    const now = new Date();

    const currentMinutes =
      now.getHours() * 60 +
      now.getMinutes();

    const bookingMinutes =
      hours * 60 + minutes;

    return bookingMinutes > currentMinutes;
  };

  // =====================================================
  // DURATION
  // =====================================================

  const getDuration = (booking) => {
    if (!booking) return "-";

    // =====================================================
    // HOTSEAT
    // =====================================================

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

        if (diffMins <= 0) {
          return "-";
        }

        const hrs = Math.floor(
          diffMins / 60
        );

        const mins = diffMins % 60;

        if (hrs > 0) {
          return `${hrs}h${
            mins > 0 ? ` ${mins}m` : ""
          }`;
        }

        return `${mins}m`;
      }

      return "Full Day";
    }

    // =====================================================
    // ROOM BOOKING
    // =====================================================

    const start = booking.startTime;
    const end = booking.endTime;

    if (!start || !end) {
      return "-";
    }

    const startTimeStr =
      formatDisplayTime(start);

    const endTimeStr =
      formatDisplayTime(end);

    const [startH, startM] =
      startTimeStr.split(":").map(Number);

    const [endH, endM] =
      endTimeStr.split(":").map(Number);

    if (
      Number.isNaN(startH) ||
      Number.isNaN(endH)
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

    if (
      hours > 0 &&
      minutes > 0
    ) {
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
  // VIEW
  // =====================================================

  const handleView = (booking) => {
    setSelected({
      ...booking,
      roomId: getRoomId(booking),
    });

    setMode("view");
  };

  // =====================================================
  // EDIT
  // =====================================================

  const handleEdit = (booking) => {
    setSelected({
      ...booking,
      roomId: getRoomId(booking),
    });

    setMode("edit");
  };

  // =====================================================
  // CLOSE MODAL
  // =====================================================

  const closeModal = () => {
    setMode(null);
    setSelected(null);
  };

  // =====================================================
  // CANCEL BOOKING
  // =====================================================

  async function cancel() {
    if (!selected?.bookingId) {
      return;
    }

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

      window.dispatchEvent(
        new Event("booking-updated")
      );

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
  // VALIDATE DATE
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
  // VALIDATE ROOM TIME
  // OFFICE HOURS = 10 AM TO 7 PM
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

    if (startTime < OFFICE_START) {
      toast.addToast({
        type: "error",
        title:
          "Start time cannot be before 10:00 AM.",
      });

      return false;
    }

    if (endTime > OFFICE_END) {
      toast.addToast({
        type: "error",
        title:
          "End time cannot be after 7:00 PM.",
      });

      return false;
    }

    if (startTime >= endTime) {
      toast.addToast({
        type: "error",
        title:
          "End time must be after start time.",
      });

      return false;
    }

    if (date === todayString) {
      const now = new Date();

      const currentMinutes =
        now.getHours() * 60 +
        now.getMinutes();

      const [
        startHour,
        startMinute,
      ] = startTime
        .split(":")
        .map(Number);

      const startTotalMinutes =
        startHour * 60 +
        startMinute;

      if (
        startTotalMinutes <=
        currentMinutes
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
  // GET HOTSEAT ID
  // =====================================================

  const getHotseatSeatId = (booking) => {
    if (!booking) return null;

    if (
      booking.seatId !== undefined &&
      booking.seatId !== null &&
      booking.seatId !== ""
    ) {
      const id = Number(
        booking.seatId
      );

      if (!Number.isNaN(id)) {
        return id;
      }
    }

    if (booking.seatNumber) {
      const digits = String(
        booking.seatNumber
      ).replace(/[^0-9]/g, "");

      if (digits) {
        const id = Number(digits);

        if (!Number.isNaN(id)) {
          return id;
        }
      }
    }

    return null;
  };

  // =====================================================
  // UPDATE HOTSEAT
  // =====================================================

  const updateHotseat = async () => {
    if (!selected?.bookingId) {
      throw new Error(
        "Hotseat booking ID is missing."
      );
    }

    const seatId =
      getHotseatSeatId(selected);

    if (
      seatId === null ||
      seatId === undefined ||
      Number.isNaN(seatId)
    ) {
      throw new Error(
        "Hotseat Seat ID is missing."
      );
    }

    if (
      !validateBookingDate(
        selected.bookingDate
      )
    ) {
      return false;
    }

    const rawTime =
      selected.expectedCheckIn ||
      selected.startTime ||
      "";

    const formattedTime =
      formatApiTime(
        formatDisplayTime(rawTime)
      );

    if (!formattedTime) {
      toast.addToast({
        type: "error",
        title:
          "Expected check-in time is required.",
      });

      return false;
    }

    const payload = {
      seatId: Number(seatId),

      bookingDate:
        selected.bookingDate,

      expectedCheckInTime:
        formattedTime,
    };

    console.log(
      "Updating Hotseat:",
      selected.bookingId
    );

    console.log(
      "Hotseat Update Payload:",
      payload
    );

    const token =
      localStorage.getItem(
        "spacebook_token"
      ) || "";

    const baseUrl =
      import.meta.env.VITE_API_BASE_URL ||
      "https://spacebook-505h.onrender.com";

    const response = await fetch(
      `${baseUrl}/api/Hotseat/${selected.bookingId}`,
      {
        method: "PUT",

        headers: {
          "Content-Type":
            "application/json",

          Authorization:
            `Bearer ${token}`,
        },

        body: JSON.stringify(payload),
      }
    );

    if (!response.ok) {
      let message =
        "Failed to update hotseat booking.";

      try {
        const errorData =
          await response.json();

        message =
          errorData?.message ||
          errorData?.title ||
          errorData?.detail ||
          message;
      } catch {
        // Ignore JSON parsing error
      }

      throw new Error(message);
    }

    return true;
  };

  // =====================================================
  // SAVE / UPDATE BOOKING
  // =====================================================

  async function save(e) {
    e.preventDefault();

    if (!selected) {
      return;
    }

    try {
      // ===================================================
      // HOTSEAT UPDATE
      // ===================================================

      if (selected.isHotseat) {
        const updated =
          await updateHotseat();

        if (!updated) {
          return;
        }

        toast.addToast({
          type: "success",
          title:
            "Hotseat booking updated successfully.",
        });

        closeModal();

        window.dispatchEvent(
          new Event("booking-updated")
        );

        await load();

        return;
      }

      // ===================================================
      // ROOM UPDATE
      // ===================================================

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

      // ===================================================
      // DATE
      // ===================================================

      if (
        !validateBookingDate(
          selected.bookingDate
        )
      ) {
        return;
      }

      // ===================================================
      // TIME
      // ===================================================

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

      // ===================================================
      // ROOM PAYLOAD
      // ===================================================

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

      console.log(
        "Updating Room Booking:",
        selected.bookingId
      );

      console.log(
        "Room Update Payload:",
        payload
      );

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

      window.dispatchEvent(
        new Event("booking-updated")
      );

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
  // FILTER BOOKINGS BY SEARCH & DATE
  // =====================================================

  const filteredBookings = useMemo(() => {
    const query = search.toLowerCase().trim();

    return bookings.filter((b) => {
      // 1. Search text filter
      const text = [
        String(b.bookingId ?? ""),
        b.roomName,
        b.module,
        b.purpose,
        b.bookingDate,
        b.status,
        b.seatNumber ? `Hot Seat ${b.seatNumber}` : "",
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch = !query || text.includes(query);

      // 2. Date filter
      let matchesDate = true;
      if (b.bookingDate) {
        const bookingDateOnly = String(b.bookingDate).split("T")[0];
        if (dateFilter === "Today") {
          matchesDate = bookingDateOnly === todayString;
        } else if (dateFilter === "Upcoming") {
          matchesDate = bookingDateOnly > todayString;
        } else if (dateFilter === "Past") {
          matchesDate = bookingDateOnly < todayString;
        }
      } else if (dateFilter !== "All") {
        matchesDate = false;
      }

      return matchesSearch && matchesDate;
    });
  }, [bookings, search, dateFilter, todayString]);

  // =====================================================
  // RENDER
  // =====================================================

  return (
    <div className="space-y-6">

      {/* PAGE HEADER & DATE FILTER */}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-4xl font-semibold">
            My Bookings
          </h1>

          <p className="mt-2 text-slate-500">
            View, edit or cancel your workspace reservations.
          </p>
        </div>

        <select
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
          className="rounded-xl border border-line bg-white px-3 py-2 text-xs font-medium text-ink outline-none shadow-sm"
        >
          <option value="All">All Dates</option>
          <option value="Today">Today</option>
          <option value="Upcoming">Upcoming</option>
          <option value="Past">Past</option>
        </select>
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

            ) : filteredBookings.length === 0 ? (

              <tr>
                <td
                  colSpan={9}
                  className="py-8 text-center text-slate-500"
                >
                  <div>
                    <p className="font-medium text-ink">
                      No bookings found.
                    </p>
                    {dateFilter !== "All" && (
                      <p className="mt-1 text-xs text-slate">
                        No bookings found for the selected date filter.
                        <button
                          type="button"
                          onClick={() => setDateFilter("All")}
                          className="ml-2 font-bold text-sky-600 hover:text-sky-800 underline"
                        >
                          Show all dates
                        </button>
                      </p>
                    )}
                  </div>
                </td>
              </tr>

            ) : (

              filteredBookings.map((b) => (

                <tr
                  key={`${
                    b.isHotseat
                      ? "hotseat"
                      : "room"
                  }-${b.bookingId}`}
                  className="border-b border-line last:border-0"
                >

                  {/* BOOKING ID */}

                  <td className="px-3 py-4 font-mono whitespace-nowrap">
                    {String(
                      b.bookingId ?? ""
                    ).replace(/^#/, "")}
                  </td>

                  {/* ROOM / HOTSEAT */}

                  <td className="px-3 py-4 whitespace-nowrap font-semibold">

                    {b.isHotseat
                      ? b.roomName ||
                        "Hot Seat"
                      : b.roomName ||
                        `Room ${
                          getRoomId(b) || ""
                        }`}

                  </td>

                  {/* MODULE */}

                  <td className="px-3 py-4 whitespace-nowrap text-slate-600">
                    {getBookingModule(b)}
                  </td>

                  {/* PURPOSE */}

                  <td className="max-w-[140px] truncate px-3 py-4">
                    {b.purpose &&
                    b.purpose.trim()
                      ? b.purpose
                      : "Reserved Workspace"}
                  </td>

                  {/* DATE */}

                  <td className="px-3 py-4 whitespace-nowrap">
                    {b.bookingDate}
                  </td>

                  {/* TIME */}

                  <td className="px-3 py-4 whitespace-nowrap text-slate-600">

                    {b.isHotseat
                      ? formatDisplayTime(
                          b.expectedCheckIn ||
                          b.startTime
                        )
                      : `${formatDisplayTime(
                          b.startTime
                        )} - ${formatDisplayTime(
                          b.endTime
                        )}`}

                  </td>

                  {/* DURATION */}

                  <td className="px-3 py-4 whitespace-nowrap">
                    {getDuration(b)}
                  </td>

                  {/* STATUS */}

                  <td className="px-3 py-4 text-center whitespace-nowrap">

                    <span
                      className={`inline-block w-24 rounded-full py-1 text-center text-xs font-bold uppercase tracking-wider ${getStatusBadgeClass(
                        b.status
                      )}`}
                    >
                      {b.status}
                    </span>

                  </td>

                  {/* ACTIONS */}

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
                        {/* EDIT */}

                        <button
                          className="mr-2.5 text-sm font-bold text-emerald-600 hover:text-emerald-800 hover:underline"
                          onClick={() =>
                            handleEdit(b)
                          }
                        >
                          Edit
                        </button>

                        {/* CANCEL */}

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

      {/* =================================================
          VIEW BOOKING MODAL
      ================================================= */}

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

            {/* BOOKING ID */}

            <dt className="font-medium">
              Booking ID
            </dt>

            <dd>
              {String(
                selected.bookingId ?? ""
              ).replace(/^#/, "")}
            </dd>

            {/* ROOM / SEAT */}

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

            {/* MODULE */}

            <dt className="font-medium">
              Module
            </dt>

            <dd>
              {getBookingModule(selected)}
            </dd>

            {/* HOTSEAT SEAT NUMBER */}

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

            {/* PURPOSE */}

            <dt className="font-medium">
              Purpose
            </dt>

            <dd>
              {selected.purpose ||
                "Reserved Workspace"}
            </dd>

            {/* DATE */}

            <dt className="font-medium">
              Date
            </dt>

            <dd>
              {selected.bookingDate}
            </dd>

            {/* TIME */}

            <dt className="font-medium">
              Time
            </dt>

            <dd>
              {selected.isHotseat
                ? formatDisplayTime(
                    selected.expectedCheckIn ||
                    selected.startTime
                  )
                : `${formatDisplayTime(
                    selected.startTime
                  )} - ${formatDisplayTime(
                    selected.endTime
                  )}`}
            </dd>

            {/* DURATION */}

            <dt className="font-medium">
              Duration
            </dt>

            <dd>
              {getDuration(selected)}
            </dd>

            {/* STATUS */}

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

      {/* =================================================
          CANCEL MODAL
      ================================================= */}

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

      {/* =================================================
          EDIT MODAL
      ================================================= */}

      <Modal
        open={mode === "edit"}
        title={
          selected?.isHotseat
            ? "Edit Hotseat Booking"
            : "Edit Room Booking"
        }
        footer={null}
        className="max-w-xl h-fit"
      >

        {selected && (

          <form
            onSubmit={save}
            className="space-y-4"
          >

            {/* BOOKING ID */}

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

            {/* =================================================
                HOTSEAT EDIT
            ================================================= */}

            {selected.isHotseat ? (

              <>
                <Field label="Seat">

                  <Input
                    value={
                      selected.seatNumber ||
                      selected.roomName ||
                      "Hot Seat"
                    }
                    disabled
                  />

                </Field>

                <Field label="Expected Check-in Time">

                  <Input
                    type="time"
                    value={formatDisplayTime(
                      selected.expectedCheckIn ||
                      selected.startTime
                    )}
                    onChange={(e) =>
                      setSelected({
                        ...selected,

                        expectedCheckIn:
                          e.target.value,

                        startTime:
                          e.target.value,

                        endTime:
                          e.target.value,
                      })
                    }
                  />

                </Field>

                <p className="text-xs text-slate-500">
                  Change the date or expected check-in
                  time for this hotseat booking.
                </p>
              </>

            ) : (

              /* =================================================
                 ROOM EDIT
              ================================================= */

              <>
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

                <p className="text-xs text-slate-500">
                  Booking hours:{" "}
                  <span className="font-semibold">
                    10:00 AM - 7:00 PM
                  </span>
                </p>

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
              </>

            )}

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