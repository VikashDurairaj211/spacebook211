import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Card from "../components/common/Card";
import StatusTag from "../components/common/StatusTag";
import DashboardCard from "../components/cards/DashboardCard";
import * as employeeApi from "../api/employee";

export default function Dashboard() {
  const { user } = useAuth();

  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboard() {
      try {
        const data = await employeeApi.getDashboard();

console.log("Dashboard Data:", data);

setDashboard(data);
      } catch (err) {
        console.error("Dashboard Error:", err);
      } finally {
        setLoading(false);
      }
    }

    loadDashboard();
  }, []);

  if (user?.role === "Admin") {
    return <Navigate to="/admin/dashboard" replace />;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-600">
        Loading dashboard...
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <Card className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-xs uppercase tracking-[0.25em] text-slate-500">
          {new Date().toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
          })}
        </p>

        <h1 className="mt-2 text-4xl font-bold">
          Welcome, {user?.name}
        </h1>

        <p className="mt-3 text-slate-600">
          Find and reserve a workspace for your next meeting.
        </p>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <DashboardCard
          title="Bookings Today"
          value={dashboard?.bookingsToday ?? 0}
          tone="warning"
        />

        <DashboardCard
          title="Upcoming"
          value={dashboard?.upcomingCount ?? 0}
        />

        <DashboardCard
          title="Today's Meetings"
          value={dashboard?.bookingsToday ?? 0}
        />
      </div>

      {/* Recent Reservations */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            Recent Reservations
          </h2>

          <Link
            to="/my-bookings"
            className="text-sm text-blue-600 hover:underline"
          >
            View all
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b">
                <th className="py-3">ROOM</th>
                <th className="py-3">DATE</th>
                <th className="py-3">TIME</th>
                <th className="py-3">STATUS</th>
              </tr>
            </thead>

            <tbody>
              {dashboard?.recentReservations?.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="py-6 text-center text-slate-500"
                  >
                    No reservations found.
                  </td>
                </tr>
              ) : (
                dashboard?.recentReservations?.map((booking) => (
                  <tr
                    key={booking.bookingId}
                    className="border-b hover:bg-slate-50"
                  >
                    <td className="py-4">
                      {booking.roomName}
                    </td>

                    <td>{booking.bookingDate}</td>

                    <td>
                      {booking.startTime.substring(0, 5)} -{" "}
                      {booking.endTime.substring(0, 5)}
                    </td>

                    <td>
                      <StatusTag status={booking.status} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}