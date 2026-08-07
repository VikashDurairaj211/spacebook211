import { Search, Bell, User, PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import { useState, useMemo, useRef, useEffect } from 'react'
import axios from 'axios'
import { rooms as ROOMS, bookings as BOOKINGS } from '../../services/mockData'
import NotificationDropdown from '../common/NotificationDropdown'
import Logo from '../../../Logo.jpg'

export default function TopNav({ onToggleSidebar, sidebarCollapsed, publicOnly = false }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const [notificationOpen, setNotificationOpen] = useState(false)
  const [searchInput, setSearchInput] = useState('')
  const [showSearchResults, setShowSearchResults] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [loadingNotifications, setLoadingNotifications] = useState(false)
  const notificationButtonRef = useRef(null)

  // Fetch Live Notifications from Backend
  const fetchNotifications = async () => {
    try {
      setLoadingNotifications(true)
      const token = localStorage.getItem('spacebook_token')
      if (!token) return

      const res = await axios.get('http://localhost:5263/api/employee/notifications', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })
      setNotifications(res.data || [])
    } catch (err) {
      console.error('Failed to fetch notifications in TopNav:', err)
    } finally {
      setLoadingNotifications(false)
    }
  }

  // Handle Mark All As Read API Call
  const handleMarkAllRead = async () => {
    try {
      const token = localStorage.getItem('spacebook_token')
      await axios.patch(
        'http://localhost:5263/api/notifications/read-all',
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      )
      // Update local state immediately
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))

      // Notify other pages/components to refresh
      window.dispatchEvent(new Event('notificationsRead'))
    } catch (err) {
      console.error('Failed to mark notifications as read:', err)
    }
  }

  useEffect(() => {
    if (!publicOnly) {
      fetchNotifications()
    }

    // Listen for read-all events triggered anywhere in the app
    window.addEventListener('notificationsRead', fetchNotifications)
    return () => window.removeEventListener('notificationsRead', fetchNotifications)
  }, [publicOnly])

  const unreadCount = useMemo(() => {
    return notifications.filter((n) => !n.isRead).length
  }, [notifications])

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

  function handleSearchSubmit(e) {
    if (e) e.preventDefault()
    if (searchInput.trim()) {
      navigate(`/search-rooms?q=${encodeURIComponent(searchInput.trim())}`)
      setShowSearchResults(false)
    }
  }

  function handleSelectResult(queryTerm) {
    navigate(`/search-rooms?q=${encodeURIComponent(queryTerm)}`)
    setSearchInput('')
    setShowSearchResults(false)
  }

  async function handleLogout() {
    await logout()
    navigate('/login')
  }

  return (
    <header className="fixed inset-x-0 top-0 z-40 flex h-14 items-center justify-between border-b border-slate-200 bg-portal-nav px-4 text-white shadow-sm md:px-6 font-sans">
      <div className="flex items-center gap-3">
        {!publicOnly && (
          <button
            onClick={onToggleSidebar}
            className="rounded-lg border border-white/20 p-2 transition bg-white/5 text-white hover:bg-white/10"
            aria-label="Toggle sidebar"
          >
            {sidebarCollapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
          </button>
        )}
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/dashboard')}>
          <img src={Logo} alt="Spacebook logo" className="h-10 w-10 rounded-full border border-white/20 bg-white/10 object-cover" />
          <div>
            <span className="block font-display text-sm font-bold tracking-tight text-white">Spacebook</span>
          </div>
        </div>
      </div>

      {!publicOnly && (
        <form onSubmit={handleSearchSubmit} className="relative mx-6 hidden max-w-md flex-1 md:flex">
          <div className="flex w-full items-center gap-2 border border-white/20 bg-white/10 px-3 py-1.5 rounded-lg focus-within:border-white/50">
            <button type="submit" className="text-white hover:opacity-80 transition-opacity">
              <Search size={15} className="text-white" />
            </button>
            <input
              type="text"
              placeholder="Search rooms, bookings..."
              value={searchInput}
              onChange={(e) => {
                setSearchInput(e.target.value)
                setShowSearchResults(true)
              }}
              onFocus={() => searchInput && setShowSearchResults(true)}
              className="w-full bg-transparent text-sm outline-none placeholder:text-slate-200 text-white font-sans"
            />
          </div>

          {showSearchResults && searchInput.trim() && (
            <div className="absolute top-full left-0 right-0 mt-2 max-h-64 overflow-auto rounded-lg border border-line bg-white shadow-lg z-50 text-ink">
              {searchResults.rooms.length > 0 && (
                <div className="border-b border-line">
                  <div className="px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-slate bg-portal-bg">
                    Rooms
                  </div>
                  {searchResults.rooms.map((room) => (
                    <button
                      key={room.id}
                      type="button"
                      onClick={() => handleSelectResult(room.name)}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-portal-bg/80 transition-colors flex flex-col font-sans"
                    >
                      <span className="font-medium text-ink">{room.name}</span>
                      <span className="text-xs text-slate">{room.module} · {room.type}</span>
                    </button>
                  ))}
                </div>
              )}

              {searchResults.bookings.length > 0 && (
                <div>
                  <div className="px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-slate bg-portal-bg">
                    Bookings
                  </div>
                  {searchResults.bookings.map((booking) => (
                    <button
                      key={booking.id}
                      type="button"
                      onClick={() => handleSelectResult(booking.title || booking.roomName)}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-portal-bg/80 transition-colors flex flex-col font-sans"
                    >
                      <span className="font-medium text-ink">{booking.title}</span>
                      <span className="text-xs text-slate">{booking.roomName} · {booking.date}</span>
                    </button>
                  ))}
                </div>
              )}

              {searchResults.rooms.length === 0 && searchResults.bookings.length === 0 && (
                <div className="px-3 py-4 text-center text-sm text-slate font-sans">No rooms or bookings found</div>
              )}
            </div>
          )}
        </form>
      )}

      {!publicOnly && (
        <div className="flex items-center gap-3">
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
              loading={loadingNotifications}
              onClose={() => setNotificationOpen(false)}
              onMarkAllRead={handleMarkAllRead}
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
              <span className="max-w-[120px] truncate font-mono text-xs">{user?.name || 'Employee'}</span>
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-full mt-1 w-32 border border-slate-200 bg-white text-sm text-ink shadow-md rounded-lg py-1 font-sans">
                <button onClick={handleLogout} className="block w-full px-3 py-2 text-left text-clay hover:bg-slate-50 transition-colors font-medium">
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  )
}