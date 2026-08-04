import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Search, CalendarRange, ClipboardList, ShieldCheck, Building2, BookOpenCheck, BarChart3 } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/search-rooms', label: 'Search Rooms', icon: Search },
  { to: '/availability-calendar', label: 'Availability Calendar', icon: CalendarRange },
  { to: '/my-bookings', label: 'My Bookings', icon: ClipboardList },
]

const ADMIN_ITEMS = [
  { to: '/admin/dashboard', label: 'Dashboard', icon: ShieldCheck },
  { to: '/admin/room-management', label: 'Room Management', icon: Building2 },
  { to: '/admin/booking-management', label: 'Booking Management', icon: BookOpenCheck },
  { to: '/admin/reports', label: 'Reports', icon: BarChart3 },
]

export default function Sidebar({ collapsed = false }) {
  // width classes used for fixed positioning and spacing
  const widthClass = collapsed ? 'w-20' : 'w-64'

  const { user } = useAuth()

  const isAdmin = user?.role === 'Admin'

  return (
    // On md+ we make the sidebar fixed so it remains while scrolling
    <aside className={`hidden md:fixed md:top-14 md:left-0 md:h-[calc(100%-3.5rem)] md:overflow-auto md:block border-r border-slate-200 bg-portal-bg transition-all duration-200 ${widthClass}`}>
      <div className="px-4 py-4">
        {/* Show workspace menu only for non-admin users */}
        {!isAdmin && (
          <>
            <p className={`mb-2 font-mono text-[11px] uppercase tracking-[0.25em] text-slate-500 ${collapsed ? 'hidden' : 'block'}`}>Workspace</p>
            <ul className="space-y-1">
              {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
                <li key={to}>
                  <NavLink
                    to={to}
                    end={end}
                    className={({ isActive }) =>
                      `flex items-center gap-3 rounded-sm px-3 py-2.5 text-sm transition ${
                        isActive
                          ? 'bg-portal-nav text-white'
                          : 'text-slate-700 hover:bg-white hover:text-ink'
                      } ${collapsed ? 'justify-center px-2' : ''}`
                    }
                  >
                    <Icon size={16} />
                    {!collapsed && <span>{label}</span>}
                  </NavLink>
                </li>
              ))}
            </ul>
          </>
        )}

        {/* Admin menu only for admins */}
        {isAdmin && (
          <div className="mt-6">
            <p className={`mb-2 font-mono text-[11px] uppercase tracking-[0.25em] text-slate-500 ${collapsed ? 'hidden' : 'block'}`}>Admin</p>
            <ul className="space-y-1">
              {ADMIN_ITEMS.map(({ to, label, icon: Icon }) => (
                <li key={to}>
                  <NavLink
                    to={to}
                    className={({ isActive }) =>
                      `flex items-center gap-3 rounded-sm px-3 py-2.5 text-sm transition ${
                        isActive
                          ? 'bg-portal-nav text-white'
                          : 'text-slate-700 hover:bg-white hover:text-ink'
                      } ${collapsed ? 'justify-center px-2' : ''}`
                    }
                  >
                    <Icon size={16} />
                    {!collapsed && <span>{label}</span>}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </aside>
  )
}
