import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { Field, Input } from '../components/common/Input'
import Button from '../components/common/Button'
import Logo from '../../Logo.jpg'

export default function Login() {
  const { login, error, loading } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    const ok = await login(email, password)
    if (ok) navigate(email.trim().toLowerCase() === 'admin@spacebook.com' ? '/admin/dashboard' : '/dashboard')
  }

  return <div className="login-portal min-h-screen px-4 py-8 sm:px-6 sm:py-10">
    <div className="mx-auto max-w-7xl">
      <div className="mb-8 flex items-center gap-4 rounded-b-[18px] bg-[#07205A] px-4 py-4 shadow-[0_20px_50px_rgba(0,0,0,0.18)] sm:px-6">
        <img src={Logo} alt="SpaceBook" className="h-10 w-10 rounded-sm border border-white/15 object-cover" />
        <div>
          <p className="text-lg font-semibold uppercase tracking-[0.35em] text-white"> SpaceBook</p>
        </div>
      </div>

      <div className="grid gap-10 lg:grid-cols-[1.2fr_0.9fr]">
        {/*<div className="flex flex-col justify-center text-white lg:pr-10">
          <h1 className="text-5xl font-semibold leading-tight tracking-tight sm:text-6xl">Welcome to the<br />Service Portal</h1>
          <p className="mt-4 max-w-xl text-lg text-slate-200">Log in to get help or report an issue.</p>
        </div>*/}

        <div className="mx-auto w-full max-w-md">
          <div className="overflow-hidden rounded-[18px] border border-white/20 bg-white/95 shadow-[0_30px_80px_rgba(15,23,42,0.18)] backdrop-blur-sm">
            <div className="border-b border-slate-200 bg-slate-50 px-6 py-5">
              <h2 className="text-lg font-semibold text-slate-900">Log in</h2>
            </div>
            <div className="px-6 py-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                <Field label="User name"><Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Enter your user name" className="w-full rounded-[10px] border border-slate-200 px-4 py-3 text-sm" /></Field>
                <Field label="Password"><div className="relative"><Input type={showPassword ? 'text' : 'password'} required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter your password" className="w-full rounded-[10px] border border-slate-200 px-4 py-3 pr-10 text-sm" /><button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" aria-label="Toggle password visibility">{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></div></Field>
                {/*<div className="text-sm text-slate-500">
                  <span className="font-medium text-[#06285f]">Forgot Password?</span>
                </div>*/}
                {error && <p className="rounded-lg border border-clay bg-red-50 px-3 py-2 text-sm text-clay">{error}</p>}
                <Button type="submit" className="w-full rounded-[10px] bg-[#06285f] py-3 text-base font-semibold text-white shadow-lg shadow-[#06285f]/20 hover:bg-[#041d48]" disabled={loading || !email.trim() || !password}>{loading ? 'Signing in...' : 'Log in'}</Button>
              </form>
              
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
}
