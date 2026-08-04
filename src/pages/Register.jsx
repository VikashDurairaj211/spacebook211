import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Field, Input } from '../components/common/Input'
import Button from '../components/common/Button'
import { useAuth } from '../context/AuthContext'
import TopNav from '../components/layout/TopNav'

export default function RegisterPage() {
  const { register, error: authError, loading } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ employeeId: '', name: '', email: '', password: '', confirmPassword: '' })
  const [error, setError] = useState('')

  function updateField(field, value) {
    setForm((currentForm) => ({ ...currentForm, [field]: value }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    if (Object.values(form).some((value) => !value.trim())) return setError('Please complete all required fields.')
    if (!/^\S+@\S+\.\S+$/.test(form.email)) return setError('Enter a valid email address.')
    if (form.password.length < 6) return setError('Password must be at least 6 characters long.')
    if (form.password !== form.confirmPassword) return setError('Passwords do not match.')

    const registered = await register(form)
    if (registered) navigate('/login', { replace: true })
  }

  return (
    <div className="min-h-screen bg-brand-bg px-4 py-10 pt-24">
      <TopNav publicOnly />
      <div className="flex items-center justify-center">
        <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-xl">
          <div className="mb-6 text-center"><h1 className="text-3xl font-semibold tracking-tight text-brand-navy">Create your employee account</h1></div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Field label="Full Name"><Input required value={form.name} onChange={(event) => updateField('name', event.target.value)} placeholder="Alex Morgan" /></Field>
            <Field label="Employee ID"><Input required value={form.employeeId} onChange={(event) => updateField('employeeId', event.target.value)} placeholder="EMP-1024" /></Field>
            <Field label="Email"><Input type="email" required value={form.email} onChange={(event) => updateField('email', event.target.value)} placeholder="alex@company.com" /></Field>
            <Field label="Password"><Input type="password" required value={form.password} onChange={(event) => updateField('password', event.target.value)} placeholder="At least 6 characters" /></Field>
            <Field label="Confirm Password"><Input type="password" required value={form.confirmPassword} onChange={(event) => updateField('confirmPassword', event.target.value)} placeholder="Re-enter password" /></Field>
            {(error || authError) && <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error || authError}</p>}
            <Button type="submit" className="w-full">{loading ? 'Registering...' : 'Register'}</Button>
          </form>
          <p className="mt-5 text-center text-sm text-slate-600">Already have an account? <Link to="/login" className="font-semibold text-brand-blue hover:underline">Login</Link></p>
        </div>
      </div>
    </div>
  )
}
