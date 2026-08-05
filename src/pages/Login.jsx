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

  return <div className="login-portal min-h-screen px-6 py-12 sm:px-[8%] sm:py-24">
    <main className="max-w-[676px]">
      <section className="text-white">
        <img src={Logo} alt="SpaceBook" className="mb-6 h-14 w-14 rounded-full object-cover shadow-lg" />
        <h1 className="text-5xl font-light leading-[1.15] tracking-tight sm:text-[74px]">Welcome to the<br />Service Portal</h1>
        <p className="mt-8 text-2xl sm:text-[34px]">Log in to get help or report an issue.</p>
      </section>

      <section className="mt-28 overflow-hidden rounded-[5px] bg-white shadow-xl">
        <div className="border-b border-[#d6d6d6] px-6 py-4 text-[21px] text-[#4a4a4a]">External login</div>
        <div className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <Field label="Employee Email"><Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@gmail.com" className="rounded-[5px] px-5 py-3 text-[16px]" /></Field>
            <Field label="Password"><div className="relative"><Input type={showPassword ? 'text' : 'password'} required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter your password" className="rounded-[5px] px-5 py-3 pr-12 text-[16px]" /><button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-3 text-slate" aria-label="Toggle password visibility">{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></div></Field>
            {error && <p className="border border-clay px-3 py-2 text-sm text-clay">Invalid Email or Password.</p>}
            <Button type="submit" className="w-full !rounded-[5px] !bg-[#06285f] !py-4 !text-[24px] !font-semibold hover:!bg-[#041d48]" disabled={loading || !email.trim() || !password}>{loading ? 'Signing in...' : 'Submit'}</Button>
          </form>
        </div>
      </section>
    </main>
  </div>
}
