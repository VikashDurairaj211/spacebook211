import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import Button from '../components/common/Button'
import Card from '../components/common/Card'
import Loader from '../components/common/Loader'

export default function RoomDetails() {
  const [searchParams] = useSearchParams()
  const roomId = searchParams.get('roomId')
  const [room, setRoom] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    getRoomById(roomId).then((data) => { if (active) setRoom(data) }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [roomId])

  const bookingQuery = searchParams.toString()
  if (loading) return <Loader label="Loading room details..." />
  if (!room) return <Card><p className="font-medium">Room not found.</p><Link to="/search-rooms" className="mt-3 inline-block text-sm text-brand-blue underline">Return to room search</Link></Card>

  return <div className="mx-auto max-w-2xl space-y-6"><div><Link to="/search-rooms" className="text-sm text-brand-blue underline">Back to available rooms</Link><h1 className="mt-2 font-display text-xl font-700">{room.name}</h1><p className="text-sm text-slate">{room.code} · {room.module} · {room.type}</p></div><Card><dl className="grid gap-4 sm:grid-cols-2"><div><dt className="font-mono text-[11px] uppercase tracking-wider text-slate">Capacity</dt><dd className="mt-1 text-sm">{room.capacity} people</dd></div><div><dt className="font-mono text-[11px] uppercase tracking-wider text-slate">Facilities</dt><dd className="mt-1 text-sm">{room.facilities?.join(', ') || 'None'}</dd></div><div><dt className="font-mono text-[11px] uppercase tracking-wider text-slate">Selected time</dt><dd className="mt-1 text-sm">{searchParams.get('date')} · {searchParams.get('startTime')}–{searchParams.get('endTime')}</dd></div><div><dt className="font-mono text-[11px] uppercase tracking-wider text-slate">Attendees</dt><dd className="mt-1 text-sm">{searchParams.get('attendees')}</dd></div></dl></Card><Link to={`/book-room?${bookingQuery}`}><Button>Continue Booking </Button></Link></div>
}
