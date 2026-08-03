import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Field, Input, Select } from '../components/common/Input'
import Button from '../components/common/Button'
import { useAuth } from '../context/AuthContext'

export default function RegisterPage() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({
    employeeId: '',
    name: '',
    email: '',
    department: 'Engineering',
    password: '',
    confirmPassword: '',
  })
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const passwordStrength = useMemo(() => {
    const pwd = form.password
    if (!pwd) return null
    if (pwd.length < 6) return { label: 'Weak', tone: 'text-red-600' }
    if (pwd.length < 10 || !/[A-Z]/.test(pwd) || !/[0-9]/.test(pwd)) {
      return { label: 'Medium', tone: 'text-amber-600' }
    }
    return { label: 'Strong', tone: 'text-emerald-600' }
  }, [form.password])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setMessage('')

    if (!form.employeeId.trim() || !form.name.trim() || !form.email.trim() || !form.department || !form.password) {
      setError('Please complete all required fields before continuing.')
      return
    }

    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    if (form.password.length < 6) {
      setError('Password must be at least 6 characters long.')
      return
    }

    const ok = await register({
      employeeId: form.employeeId,
      name: form.name,
      email: form.email,
      department: form.department,
      password: form.password,
    })

    if (ok) {
      setMessage('Account ready. You are being signed in...')
      navigate('/dashboard')
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-brand-bg px-4 py-10">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-xl">
        <div className="mb-6 text-center">
          <h1 className="text-3xl font-semibold tracking-tight text-brand-navy">Spacebook</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Employee ID">
            <Input
              value={form.employeeId}
              onChange={(e) => setForm({ ...form, employeeId: e.target.value })}
              placeholder="EMP-1024"
            />
          </Field>

          <Field label="Full Name">
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Alex Morgan"
            />
          </Field>

          <Field label="Email">
            <Input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="alex@company.com"
            />
          </Field>

          <Field label="Department">
            <Select
              value={form.department}
              onChange={(e) => setForm({ ...form, department: e.target.value })}
            >
              <option value="Engineering">Engineering</option>
              <option value="HR">HR</option>
              <option value="Operations">Operations</option>
              <option value="Finance">Finance</option>
              <option value="Admin">Admin</option>
            </Select>
          </Field>

          <Field label="Password">
            <Input
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="Enter your password"
            />
          </Field>

          <Field label="Confirm Password">
            <Input
              type="password"
              value={form.confirmPassword}
              onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
              placeholder="Re-enter password"
            />
          </Field>

          {passwordStrength ? (
            <div className="text-sm text-slate-500">
              Password strength: <span className={passwordStrength.tone}>{passwordStrength.label}</span>
            </div>
          ) : null}

          {error ? <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p> : null}
          {message ? <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-600">{message}</p> : null}

          <Button type="submit" className="w-full">Register</Button>
        </form>

        <p className="mt-5 text-center text-sm text-slate-600">
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-brand-blue hover:underline">
            Login
          </Link>
        </p>
      </div>
    </div>
  )
}
