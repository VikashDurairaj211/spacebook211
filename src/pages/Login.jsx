import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Field, Input } from '../components/common/Input'
import Button from '../components/common/Button'

export default function Login() {
  const { login, error, loading } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    const ok = await login(email, password)
    if (ok) navigate('/')
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-paper px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mb-2 font-display text-2xl font-700 tracking-tight text-ink">
            SPACEBOOK
          </div>
          <p className="font-mono text-xs uppercase tracking-wider text-slate">
            Office Workspace Reservation
          </p>
        </div>

        <form onSubmit={handleSubmit} className="border border-ink bg-white p-6">
          <div className="space-y-4">
            <Field label="Email">
              <Input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
              />
            </Field>
            <Field label="Password">
              <Input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </Field>
          </div>

          {error && (
            <p className="mt-4 border border-clay px-3 py-2 text-sm text-clay">{error}</p>
          )}

          <Button type="submit" className="mt-6 w-full" disabled={loading}>
            {loading ? 'Signing in...' : 'Log In'}
          </Button>

          <div className="mt-4 text-center">
            <a href="#" className="font-mono text-xs text-slate underline underline-offset-2 hover:text-ink">
              Forgot password?
            </a>
          </div>
        </form>
        <p className="mt-4 text-xs text-slate">Tip: include "admin" in the email (e.g. admin@company.com) to sign in as an Admin for the demo.</p>
      </div>
    </div>
  )
}
