import { useState } from 'react'
import Card from '../components/common/Card'
import Button from '../components/common/Button'
import { useAuth } from '../context/AuthContext'
import { meetingSchedule } from '../services/mockData'

export default function Profile() {
  const { user, updateProfile } = useAuth()

  const [form, setForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    department: user?.department || '',
    role: user?.role || 'Employee',
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }))
    setSaved(false)
  }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    try {
      // update local demo profile
      updateProfile({ name: form.name, email: form.email, department: form.department })
      setSaved(true)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-xl font-700">My Profile</h1>
        <p className="mt-1 text-sm text-slate">Manage your personal details and preferences.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 flex-shrink-0 items-center justify-center rounded-full bg-ink text-paper flex font-700">{(user?.name || 'U').slice(0,1).toUpperCase()}</div>
            <div>
              <div className="font-display text-lg font-700">{user?.name}</div>
              <div className="font-mono text-xs text-slate">{user?.email}</div>
              <div className="mt-2 text-sm text-slate">{user?.department}</div>
              <div className="mt-2 inline-block rounded-sm border border-line px-2 py-1 text-xs">{user?.role}</div>
            </div>
          </div>
        </Card>

        <form onSubmit={handleSave} className="md:col-span-2 space-y-4">
          <Card>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="block">
                <div className="mb-1 font-mono text-[11px] uppercase tracking-wider text-slate">Full name</div>
                <input value={form.name} onChange={(e) => update('name', e.target.value)} className="w-full border border-line px-3 py-2 text-sm" />
              </label>
              <label className="block">
                <div className="mb-1 font-mono text-[11px] uppercase tracking-wider text-slate">Email</div>
                <input value={form.email} onChange={(e) => update('email', e.target.value)} className="w-full border border-line px-3 py-2 text-sm" />
              </label>
              <label className="block">
                <div className="mb-1 font-mono text-[11px] uppercase tracking-wider text-slate">Department</div>
                <input value={form.department} onChange={(e) => update('department', e.target.value)} className="w-full border border-line px-3 py-2 text-sm" />
              </label>
              <label className="block">
                <div className="mb-1 font-mono text-[11px] uppercase tracking-wider text-slate">Role</div>
                <input value={form.role} disabled className="w-full border border-line bg-paper px-3 py-2 text-sm" />
              </label>
            </div>

            <div className="mt-4 flex items-center gap-3">
              <Button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save changes'}</Button>
              {saved && <div className="text-sm text-moss">Saved</div>}
            </div>
          </Card>
        </form>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <h2 className="font-display text-sm font-700">Upcoming Meetings</h2>
          <ul className="mt-3 space-y-2">
            {meetingSchedule.map((m) => (
              <li key={m.id} className="flex items-center justify-between text-sm">
                <div>
                  <div className="font-700 text-ink">{m.title}</div>
                  <div className="font-mono text-xs text-slate">{m.room} • {m.time}</div>
                </div>
                <div className="font-mono text-xs text-slate">{m.day}</div>
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <h2 className="font-display text-sm font-700">Preferences</h2>
          <div className="mt-3 text-sm text-slate">Notification preferences and localization will appear here.</div>
        </Card>
      </div>
    </div>
  )
}
