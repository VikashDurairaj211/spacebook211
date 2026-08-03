# SPACEBOOK — Frontend

React (JavaScript) + Vite + Tailwind CSS. Built to talk to a .NET Web API backed by PostgreSQL.

## Pages included in this pass
- `/login` — Login
- `/` — Employee Dashboard
- `/search-rooms` — Search Rooms
- `/book-room` — Book Room (optionally pre-fills `?roomId=`)
- `/my-bookings` — My Bookings

(Admin pages, Availability Calendar, Notifications, and Profile were not built yet — say the word and I'll add them on top of this same structure.)

## Getting started
```bash
npm install
cp .env.example .env   # set VITE_API_BASE_URL to your .NET API
npm run dev
```
Runs at `http://localhost:5173`.

**Demo mode:** if the backend isn't running yet, Login will still work — it detects
the failed network call and creates a local demo session so you can click through
the UI. Remove the fallback block in `src/context/AuthContext.jsx` once your real
`/api/auth/login` is live. Room search and My Bookings behave the same way (mock
data in `src/data/mockRooms.js` and `src/api/bookings.js`).

## Project structure
```
src/
  api/            axios client + one file per resource (auth, rooms, bookings)
  context/        AuthContext (JWT session state)
  components/
    layout/       TopNav, Sidebar, AppShell
    common/       Button, Input/Select/Textarea, Card, StatusTag
  pages/          one component per route
  data/           mock data used until the real API responds
```

## Expected .NET API contract
The frontend calls these routes (adjust base path in `.env` via `VITE_API_BASE_URL`,
default assumes `/api` prefix on a Kestrel dev server):

| Method | Route | Purpose |
|---|---|---|
| POST | `/auth/login` | Body `{ email, password }` → `{ token, user }` |
| POST | `/auth/logout` | Invalidate/revoke token (optional) |
| GET | `/auth/me` | Return current user from token |
| GET | `/rooms?module=&type=&capacity=&date=&startTime=&endTime=` | List/filter rooms |
| GET | `/rooms/{id}` | Room details |
| GET | `/rooms/{id}/availability?date=` | Time slots for a room on a date |
| GET | `/bookings/my` | Current user's bookings |
| POST | `/bookings` | Create booking |
| PUT | `/bookings/{id}` | Update booking |
| DELETE | `/bookings/{id}` | Cancel booking |

**Auth:** the client stores the JWT from `/auth/login` in `localStorage` and sends
it as `Authorization: Bearer <token>` on every request (see `src/api/client.js`).
A `401` response anywhere automatically clears the session and redirects to `/login`
— standard behavior for JWT expiry, so your .NET API doesn't need to do anything
special beyond returning 401 on invalid/expired tokens.

**Suggested PostgreSQL shape** (for reference, not required — build your schema
however fits your domain model):
- `rooms (id, name, code, module, type, capacity, status)`
- `bookings (id, room_id, user_id, title, purpose, date, start_time, end_time, attendees, notes, status)`
- `users (id, name, email, password_hash, department, role)`

## Design notes
Blueprint/floor-plan visual direction: ink navy (`#1B2430`) on warm paper (`#F7F5F1`),
monospace room codes (`M1-CR1` etc.) and status "plaques" instead of colored pill
badges — tokens live in `tailwind.config.js`.

## Next steps
- Swap mock fallbacks for real calls once endpoints are live (just remove the
  `catch` fallback blocks in `src/api/*.js` and `AuthContext.jsx`).
- Add the remaining pages (Availability Calendar, Notifications, Profile, and the
  Admin section) using the same `AppShell` / `Card` / `StatusTag` building blocks.
