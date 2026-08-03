// Stand-in for GET /api/rooms until the .NET + PostgreSQL backend is connected.
// `code` mirrors how you'd likely key rooms in the database (module + short type + index).
export const MOCK_ROOMS = [
  { id: 'r1', name: 'Conference Room 1', code: 'M1-CR1', module: 'Module 1', type: 'Conference', capacity: 10, status: 'Available' },
  { id: 'r2', name: 'Discussion Room 1', code: 'M1-DR1', module: 'Module 1', type: 'Discussion', capacity: 4, status: 'Available' },
  { id: 'r3', name: 'Discussion Room 2', code: 'M1-DR2', module: 'Module 1', type: 'Discussion', capacity: 4, status: 'Booked' },
  { id: 'r4', name: 'Discussion Room 3', code: 'M1-DR3', module: 'Module 1', type: 'Discussion', capacity: 4, status: 'Available' },
  { id: 'r5', name: 'Discussion Room 1', code: 'M2-DR1', module: 'Module 2', type: 'Discussion', capacity: 4, status: 'Available' },
  { id: 'r6', name: 'Discussion Room 2', code: 'M2-DR2', module: 'Module 2', type: 'Discussion', capacity: 4, status: 'Booked' },
  { id: 'r7', name: 'Discussion Room 3', code: 'M2-DR3', module: 'Module 2', type: 'Discussion', capacity: 6, status: 'Available' },
  { id: 'r8', name: 'Discussion Room 4', code: 'M2-DR4', module: 'Module 2', type: 'Discussion', capacity: 6, status: 'Available' },
  { id: 'r9', name: 'Training Room 1', code: 'M2-TR1', module: 'Module 2', type: 'Training', capacity: 20, status: 'Available' },
  { id: 'r10', name: 'Game Room 1', code: 'M2-GR1', module: 'Module 2', type: 'Game', capacity: 8, status: 'Available' },
]

export const MODULES = ['Module 1', 'Module 2']
export const ROOM_TYPES = ['Conference', 'Discussion', 'Training', 'Game']
