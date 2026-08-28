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
import {
  getNotifications,
  markAllNotificationsAsRead,
  clearAllNotifications,
  clearNotification,
} from '../../api/notifications'
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
  const [highlightedIndex, setHighlightedIndex] = useState(-1)

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

    if (location.pathname === '/admin/workspace-administration' || location.pathname === '/admin/room-management') {
      setSearchInput(urlSearch)
    } else if (location.pathname === '/admin/reports' || location.pathname === '/workspace-search' || location.pathname === '/search-rooms' || location.pathname === '/my-bookings') {
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

  const fetchNotifications = async (isSilent = false) => {
    try {
      if (!isSilent) {
        setLoadingNotifications(true)
      }

      const token = localStorage.getItem('spacebook_token')

      if (!token || !user) {
        setNotifications((prev) => (prev.length === 0 ? prev : []))
        return
      }

      const responseData = await getNotifications()
      const rawList = Array.isArray(responseData)
        ? responseData
        : responseData?.notifications || []

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

      // Zero-flicker: Only update state if data actually changed
      setNotifications((prev) => {
        if (prev.length === mapped.length) {
          const isIdentical = prev.every((item, idx) => {
            const m = mapped[idx]
            return (
              item.notificationId === m.notificationId &&
              item.isRead === m.isRead &&
              item.title === m.title &&
              item.message === m.message
            )
          })
          if (isIdentical) return prev
        }
        return mapped
      })
    } catch (error) {
      console.error('Failed to fetch notifications in TopNav:', error)
      if (!isSilent) {
        setNotifications([])
      }
    } finally {
      if (!isSilent) {
        setLoadingNotifications(false)
      }
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

      // Call backend API
      try {
        await markAllNotificationsAsRead()
      } catch (err) {
        // ignore
      }

      // Persist read IDs locally
      const currentIds = notifications.map((n, idx) =>
        String(n.notificationId ?? n.id ?? n._id ?? idx)
      )
      saveReadNotificationIds(currentIds)

      setNotifications((prev) =>
        prev.map((n) => ({ ...n, isRead: true }))
      )

      window.dispatchEvent(new Event('notificationsRead'))
    } catch (error) {
      console.error('Failed to mark notifications as read:', error)
    }
  }

  // =====================================================
  // Clear All Notifications
  // =====================================================

  const handleClearAll = async () => {
    try {
      const currentIds = notifications.map((n, idx) =>
        String(n.notificationId ?? n.id ?? n._id ?? idx)
      )
      saveClearedNotificationIds(currentIds)
      saveReadNotificationIds(currentIds)
      setNotifications([])

      try {
        await clearAllNotifications()
      } catch (e) {
        // ignore
      }

      window.dispatchEvent(new Event('notificationsRead'))
    } catch (error) {
      console.error('Failed to clear notifications in TopNav:', error)
    }
  }

  // =====================================================
  // Clear Single Notification
  // =====================================================

  const handleClearOne = async (id) => {
    const idStr = String(id)
    saveClearedNotificationIds([idStr])
    setNotifications((prev) =>
      prev.filter((n) => String(n.notificationId ?? n.id) !== idStr)
    )

    try {
      await clearNotification(id)
    } catch (e) {
      // ignore
    }

    window.dispatchEvent(new Event('notificationsRead'))
  }

  // =====================================================
  // Load Notifications (With Auto-Polling & Live Refresh)
  // =====================================================

  useEffect(() => {
    if (publicOnly || !user) {
      return
    }

    // Initial fetch (shows initial loading if necessary)
    fetchNotifications(false)

    // 1. Silent auto-polling every 5 seconds without triggering UI loading states or shakes
    const pollInterval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchNotifications(true)
      }
    }, 5000)

    // 2. Silent fetch on tab focus / visibility change
    const handleFocus = () => {
      if (document.visibilityState === 'visible') {
        fetchNotifications(true)
      }
    }

    const handleNotificationRefresh = () => {
      fetchNotifications(true)
    }

    window.addEventListener('notificationsRead', handleNotificationRefresh)
    window.addEventListener('notificationRefresh', handleNotificationRefresh)
    window.addEventListener('bookingCreated', handleNotificationRefresh)
    window.addEventListener('bookingCancelled', handleNotificationRefresh)
    window.addEventListener('booking-updated', handleNotificationRefresh)
    window.addEventListener('focus', handleFocus)
    document.addEventListener('visibilitychange', handleFocus)

    return () => {
      clearInterval(pollInterval)
      window.removeEventListener('notificationsRead', handleNotificationRefresh)
      window.removeEventListener('notificationRefresh', handleNotificationRefresh)
      window.removeEventListener('bookingCreated', handleNotificationRefresh)
      window.removeEventListener('bookingCancelled', handleNotificationRefresh)
      window.removeEventListener('booking-updated', handleNotificationRefresh)
      window.removeEventListener('focus', handleFocus)
      document.removeEventListener('visibilitychange', handleFocus)
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
          booking.meetingTitle ||
            booking.title ||
            booking.Title ||
            booking.purpose ||
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
          booking.meetingTitle ||
          booking.title ||
          booking.Title ||
          booking.purpose ||
          'Booking',
        date: booking.bookingDate ?? booking.date ?? '',
      }))
      .slice(0, 5)

    return {
      rooms: matchedRooms,
    }
  }, [searchInput, liveRooms])

  const flatSearchResults = useMemo(() => {
    return (searchResults.rooms || []).map((r, i) => ({
      ...r,
      searchType: 'room',
      globalIndex: i,
    }))
  }, [searchResults])

  // Scroll active item into view
  useEffect(() => {
    if (highlightedIndex >= 0 && searchContainerRef.current) {
      const activeEl = searchContainerRef.current.querySelector(
        `[data-search-index="${highlightedIndex}"]`
      )
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
      }
    }
  }, [highlightedIndex])

  function handleSearchKeyDown(e) {
    if (!showSearchResults || flatSearchResults.length === 0) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlightedIndex((prev) =>
        prev + 1 < flatSearchResults.length ? prev + 1 : 0
      )
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlightedIndex((prev) =>
        prev - 1 >= 0 ? prev - 1 : flatSearchResults.length - 1
      )
    } else if (e.key === 'Enter') {
      if (highlightedIndex >= 0 && flatSearchResults[highlightedIndex]) {
        e.preventDefault()
        const item = flatSearchResults[highlightedIndex]
        if (item.searchType === 'room') {
          handleSelectRoom(item)
        } else {
          handleSelectResult(item.title || item.roomName, 'booking')
        }
      }
    } else if (e.key === 'Escape') {
      setShowSearchResults(false)
      setHighlightedIndex(-1)
    }
  }

  // =====================================================
  // Search Submit
  // =====================================================

  function handleSearchSubmit(event) {
    if (event) {
      event.preventDefault()
    }

    const query = searchInput.trim()

    if (!query) {
      if (location.pathname.startsWith('/admin/workspace-administration') || location.pathname.startsWith('/admin/room-management')) {
        navigate('/admin/workspace-administration')
      } else if (location.pathname.startsWith('/admin/reports')) {
        navigate('/admin/reports')
      } else if (location.pathname.startsWith('/workspace-search') || location.pathname.startsWith('/search-rooms')) {
        navigate('/workspace-search')
      } else if (location.pathname.startsWith('/my-bookings')) {
        navigate('/my-bookings')
      }
      setShowSearchResults(false)
      return
    }

    // ADMIN SEARCH
    if (isAdmin) {
      navigate(`/admin/workspace-administration?search=${encodeURIComponent(query)}`)
    }
    // EMPLOYEE SEARCH
    else {
      if (location.pathname.includes('/my-bookings')) {
        navigate(`/my-bookings?search=${encodeURIComponent(query)}`)
      } else {
        navigate(`/workspace-search?q=${encodeURIComponent(query)}`)
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
        navigate(`/admin/reports?search=${encodeURIComponent(query)}`)
      } else {
        navigate(`/admin/workspace-administration?search=${encodeURIComponent(query)}`)
      }
    }

    // =================================================
    // EMPLOYEE NAVIGATION
    // =================================================

    else {
      if (type === 'booking') {
        navigate(`/my-bookings?search=${encodeURIComponent(query)}`)
      } else {
        navigate(`/workspace-search?q=${encodeURIComponent(query)}`)
      }
    }
  }

  function handleSelectRoom(room) {
    if (!room) return
    setSearchInput(room.name || '')
    setShowSearchResults(false)

    if (isAdmin) {
      navigate(`/admin/workspace-administration?search=${encodeURIComponent(room.name || room.code || '')}`)
    } else {
      const moduleParam = room.module || ''
      const typeParam = room.type || ''
      const nameParam = room.name || ''
      navigate(`/workspace-search?module=${encodeURIComponent(moduleParam)}&roomType=${encodeURIComponent(typeParam)}&q=${encodeURIComponent(nameParam)}`)
    }
  }

  // =====================================================
  // Clear Search
  // =====================================================

  function handleClearSearch() {
    setSearchInput('')
    setShowSearchResults(false)
    if (location.pathname.startsWith('/admin/workspace-administration') || location.pathname.startsWith('/admin/room-management')) {
      navigate('/admin/workspace-administration')
    } else if (location.pathname.startsWith('/admin/reports')) {
      navigate('/admin/reports')
    } else if (location.pathname.startsWith('/workspace-search') || location.pathname.startsWith('/search-rooms')) {
      navigate('/workspace-search')
    } else if (location.pathname.startsWith('/my-bookings')) {
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
                setSearchInput(event.target.value)
                setHighlightedIndex(-1)
                setShowSearchResults(true)
              }}
              onKeyDown={handleSearchKeyDown}
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
              <div className="absolute left-0 right-0 top-full z-50 mt-2 max-h-64 overflow-auto rounded-xl border border-sky-200 bg-white text-ink shadow-2xl divide-y divide-slate-100">

                {/* Rooms */}

                {searchResults.rooms.length > 0 && (
                  <div>
                    <div className="bg-sky-50/80 px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-sky-800">
                      Rooms
                    </div>

                    {searchResults.rooms.map((room, rIdx) => {
                      const isHighlighted = highlightedIndex === rIdx
                      return (
                        <button
                          key={room.id}
                          type="button"
                          data-search-index={rIdx}
                          onMouseEnter={() => setHighlightedIndex(rIdx)}
                          onClick={() => handleSelectRoom(room)}
                          className={`flex w-full flex-col px-3 py-2 text-left font-sans text-sm transition-colors border-l-4 ${
                            isHighlighted
                              ? 'bg-sky-100/90 text-sky-950 border-[#0284C7] font-semibold shadow-xs'
                              : 'border-transparent hover:bg-sky-50/60 text-slate-800'
                          }`}
                        >
                          <span className="font-medium text-ink">
                            {room.name}
                          </span>

                          <span className="text-xs text-slate">
                            {room.module} · {room.type}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                )}

                {/* No Results */}

                {searchResults.rooms.length === 0 && (
                  <div className="px-3 py-4 text-center font-sans text-sm text-slate">
                    No rooms found
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
              onClearAll={
                handleClearAll
              }
              onClearOne={
                handleClearOne
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