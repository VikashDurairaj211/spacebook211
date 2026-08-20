import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
} from 'react-router-dom'

import { AuthProvider } from '../context/AuthContext'
import RequireAuth from '../components/RequireAuth'
import AppShell from '../components/layout/AppShell'
import LoginPage from '../pages/Login'

import DashboardPage from '../pages/Dashboard'
import SearchRoomsPage from '../pages/SearchRooms'
import RoomDetailsPage from '../pages/RoomDetails'
import AvailabilityCalendarPage from '../pages/AvailabilityCalendar'
import BookRoomPage from '../pages/BookRoom'
import MyBookingsPage from '../pages/MyBookings'
import NotificationsPage from '../pages/Notifications'
import ProfilePage from '../pages/Profile'
import HotseatBookingPage from '../components/HotseatMap/HotseatBooking'

import AdminDashboardPage from '../pages/Admin/Dashboard'
import AdminRoomManagementPage from '../pages/Admin/RoomManagement'
import AdminBookingManagementPage from '../pages/Admin/BookingManagement'
import AdminReportsPage from '../pages/Admin/Reports'

export default function AppRoutes() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>

          {/* PUBLIC ROUTES */}
          <Route
            path="/login"
            element={<LoginPage />}
          />

          {/* PROTECTED ROUTES */}
          <Route
            element={
              <RequireAuth>
                <AppShell />
              </RequireAuth>
            }
          >
            {/* EMPLOYEE */}
            <Route
              path="/"
              element={<DashboardPage />}
            />

            <Route
              path="/dashboard"
              element={<DashboardPage />}
            />

            <Route
              path="/search-rooms"
              element={<SearchRoomsPage />}
            />

            <Route
              path="/room-details"
              element={<RoomDetailsPage />}
            />

            <Route
              path="/availability-calendar"
              element={<AvailabilityCalendarPage />}
            />

            <Route
              path="/office-map"
              element={<HotseatBookingPage />}
            />

            <Route
              path="/book-room"
              element={<BookRoomPage />}
            />

            <Route
              path="/my-bookings"
              element={<MyBookingsPage />}
            />

            <Route
              path="/notifications"
              element={<NotificationsPage />}
            />

            <Route
              path="/profile"
              element={<ProfilePage />}
            />

            {/* ADMIN */}
            <Route
              path="/admin/dashboard"
              element={
                <RequireAuth allowedRoles={['Admin']}>
                  <AdminDashboardPage />
                </RequireAuth>
              }
            />

            <Route
              path="/admin/room-management"
              element={
                <RequireAuth allowedRoles={['Admin']}>
                  <AdminRoomManagementPage />
                </RequireAuth>
              }
            />

            <Route
              path="/admin/booking-management"
              element={
                <RequireAuth allowedRoles={['Admin']}>
                  <AdminBookingManagementPage />
                </RequireAuth>
              }
            />

            <Route
              path="/admin/reports"
              element={
                <RequireAuth allowedRoles={['Admin']}>
                  <AdminReportsPage />
                </RequireAuth>
              }
            />
          </Route>

          {/* FALLBACK */}
          <Route
            path="*"
            element={<Navigate to="/" replace />}
          />

        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}