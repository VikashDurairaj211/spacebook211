import { Search, Bell, User, Menu, PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import { useState, useMemo, useRef } from 'react'
import { rooms as ROOMS, bookings as BOOKINGS, notifications as NOTIFS } from '../../services/mockData'
import NotificationDropdown from '../common/NotificationDropdown'
import Logo from '../../../Logo.jpg'

export default function TopNav({ onToggleSidebar, sidebarCollapsed, publicOnly = false }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const [notificationOpen, setNotificationOpen] = useState(false)
  const [searchInput, setSearchInput] = useState('')
  const [showSearchResults, setShowSearchResults] = useState(false)
  const [notifications, setNotifications] = useState(() => NOTIFS)
  const notificationButtonRef = useRef(null)

  const unreadCount = notifications.filter((notification) => notification.unread).length

  const searchResults = useMemo(() => {
    if (!searchInput.trim()) return { rooms: [], bookings: [] }

    const query = searchInput.toLowerCase()
    const matchedRooms = ROOMS.filter((room) =>
      room.name.toLowerCase().includes(query) ||
      room.code.toLowerCase().includes(query) ||
      room.module.toLowerCase().includes(query)
    ).slice(0, 5)

    const matchedBookings = BOOKINGS.filter((booking) =>
      booking.roomName.toLowerCase().includes(query) ||
      booking.title.toLowerCase().includes(query)
    ).slice(0, 5)

    return { rooms: matchedRooms, bookings: matchedBookings }
  }, [searchInput])

  function handleSearch(e) {
    e.preventDefault()
    if (searchInput.trim()) {
      navigate(`/search-rooms?q=${encodeURIComponent(searchInput)}`)
      setSearchInput('')
      setShowSearchResults(false)
    }
  }

  async function handleLogout() {
    await logout()
    navigate('/login')
  }

  return (
    <header className="fixed inset-x-0 top-0 z-40 flex h-14 items-center justify-between border-b border-slate-200 bg-portal-nav px-4 text-white shadow-sm md:px-6">
      <div className="flex items-center gap-3">
        {!publicOnly && <button
          onClick={onToggleSidebar}
          className="rounded-lg border border-white/20 p-2 transition bg-white/5 text-white hover:bg-white/10"
          aria-label="Toggle sidebar"
        >
          {sidebarCollapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
        </button>}
        <div className="flex items-center gap-2">
          <img src={Logo} alt="Spacebook logo" className="h-10 w-10 rounded-full border border-white/20 bg-white/10 object-cover" />
          <div>
            <span className="block font-display text-sm font-700 tracking-tight text-white">Spacebook</span>
           
          </div>
        </div>
      </div>

      {!publicOnly && <form onSubmit={handleSearch} className="relative mx-6 hidden max-w-md flex-1 md:flex">
        <div className="flex w-full items-center gap-2 border border-white/20 bg-white/10 px-3 py-1.5 rounded-lg">
          <Search size={15} className="text-slate-200" />
          <input
            type="text"
            placeholder="Search rooms, bookings..."
            value={searchInput}
            onChange={(e) => {
              setSearchInput(e.target.value)
              setShowSearchResults(true)
            }}
            onFocus={() => searchInput && setShowSearchResults(true)}
            className="w-full bg-transparent text-sm outline-none placeholder:text-slate-200"
          />
        </div>

        {showSearchResults && searchInput.trim() && (
          <div className="absolute top-full left-0 right-0 mt-2 max-h-64 overflow-auto rounded-lg border border-line bg-white shadow-lg z-50">
            {searchResults.rooms.length > 0 && (
              <div className="border-b border-line">
                <div className="px-3 py-2 font-mono text-[11px] uppercase tracking-[0.2em] text-slate bg-portal-bg">Rooms</div>
                {searchResults.rooms.map((room) => (
                  <button
                    key={room.id}
                    onClick={() => {
                      navigate(`/search-rooms?q=${encodeURIComponent(room.name)}`)
                      setSearchInput('')
                      setShowSearchResults(false)
                    }}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-portal-bg"
                  >
                    <div className="font-medium text-ink">{room.name}</div>
                    <div className="text-xs text-slate">{room.module} · {room.type}</div>
                  </button>
                ))}
              </div>
            )}

            {searchResults.bookings.length > 0 && (
              <div>
                <div className="px-3 py-2 font-mono text-[11px] uppercase tracking-[0.2em] text-slate bg-portal-bg">Bookings</div>
                {searchResults.bookings.map((booking) => (
                  <button
                    key={booking.id}
                    onClick={() => {
                      navigate(`/search-rooms?q=${encodeURIComponent(booking.roomName)}`)
                      setSearchInput('')
                      setShowSearchResults(false)
                    }}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-portal-bg"
                  >
                    <div className="font-medium text-ink">{booking.title}</div>
                    <div className="text-xs text-slate">{booking.roomName} · {booking.date}</div>
                  </button>
                ))}
              </div>
            )}

            {searchResults.rooms.length === 0 && searchResults.bookings.length === 0 && (
              <div className="px-3 py-4 text-center text-sm text-slate">No results found</div>
            )}
          </div>
        )}
      </form>}

      {!publicOnly && <div className="flex items-center gap-3">
        <div className="relative">
          <button
            ref={notificationButtonRef}
            onClick={() => {
              setNotificationOpen((value) => !value)
              setMenuOpen(false)
            }}
            className="relative rounded-lg p-2 text-white hover:bg-white/10"
            aria-label="Notifications"
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span className="pointer-events-none absolute -right-1 -top-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-400 px-1.5 text-[10px] font-semibold text-white">
                {unreadCount}
              </span>
            )}
          </button>

          <NotificationDropdown
            open={notificationOpen}
            buttonRef={notificationButtonRef}
            notifications={notifications}
            onClose={() => setNotificationOpen(false)}
            onMarkAllRead={() => setNotifications((prev) => prev.map((notification) => ({ ...notification, unread: false })))}
            onViewAll={() => {
              navigate('/notifications')
              setNotificationOpen(false)
            }}
          />
        </div>

        <div className="relative">
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="flex items-center gap-2 rounded-lg border border-white/20 px-2 py-1 text-sm text-white hover:bg-white/10"
          >
            <User size={15} />
            <span className="hidden font-mono text-xs md:inline">{user?.name || 'Employee'}</span>
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-full mt-1 w-40 border border-slate-200 bg-white text-sm text-ink shadow-sm rounded-lg">
              <button
                onClick={() => {
                  navigate('/profile')
                  setMenuOpen(false)
                }}
                className="block w-full px-3 py-2 text-left hover:bg-slate-50"
              >
                Profile
              </button>
              <button onClick={handleLogout} className="block w-full px-3 py-2 text-left text-clay hover:bg-slate-50">
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>}
    </header>
  )
}
