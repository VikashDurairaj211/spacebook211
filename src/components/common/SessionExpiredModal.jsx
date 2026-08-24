import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ShieldAlert, LogIn } from 'lucide-react'
import Button from './Button'

export default function SessionExpiredModal({ open, onClose }) {
  const navigate = useNavigate()
  const [countdown, setCountdown] = useState(15)

  useEffect(() => {
    if (!open) {
      setCountdown(15)
      return
    }

    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval)
          handleLoginRedirect()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [open])

  const handleLoginRedirect = () => {
    localStorage.removeItem('spacebook_token')
    localStorage.removeItem('spacebook_user')
    if (onClose) onClose()
    navigate('/login')
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-amber-200 bg-white p-6 shadow-2xl">
        {/* Top Decorative Amber Bar */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-400 via-orange-500 to-amber-500" />

        <div className="flex flex-col items-center text-center">
          {/* Animated Warning Icon with Glow */}
          <div className="relative mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-50 ring-8 ring-amber-50/50">
            <ShieldAlert size={32} className="text-amber-600 animate-pulse" />
          </div>

          <h3 className="font-display text-xl font-bold text-slate-900">
            Your Session Has Expired
          </h3>

          <p className="mt-2 text-sm text-slate-600 leading-relaxed">
            For your security and workspace data protection, your session has timed
            out due to inactivity. Please log in again to continue.
          </p>

          {/* Countdown notice */}
          <div className="mt-4 rounded-xl bg-amber-50/80 px-3.5 py-1.5 font-mono text-xs font-semibold text-amber-900">
            Auto-redirecting to login in {countdown}s
          </div>

          {/* Action Button */}
          <div className="mt-6 w-full">
            <Button
              onClick={handleLoginRedirect}
              className="w-full flex items-center justify-center gap-2 bg-sky-700 hover:bg-sky-800 text-white font-bold py-2.5 rounded-xl shadow-md transition-all active:scale-98"
            >
              <LogIn size={16} />
              <span>Log In Again</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
