import { useEffect, useState, useRef, useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";

import {
  searchRooms,
  getRoomAvailability,
  getModules,
  getRoomTypes,
  DEFAULT_MODULES,
  DEFAULT_ROOM_TYPES,
} from "../api/rooms";
import { getMyBookings } from "../api/bookings";
import client from "../api/client";

import { Field, Input, Select } from "../components/common/Input";
import BusinessDatePicker from "../components/common/BusinessDatePicker";
import ScrollableTimePicker from "../components/common/ScrollableTimePicker";
import Button from "../components/common/Button";
import Card from "../components/common/Card";
import Loader from "../components/common/Loader";
import Modal from "../components/common/Modal";




const isWeekendDate = (dateStr) => {
  if (!dateStr) return false;
  const [y, m, d] = dateStr.split("-").map(Number);
  if (!y || !m || !d) return false;
  const dt = new Date(y, m - 1, d);
  const day = dt.getDay();
  return day === 0 || day === 6;
};

const getNextBusinessDayFormatted = () => {
  const next = new Date();
  const day = next.getDay();
  if (day === 6) {
    next.setDate(next.getDate() + 2);
  } else if (day === 0) {
    next.setDate(next.getDate() + 1);
  }
  const year = next.getFullYear();
  const month = String(next.getMonth() + 1).padStart(2, "0");
  const d = String(next.getDate()).padStart(2, "0");
  return `${year}-${month}-${d}`;
};

const INITIAL_FILTERS = {
  module: "",
  roomTypeId: "",
  capacity: "",
  date: getNextBusinessDayFormatted(),
  startTime: "",
  endTime: "",
};

// =====================================================
// OFFICE HOURS
// =====================================================

const OFFICE_START_TIME = "10:00";
const OFFICE_END_TIME = "22:00";

// =====================================================
// HELPER FUNCTIONS
// =====================================================

function normalizeTime(time) {
  if (!time) return "";

  return String(time).substring(0, 5);
}

function timeToMinutes(time) {
  if (!time) return null;

  const normalized = normalizeTime(time);
  const [hours, minutes] = normalized.split(":").map(Number);

  if (
    Number.isNaN(hours) ||
    Number.isNaN(minutes)
  ) {
    return null;
  }

  return hours * 60 + minutes;
}

function isBookingActive(status) {
  const value = String(status || "")
    .trim()
    .toLowerCase();

  return ![
    "cancelled",
    "canceled",
    "rejected",
    "declined",
  ].includes(value);
}

function getRoomTypeName(room) {
  if (!room) return 'Conference';
  if (typeof room === 'string' && room.trim()) return room;
  if (typeof room.roomType === 'string' && room.roomType.trim()) return room.roomType;
  if (typeof room.roomType === 'object' && room.roomType?.name) return room.roomType.name;
  if (typeof room.roomTypeName === 'string' && room.roomTypeName.trim()) return room.roomTypeName;
  if (typeof room.typeName === 'string' && room.typeName.trim()) return room.typeName;
  if (typeof room.type === 'string' && room.type.trim()) return room.type;

  const typeId = Number(room.roomTypeId ?? room.typeId ?? room.roomType?.id ?? 0);
  if (typeId === 1) return 'Conference';
  if (typeId === 2) return 'Training';
  if (typeId === 3) return 'Discussion';

  const name = String(room.roomName || room.name || '').toLowerCase();
  if (name.includes('train')) return 'Training';
  if (name.includes('disc')) return 'Discussion';
  if (name.includes('conf')) return 'Conference';

  return 'Conference';
}

function getRoomModuleName(room) {
  if (!room) return 'Module 1 - Elcot Park - CMB';
  if (typeof room.module === 'string' && room.module.includes(' - ')) return room.module;
  if (typeof room.moduleName === 'string' && room.moduleName.includes(' - ')) return room.moduleName;

  const modId = Number(room.moduleId ?? room.moduleid ?? 0);
  if (modId === 3) return 'Module 1 - Tidel Park - CMB';
  if (modId === 2) return 'Module 2 - Elcot Park - CMB';
  if (modId === 1) return 'Module 1 - Elcot Park - CMB';

  const str = String(room.module || room.moduleName || room.roomNumber || room.code || '').toLowerCase();
  if (str.includes('tidel') || str.includes('tidal') || str.includes('to1')) return 'Module 1 - Tidel Park - CMB';
  if (str.includes('module 2') || str.includes('m2') || str.includes('eo2')) return 'Module 2 - Elcot Park - CMB';
  return 'Module 1 - Elcot Park - CMB';
}

function normalizeRoomFacilities(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw.map((f) => {
      if (typeof f === 'string') return f;
      if (typeof f === 'object' && f !== null) return f.facilityName || f.name || f.facility || '';
      if (typeof f === 'number') {
        const facilityMap = { 1: 'Projector', 2: 'Video Conferencing', 3: 'Whiteboard', 4: 'Wi-Fi', 5: 'Monitor', 6: 'Speaker' };
        return facilityMap[f] || `Facility ${f}`;
      }
      return String(f);
    }).filter(Boolean);
  }
  return [];
}

