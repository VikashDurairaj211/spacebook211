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
    description: 'Basic rules, office operating hours, and instant confirmation system.',
    topics: [
      {
        title: 'Office Operating Hours (10:00 AM – 10:00 PM)',
        content:
          'SpaceBook operates during official office hours from 10:00 AM to 10:00 PM IST (Monday through Friday). All meeting room and hot-seat bookings must fall within this timeframe.',
        tips: 'The system automatically disables time slots outside 10:00 AM – 10:00 PM.',
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
    description: 'How to search, check amenities, and reserve meeting spaces.',
    topics: [
      {
        title: '1. Finding the Right Meeting Room',
        content:
          'Navigate to "Search Rooms" from the sidebar. Use filters at the top to filter by Location (Module 1 / Module 2 - Elcot Park), Date, Time Slots, Capacity range, and specific Amenities.',
        steps: [
          'Select your desired Date and Start/End times (between 10:00 AM and 10:00 PM).',
          'Filter by required amenities (e.g. Video Conferencing, Smart TV, Whiteboard, Projector).',
          'Review real-time room cards showing room capacity, module location, and current availability status.',
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
          'Click "Book Now", enter your Meeting Title and Purpose, review the summary modal, and click "Confirm Booking". Your reservation is created immediately and added to your calendar.',
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
          'Go to "Hotseat Booking" in the sidebar to open the interactive office floor map. You can toggle between Module 1 and Module 2 floor layouts.',
      },
      {
        title: '2. Understanding Desk Color Codes',
        content:
          'The floor map uses live color coding for each workstation pin:',
        steps: [
          '🟢 Green Pin: Available workstation ready for immediate booking.',
          '🔴 Red Pin: Occupied desk currently reserved by another team member.',
          '🔵 Blue Pin: Your currently selected seat on the floor map.',
        ],
      },
      {
        title: '3. Reserving Your Hot-Seat',
        content:
          'Click on any available green seat pin, select your expected check-in time (from 10:00 AM onwards), and confirm your reservation. You can manage or release your hot-seat from the desk panel anytime.',
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
          'Visit "My Bookings" to see all your reservations organized in tabs: Active (upcoming meetings), Completed (past meetings), and Cancelled. Filter by date or search by meeting title.',
      },
      {
        title: '2. Rescheduling / Editing Booking Time',
        content:
          'Need to change your meeting time? Click the "Edit / Reschedule" button on your booking card. Pick a new date or adjust the start/end time slots within 10:00 AM – 10:00 PM. The system validates conflict-free slots instantly.',
      },
      {
        title: '3. Cancelling with Reason',
        content:
          'If your meeting is no longer happening, click "Cancel". Select or enter a brief cancellation reason (e.g. Schedule Conflict, Client Postponed). This immediately frees the room for other colleagues and records clean analytics for the company.',
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
    id: 'spacebook-copilot',
    title: 'SpaceBook AI Copilot',
    icon: Sparkles,
    badge: 'AI Assistant',
    description: 'Using the built-in intelligent assistant for instant support.',
    topics: [
      {
        title: 'What SpaceBook AI Can Do',
        content:
          'SpaceBook features a built-in AI Copilot accessible via the floating icon in the top right corner. You can chat with it to get quick help on:',
        steps: [
          'Checking room availability and recommending rooms based on team size.',
          'Explaining office booking rules, operational hours, and policies.',
          'Guiding you on how to reschedule or cancel bookings.',
          'Answering general workplace and facility questions in real-time.',
        ],
      },
    ],
  },
  {
    id: 'admin-portal',
    title: 'Admin Tools & Analytics',
    icon: ShieldCheck,
    badge: 'Admin Only',
    description: 'Room inventory, master booking management, and workplace reports.',
    topics: [
      {
        title: '1. Room Management',
        content:
          'Admins can add new meeting rooms, update room capacity, set floor/module location, configure equipment amenities, and toggle rooms into maintenance mode when unavailable.',
      },
      {
        title: '2. Master Booking Management',
        content:
          'The Master Booking Management page gives administrators complete visibility into all employee reservations across the organization. Admins can search by employee or room, filter by date, and perform administrative overrides when needed.',
      },
      {
        title: '3. Workplace Analytics & Executive Reports',
        content:
          'The Reports page provides deep visual business intelligence:',
        steps: [
          'Top KPI Cards: Total Reservations, Confirmed Rate %, Cancelled Rate %, Workforce Engagement.',
          'Visual Charts: Employee Booking vs Cancel Ratio, Reservation Outcome Donut, Volume Trendline (Monthly/Weekly), Room Demand Rankings.',
          'Cancellation Drivers: Visual breakdown of reasons why employees cancel rooms.',
          'Peak Hours Chart: Demand distribution across office hours (10:00 AM – 10:00 PM).',
          'Excel Export: Download a 4-sheet formatted Excel workbook (.xlsx) including detailed audits, employee breakdowns, and cancellation insights.',
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
        title: 'How do I mark all notifications as read?',
        content:
          'Click the Notification Bell in the top bar and select "Mark all as read". Your unread badge will clear and the state is permanently saved.',
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
    <div className="fixed inset-0 z-[100000] flex items-center justify-center bg-slate-900/60 p-3 sm:p-6 backdrop-blur-md animate-in fade-in duration-200">
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
              <p className="text-xs text-slate-500">
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
              className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-10 pr-4 text-xs text-slate-800 placeholder-slate-400 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
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
            <p className="px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-slate-400">
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
                    className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-xs font-semibold transition ${
                      isActive
                        ? 'bg-sky-600 text-white shadow-sm'
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
              <div className="flex items-center justify-between text-[11px] font-bold text-sky-950">
                <span>Active Hours</span>
                <Clock size={13} className="text-sky-600" />
              </div>
              <p className="mt-1 text-xs font-mono font-bold text-sky-700">
                10:00 AM – 10:00 PM
              </p>
              <p className="mt-1 text-[10px] text-slate-500 leading-tight">
                Monday to Friday · Instant auto-confirmations.
              </p>
            </div>
          </div>

          {/* Right Topic Details Body */}
          <div className="flex-1 overflow-y-auto p-6 bg-white space-y-6">
            {/* Active Chapter Header */}
            <div className="border-b border-line pb-4">
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-sky-100 px-2.5 py-0.5 font-mono text-[10px] font-bold text-sky-800 uppercase tracking-wider">
                  {activeSection.badge}
                </span>
              </div>
              <h3 className="mt-1 font-display text-xl font-bold text-slate-900">
                {activeSection.title}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
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
                    <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-sky-100 text-sky-800 font-mono text-xs font-bold">
                      {idx + 1}
                    </div>
                    <h4 className="font-display text-sm font-bold text-slate-900">
                      {topic.title}
                    </h4>
                  </div>

                  <p className="text-xs text-slate-700 leading-relaxed pl-8">
                    {topic.content}
                  </p>

                  {/* Step list if applicable */}
                  {topic.steps && (
                    <div className="pl-8 space-y-1.5 pt-1">
                      {topic.steps.map((step, sIdx) => (
                        <div
                          key={sIdx}
                          className="flex items-start gap-2 text-xs text-slate-600"
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
                    <div className="ml-8 mt-2 rounded-xl border border-emerald-200 bg-emerald-50/60 p-2.5 text-xs text-emerald-900 flex items-start gap-2">
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
        <div className="flex items-center justify-between border-t border-line bg-slate-50 px-6 py-3 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <Sparkles size={14} className="text-sky-600" />
            <span>Need more help? Ask the floating <strong>SpaceBook AI Copilot</strong> anytime.</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-sky-700 px-4 py-1.5 font-bold text-white shadow-sm hover:bg-sky-800 transition"
          >
            Got it, thanks!
          </button>
        </div>
      </div>
    </div>
  )
}
