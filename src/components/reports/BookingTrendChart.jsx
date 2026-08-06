import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from 'recharts'

import Card from '../../components/common/Card'
import Button from '../../components/common/Button'
import Select from '../../components/common/Select'
import { downloadCSV } from '../../utils/exportHelpers'

export default function BookingTrendChart({
  title,
  data,
  xKey,
  chartType = 'bar',
  reportType,
  moduleOptions,
  roomTypeOptions,
  statusOptions,
  selectedModule,
  selectedRoomType,
  selectedStatus,
  onReportTypeChange,
  onModuleChange,
  onRoomTypeChange,
  onStatusChange,
  kpiMetrics,
  hasData,
}) {
  const handleDownload = () => {
    const fileName = `${title
      .toLowerCase()
      .replace(/[^a-z0-9]+/gi, '-')
      .replace(/(^-|-$)/g, '')}.csv`

    downloadCSV(data, fileName)
  }

  return (
    <Card className="rounded-[28px] border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-200 px-6 py-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-slate-900">{title}</h2>
            <p className="mt-1 text-sm text-slate-500">
              Track bookings across selected modules, room types, and status filters.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button size="sm" variant="secondary" onClick={handleDownload}>
              Download CSV
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-4 border-b border-gray-100 p-6 xl:grid-cols-4">
        <div>
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
            Report Type
          </label>
          <Select
            value={reportType}
            onChange={(e) => onReportTypeChange(e.target.value)}
          >
            <option value="Monthly">Monthly</option>
            <option value="Weekly">Weekly</option>
          </Select>
        </div>

        <div>
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
            Module
          </label>
          <Select
            value={selectedModule}
            onChange={(e) => onModuleChange(e.target.value)}
          >
            {moduleOptions.map((module) => (
              <option key={module} value={module}>
                {module}
              </option>
            ))}
          </Select>
        </div>

        <div>
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
            Room Type
          </label>
          <Select
            value={selectedRoomType}
            onChange={(e) => onRoomTypeChange(e.target.value)}
          >
            {roomTypeOptions.map((roomType) => (
              <option key={roomType} value={roomType}>
                {roomType}
              </option>
            ))}
          </Select>
        </div>

        <div>
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
            Booking Status
          </label>
          <Select
            value={selectedStatus}
            onChange={(e) => onStatusChange(e.target.value)}
          >
            {statusOptions.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="px-6 py-6">
        <div className="grid gap-4 md:grid-cols-2">
          {kpiMetrics.map((metric) => (
            <div
              key={metric.label}
              className="rounded-3xl border border-gray-100 bg-slate-50 p-4 transition duration-200 hover:border-slate-300 hover:bg-slate-100 hover:-translate-y-0.5 hover:shadow-sm cursor-pointer"
            >
              <p className="text-xs uppercase tracking-[0.28em] text-slate-500">
                {metric.label}
              </p>
              <p className="mt-3 text-2xl font-semibold text-slate-900">
                {metric.value}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="p-6">
        {hasData ? (
          <div className="h-[430px]">
            <ResponsiveContainer width="100%" height="100%">
              {chartType === 'line' ? (
                <LineChart data={data} margin={{ top: 16, right: 24, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis
                    dataKey={xKey}
                    tick={{ fill: '#475569', fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                    padding={{ left: 12, right: 12 }}
                  />
                  <YAxis
                    tick={{ fill: '#475569', fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                    width={40}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: 14,
                      borderColor: '#e2e8f0',
                      boxShadow: '0 12px 40px rgba(15, 23, 42, 0.12)',
                    }}
                    labelStyle={{ color: '#0f172a' }}
                  />
                  <Legend verticalAlign="top" height={32} />
                  <Line
                    type="monotone"
                    dataKey="bookings"
                    stroke="#2563EB"
                    strokeWidth={3}
                    dot={{ r: 4, fill: '#2563EB' }}
                    activeDot={{ r: 6 }}
                    animationDuration={600}
                  />
                </LineChart>
              ) : (
                <BarChart data={data} margin={{ top: 16, right: 24, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis
                    dataKey={xKey}
                    tick={{ fill: '#475569', fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                    padding={{ left: 12, right: 12 }}
                  />
                  <YAxis
                    tick={{ fill: '#475569', fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                    width={40}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: 14,
                      borderColor: '#e2e8f0',
                      boxShadow: '0 12px 40px rgba(15, 23, 42, 0.12)',
                    }}
                    labelStyle={{ color: '#0f172a' }}
                  />
                  <Legend verticalAlign="top" height={32} />
                  <Bar
                    dataKey="bookings"
                    fill="#2563EB"
                    radius={[12, 12, 0, 0]}
                    animationDuration={600}
                  />
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="flex h-[430px] items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-slate-50 text-center text-slate-500">
            No data available for the selected filters.
          </div>
        )}
      </div>
    </Card>
  )
}