// =====================================================
// SEARCH ROOMS PAGE
// =====================================================

export default function SearchRooms() {
  const [searchParams] = useSearchParams();

  const [modules, setModules] = useState(DEFAULT_MODULES);
  const [roomTypes, setRoomTypes] = useState(DEFAULT_ROOM_TYPES);

  const [filters, setFilters] =
    useState(INITIAL_FILTERS);

  // Load dynamic modules and room types from backend
  useEffect(() => {
    let isMounted = true;

    async function loadDynamicFilters() {
      try {
        const [modData, typeData] = await Promise.allSettled([
          getModules(),
          getRoomTypes(),
        ]);

        if (isMounted) {
          if (
            modData.status === "fulfilled" &&
            Array.isArray(modData.value) &&
            modData.value.length > 0
          ) {
            setModules(modData.value);
          }
          if (
            typeData.status === "fulfilled" &&
            Array.isArray(typeData.value) &&
            typeData.value.length > 0
          ) {
            setRoomTypes(typeData.value);
          }
        }
      } catch (err) {
        console.warn("Using fallback room options:", err);
      }
    }

    loadDynamicFilters();

    return () => {
      isMounted = false;
    };
  }, []);

  // ===================================================
  // TOP NAV SEARCH PARAMETER SYNC
  // ===================================================

  useEffect(() => {
    const moduleParam = searchParams.get("module") || "";
    const roomTypeParam = searchParams.get("roomType") || "";
    const roomTypeIdParam = searchParams.get("roomTypeId") || "";
    const query = String(
      searchParams.get("q") ||
      searchParams.get("search") ||
      ""
    ).toLowerCase().trim();

    if (!moduleParam && !roomTypeParam && !roomTypeIdParam && !query) return;

    setFilters((prev) => {
      let nextModule = prev.module;
      let nextRoomTypeId = prev.roomTypeId;

      if (moduleParam) {
        if (moduleParam.toLowerCase().includes("tidel") || moduleParam.toLowerCase().includes("tidal")) {
          nextModule = "Module 1 - Tidel Park - CMB";
        } else if (moduleParam.toLowerCase().includes("module 2") || moduleParam.toLowerCase().includes("m2")) {
          nextModule = "Module 2 - Elcot Park - CMB";
        } else if (moduleParam.toLowerCase().includes("module 1") || moduleParam.toLowerCase().includes("m1")) {
          nextModule = "Module 1 - Elcot Park - CMB";
        }
      }

      if (roomTypeIdParam) {
        nextRoomTypeId = String(roomTypeIdParam);
      } else if (roomTypeParam) {
        const found = roomTypes.find(t => t.name.toLowerCase() === roomTypeParam.toLowerCase());
        if (found) {
          nextRoomTypeId = String(found.id);
        }
      }

      if (!nextModule && query) {
        if (query.includes("tidel") || query.includes("tidal") || query.includes("to1")) {
          nextModule = "Module 1 - Tidel Park - CMB";
        } else if (query.includes("module 2") || query.includes("m2") || query.includes("eo2")) {
          nextModule = "Module 2 - Elcot Park - CMB";
        } else if (query.includes("module 1") || query.includes("m1") || query.includes("eo1")) {
          nextModule = "Module 1 - Elcot Park - CMB";
        }
      }

      if (!nextRoomTypeId && query) {
        if (query.includes("conference")) {
          nextRoomTypeId = "1";
          if (!nextModule) {
            nextModule = "Module 1 - Elcot Park - CMB";
          }
        } else if (query.includes("training")) {
          nextRoomTypeId = "2";
          if (!nextModule) {
            nextModule = "Module 2 - Elcot Park - CMB";
          }
        } else if (query.includes("discussion")) {
          nextRoomTypeId = "3";
        }
      }

      return {
        ...prev,
        module: nextModule || prev.module,
        roomTypeId: nextRoomTypeId || prev.roomTypeId,
      };
    });
  }, [searchParams]);

  const [results, setResults] =
    useState([]);

  const [loading, setLoading] =
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

  // ===================================================
  // SEARCH MESSAGE
  // ===================================================

  const [searchMessage, setSearchMessage] =
    useState("");

  const [capacityExceeded, setCapacityExceeded] =
    useState(false);

  // ===================================================
  // CONFLICT WARNING
  // ===================================================

  const [conflictOpen, setConflictOpen] =
    useState(false);

  const [conflictingBooking, setConflictingBooking] =
    useState(null);

  const [pendingRoomId, setPendingRoomId] =
    useState(null);

  // ===================================================
  // LOAD BOOKINGS FROM BACKEND
  // ===================================================

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
    } catch (err) {
      console.error(
        "Unable to load bookings:",
        err
      );

      setBookings([]);
    }
  }

  // ===================================================
  // SEARCH CRITERIA
  // ===================================================

  const canSearch =
    Boolean(filters.module) &&
    Boolean(filters.roomTypeId);

  const canChooseType =
    Boolean(filters.module);

  // ===================================================
  // DYNAMICALLY FILTER ROOM TYPES BASED ON MODULE
  // ===================================================

  const availableRoomTypes = useMemo(() => {
    return roomTypes.filter((type) => {
      if (
        filters.module === "Module 2 - Elcot Park - CMB" &&
        type.name === "Conference"
      ) {
        return false;
      }
      if (
        filters.module === "Module 1 - Elcot Park - CMB" &&
        type.name === "Training"
      ) {
        return false;
      }
      return true;
    });
  }, [roomTypes, filters.module]);

  // ===================================================
  // UPDATE FILTER
  // ===================================================

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

  // ===================================================
  // GET ROOM TYPE NAME
  // ===================================================

  function getRoomTypeName() {
    const roomType =
      roomTypes.find(
        (type) =>
          String(type.id) ===
          String(filters.roomTypeId)
      );

    return roomType?.name || "";
  }

  // ===================================================
  // MODULE / ROOM TYPE VALIDATION
  // ===================================================

  function validateModuleRoomType() {
    const roomType =
      getRoomTypeName();

    if (
      filters.module ===
        "Module 2 - Elcot Park - CMB" &&
      roomType === "Conference"
    ) {
      setSearchMessage(
        "Conference rooms are available only in Module 1 - Elcot Park - CMB. Please select Module 1."
      );

      return false;
    }

    if (
      filters.module ===
        "Module 1 - Elcot Park - CMB" &&
      roomType === "Training"
    ) {
      setSearchMessage(
        "Training rooms are available only in Module 2 - Elcot Park - CMB. Please select Module 2."
      );

      return false;
    }

    return true;
  }

  // ===================================================
  // SEARCH ROOMS
  // ===================================================

  async function handleSearch(e) {
    e.preventDefault();

    setCapacityExceeded(false);
    setSearchMessage("");
    setResults([]);
    setError("");

    // =================================================
    // REQUIRED FIELDS
    // =================================================

    if (!filters.module) {
      setError(
        "Please select a module."
      );
      return;
    }

    if (!filters.roomTypeId) {
      setError(
        "Please select a room type."
      );
      return;
    }

    // =================================================
    // MODULE / ROOM TYPE
    // =================================================

    if (!validateModuleRoomType()) {
      setResultsOpen(true);
      return;
    }

    // =================================================
    // PARTICIPANT VALIDATION & CAPACITY CHECK
    // =================================================

    const requestedCapacity = filters.capacity
      ? Number(filters.capacity)
      : 0;

    if (filters.capacity && requestedCapacity < 1) {
      setError(
        "Number of participants must be at least 1."
      );
      return;
    }

    // =================================================
    // START / END TIME
    // =================================================

    if (
      filters.startTime &&
      filters.endTime &&
      filters.startTime >=
        filters.endTime
    ) {
      setError(
        "End time must be after start time."
      );
      return;
    }

    // =================================================
    // OFFICE HOURS
    // =================================================

    if (
      filters.startTime &&
      filters.startTime <
        OFFICE_START_TIME
    ) {
      setError(
        "Bookings are allowed only during office hours: 10:00 AM to 10:00 PM."
      );
      return;
    }

    if (
      filters.endTime &&
      filters.endTime >
        OFFICE_END_TIME
    ) {
      setError(
        "Bookings are allowed only during office hours: 10:00 AM to 10:00 PM."
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

      // ===============================================
      // TODAY TIME VALIDATION
      // ===============================================

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
          filters.startTime <=
            currentTime
        ) {
          setError(
            "The selected start time has already passed. Please select a future time."
          );
          return;
        }

        if (
          filters.endTime &&
          filters.endTime <=
            currentTime
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

      // =================================================
      // RESPONSE
      // =================================================

      let searchResults = [];
      let backendMessage = "";
      let isCapacityExceeded = false;

      if (
        Array.isArray(data)
      ) {
        searchResults = data;
      } else if (
        data &&
        Array.isArray(data.rooms)
      ) {
        searchResults =
          data.rooms;

        backendMessage =
          data.message || "";

        isCapacityExceeded =
          data.capacityExceeded === true;
      } else if (data) {
        searchResults = [];

        backendMessage =
          data.message || "";

        isCapacityExceeded =
          data.capacityExceeded === true;
      }

      // Filter out rooms that are in Maintenance or Blocked
      let statusOverrides = {};
      let blockedRoomIds = [];
      try {
        statusOverrides = JSON.parse(localStorage.getItem('spacebook_room_status_overrides') || '{}');
        blockedRoomIds = JSON.parse(localStorage.getItem('spacebook_blocked_rooms') || '[]');
      } catch {
        // ignore
      }

      let maintenanceCount = 0;
      const initialCount = searchResults.length;

      searchResults = searchResults.filter((room) => {
        const id = String(room.id ?? room.roomId ?? '').trim();
        const code = String(room.roomNumber ?? room.roomCode ?? room.code ?? '').trim().toLowerCase();

        const override = statusOverrides[id] || (code && statusOverrides[code]);
        if (override && String(override).toLowerCase() === 'maintenance') {
          maintenanceCount++;
          return false;
        }

        if (id && blockedRoomIds.map(String).includes(id)) {
          maintenanceCount++;
          return false;
        }

        const roomStatus = String(room.status || room.roomStatus || '').toLowerCase();
        const isBlocked =
          room.isBlocked === true ||
          room.IsBlocked === true ||
          String(room.isBlocked).toLowerCase() === 'true' ||
          String(room.IsBlocked).toLowerCase() === 'true' ||
          room.isBlocked === 1 ||
          room.IsBlocked === 1 ||
          roomStatus === 'maintenance' ||
          roomStatus === 'blocked';

        if (isBlocked || room.isAvailable === false) {
          maintenanceCount++;
          return false;
        }

        return true;
      });

      // Normalize room types, modules, capacity, and facilities
      searchResults = searchResults.map((room) => {
        const id = room.roomId ?? room.id ?? room.RoomId;
        const name = room.roomName ?? room.name ?? room.RoomName ?? 'Room';
        const code = room.roomNumber ?? room.roomCode ?? room.code ?? '';
        const roomType = getRoomTypeName(room);
        const moduleName = getRoomModuleName(room);
        const capacity = Number(room.capacity ?? room.roomCapacity ?? 4);
        const facilities = normalizeRoomFacilities(room.facilities);

        return {
          ...room,
          roomId: id,
          id: id,
          roomName: name,
          roomNumber: code,
          roomType: roomType,
          module: moduleName,
          capacity: capacity,
          facilities: facilities,
        };
      });

      // Check if backend message indicates capacity failure
      const lowerBackendMsg = String(backendMessage).toLowerCase();
      if (
        isCapacityExceeded ||
        lowerBackendMsg.includes("accommodate") ||
        (lowerBackendMsg.includes("capacity") &&
          lowerBackendMsg.includes("participant"))
      ) {
        isCapacityExceeded = true;
        backendMessage =
          "No room can accommodate the selected number of participants.";
      }

      let finalMessage = backendMessage;

      // =================================================
      // NO-RESULT MESSAGE (Maintenance vs Availability vs Capacity)
      // =================================================

      if (searchResults.length === 0) {
        if (maintenanceCount > 0 && initialCount > 0) {
          finalMessage =
            maintenanceCount === 1
              ? "The requested room is currently under maintenance and temporarily unavailable for booking."
              : "The matching rooms are currently under maintenance and temporarily unavailable for booking.";
        } else if (
          isCapacityExceeded
        ) {
          finalMessage =
            "No room can accommodate the selected number of participants.";
        } else {
          const roomType = getRoomTypeName();

          if (
            roomType === "Conference" &&
            filters.module === "Module 2 - Elcot Park - CMB"
          ) {
            finalMessage =
              "Conference rooms are available only in Module 1 - Elcot Park - CMB.";
          } else if (
            roomType === "Training" &&
            filters.module === "Module 1 - Elcot Park - CMB"
          ) {
            finalMessage =
              "Training rooms are available only in Module 2 - Elcot Park - CMB.";
          } else {
            finalMessage =
              "No rooms are available for the selected date and time. The rooms may already be booked or unavailable.";
          }
        }
      } else if (
        lowerBackendMsg.includes("success") ||
        lowerBackendMsg.includes("found")
      ) {
        finalMessage = "";
      }

      setCapacityExceeded(
        isCapacityExceeded
      );

      setSearchMessage(
        finalMessage
      );

      setResults(
        searchResults
      );

      setResultsOpen(true);
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

  // ===================================================
  // ROOM DETAILS
  // ===================================================

  function handleOpenDetails(room) {
    setSelectedRoom(room);
    setDetailsOpen(true);
  }

  // ===================================================
  // BUILD BOOKING LINK
  // ===================================================

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

  // ===================================================
  // CHECK WHETHER USER HAS TIME CONFLICT
  // ===================================================

  function findUserTimeConflict(roomId) {
    if (
      !filters.date ||
      !filters.startTime ||
      !filters.endTime
    ) {
      return null;
    }

    const requestedStart =
      timeToMinutes(
        filters.startTime
      );

    const requestedEnd =
      timeToMinutes(
        filters.endTime
      );

    if (
      requestedStart === null ||
      requestedEnd === null
    ) {
      return null;
    }

    const conflict =
      bookings.find((booking) => {
        if (
          !isBookingActive(
            booking.status
          )
        ) {
          return false;
        }

        // Same date
        const bookingDate =
          String(
            booking.bookingDate ||
              booking.date ||
              ""
          ).substring(0, 10);

        if (
          bookingDate !==
          filters.date
        ) {
          return false;
        }

        const bookingStart =
          timeToMinutes(
            booking.startTime
          );

        const bookingEnd =
          timeToMinutes(
            booking.endTime
          );

        if (
          bookingStart === null ||
          bookingEnd === null
        ) {
          return false;
        }

        // Check time overlap
        const overlaps =
          requestedStart <
            bookingEnd &&
          requestedEnd >
            bookingStart;

        if (!overlaps) {
          return false;
        }

        // Same room is not the warning
        // we want here. Backend availability
        // should already remove it.
        const bookedRoomId =
          String(
            booking.roomId ?? ""
          );

        const selectedRoomId =
          String(
            roomId ?? ""
          );

        if (
          bookedRoomId ===
          selectedRoomId
        ) {
          return false;
        }

        return true;
      });

    return conflict || null;
  }

  // ===================================================
  // HANDLE BOOK NOW
  // ===================================================

  function handleBookRoom(roomId) {
    const conflict =
      findUserTimeConflict(
        roomId
      );

    if (conflict) {
      setPendingRoomId(roomId);
      setConflictingBooking(
        conflict
      );
      setConflictOpen(true);
      return;
    }

    // No conflict - go directly
    // to booking page.
    window.location.href =
      bookRoomLink(roomId);
  }

  // ===================================================
  // PROCEED AFTER WARNING
  // ===================================================

  function proceedWithBooking() {
    if (!pendingRoomId) {
      return;
    }

    const link =
      bookRoomLink(
        pendingRoomId
      );

    setConflictOpen(false);
    setConflictingBooking(null);
    setPendingRoomId(null);
    setResultsOpen(false);

    window.location.href = link;
  }

  // ===================================================
  // CANCEL WARNING
  // ===================================================

  function cancelConflict() {
    setConflictOpen(false);
    setConflictingBooking(null);
    setPendingRoomId(null);
  }

  // ===================================================
  // STATUS BADGE
  // ===================================================

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

  // ===================================================
  // DATE LIMITS
  // ===================================================

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

  // ===================================================
  // UI
  // ===================================================

  return (
    <div className="space-y-6">

      {/* PAGE HEADER */}

      <div>
        <h1 className="font-display text-3xl font-bold">
          Workspace Search
        </h1>

        <p className="mt-2 text-slate-600">
          Select module and room type to find available rooms.
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

            <Field
              label={
                <span>
                  1. Select Module{" "}
                  <span className="text-red-500">
                    *
                  </span>
                </span>
              }
            >
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

                {modules.map(
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

            <Field
              label={
                <span>
                  2. Select Room Type{" "}
                  <span className="text-red-500">
                    *
                  </span>
                </span>
              }
            >
              <Select
                disabled={!canChooseType}
                value={
                  filters.roomTypeId
                }
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

                {availableRoomTypes.map(
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

            <BusinessDatePicker
              label="4. Booking Date"
              min={todayStr}
              max={maxDateStr}
              value={filters.date}
              onChange={(value) =>
                updateFilter("date", value)
              }
            />

            {/* START TIME */}

            <ScrollableTimePicker
              label="5. Start Time"
              value={filters.startTime}
              selectedDate={filters.date}
              onChange={(value) =>
                updateFilter(
                  "startTime",
                  value
                )
              }
            />

            {/* END TIME */}

            <ScrollableTimePicker
              label="6. End Time"
              value={filters.endTime}
              selectedDate={filters.date}
              minTime={filters.startTime}
              onChange={(value) =>
                updateFilter(
                  "endTime",
                  value
                )
              }
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
                  key={
                    booking.bookingId
                  }
                  className="flex items-center justify-between p-4"
                >
                  <div>
                    <p className="font-semibold">
                      {
                        booking.roomName
                      }
                    </p>

                    <p className="text-sm text-slate-500">
                      {
                        booking.bookingDate
                      }

                      {" • "}

                      {booking.startTime
                        ? normalizeTime(
                            booking.startTime
                          )
                        : ""}

                      {" - "}

                      {booking.endTime
                        ? normalizeTime(
                            booking.endTime
                          )
                        : ""}
                    </p>
                  </div>

                  <span
                    className={`inline-block w-28 rounded-full py-1 text-center text-xs font-bold tracking-wider uppercase ${getStatusBadgeClass(
                      booking.status
                    )}`}
                  >
                    {
                      booking.status
                    }
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

      {/* =================================================
          AVAILABLE ROOMS MODAL
          ================================================= */}

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
        {results.length > 0 && (
          <p className="mb-4 text-sm font-medium text-slate-600">
            {results.length} available workspace{results.length !== 1 ? "s" : ""} found.
          </p>
        )}

        {/* NO RESULTS */}

        {results.length === 0 ? (
          <div className="space-y-3">
            <div
              className={`rounded-xl border p-4.5 ${
                searchMessage.toLowerCase().includes("maintenance")
                  ? "border-amber-200 bg-amber-50/80 text-amber-950"
                  : capacityExceeded
                  ? "border-red-200 bg-red-50 text-red-700"
                  : "border-slate-200 bg-slate-50 text-slate-700"
              }`}
            >
              <p className="text-sm font-semibold">
                {searchMessage ||
                  "No rooms are available for the selected criteria."}
              </p>

              {searchMessage.toLowerCase().includes("maintenance") && (
                <p className="mt-1.5 text-xs text-amber-800">
                  Facilities staff are currently servicing this workspace. Please select an alternative room type, time slot, or campus module.
                </p>
              )}

              {capacityExceeded && (
                <p className="mt-1.5 text-xs text-red-600">
                  Please enter a smaller number of participants and search again.
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="max-h-[60vh] space-y-4 overflow-y-auto pr-1">

            {results.map(
              (room) => (
                <Card
                  key={
                    room.roomId
                  }
                >
                  <div className="flex items-start justify-between">

                    <div>
                      <h3 className="text-lg font-semibold">
                        {
                          room.roomName
                        }
                      </h3>

                      <p className="text-sm text-slate-500">
                        {
                          room.module
                        }
                      </p>
                    </div>

                    <span
                      className={`inline-block w-28 rounded-full py-1 text-center text-xs font-bold tracking-wider uppercase ${getStatusBadgeClass(
                        room.status || "Available"
                      )}`}
                    >
                      {room.status || "Available"}
                    </span>
                  </div>

                  <div className="mt-4 space-y-2 text-sm">

                    <p>
                      <span className="font-medium">
                        Room Type:
                      </span>{" "}
                      {
                        room.roomType
                      }
                    </p>

                    <p>
                      <span className="font-medium">
                        Capacity:
                      </span>{" "}
                      {
                        room.capacity
                      }
                    </p>

                    <p>
                      <span className="font-medium">
                        Facilities:
                      </span>{" "}
                      {room
                        .facilities
                        ?.length
                        ? room.facilities.join(
                            ", "
                          )
                        : "None"}
                    </p>
                  </div>

                  <div className="mt-5 flex gap-3">

                    <Button
                      variant="secondary"
                      className="flex-1"
                      onClick={() =>
                        handleOpenDetails(
                          room
                        )
                      }
                    >
                      View Details
                    </Button>

                    <Button
                      className="flex-1"
                      onClick={() =>
                        handleBookRoom(
                          room.roomId
                        )
                      }
                    >
                      Book Now
                    </Button>

                  </div>
                </Card>
              )
            )}

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
                  {
                    selectedRoom.roomName
                  }
                </p>

                <p className="text-slate-500">
                  {
                    selectedRoom.module
                  }
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
                {
                  selectedRoom.roomType
                }
              </p>

              <p>
                <span className="font-medium text-slate-700">
                  Capacity:
                </span>{" "}
                {
                  selectedRoom.capacity
                }{" "}
                People
              </p>

              <p>
                <span className="font-medium text-slate-700">
                  Facilities:
                </span>{" "}
                {selectedRoom
                  .facilities
                  ?.length
                  ? selectedRoom.facilities.join(
                      ", "
                    )
                  : "None"}
              </p>

              {filters.date && (
                <p>
                  <span className="font-medium text-slate-700">
                    Selected Date:
                  </span>{" "}
                  {
                    filters.date
                  }
                </p>
              )}

              {(filters.startTime ||
                filters.endTime) && (
                <p>
                  <span className="font-medium text-slate-700">
                    Time Slot:
                  </span>{" "}
                  {
                    filters.startTime ||
                    "--:--"
                  }
                  {" - "}
                  {
                    filters.endTime ||
                    "--:--"
                  }
                </p>
              )}
            </div>

            <div className="pt-2">

              <Button
                className="w-full"
                onClick={() => {
                  setDetailsOpen(
                    false
                  );

                  handleBookRoom(
                    selectedRoom.roomId
                  );
                }}
              >
                Proceed to Book
              </Button>

            </div>
          </div>
        )}
      </Modal>

      {/* =================================================
          SAME USER TIME CONFLICT WARNING
          ================================================= */}

      <Modal
        open={conflictOpen}
        title="Existing Booking Found"
        footer={
          <div className="flex justify-end gap-3">

            <Button
              variant="secondary"
              onClick={
                cancelConflict
              }
            >
              Cancel
            </Button>

            <Button
              onClick={
                proceedWithBooking
              }
            >
              Proceed
            </Button>

          </div>
        }
      >
        <div className="space-y-4">

          <div className="rounded-lg border border-amber-300 bg-amber-50 p-4">

            <p className="font-semibold text-amber-800">
              You already have a booking for another room during this time.
            </p>

            <p className="mt-2 text-sm text-amber-700">
              Do you want to proceed with booking this different room as well?
            </p>

          </div>

          {conflictingBooking && (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm">

              <p className="font-semibold text-slate-800">
                Existing Booking
              </p>

              <div className="mt-2 space-y-1 text-slate-600">

                <p>
                  <span className="font-medium">
                    Room:
                  </span>{" "}
                  {
                    conflictingBooking.roomName ||
                    "Another room"
                  }
                </p>

                <p>
                  <span className="font-medium">
                    Date:
                  </span>{" "}
                  {
                    conflictingBooking.bookingDate ||
                    filters.date
                  }
                </p>

                <p>
                  <span className="font-medium">
                    Time:
                  </span>{" "}
                  {
                    conflictingBooking.startTime
                      ? normalizeTime(
                          conflictingBooking.startTime
                        )
                      : "--:--"
                  }
                  {" - "}
                  {
                    conflictingBooking.endTime
                      ? normalizeTime(
                          conflictingBooking.endTime
                        )
                      : "--:--"
                  }
                </p>

              </div>
            </div>
          )}

          <p className="text-sm text-slate-500">
            Click <strong>Proceed</strong> to continue with the new room, or <strong>Cancel</strong> to keep your existing booking.
          </p>

        </div>
      </Modal>

    </div>
  );
}