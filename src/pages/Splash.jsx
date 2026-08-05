import { Navigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Button from '../components/common/Button'

export default function SplashPage() {
  const { user } = useAuth()

  if (user) {
    return <Navigate to="/dashboard" replace />
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-brand-bg px-4 py-10">
      <div className="w-full max-w-5xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl">
        <div className="grid gap-0 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="bg-gradient-to-br from-brand-navy to-brand-blue px-8 py-12 text-white sm:px-12 lg:px-14">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-blue-100">SpaceBook</p>
            <h1 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl">
              Reserve the right room, instantly.
            </h1>
            <p className="mt-5 max-w-xl text-lg text-blue-100/90">
              A modern office workspace experience for booking rooms, managing availability, and keeping teams aligned.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/login">
                <Button variant="secondary" className="bg-white text-brand-navy hover:bg-slate-100">
                  Get Started
                </Button>
              </Link>
            </div>
          </div>

          <div className="bg-brand-bg px-8 py-12 sm:px-12 lg:px-14">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-sm font-semibold uppercase tracking-[0.25em] text-brand-blue">What you can do</p>
              <ul className="mt-5 space-y-3 text-sm text-slate-600">
                <li className="flex items-start gap-2">
                  <span className="mt-1 h-2.5 w-2.5 rounded-full bg-brand-blue" />
                  Search and book meeting rooms in seconds.
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1 h-2.5 w-2.5 rounded-full bg-brand-blue" />
                  View live availability across your workplace.
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1 h-2.5 w-2.5 rounded-full bg-brand-blue" />
                  Manage approvals and room operations as an admin.
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
