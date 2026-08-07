import { useEffect, useState } from 'react'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'

export default function NotificationDropdown({ onClose }) {
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  const fetchNotifications = async () => {
    try {
      setLoading(true)
      // 👈 Use 'spacebook_token' here
      const token = localStorage.getItem('spacebook_token')
      const response = await axios.get('http://localhost:5263/api/employee/notifications', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })
      setNotifications(response.data || [])
    } catch (error) {
      console.error('Failed to load notifications:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleMarkAllAsRead = async () => {
    try {
      // 👈 Use 'spacebook_token' here
      const token = localStorage.getItem('spacebook_token')
      await axios.patch(
        'http://localhost:5263/api/notifications/read-all',
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      )
      setNotifications((prev) => prev.map((item) => ({ ...item, isRead: true })))

      window.dispatchEvent(new Event('notificationsRead'))
    } catch (error) {
      console.error('Failed to mark notifications as read:', error)
    }
  }

  useEffect(() => {
    fetchNotifications()
  }, [])

  return (
    <div className="w-[380px] bg-white border border-slate-200 rounded-2xl shadow-xl p-4 font-sans text-slate-800">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
        <div>
          <h3 className="text-lg font-serif font-semibold text-slate-900">Notifications</h3>
          <p className="text-xs text-slate-500">Recent alerts for your account.</p>
        </div>
        <button
          onClick={handleMarkAllAsRead}
          className="text-xs font-medium px-3 py-1.5 border border-slate-300 rounded-lg hover:bg-slate-50 transition"
        >
          Mark all as read
        </button>
      </div>

      <div className="max-h-[320px] overflow-y-auto space-y-3 pr-1">
        {loading ? (
          <p className="text-center py-6 text-sm text-slate-400">Loading alerts...</p>
        ) : notifications.length === 0 ? (
          <p className="text-center py-6 text-sm text-slate-400">No recent notifications</p>
        ) : (
          notifications.map((item) => (
            <div
              key={item.notificationId}
              className={`p-3.5 rounded-xl border transition flex justify-between items-start ${
                !item.isRead ? 'bg-slate-50/70 border-slate-200' : 'bg-white border-slate-100'
              }`}
            >
              <div className="pr-2 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-slate-900 text-sm">{item.title}</span>
                  {!item.isRead && (
                    <span className="bg-amber-400 text-white text-[10px] font-bold px-1.5 py-0.5 rounded tracking-wide uppercase">
                      NEW
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">{item.message}</p>
              </div>

              <div className="text-[10px] text-slate-400 font-mono text-right whitespace-pre uppercase leading-tight pt-0.5">
                {item.timeAgo}
              </div>
            </div>
          ))
        )}
      </div>

      <div className="pt-3 border-t border-slate-100 mt-3 text-center">
        <button
          onClick={() => {
            if (onClose) onClose()
            navigate('/notifications')
          }}
          className="block w-full py-2.5 border border-slate-200 rounded-full font-serif font-semibold text-slate-900 text-sm hover:bg-slate-50 transition"
        >
          View all notifications
        </button>
      </div>
    </div>
  )
}