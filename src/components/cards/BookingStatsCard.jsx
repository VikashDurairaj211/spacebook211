import { BarChart3 } from "lucide-react";

export function BookingStatsCard({ modules = [], bookings = [] }) {
  // Aggregate all seats across all modules
  const allSeats = modules.flatMap((module) => module.seats || []);

  const totalSpaces = allSeats.length;
  const availableCount = allSeats.filter((seat) => seat.status === "vacant").length;
  const bookedCount = allSeats.filter((seat) => seat.status === "occupied").length;
  const pendingCheckInCount = allSeats.filter(
    (seat) => seat.status === "reserved" || seat.status === "my-booked"
  ).length;

  // Active bookings count for today
  const todayKey = new Date().toISOString().split("T")[0];
  const bookingsToday = bookings.filter(
    (b) => b.date === todayKey && ["RESERVED", "OCCUPIED"].includes(b.status)
  ).length;

  return (
    <div className="rounded-2xl border border-sky-200 bg-white p-3.5 shadow-sm space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-sky-800">
          Hotseat Stats
        </span>
        <BarChart3 size={14} className="text-sky-600" />
      </div>

      {/* Main Status Counts matching legend exact naming & colors */}
      <div className="flex flex-col gap-2 text-xs">
        {/* AVAILABLE */}
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2 text-slate-700 font-medium">
            <span className="w-2.5 h-2.5 rounded bg-white border-2 border-[#2563EB] inline-block shadow-sm" /> Available
          </span>
          <span className="font-bold text-sky-950">{availableCount}</span>
        </div>

        {/* BOOKED */}
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2 text-slate-700 font-medium">
            <span className="w-2.5 h-2.5 rounded bg-[#8E9EB5] inline-block shadow-sm" /> Booked
          </span>
          <span className="font-bold text-sky-950">{bookedCount}</span>
        </div>

        {/* PENDING CHECK-IN */}
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2 text-slate-700 font-medium">
            <span className="w-2.5 h-2.5 rounded bg-[#FEF3C7] border border-[#F59E0B] inline-block shadow-sm" /> Pending Check-in
          </span>
          <span className="font-bold text-sky-950">{pendingCheckInCount}</span>
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-sky-100 my-1" />

      {/* Footer Metrics */}
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