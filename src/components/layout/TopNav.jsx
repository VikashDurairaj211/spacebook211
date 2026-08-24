import {
  Search,
  Bell,
  User,
  PanelLeftClose,
  PanelLeftOpen,
  Home,
  X,
  HelpCircle,
  BookOpen,
} from 'lucide-react'

import { useAuth } from '../../context/AuthContext'
import { useNavigate, useLocation } from 'react-router-dom'
import { useState, useMemo, useRef, useEffect } from 'react'

import client from '../../api/client'
import NotificationDropdown from '../common/NotificationDropdown'

export default function TopNav({
  onToggleSidebar,
  sidebarCollapsed,
  publicOnly = false,
}) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [menuOpen, setMenuOpen] = useState(false)
  const [notificationOpen, setNotificationOpen] = useState(false)
  const [searchInput, setSearchInput] = useState('')
  const [showSearchResults, setShowSearchResults] = useState(false)

  const [liveRooms, setLiveRooms] = useState([])
  const [liveBookings, setLiveBookings] = useState([])

  const [notifications, setNotifications] = useState([])
  const [loadingNotifications, setLoadingNotifications] = useState(false)

  const notificationButtonRef = useRef(null)
  const searchContainerRef = useRef(null)

  // =====================================================
  // Determine whether logged-in user is Admin
  // =====================================================

  const isAdmin =
    user?.role === 'Admin' ||
    user?.role === 'admin' ||
    user?.isAdmin === true

  // =====================================================
  // Synchronize search input with URL search parameters for Room Management
  // =====================================================

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const urlSearch = params.get('search') || params.get('q') || ''

    if (location.pathname === '/admin/room-management') {
      setSearchInput(urlSearch)
    } else if (location.pathname === '/admin/reports' || location.pathname === '/search-rooms' || location.pathname === '/my-bookings') {
      setSearchInput(urlSearch)
    } else {
      setSearchInput('')
    }
  }, [location.pathname, location.search])

  // =====================================================
  // Close search dropdown on click outside
  // =====================================================

  useEffect(() => {
    function handleClickOutside(event) {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(event.target)
      ) {
        setShowSearchResults(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  // =====================================================
  // Fetch Live Rooms and Bookings for Autocomplete
  // =====================================================

  useEffect(() => {
    if (publicOnly || !user) {
      return
    }

    async function loadSearchData() {
      try {
        if (isAdmin) {
          const [roomsRes, bookingsRes] = await Promise.allSettled([
            client.get('/admin/rooms'),
            client.get('/admin/bookings'),
          ])

          if (roomsRes.status === 'fulfilled' && roomsRes.value.data) {
            const raw = roomsRes.value.data
            const list = Array.isArray(raw)
              ? raw
              : raw.data || raw.rooms || []
            setLiveRooms(list)
          }

          if (bookingsRes.status === 'fulfilled' && bookingsRes.value.data) {
            const raw = bookingsRes.value.data
            const list = Array.isArray(raw)
              ? raw
              : raw.data || raw.bookings || []
            setLiveBookings(list)
          }
        } else {
          const now = new Date()
          const day = now.getDay()
          const target = new Date(now)
          // If Saturday (+2) or Sunday (+1), use Monday
          if (day === 6) target.setDate(now.getDate() + 2)
          else if (day === 0) target.setDate(now.getDate() + 1)

          const year = target.getFullYear()
          const month = String(target.getMonth() + 1).padStart(2, '0')
          const d = String(target.getDate()).padStart(2, '0')
          const targetDateStr = `${year}-${month}-${d}`

          const [availRes, myBookingsRes] = await Promise.allSettled([
            client.get('/employee/availability', {
              params: { date: targetDateStr },
            }),
            client.get('/employee/mybookings'),
          ])

          if (availRes.status === 'fulfilled' && availRes.value.data) {
            const raw = availRes.value.data
            const list = Array.isArray(raw)
              ? raw
              : raw.rooms || raw.data || []
            setLiveRooms(list)
          }

          if (myBookingsRes.status === 'fulfilled' && myBookingsRes.value.data) {
            const raw = myBookingsRes.value.data
            const list = Array.isArray(raw)
              ? raw
              : raw.data || raw.bookings || []
            setLiveBookings(list)
          }
        }
      } catch (error) {
        console.error('Failed to pre-fetch search autocomplete data:', error)
      }
    }

    loadSearchData()
  }, [publicOnly, user, isAdmin])

  // Helper to get locally marked read notification IDs
  const getReadNotificationIds = () => {
    try {
      const raw = localStorage.getItem('spacebook_read_notifications')
      return raw ? JSON.parse(raw) : []
    } catch (e) {
      return []
    }
  }

  const saveReadNotificationIds = (ids) => {
    try {
      const existing = getReadNotificationIds()
      const merged = Array.from(new Set([...existing, ...ids]))
      localStorage.setItem('spacebook_read_notifications', JSON.stringify(merged))
    } catch (e) {
      // ignore
    }
  }

  // Helper to get locally cleared/dismissed notification IDs
  const getClearedNotificationIds = () => {
    try {
      const raw = localStorage.getItem('spacebook_cleared_notifications')
      return raw ? JSON.parse(raw) : []
    } catch (e) {
      return []
    }
  }

  const saveClearedNotificationIds = (ids) => {
    try {
      const existing = getClearedNotificationIds()
      const merged = Array.from(new Set([...existing, ...ids]))
      localStorage.setItem('spacebook_cleared_notifications', JSON.stringify(merged))
    } catch (e) {
      // ignore
    }
  }

  // =====================================================
  // Fetch Notifications
  // =====================================================

  const fetchNotifications = async () => {
    try {
      setLoadingNotifications(true)

      const token = localStorage.getItem('spacebook_token')

      if (!token || !user) {
        setNotifications([])
        return
      }

      const endpoint = isAdmin
        ? '/admin/notifications'
        : '/employee/notifications'

      const response = await client.get(endpoint)
      const rawList = Array.isArray(response.data)
        ? response.data
        : response.data?.notifications || []

      const readIds = new Set(getReadNotificationIds().map(String))
      const clearedIds = new Set(getClearedNotificationIds().map(String))

      const mapped = rawList
        .map((n, idx) => {
          const id = String(n.notificationId ?? n.id ?? n._id ?? idx)
          const isRead =
            n.isRead === true ||
            n.is_read === true ||
            n.read === true ||
            readIds.has(id)

          return {
            ...n,
            notificationId: id,
            isRead,
          }
        })
        .filter((n) => !clearedIds.has(String(n.notificationId)))

      setNotifications(mapped)
    } catch (error) {
      console.error('Failed to fetch notifications in TopNav:', error)
      setNotifications([])
    } finally {
      setLoadingNotifications(false)
    }
  }

  // =====================================================
  // Mark All Notifications As Read
  // =====================================================

  const handleMarkAllRead = async () => {
    try {
      const token = localStorage.getItem('spacebook_token')

      if (!token) {
        return
      }

      const endpoint = isAdmin
        ? '/admin/notifications/read-all'
        : '/employee/notifications/read-all'

      // Call backend
      try {
        await client.patch(endpoint, {})
      } catch (err) {
        try {
          await client.put(endpoint, {})
        } catch (e) {
          // ignore
        }
      }

      // Persist read IDs locally
      const currentIds = notifications.map((n, idx) =>
        String(n.notificationId ?? n.id ?? n._id ?? idx)
      )
      saveReadNotificationIds(currentIds)

      setNotifications([])

      window.dispatchEvent(new Event('notificationsRead'))
    } catch (error) {
      console.error('Failed to mark notifications as read:', error)
    }
  }

  // =====================================================
  // Load Notifications
  // =====================================================

  useEffect(() => {
    if (publicOnly || !user) {
      return
    }

    fetchNotifications()

    const handleNotificationRefresh = () => {
      fetchNotifications()
    }

    window.addEventListener('notificationsRead', handleNotificationRefresh)

    return () => {
      window.removeEventListener('notificationsRead', handleNotificationRefresh)
    }
  }, [publicOnly, user, isAdmin])

  // =====================================================
  // Unread Count
  // =====================================================

  const unreadCount = useMemo(() => {
    return notifications.filter((notification) => !notification.isRead).length
  }, [notifications])

  // =====================================================
  // Search Results
  // =====================================================

  const searchResults = useMemo(() => {
    if (!searchInput.trim()) {
      return {
        rooms: [],
        bookings: [],
      }
    }

    const query = searchInput.trim().toLowerCase()

    const roomDataSource = liveRooms
    const bookingDataSource = liveBookings

    const matchedRooms = roomDataSource
      .filter((room) => {
        const name = String(room.roomName || room.name || room.RoomName || '')
        const code = String(room.roomCode || room.code || room.Code || '')
        const moduleName = String(room.module || room.Module || '')
        const type = String(
          room.roomTypeName || room.type || room.roomType?.name || ''
        )

        return (
          name.toLowerCase().includes(query) ||
          code.toLowerCase().includes(query) ||
          moduleName.toLowerCase().includes(query) ||
          type.toLowerCase().includes(query)
        )
      })
      .map((room) => ({
        id: room.roomId ?? room.id ?? room.RoomId,
        name: room.roomName ?? room.name ?? room.RoomName ?? 'Room',
        module: room.module ?? room.Module ?? '',
        type: room.roomTypeName ?? room.type ?? room.roomType?.name ?? '',
        code: room.roomCode ?? room.code ?? room.Code ?? '',
      }))
      .slice(0, 5)

    const matchedBookings = bookingDataSource
      .filter((booking) => {
        const roomName = String(
          booking.roomName || booking.RoomName || booking.room?.name || ''
        )
        const title = String(
          booking.title ||
            booking.meetingTitle ||
            booking.purpose ||
            booking.Title ||
            ''
        )
        const creator = String(
          booking.userName ||
            booking.bookedBy ||
            booking.employeeName ||
            booking.requestedBy ||
            ''
        )

        return (
          roomName.toLowerCase().includes(query) ||
          title.toLowerCase().includes(query) ||
          creator.toLowerCase().includes(query)
        )
      })
      .map((booking) => ({
        id: booking.bookingId ?? booking.id ?? booking.BookingId,
        roomName:
          booking.roomName ??
          booking.RoomName ??
          booking.room?.name ??
          'Room',
        title:
          booking.title ??
          booking.meetingTitle ??
          booking.purpose ??
          booking.Title ??
          'Booking',
        date: booking.bookingDate ?? booking.date ?? '',
      }))
      .slice(0, 5)

    return {
      rooms: matchedRooms,
      bookings: matchedBookings,
    }
  }, [searchInput, liveRooms, liveBookings])

  // =====================================================
  // Search Submit
  // =====================================================

  function handleSearchSubmit(event) {
    if (event) {
      event.preventDefault()
    }

    const query = searchInput.trim()

    if (!query) {
      if (location.pathname === '/admin/room-management') {
        navigate('/admin/room-management')
      } else if (location.pathname === '/admin/reports') {
        navigate('/admin/reports')
      } else if (location.pathname === '/search-rooms') {
        navigate('/search-rooms')
      } else if (location.pathname === '/my-bookings') {
        navigate('/my-bookings')
      }
      setShowSearchResults(false)
      return
    }

    // ADMIN SEARCH
    if (isAdmin) {
      navigate(`/admin/room-management?search=${encodeURIComponent(query)}`)
    }
    // EMPLOYEE SEARCH
    else {
      if (location.pathname.includes('/my-bookings')) {
        navigate(`/my-bookings?search=${encodeURIComponent(query)}`)
      } else {
        navigate(`/search-rooms?q=${encodeURIComponent(query)}`)
      }
    }

    setShowSearchResults(false)
  }

  // =====================================================
  // Select Search Result
  // =====================================================

  function handleSelectResult(queryTerm, type = 'room') {
    const query = String(queryTerm || '').trim()

    if (!query) {
      return
    }

    setSearchInput(query)
    setShowSearchResults(false)

    // =================================================
    // ADMIN NAVIGATION
    // =================================================

    if (isAdmin) {
      if (type === 'booking') {
        navigate(`/admin/booking-management?search=${encodeURIComponent(query)}`)
      } else {
        navigate(`/admin/room-management?search=${encodeURIComponent(query)}`)
      }
    }

    // =================================================
    // EMPLOYEE NAVIGATION
    // =================================================

    else {
      if (type === 'booking') {
        navigate(`/my-bookings?search=${encodeURIComponent(query)}`)
      } else {
        navigate(`/search-rooms?q=${encodeURIComponent(query)}`)
      }
    }
  }

  // =====================================================
  // Clear Search
  // =====================================================

  function handleClearSearch() {
    setSearchInput('')
    setShowSearchResults(false)
    if (location.pathname === '/admin/room-management') {
      navigate('/admin/room-management')
    } else if (location.pathname === '/admin/reports') {
      navigate('/admin/reports')
    } else if (location.pathname === '/search-rooms') {
      navigate('/search-rooms')
    } else if (location.pathname === '/my-bookings') {
      navigate('/my-bookings')
    }
  }

  // =====================================================
  // Logout
  // =====================================================

  async function handleLogout() {
    await logout()
    navigate('/login')
  }

  // =====================================================
  // Render
  // =====================================================

  return (
    <header className="fixed top-0 left-0 right-0 z-40 flex h-[52px] items-center justify-between border-b border-sky-200 bg-sky-100 px-4 shadow-sm">

      {/* =================================================
          LEFT SIDE
      ================================================= */}

      <div className="flex min-w-0 items-center">
        {!publicOnly && (
          <button
            type="button"
            onClick={onToggleSidebar}
            className="mr-3 rounded-lg p-1.5 text-sky-900 transition hover:bg-sky-200"
            aria-label={
              sidebarCollapsed
                ? 'Open sidebar'
                : 'Close sidebar'
            }
          >
            {sidebarCollapsed ? (
              <PanelLeftOpen size={18} />
            ) : (
              <PanelLeftClose size={18} />
            )}
          </button>
        )}

        <div
          className="flex cursor-pointer items-center gap-2"
          onClick={() =>
            navigate(
              isAdmin
                ? '/admin/reports'
                : '/dashboard'
            )
          }
        >
          <img
            src="/Logo.png"
            alt="SpaceBook"
            className="h-7 w-7 object-contain"
          />

          <span className="hidden font-display text-base font-bold text-sky-950 sm:block">
            SPACEBOOK
          </span>
        </div>
      </div>

      {/* =================================================
          SEARCH
      ================================================= */}

      {!publicOnly && (
        <form
          ref={searchContainerRef}
          onSubmit={handleSearchSubmit}
          className="relative mx-6 hidden max-w-sm flex-1 md:flex"
        >
          <div className="flex w-full items-center gap-2 rounded-lg border border-sky-300 bg-white/60 px-3 py-1 focus-within:border-sky-500">

            <button
              type="submit"
              className="text-sky-900 transition-opacity hover:opacity-80"
              aria-label="Search"
            >
              <Search
                size={14}
                className="text-sky-900"
              />
            </button>

            <input
              type="text"
              placeholder="Search rooms, bookings..."
              value={searchInput}
              onChange={(event) => {
                setSearchInput(
                  event.target.value
                )
                setShowSearchResults(true)
              }}
              onFocus={() => {
                if (searchInput.trim()) {
                  setShowSearchResults(true)
                }
              }}
              className="w-full bg-transparent text-xs font-sans text-sky-950 outline-none placeholder:text-sky-700/60"
            />

            {searchInput && (
              <button
                type="button"
                onClick={handleClearSearch}
                className="rounded-full p-0.5 text-sky-700/60 transition hover:bg-sky-200 hover:text-sky-950"
                aria-label="Clear search"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Search Dropdown */}

          {showSearchResults &&
            searchInput.trim() && (
              <div className="absolute left-0 right-0 top-full z-50 mt-2 max-h-64 overflow-auto rounded-lg border border-line bg-white text-ink shadow-lg">

                {/* Rooms */}

                {searchResults.rooms.length > 0 && (
                  <div className="border-b border-line">

                    <div className="bg-portal-bg px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-slate">
                      Rooms
                    </div>

                    {searchResults.rooms.map(
                      (room) => (
                        <button
                          key={room.id}
                          type="button"
                          onClick={() =>
                            handleSelectResult(
                              room.name,
                              'room'
                            )
                          }
                          className="flex w-full flex-col px-3 py-2 text-left font-sans text-sm transition-colors hover:bg-portal-bg/80"
                        >
                          <span className="font-medium text-ink">
                            {room.name}
                          </span>

                          <span className="text-xs text-slate">
                            {room.module} · {room.type}
                          </span>
                        </button>
                      )
                    )}
                  </div>
                )}

                {/* Bookings */}

                {searchResults.bookings.length >
                  0 && (
                  <div>

                    <div className="bg-portal-bg px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-slate">
                      Bookings
                    </div>

                    {searchResults.bookings.map(
                      (booking) => (
                        <button
                          key={booking.id}
                          type="button"
                          onClick={() =>
                            handleSelectResult(
                              booking.title ||
                                booking.roomName,
                              'booking'
                            )
                          }
                          className="flex w-full flex-col px-3 py-2 text-left font-sans text-sm transition-colors hover:bg-portal-bg/80"
                        >
                          <span className="font-medium text-ink">
                            {booking.title}
                          </span>

                          <span className="text-xs text-slate">
                            {booking.roomName} ·{' '}
                            {booking.date}
                          </span>
                        </button>
                      )
                    )}
                  </div>
                )}

                {/* No Results */}

                {searchResults.rooms.length === 0 &&
                  searchResults.bookings.length ===
                    0 && (
                    <div className="px-3 py-4 text-center font-sans text-sm text-slate">
                      No rooms or bookings found
                    </div>
                  )}
              </div>
            )}
        </form>
      )}

      {/* =================================================
          RIGHT SIDE
      ================================================= */}

      {!publicOnly && (
        <div className="flex items-center gap-2">

          {/* SharePoint */}

          <a
            href="https://vmivsp.sharepoint.com"
            className="rounded-lg p-1.5 text-sky-900 transition hover:bg-sky-200"
            aria-label="SharePoint Home"
          >
            <Home size={16} />
          </a>

          {/* Notifications */}

          <div className="relative">

            <button
              ref={notificationButtonRef}
              type="button"
              onClick={() => {
                setNotificationOpen(
                  (value) => !value
                )

                setMenuOpen(false)
              }}
              className="relative rounded-lg p-1.5 text-sky-900 hover:bg-sky-200"
              aria-label="Notifications"
            >
              <Bell size={16} />

              {unreadCount > 0 && (
                <span className="pointer-events-none absolute -right-1 -top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[9px] font-semibold text-white">
                  {unreadCount}
                </span>
              )}
            </button>

            <NotificationDropdown
              open={notificationOpen}
              buttonRef={notificationButtonRef}
              notifications={notifications}
              loading={loadingNotifications}
              onClose={() =>
                setNotificationOpen(false)
              }
              onMarkAllRead={
                handleMarkAllRead
              }
              onViewAll={() => {
                navigate(
                  isAdmin
                    ? '/admin/notifications'
                    : '/notifications'
                )

                setNotificationOpen(false)
              }}
            />
          </div>

          {/* User Guide & Help Button */}
          <button
            type="button"
            onClick={() => window.dispatchEvent(new Event('openSpaceBookGuide'))}
            className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-semibold text-sky-900 border border-sky-300/80 bg-white/70 hover:bg-sky-200/80 hover:border-sky-400 transition shadow-xs"
            title="Open SpaceBook User Guide & Help"
            aria-label="User Guide"
          >
            <HelpCircle size={14} className="text-sky-700" />
            <span className="hidden sm:inline">Guide</span>
          </button>

          {/* User Menu */}

          <div className="relative">

            <button
              type="button"
              onClick={() =>
                setMenuOpen(
                  (value) => !value
                )
              }
              className="flex items-center gap-2 rounded-lg border border-sky-300 px-2 py-1 text-xs text-sky-950 hover:bg-sky-200"
            >
              <User size={14} />

              <span className="max-w-[100px] truncate font-mono text-xs">
                {user?.name ||
                  (isAdmin
                    ? 'Admin'
                    : 'Employee')}
              </span>
            </button>

            {menuOpen && (
              <div className="absolute right-0 top-full z-50 mt-1 w-32 rounded-lg border border-slate-200 bg-white py-1 font-sans text-sm text-ink shadow-md">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="block w-full px-3 py-2 text-left font-medium text-clay transition-colors hover:bg-slate-50 text-xs"
                >
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