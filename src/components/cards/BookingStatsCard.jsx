import { useState, useEffect, useCallback } from "react";
import { BarChart3 } from "lucide-react";

const API_BASE = "https://spacebook-505h.onrender.com/api/Hotseat";

export function BookingStatsCard() {
  const [totalSpaces, setTotalSpaces] = useState(229);
  const [availableCount, setAvailableCount] = useState(229);
  const [bookedCount, setBookedCount] = useState(0);
  const [pendingCheckInCount, setPendingCheckInCount] = useState(0);
  const [bookingsToday, setBookingsToday] = useState(0);

  const fetchStatsData = useCallback(async () => {
    try {
      const token = localStorage.getItem("spacebook_token") || "";
      const headers = { Authorization: `Bearer ${token}` };

      // Fetch seats and all hotseat bookings
      const [seatsRes, bookingsRes] = await Promise.all([
        fetch(API_BASE, { headers }),
        fetch(`${API_BASE}/my-bookings`, { headers }),
      ]);

      let seatList = [];
      let bookingList = [];

      if (seatsRes.ok) {
        const rawSeats = await seatsRes.json();
        seatList = Array.isArray(rawSeats) ? rawSeats : rawSeats?.seats || [];
      }

      if (bookingsRes.ok) {
        const rawBookings = await bookingsRes.json();
        bookingList = Array.isArray(rawBookings) ? rawBookings : rawBookings?.bookings || [];
      }

      const total = seatList.length || 229;
      setTotalSpaces(total);

      // Local today date string: YYYY-MM-DD
      const todayStr = new Date().toLocaleDateString("en-CA");

      // Filter bookings relevant for TODAY
      const todayBookings = bookingList.filter((b) => {
        const bDate = (b.date || b.bookingDate || b.expectedCheckIn || "").split("T")[0];
        const status = b.status?.toLowerCase();
        return bDate === todayStr && status !== "cancelled" && status !== "rejected";
      });

      setBookingsToday(todayBookings.length);

      // Count checked-in vs pending check-in for today
      let activeOccupied = 0;
      let pendingCheckIn = 0;

      todayBookings.forEach((b) => {
        const status = b.status?.toLowerCase();
        if (b.checkInTime && !b.releasedOn) {
          // User has actively checked in
          activeOccupied += 1;
        } else if (status === "confirmed" || status === "reserved" || status === "pending" || !b.checkInTime) {
          // Confirmed/Reserved for today but not checked in yet
          pendingCheckIn += 1;
        }
      });

      // Also check if any raw seat object has an explicit status from the API
      seatList.forEach((s) => {
        const status = s.status?.toLowerCase();
        if (status === "occupied" || status === "checked-in") {
          activeOccupied += 1;
        } else if (status === "reserved" || status === "pending") {
          pendingCheckIn += 1;
        }
      });

      // Ensure counts don't double-count or exceed total
      const totalReservedToday = Math.min(total, activeOccupied + pendingCheckIn);
      const calculatedAvailable = Math.max(0, total - totalReservedToday);

      setBookedCount(activeOccupied);
      setPendingCheckInCount(pendingCheckIn);
      setAvailableCount(calculatedAvailable);

    } catch (err) {
      console.error("Failed to load sidebar stats:", err);
    }
  }, []);

  useEffect(() => {
    fetchStatsData();

    const interval = setInterval(fetchStatsData, 15000);
    const handleFocus = () => fetchStatsData();

    window.addEventListener("focus", handleFocus);
    window.addEventListener("booking-updated", handleFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("booking-updated", handleFocus);
    };
  }, [fetchStatsData]);

  return (
    <div className="rounded-2xl border border-sky-200 bg-white p-3.5 shadow-sm space-y-3">
      <div className="flex items-center justify-between">
        <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-sky-800">
          Hotseat Stats
        </span>
        <BarChart3 size={14} className="text-sky-600" />
      </div>

      <div className="flex flex-col gap-2 text-xs">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2 text-slate-700 font-medium">
            <span className="w-2.5 h-2.5 rounded bg-white border-2 border-[#2563EB] inline-block shadow-sm" /> Available
          </span>
          <span className="font-bold text-sky-950">{availableCount}</span>
        </div>

        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2 text-slate-700 font-medium">
            <span className="w-2.5 h-2.5 rounded bg-[#8E9EB5] inline-block shadow-sm" /> Booked
          </span>
          <span className="font-bold text-sky-950">{bookedCount}</span>
        </div>

        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2 text-slate-700 font-medium">
            <span className="w-2.5 h-2.5 rounded bg-[#FEF3C7] border border-[#F59E0B] inline-block shadow-sm" /> Pending Check-in
          </span>
          <span className="font-bold text-sky-950">{pendingCheckInCount}</span>
        </div>
      </div>

      <div className="border-t border-sky-100 my-1" />

      <div className="flex flex-col gap-1.5 text-xs text-sky-900/70">
        <div className="flex items-center justify-between">
          <span>Bookings today</span>
          <span className="font-bold text-sky-950">{bookingsToday}</span>
        </div>

        <div className="flex items-center justify-between">
          <span>Total spaces</span>
          <span className="font-bold text-sky-950">{totalSpaces}</span>
        </div>
      </div>
    </div>
  );
}