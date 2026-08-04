import Card from '../../components/common/Card'
import Button from '../../components/common/Button'

export default function ReportFilters({
  filters,
  reportTypes,
  moduleOptions,
  roomTypeOptions,
  statusOptions,
  onChange,
  onApply,
  onReset,
}) {
  return (
    <Card className="rounded-[24px] border border-line bg-white p-6 shadow-sm">
      <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="font-display text-lg font-700 text-ink">Report Filters</h2>
          <p className="mt-1 text-sm text-slate">Choose the range and filters for your workspace analytics.</p>
        </div>
        <div className="text-sm text-slate">Data updates instantly after applying filters.</div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <div>
          <label className="mb-2 block text-sm font-medium text-slate">Start Date</label>
          <input
            type="date"
            value={filters.startDate}
            onChange={(event) => onChange('startDate', event.target.value)}
            className="w-full rounded-2xl border border-line bg-portal-bg px-3 py-2 text-sm text-ink outline-none focus:border-portal-accent"
          />
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium text-slate">End Date</label>
          <input
            type="date"
            value={filters.endDate}
            onChange={(event) => onChange('endDate', event.target.value)}
            className="w-full rounded-2xl border border-line bg-portal-bg px-3 py-2 text-sm text-ink outline-none focus:border-portal-accent"
          />
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium text-slate">Report Type</label>
          <select
            value={filters.reportType}
            onChange={(event) => onChange('reportType', event.target.value)}
            className="w-full rounded-2xl border border-line bg-white px-3 py-2 text-sm text-ink outline-none"
          >
            {reportTypes.map((type) => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium text-slate">Module</label>
          <select
            value={filters.module}
            onChange={(event) => onChange('module', event.target.value)}
            className="w-full rounded-2xl border border-line bg-white px-3 py-2 text-sm text-ink outline-none"
          >
            {moduleOptions.map((module) => (
              <option key={module} value={module}>{module}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium text-slate">Room Type</label>
          <select
            value={filters.roomType}
            onChange={(event) => onChange('roomType', event.target.value)}
            className="w-full rounded-2xl border border-line bg-white px-3 py-2 text-sm text-ink outline-none"
          >
            {roomTypeOptions.map((roomType) => (
              <option key={roomType} value={roomType}>{roomType}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium text-slate">Booking Status</label>
          <select
            value={filters.status}
            onChange={(event) => onChange('status', event.target.value)}
            className="w-full rounded-2xl border border-line bg-white px-3 py-2 text-sm text-ink outline-none"
          >
            {statusOptions.map((status) => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <Button onClick={onApply}>Apply Filters</Button>
        <Button variant="secondary" onClick={onReset}>Reset Filters</Button>
      </div>
    </Card>
  )
}
