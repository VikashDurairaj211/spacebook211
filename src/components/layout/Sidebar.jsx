import { useState, useEffect } from 'react'
import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Search, CalendarRange, MapPin, ShieldCheck, Building2, BookOpenCheck, Armchair, BarChart3, Clock } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import client from '../../api/client'

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/workspace-search', label: 'Workspace Search', icon: Search },
  { to: '/workspace-availability', label: 'Workspace Availability', icon: CalendarRange },
  { to: '/hotseat-reservation', label: 'Hotseat Reservation', icon: MapPin },
]

const ADMIN_ITEMS = [
  { to: '/admin/reports', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/admin/workspace-administration', label: 'Workspace Administration', icon: Building2 },
  { to: '/admin/hotseat-management', label: 'Hotseat Management', icon: Armchair },
]

const DEFAULT_FACILITY_OVERVIEW = [
  {
    type: 'Discussion Rooms:',
    capacity: '8 to 10 People',
    facilities: '(Monitor, Speaker, Video Conferencing, Whiteboard, Wi-Fi)',
  },
  {
    type: 'Conference Rooms:',
    capacity: 'Up to 20 People',
    facilities: '(Monitor, Speaker, Video Conferencing, Wi-Fi)',
  },
  {
    type: 'Training Rooms:',
    capacity: 'Up to 50 People',
    facilities: '(Mike, Projector, Speaker, Wi-Fi)',
  },
]

export default function Sidebar({ collapsed = true, modules = [], bookings = [] }) {
  const widthClass = collapsed ? 'w-20' : 'w-64'
  const { user } = useAuth()
  const isAdmin = user?.role === 'Admin' || user?.isAdmin === true
  const [dynamicOverview, setDynamicOverview] = useState(DEFAULT_FACILITY_OVERVIEW)

  useEffect(() => {
    let isMounted = true

    async function loadDynamicFacilities() {
      try {
        let rooms = []
        if (isAdmin) {
          try {
            const { data } = await client.get('/admin/rooms')
            rooms = Array.isArray(data) ? data : data?.data || data?.rooms || []
          } catch {
            // ignore
          }
        } else {
          try {
            const todayStr = new Date().toISOString().split('T')[0]
            const { data } = await client.get('/employee/availability', {
              params: { date: todayStr },
            })
            rooms = data?.rooms || (Array.isArray(data) ? data : [])
          } catch {
            // ignore
          }
        }

        if (!rooms || rooms.length === 0) {
          try {
            rooms = JSON.parse(localStorage.getItem('spacebook_room_inventory') || '[]')
          } catch {
            // ignore
          }
        }

        if (!rooms || !rooms.length || !isMounted) return

        const typeMap = {
          discussion: { name: 'Discussion Rooms:', capacities: [], facilities: new Set() },
          conference: { name: 'Conference Rooms:', capacities: [], facilities: new Set() },
          training: { name: 'Training Rooms:', capacities: [], facilities: new Set() },
        }

        rooms.forEach((r) => {
          const rawType = String(r.roomType || r.type || r.roomTypeName || '').toLowerCase()
          let key = null
          if (rawType.includes('discussion')) key = 'discussion'
          else if (rawType.includes('conference')) key = 'conference'
          else if (rawType.includes('training')) key = 'training'

          if (!key) return

          const cap = Number(r.capacity || r.maxCapacity || r.roomCapacity || 0)
          if (cap > 0) typeMap[key].capacities.push(cap)

          const facList = r.facilities || r.roomFacilities || []
          facList.forEach((f) => {
            const name = typeof f === 'object' && f !== null ? (f.name || f.facilityName) : String(f)
            if (name && name.trim() && name.trim() !== 'undefined' && name.trim() !== 'null') {
              typeMap[key].facilities.add(name.trim())
            }
          })
        })

        const computed = Object.values(typeMap).map((item, idx) => {
          let capText = DEFAULT_FACILITY_OVERVIEW[idx].capacity
          if (item.capacities.length > 0) {
            const min = Math.min(...item.capacities)
            const max = Math.max(...item.capacities)
            capText = min === max ? `Up to ${max} People` : `${min} to ${max} People`
          }

          let facText = DEFAULT_FACILITY_OVERVIEW[idx].facilities
          if (item.facilities.size > 0) {
            facText = `(${Array.from(item.facilities).join(', ')})`
          }

          return {
            type: item.name,
            capacity: capText,
            facilities: facText,
          }
        })

        if (isMounted && computed.length > 0) {
          setDynamicOverview(computed)
        }
      } catch (err) {
        console.warn('Sidebar dynamic facility fetch error:', err)
      }
    }

    loadDynamicFacilities()

    return () => {
      isMounted = false
    }
  }, [])

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
                {/* Facility Overview Card */}
                <div className="rounded-2xl border border-sky-200 bg-white p-3.5 shadow-sm space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-sky-800">
                      Facility Overview
                    </span>
                    <Building2 size={14} className="text-sky-600" />
                  </div>

                  <div className="space-y-2 pt-1">
                    {dynamicOverview.map((item) => (
                      <div key={item.type} className="text-[11px] leading-snug">
                        <p className="font-bold text-sky-950">{item.type}</p>
                        <p className="text-slate-600">
                          {item.capacity} {item.facilities}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Office Policy Card */}
                <div className="rounded-2xl border border-sky-200 bg-white p-3.5 shadow-sm space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-sky-800">
                      Office Policy
                    </span>
                    <Clock size={14} className="text-sky-600" />
                  </div>

                  <div className="flex items-baseline justify-between pt-1">
                    <span className="text-sm font-semibold text-sky-950">10:00 - 22:00 IST</span>
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
                    <span className="text-sm font-semibold text-sky-950">10:00 - 22:00 IST</span>
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
          </div>
        )}
      </div>
    </aside>
  )
}