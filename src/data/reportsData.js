export const reportTypes = ['Daily', 'Weekly', 'Monthly', 'Quarterly', 'Yearly']
export const moduleOptions = ['All', 'Module 1', 'Module 2', 'Module 3']
export const roomTypeOptions = ['All', 'Conference', 'Discussion', 'Training', 'Executive']
export const statusOptions = ['All', 'Confirmed', 'Pending', 'Cancelled']

export const defaultReportFilters = {
  startDate: '2026-07-01',
  endDate: '2026-07-31',
  reportType: 'Monthly',
  module: 'All',
  roomType: 'All',
  status: 'All',
}

export const kpiMetrics = [
  { label: 'Total Bookings', value: '248' },
  { label: 'Total Rooms', value: '34' },
  { label: 'Rooms Utilized', value: '28' },
  { label: 'Occupancy Rate', value: '82%' },
  { label: 'Avg. Booking Duration', value: '1h 45m' },
  { label: 'Peak Booking Day', value: 'Friday' },
  { label: 'Most Booked Room', value: 'Conference Room 1' },
  { label: 'Cancellation Rate', value: '10%' },
]

export const monthlyBookingTrend = [
  { month: 'Jan', bookings: 42 },
  { month: 'Feb', bookings: 58 },
  { month: 'Mar', bookings: 63 },
  { month: 'Apr', bookings: 76 },
  { month: 'May', bookings: 91 },
  { month: 'Jun', bookings: 104 },
  { month: 'Jul', bookings: 118 },
  { month: 'Aug', bookings: 125 },
]

export const weeklyBookingTrend = [
  { day: 'Mon', bookings: 18 },
  { day: 'Tue', bookings: 24 },
  { day: 'Wed', bookings: 28 },
  { day: 'Thu', bookings: 34 },
  { day: 'Fri', bookings: 42 },
  { day: 'Sat', bookings: 16 },
  { day: 'Sun', bookings: 12 },
]

export const moduleUtilization = [
  { module: 'Module 1', utilization: 78, bookings: 68 },
  { module: 'Module 2', utilization: 92, bookings: 83 },
  { module: 'Module 3', utilization: 64, bookings: 50 },
]

export const bookingStatusDistribution = [
  { name: 'Confirmed', value: 148 },
  { name: 'Pending', value: 64 },
  { name: 'Cancelled', value: 28 },
]

export const roomTypeUsage = [
  { name: 'Conference', value: 112 },
  { name: 'Discussion', value: 74 },
  { name: 'Training', value: 32 },
  { name: 'Executive', value: 30 },
]

export const peakBookingHours = [
  { hour: '08:00', bookings: 12 },
  { hour: '09:00', bookings: 22 },
  { hour: '10:00', bookings: 34 },
  { hour: '11:00', bookings: 39 },
  { hour: '12:00', bookings: 32 },
  { hour: '13:00', bookings: 25 },
  { hour: '14:00', bookings: 18 },
  { hour: '15:00', bookings: 16 },
  { hour: '16:00', bookings: 14 },
]

export const mostBookedRooms = [
  { roomName: 'Conference Room 1', module: 'Module 2', totalBookings: 48, utilization: 92, roomType: 'Conference', status: 'Confirmed' },
  { roomName: 'Discussion Room 3', module: 'Module 1', totalBookings: 37, utilization: 85, roomType: 'Discussion', status: 'Confirmed' },
  { roomName: 'Training Room 1', module: 'Module 3', totalBookings: 24, utilization: 74, roomType: 'Training', status: 'Confirmed' },
]

export const leastUsedRooms = [
  { roomName: 'Executive Suite 2', module: 'Module 2', totalBookings: 4, roomType: 'Executive', status: 'Confirmed' },
  { roomName: 'Discussion Room 5', module: 'Module 3', totalBookings: 6, roomType: 'Discussion', status: 'Pending' },
  { roomName: 'Conference Room 4', module: 'Module 1', totalBookings: 8, roomType: 'Conference', status: 'Confirmed' },
]

export const recentBookingActivity = [
  { bookingId: 'B-1024', employee: 'Alicia Pena', room: 'Conference Room 1', date: '2026-08-04', duration: '2h 00m', status: 'Confirmed', module: 'Module 2', roomType: 'Conference' },
  { bookingId: 'B-1018', employee: 'Marcus Lee', room: 'Discussion Room 2', date: '2026-08-03', duration: '1h 30m', status: 'Pending', module: 'Module 1', roomType: 'Discussion' },
  { bookingId: 'B-1031', employee: 'Sara Khan', room: 'Training Room 1', date: '2026-08-02', duration: '3h 00m', status: 'Confirmed', module: 'Module 3', roomType: 'Training' },
  { bookingId: 'B-1007', employee: 'Daniel Cross', room: 'Conference Room 1', date: '2026-08-01', duration: '1h 45m', status: 'Cancelled', module: 'Module 2', roomType: 'Conference' },
]

export const reportInsights = [
  'Module 2 has the highest utilization this month.',
  'Conference Room 1 is the most booked room.',
  'Friday has the highest booking count.',
  'Average occupancy is 82%.',
  '10% of bookings were cancelled.',
]
