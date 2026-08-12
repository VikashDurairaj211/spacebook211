import {
  Search,
  Bell,
  User,
  PanelLeftClose,
  PanelLeftOpen,
  Home,
} from 'lucide-react'

import { useAuth } from '../../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import { useState, useMemo, useRef, useEffect } from 'react'

import client from '../../api/client'

import { rooms as ROOMS, bookings as BOOKINGS } from '../../services/mockData'
import NotificationDropdown from '../common/NotificationDropdown'
import Logo from '../../../Logo.png'

export default function TopNav({
  onToggleSidebar,
  sidebarCollapsed,
  publicOnly = false,
}) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const [menuOpen, setMenuOpen] = useState(false)
  const [notificationOpen, setNotificationOpen] = useState(false)
  const [searchInput, setSearchInput] = useState('')
  const [showSearchResults, setShowSearchResults] = useState(false)

  const [notifications, setNotifications] = useState([])
  const [loadingNotifications, setLoadingNotifications] = useState(false)

  const notificationButtonRef = useRef(null)

  // Determine whether logged-in user is Admin
  const isAdmin =
    user?.role === 'Admin' ||
    user?.role === 'admin' ||
    user?.isAdmin === true

  // =====================================================
  // Fetch Notifications
  // Uses deployed Render API through axios client
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

      setNotifications(response.data || [])
    } catch (error) {
      console.error(
        'Failed to fetch notifications in TopNav:',
        error
      )

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

      await client.patch(endpoint, {})

      setNotifications((previous) =>
        previous.map((notification) => ({
          ...notification,
          isRead: true,
        }))
      )

      window.dispatchEvent(new Event('notificationsRead'))
    } catch (error) {
      console.error(
        'Failed to mark notifications as read:',
        error
      )
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

    window.addEventListener(
      'notificationsRead',
      handleNotificationRefresh
    )

    return () => {
      window.removeEventListener(
        'notificationsRead',
        handleNotificationRefresh
      )
    }
  }, [publicOnly, user, isAdmin])

  // =====================================================
  // Unread Count
  // =====================================================

  const unreadCount = useMemo(() => {
    return notifications.filter(
      (notification) => !notification.isRead
    ).length
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

    const matchedRooms = ROOMS.filter((room) => {
      return (
        room.name?.toLowerCase().includes(query) ||
        room.code?.toLowerCase().includes(query) ||
        room.module?.toLowerCase().includes(query)
      )
    }).slice(0, 5)

    const matchedBookings = BOOKINGS.filter((booking) => {
      return (
        booking.roomName?.toLowerCase().includes(query) ||
        booking.title?.toLowerCase().includes(query)
      )
    }).slice(0, 5)

    return {
      rooms: matchedRooms,
      bookings: matchedBookings,
    }
  }, [searchInput])

  // =====================================================
  // Search Submit
  // =====================================================

  function handleSearchSubmit(event) {
    event.preventDefault()

    const query = searchInput.trim()

    if (!query) {
      return
    }

    navigate(
      `/search-rooms?q=${encodeURIComponent(query)}`
    )

    setSearchInput('')
    setShowSearchResults(false)
  }

  // =====================================================
  // Select Search Result
  // =====================================================

  function handleSelectResult(queryTerm) {
    const query = String(queryTerm || '').trim()

    if (!query) {
      return
    }

    navigate(
      `/search-rooms?q=${encodeURIComponent(query)}`
    )

    setSearchInput('')
    setShowSearchResults(false)
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
            className="mr-3 rounded-lg p-1.5 text-sky-900 hover:bg-sky-200 transition"
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
          onClick={() => navigate('/dashboard')}
        >
          <img
            src={Logo}
            alt="SpaceBook"
            className="h-7 w-7 object-contain"
          />

          <span className="hidden font-display text-base font-bold text-sky-950 sm:block">
            Spacebook
          </span>
        </div>
      </div>

      {/* =================================================
          SEARCH
      ================================================= */}

      {!publicOnly && (
        <form
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
                setShowSearchResults(true)
              }}
              onFocus={() => {
                if (searchInput.trim()) {
                  setShowSearchResults(true)
                }
              }}
              className="w-full bg-transparent text-xs font-sans text-sky-950 outline-none placeholder:text-sky-700/60"
            />
          </div>

          {/* Search Dropdown */}

          {showSearchResults && searchInput.trim() && (
            <div className="absolute left-0 right-0 top-full z-50 mt-2 max-h-64 overflow-auto rounded-lg border border-line bg-white text-ink shadow-lg">
              {/* Rooms */}

              {searchResults.rooms.length > 0 && (
                <div className="border-b border-line">
                  <div className="bg-portal-bg px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-slate">
                    Rooms
                  </div>

                  {searchResults.rooms.map((room) => (
                    <button
                      key={room.id}
                      type="button"
                      onClick={() =>
                        handleSelectResult(room.name)
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
                  ))}
                </div>
              )}

              {/* Bookings */}

              {searchResults.bookings.length > 0 && (
                <div>
                  <div className="bg-portal-bg px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-slate">
                    Bookings
                  </div>

                  {searchResults.bookings.map((booking) => (
                    <button
                      key={booking.id}
                      type="button"
                      onClick={() =>
                        handleSelectResult(
                          booking.title ||
                            booking.roomName
                        )
                      }
                      className="flex w-full flex-col px-3 py-2 text-left font-sans text-sm transition-colors hover:bg-portal-bg/80"
                    >
                      <span className="font-medium text-ink">
                        {booking.title}
                      </span>

                      <span className="text-xs text-slate">
                        {booking.roomName} · {booking.date}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {/* No Results */}

              {searchResults.rooms.length === 0 &&
                searchResults.bookings.length === 0 && (
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
          {/* SharePoint - Opens in the same tab */}

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
              onMarkAllRead={handleMarkAllRead}
              onViewAll={() => {
                navigate('/notifications')
                setNotificationOpen(false)
              }}
            />
          </div>

          {/* User Menu */}

          <div className="relative">
            <button
              type="button"
              onClick={() =>
                setMenuOpen((value) => !value)
              }
              className="flex items-center gap-2 rounded-lg border border-sky-300 px-2 py-1 text-xs text-sky-950 hover:bg-sky-200"
            >
              <User size={14} />

              <span className="max-w-[100px] truncate font-mono text-xs">
                {user?.name || 'Employee'}
              </span>
            </button>

            {menuOpen && (
              <div className="absolute right-0 top-full z-50 mt-1 w-32 rounded-lg border border-slate-200 bg-white py-1 font-sans text-sm text-ink shadow-md">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="block w-full px-3 py-2 text-left font-medium text-clay transition-colors hover:bg-slate-50"
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