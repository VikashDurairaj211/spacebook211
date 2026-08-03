import { useState } from 'react'
import Card from '../../components/common/Card'
import { Field, Input, Select, Textarea } from '../../components/common/Input'
import Button from '../../components/common/Button'

export default function Settings() {
  const [workspaceName, setWorkspaceName] = useState('SPACEBOOK HQ')
  const [timezone, setTimezone] = useState('UTC')
  const [bookingWindow, setBookingWindow] = useState('14')
  const [approvalMode, setApprovalMode] = useState('Auto')
  const [notificationEmail, setNotificationEmail] = useState('admin@company.com')
  const [notes, setNotes] = useState('Standard booking rules apply.')

  return (
    <div className="space-y-6">
      <div className="border border-ink bg-white p-5">
        <h1 className="font-display text-xl font-700 text-ink">Settings</h1>
        <p className="mt-2 text-sm text-slate">Configure admin preferences, system rules, and notification settings.</p>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="space-y-4">
          <h2 className="font-display text-sm font-700 text-ink">System Preferences</h2>
          <Field label="Workspace Name">
            <Input value={workspaceName} onChange={(e) => setWorkspaceName(e.target.value)} />
          </Field>
          <Field label="Timezone">
            <Select value={timezone} onChange={(e) => setTimezone(e.target.value)}>
              <option value="UTC">UTC</option>
              <option value="America/New_York">America/New_York</option>
              <option value="Europe/London">Europe/London</option>
              <option value="Asia/Kolkata">Asia/Kolkata</option>
            </Select>
          </Field>
          <Field label="Booking Window (days)">
            <Input type="number" value={bookingWindow} onChange={(e) => setBookingWindow(e.target.value)} />
          </Field>
        </Card>

        <Card className="space-y-4">
          <h2 className="font-display text-sm font-700 text-ink">Booking Rules</h2>
          <Field label="Approval Mode">
            <Select value={approvalMode} onChange={(e) => setApprovalMode(e.target.value)}>
              <option>Auto</option>
              <option>Manual</option>
            </Select>
          </Field>
          <Field label="Default Booking Duration">
            <Select>
              <option>30 minutes</option>
              <option>1 hour</option>
              <option>2 hours</option>
            </Select>
          </Field>
          <Field label="Max Attendees">
            <Input type="number" placeholder="20" />
          </Field>
        </Card>

        <Card className="space-y-4">
          <h2 className="font-display text-sm font-700 text-ink">Notifications</h2>
          <Field label="Notification Email">
            <Input value={notificationEmail} onChange={(e) => setNotificationEmail(e.target.value)} />
          </Field>
          <Field label="Admin Notes">
            <Textarea rows={5} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </Field>
        </Card>
      </div>

      <Card>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-display text-sm font-700 text-ink">Save Settings</h2>
            <p className="text-sm text-slate">Changes are stored locally for this demo session.</p>
          </div>
          <Button>Save Changes</Button>
        </div>
      </Card>
    </div>
  )
}
