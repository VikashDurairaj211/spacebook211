import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Search, CalendarRange, MapPin, ShieldCheck, Building2, BookOpenCheck, BarChart3, Clock } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { BookingStatsCard } from '../cards/BookingStatsCard'

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/search-rooms', label: 'Search Rooms', icon: Search },
  { to: '/availability-calendar', label: 'Availability Calendar', icon: CalendarRange },
  { to: '/office-map', label: 'Hotseat Reservation', icon: MapPin },
]

const ADMIN_ITEMS = [
  { to: '/admin/dashboard', label: 'Dashboard', icon: ShieldCheck },
  { to: '/admin/room-management', label: 'Room Management', icon: Building2 },
  { to: '/admin/booking-management', label: 'Booking Management', icon: BookOpenCheck },
  { to: '/admin/reports', label: 'Reports', icon: BarChart3 },
]

export default function Sidebar({ collapsed = true, modules = [], bookings = [] }) {
  const widthClass = collapsed ? 'w-20' : 'w-64'
  const { user } = useAuth()
  const isAdmin = user?.role === 'Admin' || user?.isAdmin === true

  return (
    <aside className={`hidden md:fixed md:top-14 md:left-0 md:h-[calc(100%-3.5rem)] md:overflow-y-auto md:flex md:flex-col border-r border-sky-200 bg-sky-50/60 transition-all duration-200 ${widthClass}`}>
      <div className="px-4 py-4 space-y-6">
        {/* Show workspace menu & widgets for non-admin users */}
        {!isAdmin && (
          <>
            <div>
              <p className={`mb-2 font-mono text-[11px] uppercase tracking-[0.25em] text-sky-800/70 ${collapsed ? 'hidden' : 'block'}`}>Workspace</p>
              <ul className="space-y-1.5">
                {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
                  <li key={to}>
                    <NavLink
                      to={to}
                      end={end}
                      className={({ isActive }) =>
                        `flex items-center gap-3 rounded-full px-4 py-2.5 text-sm transition-all duration-200 ${isActive
                          ? 'bg-sky-600 text-white font-medium shadow-sm'
                          : 'text-sky-950 hover:bg-sky-200/60 hover:text-sky-900'
                        } ${collapsed ? 'justify-center px-2' : ''}`
                      }
                    >
                      <Icon size={18} />
                      {!collapsed && <span>{label}</span>}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>

            {!collapsed && (
              <div className="pt-2 space-y-4">
                {/* Live Hotseat Stats Card */}
                <BookingStatsCard modules={modules} bookings={bookings} />

                {/* Office Policy Card */}
                <div className="rounded-2xl border border-sky-200 bg-white p-3.5 shadow-sm space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-sky-800">
                      Office Policy
                    </span>
                    <Clock size={14} className="text-sky-600" />
                  </div>

                  <div className="flex items-baseline justify-between pt-1">
                    <span className="text-sm font-semibold text-sky-950">10:00 - 19:00 IST</span>
                    <span className="text-[10px] text-sky-800 font-medium bg-sky-100 px-2 py-0.5 rounded-full">
                      Active Hours
                    </span>
                  </div>
                  <p className="text-[11px] text-sky-900/70 leading-tight">
                    Ensure standard room reservations comply with operational office time slots.
                  </p>
                </div>
              </div>
            )}
          </>
        )}

        {/* Show admin menu & Office Policy card for admin users */}
        {isAdmin && (
          <div>
            <p className={`mb-2 font-mono text-[11px] uppercase tracking-[0.25em] text-sky-800/70 ${collapsed ? 'hidden' : 'block'}`}>Admin</p>
            <ul className="space-y-1.5">
              {ADMIN_ITEMS.map(({ to, label, icon: Icon }) => (
                <li key={to}>
                  <NavLink
                    to={to}
                    className={({ isActive }) =>
                      `flex items-center gap-3 rounded-full px-4 py-2.5 text-sm transition-all duration-200 ${isActive
                        ? 'bg-sky-600 text-white font-medium shadow-sm'
                        : 'text-sky-950 hover:bg-sky-200/60 hover:text-sky-900'
                      } ${collapsed ? 'justify-center px-2' : ''}`
                    }
                  >
                    <Icon size={18} />
                    {!collapsed && <span>{label}</span>}
                  </NavLink>
                </li>
              ))}
            </ul>

            {!collapsed && (
              <div className="mt-6 pt-2 space-y-4">
                {/* Office Policy Card for Admin */}
                <div className="rounded-2xl border border-sky-200 bg-white p-3.5 shadow-sm space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-sky-800">
                      Office Policy
                    </span>
                    <Clock size={14} className="text-sky-600" />
                  </div>

                  <div className="flex items-baseline justify-between pt-1">
                    <span className="text-sm font-semibold text-sky-950">10:00 - 19:00 IST</span>
                    <span className="text-[10px] text-sky-800 font-medium bg-sky-100 px-2 py-0.5 rounded-full">
                      Active Hours
                    </span>
                  </div>
                  <p className="text-[11px] text-sky-900/70 leading-tight">
                    Ensure standard booking approvals comply with operational office time slots.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  )
}