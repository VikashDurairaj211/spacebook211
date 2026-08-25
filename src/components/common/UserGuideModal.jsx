import { useState, useMemo } from 'react'
import {
  BookOpen,
  X,
  Search,
  Calendar,
  Layers,
  MapPin,
  Clock,
  Sparkles,
  ShieldCheck,
  Building2,
  CheckCircle2,
  FileSpreadsheet,
  AlertTriangle,
  HelpCircle,
  ChevronRight,
  ArrowRight,
  UserCheck,
} from 'lucide-react'

// =====================================================
// Comprehensive Guide Content Data
// =====================================================

const GUIDE_SECTIONS = [
  {
    id: 'getting-started',
    title: 'Getting Started & Policy',
    icon: Sparkles,
    badge: 'Core Policy',
    description: 'Basic rules, office operating hours, multi-module campuses, and instant confirmation system.',
    topics: [
      {
        title: 'Office Operating Hours (10:00 AM – 10:00 PM)',
        content:
          'SpaceBook operates during official office hours from 10:00 AM to 10:00 PM IST (Monday through Friday). All meeting room and hot-seat bookings must fall within this timeframe.',
        tips: 'The system automatically disables time slots outside 10:00 AM – 10:00 PM.',
      },
      {
        title: 'Multi-Module Campus Support',
        content:
          'SpaceBook manages meeting rooms and workstations across 3 standard modules: Module 1 - Elcot Park - CMB, Module 2 - Elcot Park - CMB, and Module 1 - Tidel Park - CMB.',
        tips: 'Easily filter by campus module in Room Search, Calendar, and Admin views.',
      },
      {
        title: 'Auto-Approval & Instant Confirmation',
        content:
          'Every room reservation and desk booking made on SpaceBook is automatically confirmed in real-time. There is no waiting for admin approval, allowing teams to reserve and use spaces immediately.',
        tips: 'Always book in advance during peak hours (11:00 AM – 4:00 PM).',
      },
      {
        title: 'Session Timeout & Account Security',
        content:
          'For data protection and corporate security, your session automatically expires after a period of inactivity. When expired, a clear security popup will alert you with a countdown to log in again safely.',
        tips: 'Your work is saved, and you can re-login smoothly without losing context.',
      },
    ],
  },
  {
    id: 'booking-rooms',
    title: 'Booking Meeting Rooms',
    icon: Building2,
    badge: 'Meeting Rooms',
    description: 'How to search, check amenities, and reserve meeting spaces across Elcot & Tidel Park.',
    topics: [
      {
        title: '1. Finding the Right Meeting Room',
        content:
          'Navigate to "Workspace Search" from the sidebar or type a room name directly into the Top Navigation search bar. Filter by Module (Elcot Park Module 1 & 2, Tidel Park Module 1), Room Type (Conference, Training, Discussion), Capacity, and technical Facilities.',
        steps: [
          'Select your target Date and Start/End times (between 10:00 AM and 10:00 PM).',
          'Choose your Room Type: Conference (up to 20 people), Training (up to 50 people), or Discussion (8 to 10 people).',
          'Filter by required amenities (e.g. Video Conferencing, Smart TV, Whiteboard, Projector, Speaker, Wi-Fi).',
          'Review real-time room cards showing capacity, standardized room codes (e.g. CBE-05-EO1-001), module location, and current availability status.',
        ],
      },
      {
        title: '2. Viewing Room Details & Schedule Matrix',
        content:
          'Click "View Details" on any room card to see its full photo gallery, capacity limits, technical facilities, and the day-long time slot matrix showing already occupied vs free hours.',
      },
      {
        title: '3. Instant Reservation & Confirmation',
        content:
          'Click "Book Now", enter your Meeting Title, review the summary modal, and click "Confirm Booking". Your reservation is created immediately with a clean numeric Booking ID and added to your calendar.',
      },
    ],
  },
  {
    id: 'hotseat-booking',
    title: 'Hot-Seat / Desk Booking',
    icon: MapPin,
    badge: 'Interactive Map',
    description: 'How to reserve individual workstations using the interactive floor map.',
    topics: [
      {
        title: '1. Navigating the Office Floor Plan',
        content:
          'Go to "Hotseat Reservation" in the sidebar to open the interactive office floor map. You can toggle between Module 1 and Module 2 floor layouts.',
      },
      {
        title: '2. Understanding Desk Color Codes',
        content:
          'The floor map uses live color coding for each workstation pin:',
        steps: [
          '🟢 Green Pin: Available workstation ready for immediate booking.',
          '🔵 Blue Pin: Your currently selected seat on the floor map.',
          '🔴 Red Pin: Occupied / Booked desk currently reserved by another team member.',
          '⚪ Gray Pin: Unavailable workstation (non-reservable or maintenance slot).',
        ],
      },
      {
        title: '3. Booking a Workstation Desk',
        content:
          'Select your target Date and Work Shift (Full Day 10:00 AM - 10:00 PM, Morning 10:00 AM - 04:00 PM, or Afternoon 04:00 PM - 10:00 PM). Pick any Green available seat, and confirm.',
      },
      {
        title: '4. Checking In & QR Code Workflow',
        content:
          'Once booked, your workstation card appears under the map. When arriving at the office, click "Check In" or scan the desk QR code to confirm your physical presence.',
      },
    ],
  },
  {
    id: 'managing-bookings',
    title: 'Managing My Reservations',
    icon: Calendar,
    badge: 'My Bookings',
    description: 'Viewing, rescheduling time slots, and cancelling reservations.',
    topics: [
      {
        title: '1. Viewing Active & Upcoming Reservations',
        content:
          'Visit "My Bookings" to see all your reservations organized in tabs: Active (upcoming meetings), Completed (past meetings), and Cancelled. Filter by date, search by meeting title, and inspect clean numeric Booking IDs.',
      },
      {
        title: '2. Rescheduling / Editing Booking Time',
        content:
          'Need to change your meeting time? Click the "Edit / Reschedule" button on your booking card. Pick a new date or adjust start/end time slots within 10:00 AM – 10:00 PM. The system validates conflict-free slots instantly.',
      },
      {
        title: '3. Cancelling Reservations',
        content:
          'If you no longer need a reserved space, click "Cancel" on your booking card:',
        steps: [
          'Meeting Rooms: Enter a brief cancellation reason (e.g. Schedule Conflict, Client Postponed) to keep facilities audit logs accurate.',
          'Hot-Seats: Instant cancellation with confirmation only—no reason required.',
        ],
      },
    ],
  },
  {
    id: 'availability-calendar',
    title: 'Availability Calendar',
    icon: Clock,
    badge: 'Schedule Grid',
    description: 'Visual time-grid matrix of all rooms across the workplace.',
    topics: [
      {
        title: 'How to Check Workspace Availability',
        content:
          'The "Availability Calendar" page provides a bird’s-eye view matrix of all office meeting rooms across hourly time slots (10:00 AM to 10:00 PM).',
        steps: [
          'Select any date to inspect room schedules for that day.',
          'On weekends (Saturday/Sunday), the calendar automatically looks ahead to the next working business day.',
          'Look for green open slots to find times where all rooms or specific rooms are vacant.',
          'Click directly on an available slot to initiate an instant booking.',
        ],
      },
    ],
  },
  {
    id: 'aira-assistant',
    title: 'Aira AI Assistant',
    icon: Sparkles,
    badge: 'AI Assistant',
    description: 'Using the built-in intelligent assistant with background preloading for zero-lag support.',
    topics: [
      {
        title: 'Instant Background Preloading',
        content:
          'Aira is automatically preloaded in the background upon application startup. When you click the floating Aira icon in the top navigation bar, the chat interface opens immediately without loading delays.',
      },
      {
        title: 'Supported Prompts & Capabilities',
        content:
          'You can chat with Aira using these 6 supported prompts:',
        steps: [
          '1. Office Locations: "What office locations are available in the system?"',
          '2. Office Search: "Search for the office located in [City/Location Name]."',
          '3. Available Rooms: "What rooms are available in the [Office Name] office?"',
          '4. Room Search: "Search for the room named [Room Name]."',
          '5. Office & Room Filtering: "Show me the rooms in [Office Name] that match the selected [Filter Criteria]."',
          '6. Room Information: "Tell me about the [Room Name] room."',
        ],
      },
    ],
  },
  {
    id: 'admin-portal',
    title: 'Admin Tools & Intelligence',
    icon: ShieldCheck,
    badge: 'Admin Only',
    description: 'Executive KPIs, reservation audit modal, room management, and visual analytics.',
    topics: [
      {
        title: '1. Reports & Executive KPI Cards',
        content:
          'The Admin Reports page gives administrators a unified overview with compact, high-impact cards:',
        steps: [
          'Executive KPI Metrics: Total Reservations, Utilization %, Confirmed Bookings (with % rate), Cancelled Bookings (with % impact), and Workforce Engagement.',
          'Compact 5-Column Sizing: All metric cards fit neatly across the screen without horizontal scrolling.',
          'Dynamic Global Filter Bar: Filter metrics by Timeframe (All Time, Today, Past 7 Days, Past 30 Days, Past Dates), Module (Elcot Park Module 1 & 2, Tidel Park Module 1), and Status (All Status, Confirmed, Cancelled).',
          'Export CSV: Download full reservation audit records including timestamps, requester details, and cancellation reasons.',
        ],
      },
      {
        title: '2. Workplace Reservation Records & Audit Modal',
        content:
          'The reservation records table is accessed cleanly via the "View" button in the summary card:',
        steps: [
          'Dedicated Audit Modal: Clicking "View" opens a spacious audit modal showing Booking ID, Meeting Title, Room, Module, Date, Time, Created By, and Status.',
          'Clean Numeric IDs: Booking IDs render as clean numeric values without unnecessary prefixes.',
          'Live Search & Quick Reset: Search by employee, room, title, or booking ID, with instant filter reset.',
          'Pagination: Browse records smoothly with 8 items per page.',
        ],
      },
      {
        title: '3. Workspace Administration & Inventory',
        content:
          'The Workspace Administration page allows administrators to manage room inventory and operational states across Elcot Park and Tidel Park:',
        steps: [
          'Inventory Metrics: Monitor Total Workspaces, Available, Reserved (currently occupied), and Maintenance counts.',
          'Status Controls: Easily toggle room operational states between "Available" and "Maintenance".',
          'Balanced Table Layout: Column widths are precisely distributed with compact padding to prevent text overlap or horizontal scrollbars.',
          'Add & Edit Workspaces: Create new meeting rooms or update capacities, module locations, and multimedia facilities.',
        ],
      },
      {
        title: '4. Visual Analytics & Usage Intelligence',
        content:
          'Compact business intelligence charts included on the Reports page:',
        steps: [
          'Employee Booking vs Cancellation Ratio: Top employee booking volume compared with cancellation rates.',
          'Reservation Outcome Breakdown: Donut chart illustrating confirmed vs cancelled proportions.',
          'Reservation Volume Trendline: Interactive area chart tracking monthly and weekly volume patterns.',
          'Most Reserved Rooms: Horizontal bar ranking identifying the most frequently booked workspaces.',
          'Peak Workspace Demand by Hour: Hourly distribution of office reservations across the workday.',
        ],
      },
    ],
  },
  {
    id: 'faqs',
    title: 'Frequently Asked Questions',
    icon: HelpCircle,
    badge: 'FAQs',
    description: 'Quick answers to common questions and troubleshooting.',
    topics: [
      {
        title: 'Can I book a room on Saturday or Sunday?',
        content:
          'No. The office is operational Monday through Friday. Weekend dates are restricted to prevent unnecessary energy consumption and maintain facility schedules.',
      },
      {
        title: 'Which campus modules are supported in SpaceBook?',
        content:
          'SpaceBook supports Module 1 - Elcot Park - CMB, Module 2 - Elcot Park - CMB, and Module 1 - Tidel Park - CMB across Conference, Training, and Discussion rooms.',
      },
      {
        title: 'Is there a limit on how long I can reserve a room?',
        content:
          'Bookings must fall within official office hours (10:00 AM – 10:00 PM). Standard reservations range from 30 minutes up to full-day sessions depending on room availability.',
      },
      {
        title: 'How do I know if my booking was approved?',
        content:
          'All reservations are auto-approved instantly. You will receive an on-screen confirmation and your booking will immediately show in your "My Bookings" list.',
      },
      {
        title: 'Where can I see why a reservation was cancelled?',
        content:
          'Cancellation reasons are viewable by Admins in the "Reservation Details" modal when clicking View on any booking, as well as in the exported CSV audit report.',
      },
      {
        title: 'How do administrators manage bookings and rooms?',
        content:
          'Administrators use "Reports" to monitor executive KPIs, view the reservation audit modal, and export CSV reports. Room inventory, capacities, and maintenance modes are managed under "Workspace Administration".',
      },
    ],
  },
]

