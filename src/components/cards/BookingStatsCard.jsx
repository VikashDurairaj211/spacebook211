import { useState, useEffect } from "react";
import { BarChart3 } from "lucide-react";

const API_BASE = "https://spacebook-505h.onrender.com/api/Hotseat";

export function BookingStatsCard() {
  const [modules, setModules] = useState([]);
  const [bookings, setBookings] = useState([]);

  useEffect(() => {
    async function fetchStatsData() {
      try {
        const token = localStorage.getItem("spacebook_token") || "";
        const headers = { Authorization: `Bearer ${token}` };

        const [seatsRes, bookingsRes] = await Promise.all([
          fetch(API_BASE, { headers }),
          fetch(`${API_BASE}/my-bookings`, { headers }),
        ]);

        if (seatsRes.ok) {
          const rawSeats = await seatsRes.json();
          const module1Seats = rawSeats
            .filter((s) => s.seatNumber.includes("EO1"))
            .map((s) => ({ status: s.status }));
          const module2Seats = rawSeats
            .filter((s) => s.seatNumber.includes("EO2"))
            .map((s) => ({ status: s.status }));

          setModules([
            { id: "module1", seats: module1Seats },
            { id: "module2", seats: module2Seats },
          ]);
        }

        if (bookingsRes.ok) {
          const myBookings = await bookingsRes.json();
          setBookings(myBookings);
        }
      } catch (err) {
        console.error("Failed to load sidebar stats:", err);
      }
    }

    fetchStatsData();
  }, []);

  const allSeats = modules.flatMap((module) => module.seats || []);

  const totalSpaces = allSeats.length;
  const availableCount = allSeats.filter((seat) => seat.status?.toLowerCase() === "vacant").length;
  const bookedCount = allSeats.filter((seat) => seat.status?.toLowerCase() === "occupied" || seat.status?.toLowerCase() === "booked").length;
  const pendingCheckInCount = allSeats.filter(
    (seat) => seat.status?.toLowerCase() === "reserved" || seat.status === "my-booked"
  ).length;

  const todayKey = new Date().toISOString().split("T")[0];
  const bookingsToday = bookings.filter(
    (b) => (b.bookingDate === todayKey || b.date === todayKey)
  ).length;

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