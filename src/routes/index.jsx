import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from '../context/AuthContext'
import RequireAuth from '../components/RequireAuth'
import AppShell from '../components/layout/AppShell'
import LoginPage from '../pages/Login'
import DashboardPage from '../pages/Dashboard'
import SearchRoomsPage from '../pages/SearchRooms'
import AvailabilityCalendarPage from '../pages/AvailabilityCalendar'
import BookRoomPage from '../pages/BookRoom'
import MyBookingsPage from '../pages/MyBookings'
import NotificationsPage from '../pages/Notifications'
import ProfilePage from '../pages/Profile'
import AdminDashboardPage from '../pages/Admin/Dashboard'
import AdminRoomManagementPage from '../pages/Admin/RoomManagement'
import AdminBookingManagementPage from '../pages/Admin/BookingManagement'
import AdminReportsPage from '../pages/Admin/Reports'


export default function AppRoutes() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          <Route
            element={
              <RequireAuth>
                <AppShell />
              </RequireAuth>
            }
          >
            <Route path="/" element={<DashboardPage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/search-rooms" element={<SearchRoomsPage />} />
            <Route path="/availability-calendar" element={<AvailabilityCalendarPage />} />
            <Route path="/book-room" element={<BookRoomPage />} />
            <Route path="/my-bookings" element={<MyBookingsPage />} />
            <Route path="/notifications" element={<NotificationsPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
            <Route path="/admin/room-management" element={<AdminRoomManagementPage />} />
            <Route path="/admin/booking-management" element={<AdminBookingManagementPage />} />
            <Route path="/admin/reports" element={<AdminReportsPage />} />
           
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