export default function UserGuideModal({ open, onClose }) {
  const [activeSectionId, setActiveSectionId] = useState('getting-started')
  const [searchQuery, setSearchQuery] = useState('')

  // Filter sections by search query
  const filteredSections = useMemo(() => {
    if (!searchQuery.trim()) return GUIDE_SECTIONS

    const q = searchQuery.toLowerCase()
    return GUIDE_SECTIONS.map((section) => {
      const matchSection =
        section.title.toLowerCase().includes(q) ||
        section.description.toLowerCase().includes(q)

      const matchingTopics = section.topics.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.content.toLowerCase().includes(q) ||
          (t.tips && t.tips.toLowerCase().includes(q)) ||
          (t.steps && t.steps.some((s) => s.toLowerCase().includes(q)))
      )

      if (matchSection || matchingTopics.length > 0) {
        return {
          ...section,
          topics: matchingTopics.length > 0 ? matchingTopics : section.topics,
        }
      }
      return null
    }).filter(Boolean)
  }, [searchQuery])

  const activeSection =
    filteredSections.find((s) => s.id === activeSectionId) ||
    filteredSections[0] ||
    GUIDE_SECTIONS[0]

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[100000] font-sans flex items-center justify-center bg-slate-900/60 p-3 sm:p-6 backdrop-blur-md animate-in fade-in duration-200"
      style={{ fontFamily: 'var(--fontFamilyBase, "Segoe UI Variable", "Segoe UI", sans-serif)' }}
    >
      <div className="relative flex h-[90vh] max-h-[820px] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-sky-100 bg-white shadow-2xl">
        {/* =================================================
            Modal Header
        ================================================= */}
        <div className="flex items-center justify-between border-b border-line bg-gradient-to-r from-sky-50 via-white to-sky-50/50 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-600 text-white shadow-md shadow-sky-600/20">
              <BookOpen size={20} />
            </div>
            <div>
              <h2 className="font-display text-lg font-bold text-sky-950">
                SpaceBook User Guide & Help Center
              </h2>
              <p className="text-xs text-slate-500 font-sans">
                Complete walkthrough for room reservations, hot-desking, policies, and admin tools.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-800 transition"
            title="Close User Guide"
          >
            <X size={18} />
          </button>
        </div>

        {/* =================================================
            Search Bar
        ================================================= */}
        <div className="border-b border-line bg-slate-50/50 px-6 py-3">
          <div className="relative">
            <Search
              size={16}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search topics (e.g., 'how to reschedule', 'office hours', 'hotseat', 'excel export')..."
              className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-10 pr-4 text-xs font-sans text-slate-800 placeholder-slate-400 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 hover:text-slate-600"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* =================================================
            Main Content: Sidebar Navigation + Topic Body
        ================================================= */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left Navigation Sidebar */}
          <div className="w-64 border-r border-line bg-slate-50/60 p-3 overflow-y-auto hidden md:block">
            <p className="px-3 py-1 font-mono text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Guide Chapters
            </p>
            <nav className="mt-1 space-y-1">
              {filteredSections.map((section) => {
                const Icon = section.icon
                const isActive = activeSection.id === section.id
                return (
                  <button
                    key={section.id}
                    onClick={() => setActiveSectionId(section.id)}
                    className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-xs font-sans font-semibold transition ${
                      isActive
                        ? 'bg-sky-600 text-white shadow-sm font-bold'
                        : 'text-slate-700 hover:bg-slate-200/60 hover:text-slate-900'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <Icon
                        size={15}
                        className={isActive ? 'text-white' : 'text-sky-700'}
                      />
                      <span className="truncate">{section.title}</span>
                    </div>
                    {isActive && <ChevronRight size={14} className="shrink-0" />}
                  </button>
                )
              })}
            </nav>

            {/* Quick Policy Box in Sidebar */}
            <div className="mt-6 rounded-2xl border border-sky-200 bg-white p-3 shadow-sm">
              <div className="flex items-center justify-between font-mono text-[11px] font-bold text-sky-950 uppercase tracking-wider">
                <span>Active Hours</span>
                <Clock size={13} className="text-sky-600" />
              </div>
              <p className="mt-1 text-xs font-bold text-sky-700 font-sans">
                10:00 AM – 10:00 PM
              </p>
              <p className="mt-1 text-[10px] text-slate-500 font-sans leading-tight">
                Monday to Friday · Instant auto-confirmations.
              </p>
            </div>
          </div>

          {/* Right Topic Details Body */}
          <div className="flex-1 overflow-y-auto p-6 bg-white space-y-6">
            {/* Active Chapter Header */}
            <div className="border-b border-line pb-4">
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-sky-100 px-2.5 py-0.5 font-mono text-[11px] font-bold text-sky-800 uppercase tracking-wider">
                  {activeSection.badge}
                </span>
              </div>
              <h3 className="mt-1 font-display text-xl font-bold text-slate-900">
                {activeSection.title}
              </h3>
              <p className="text-xs text-slate-500 font-sans mt-0.5">
                {activeSection.description}
              </p>
            </div>

            {/* Topics List */}
            <div className="space-y-6">
              {activeSection.topics.map((topic, idx) => (
                <div
                  key={idx}
                  className="rounded-2xl border border-slate-200/80 bg-slate-50/40 p-5 space-y-3 transition hover:border-sky-200 hover:bg-white"
                >
                  <div className="flex items-center gap-2">
                    <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-sky-100 text-sky-800 text-xs font-mono font-bold">
                      {idx + 1}
                    </div>
                    <h4 className="font-display text-sm font-bold text-slate-900">
                      {topic.title}
                    </h4>
                  </div>

                  <p className="text-xs text-slate-700 font-sans leading-relaxed pl-8">
                    {topic.content}
                  </p>

                  {/* Step list if applicable */}
                  {topic.steps && (
                    <div className="pl-8 space-y-1.5 pt-1">
                      {topic.steps.map((step, sIdx) => (
                        <div
                          key={sIdx}
                          className="flex items-start gap-2 text-xs font-sans text-slate-600"
                        >
                          <ArrowRight
                            size={12}
                            className="text-sky-600 shrink-0 mt-0.5"
                          />
                          <span>{step}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Pro-Tip Box */}
                  {topic.tips && (
                    <div className="ml-8 mt-2 rounded-xl border border-emerald-200 bg-emerald-50/60 p-2.5 text-xs font-sans text-emerald-900 flex items-start gap-2">
                      <CheckCircle2
                        size={14}
                        className="text-emerald-600 shrink-0 mt-0.5"
                      />
                      <span>
                        <strong className="font-semibold">Pro-Tip:</strong> {topic.tips}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* =================================================
            Modal Footer
        ================================================= */}
        <div className="flex items-center justify-between border-t border-line bg-slate-50 px-6 py-3 text-xs font-sans text-slate-500">
          <div className="flex items-center gap-2">
            <Sparkles size={14} className="text-sky-600" />
            <span>Need more help? Ask <strong>Aira</strong> anytime.</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-sky-700 px-4 py-1.5 font-sans font-bold text-white shadow-sm hover:bg-sky-800 transition"
          >
            Got it, thanks!
          </button>
        </div>
      </div>
    </div>
  )
}
