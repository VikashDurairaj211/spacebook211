# SPACEBOOK — Frontend

Modern Workspace & Hot-Desk Management System built with React, Vite, and Tailwind CSS. Connects to a .NET Web API backed by PostgreSQL.

---

## 🚀 Key Features & Pages

### 🏢 Employee Experience
- **`/login`** — Authentication with JWT session storage and fallback demo capability.
- **`/dashboard` (`/`)** — Employee Dashboard with quick actions, active reservation summaries, and facility overview.
- **`/search-rooms`** — Real-time workspace search with multi-module filtering (Elcot Park & Tidel Park), capacity limits, amenity tags, and conflict detection.
- **`/room-details/:id`** — Interactive room details, photo gallery, capacity, and day-long time slot matrix.
- **`/book-room`** — Instant reservation modal with numeric Booking IDs and operational hours validation (10:00 AM – 10:00 PM).
- **`/availability-calendar`** — Workspace Availability Matrix across all rooms with automatic weekend look-ahead.
- **`/office-map`** — Interactive Hot-Seat Floor Plan with live pin color codes (🟢 Available, 🔵 Selected, 🔴 Occupied, ⚪ Maintenance) and shift selections (Full Day, Morning, Afternoon).
- **`/my-bookings`** — Reservation management with Active, Completed, and Cancelled tabs, time slot rescheduling, cancellation reasons, and check-in workflows.
- **`/notifications`** — Live updates and alert notifications.
- **`/profile`** — Employee account and role information.
- **Aira AI Assistant** — Floating background-preloaded assistant for instant office searches, room availability queries, and amenity lookups.
- **User Guide & Help Center** — Comprehensive in-app guide accessible from Top Navigation.

### 🛡️ Admin Portal (`/admin/*`)
- **`/admin/reports`** — Executive BI Dashboard featuring 5 compact KPI metric cards, interactive visual analytics charts (utilization, trends, peak demand hours), dedicated Audit Modal (8 items/page), and CSV data exports.
- **`/admin/room-management`** — Workspace Administration for managing room inventory, maintenance statuses, module locations, and amenities.
- **`/admin/hotseat-management`** — Workstation & Hot-Desk Administration with occupancy KPIs, shift breakdowns, desk actions (Check-In, Check-Out, Force Release, Set Maintenance), and CSV export.

---

## 🛠️ Getting Started

```bash
# 1. Install dependencies
npm install

# 2. Configure environment variables
cp .env.example .env
# Set VITE_API_BASE_URL to your backend .NET API (default: http://localhost:5000/api)

# 3. Start local development server
npm run dev
```

Application runs locally at `http://localhost:5173`.

---

## 📁 Project Structure

```
src/
  api/            Axios API client and resource modules (auth, rooms, bookings, admin)
  components/
    common/       UserGuideModal, Button, Input, Modal, DatePicker, TimePicker, StatusTag
    calendar/     AvailabilityGrid and calendar components
    HotseatMap/   Interactive floor map and hotseat booking components
    layout/       TopNav, Sidebar, AppShell, Layout
  context/        AuthContext (JWT session state, security timeout)
  pages/          Application route pages (Employee & Admin portals)
  routes/         React Router route definitions with role-based RequireAuth guards
  utils/          Formatting, export helpers, time and date utilities
```

---

## 📋 Operating Hours & Rules
- **Operational Hours**: 10:00 AM – 10:00 PM IST (Monday through Friday).
- **Campus Modules**: Module 1 - Elcot Park - CMB, Module 2 - Elcot Park - CMB, and Module 1 - Tidel Park - CMB.
- **Room Types**: Conference (up to 20), Training (up to 50), Discussion (8 to 10).
- **Approval System**: Automatic instant confirmation on all room and workstation bookings.
