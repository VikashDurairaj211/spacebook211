```jsx
import {
  Search,
  Bell,
  User,
  PanelLeftClose,
  PanelLeftOpen,
  Home,
} from "lucide-react";

import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { useState, useMemo, useRef, useEffect } from "react";

import client from "../../api/client";

import {
  rooms as ROOMS,
  bookings as BOOKINGS,
} from "../../services/mockData";

import NotificationDropdown from "../common/NotificationDropdown";
import Logo from "../../../Logo.png";

export default function TopNav({
  onToggleSidebar,
  sidebarCollapsed,
  publicOnly = false,
}) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [menuOpen, setMenuOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [loadingNotifications, setLoadingNotifications] = useState(false);

  const notificationButtonRef = useRef(null);

  // =====================================================
  // Determine logged-in user role
  // =====================================================

  const isAdmin =
    user?.role === "Admin" ||
    user?.role === "admin" ||
    user?.isAdmin === true;

  // =====================================================
  // Fetch notifications
  // IMPORTANT:
  // Use the shared Axios client.
  // DO NOT use localhost here.
  // =====================================================

  const fetchNotifications = async () => {
    if (!user) return;

    try {
      setLoadingNotifications(true);

      const endpoint = isAdmin
        ? "/admin/notifications"
        : "/employee/notifications";

      const response = await client.get(endpoint);

      setNotifications(response.data || []);
    } catch (error) {
      console.error(
        "Failed to fetch notifications in TopNav:",
        error
      );

      setNotifications([]);
    } finally {
      setLoadingNotifications(false);
    }
  };

  // =====================================================
  // Mark all notifications as read
  // =====================================================

  const handleMarkAllRead = async () => {
    try {
      if (!user) return;

      const endpoint = isAdmin
        ? "/admin/notifications/read-all"
        : "/notifications/read-all";

      await client.patch(endpoint);

      // Immediately update UI
      setNotifications((prev) =>
        prev.map((notification) => ({
          ...notification,
          isRead: true,
        }))
      );

      // Notify other components
      window.dispatchEvent(
        new Event("notificationsRead")
      );
    } catch (error) {
      console.error(
        "Failed to mark notifications as read:",
        error
      );
    }
  };

  // =====================================================
  // Load notifications when user changes
  // =====================================================

  useEffect(() => {
    if (publicOnly || !user) {
      return;
    }

    fetchNotifications();

    const handleNotificationsRead = () => {
      fetchNotifications();
    };

    window.addEventListener(
      "notificationsRead",
      handleNotificationsRead
    );

    return () => {
      window.removeEventListener(
        "notificationsRead",
        handleNotificationsRead
      );
    };
  }, [publicOnly, user, isAdmin]);

  // =====================================================
  // Unread notification count
  // =====================================================

  const unreadCount = useMemo(() => {
    return notifications.filter(
      (notification) => !notification.isRead
    ).length;
  }, [notifications]);

  // =====================================================
  // Search results
  // =====================================================

  const searchResults = useMemo(() => {
    if (!searchInput.trim()) {
      return {
        rooms: [],
        bookings: [],
      };
    }

    const query = searchInput.toLowerCase();

    const matchedRooms = ROOMS.filter((room) => {
      return (
        room.name?.toLowerCase().includes(query) ||
        room.code?.toLowerCase().includes(query) ||
        room.module?.toLowerCase().includes(query)
      );
    }).slice(0, 5);

    const matchedBookings = BOOKINGS.filter((booking) => {
      return (
        booking.roomName?.toLowerCase().includes(query) ||
        booking.title?.toLowerCase().includes(query)
      );
    }).slice(0, 5);

    return {
      rooms: matchedRooms,
      bookings: matchedBookings,
    };
  }, [searchInput]);

  // =====================================================
  // Search submit
  // =====================================================

  function handleSearchSubmit(event) {
    event.preventDefault();

    if (!searchInput.trim()) {
      return;
    }

    navigate(
      `/search-rooms?q=${encodeURIComponent(
        searchInput.trim()
      )}`
    );

    setShowSearchResults(false);
  }

  // =====================================================
  // Select search result
  // =====================================================

  function handleSelectResult(queryTerm) {
    navigate(
      `/search-rooms?q=${encodeURIComponent(queryTerm)}`
    );

    setSearchInput("");
    setShowSearchResults(false);
  }

  // =====================================================
  // Logout
  // =====================================================

  async function handleLogout() {
    await logout();
    navigate("/login");
  }

  // =====================================================
  // Render
  // =====================================================

  return (
    <header className="flex h-16 items-center justify-between border-b border-white/10 bg-[#172033] px-4">
      {/* =================================================
          LEFT SIDE
      ================================================= */}

      <div className="flex min-w-0 items-center">
        {!publicOnly && (
          <button
            type="button"
            onClick={onToggleSidebar}
            className="mr-3 rounded-lg p-2 text-white hover:bg-white/10 transition"
            aria-label={
              sidebarCollapsed
                ? "Open sidebar"
                : "Close sidebar"
            }
          >
            {sidebarCollapsed ? (
              <PanelLeftOpen size={20} />
            ) : (
              <PanelLeftClose size={20} />
            )}
          </button>
        )}

        {/* Logo / Home */}

        <div
          className="flex cursor-pointer items-center gap-2.5"
          onClick={() => navigate("/dashboard")}
        >
          <img
            src={Logo}
            alt="Spacebook"
            className="h-8 w-8 object-contain"
          />

          <span className="font-semibold tracking-wide text-white">
            Spacebook
          </span>
        </div>

        {/* =================================================
            SEARCH
        ================================================= */}

        {!publicOnly && (
          <form
            onSubmit={handleSearchSubmit}
            className="relative mx-6 hidden max-w-md flex-1 md:flex"
          >
            <div className="flex w-full items-center gap-2 rounded-lg border border-white/20 bg-white/10 px-3 py-1.5 focus-within:border-white/50">
              <button
                type="submit"
                className="text-white transition-opacity hover:opacity-80"
              >
                <Search
                  size={15}
                  className="text-white"
                />
              </button>

              <input
                type="text"
                placeholder="Search rooms, bookings..."
                value={searchInput}
                onChange={(event) => {
                  setSearchInput(event.target.value);
                  setShowSearchResults(true);
                }}
                onFocus={() => {
                  if (searchInput) {
                    setShowSearchResults(true);
                  }
                }}
                className="w-full bg-transparent font-sans text-sm text-white outline-none placeholder:text-slate-200"
              />
            </div>

            {/* Search dropdown */}

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
                                room.name
                              )
                            }
                            className="flex w-full flex-col px-3 py-2 text-left font-sans text-sm transition-colors hover:bg-portal-bg/80"
                          >
                            <span className="font-medium text-ink">
                              {room.name}
                            </span>

                            <span className="text-xs text-slate">
                              {room.module} ·{" "}
                              {room.type}
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
                                  booking.roomName
                              )
                            }
                            className="flex w-full flex-col px-3 py-2 text-left font-sans text-sm transition-colors hover:bg-portal-bg/80"
                          >
                            <span className="font-medium text-ink">
                              {booking.title}
                            </span>

                            <span className="text-xs text-slate">
                              {booking.roomName} ·{" "}
                              {booking.date}
                            </span>
                          </button>
                        )
                      )}
                    </div>
                  )}

                  {/* Nothing found */}

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
      </div>

      {/* =================================================
          RIGHT SIDE
      ================================================= */}

      {!publicOnly && (
        <div className="flex items-center gap-3">
          {/* =================================================
              SHAREPOINT
          ================================================= */}

          <a
            href="https://vmivsp.sharepoint.com"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg p-2 text-white transition hover:bg-white/10"
            aria-label="SharePoint Home"
          >
            <Home size={18} />
          </a>

          {/* =================================================
              NOTIFICATIONS
          ================================================= */}

          <div className="relative">
            <button
              ref={notificationButtonRef}
              type="button"
              onClick={() => {
                setNotificationOpen(
                  (value) => !value
                );
                setMenuOpen(false);
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
              onClose={() =>
                setNotificationOpen(false)
              }
              onMarkAllRead={handleMarkAllRead}
              onViewAll={() => {
                navigate("/notifications");
                setNotificationOpen(false);
              }}
            />
          </div>

          {/* =================================================
              USER MENU
          ================================================= */}

          <div className="relative">
            <button
              type="button"
              onClick={() =>
                setMenuOpen((value) => !value)
              }
              className="flex items-center gap-2 rounded-lg border border-white/20 px-2 py-1 text-sm text-white hover:bg-white/10"
            >
              <User size={15} />

              <span className="max-w-[120px] truncate font-mono text-xs">
                {user?.name || "Employee"}
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
  );
}
```
