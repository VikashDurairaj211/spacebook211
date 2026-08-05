import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts'
import Card from '../../components/common/Card'
import Button from '../../components/common/Button'
import { downloadCSV } from '../../utils/exportHelpers'

const COLORS = ['#1d4ed8', '#0ea5e9', '#64748b', '#f97316']

export default function RoomUsageChart({ data }) {
  const handleDownload = () => {
    downloadCSV(data, 'room-type-usage.csv')
  }

  return (
    <Card className="rounded-[28px] border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-200 px-6 py-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Room Type Usage</h2>
            <p className="mt-1 text-sm text-slate-500">How bookings are distributed across room categories.</p>
          </div>
          <Button size="sm" variant="secondary" onClick={handleDownload}>
            Download CSV
          </Button>
        </div>
      </div>

      <div className="p-6">
        {data.length ? (
          <div className="h-[360px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data} dataKey="value" nameKey="name" outerRadius={110} innerRadius={62} paddingAngle={4}>
                  {data.map((entry, index) => (
                    <Cell key={`cell-${entry.name}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ borderRadius: 14, boxShadow: '0 12px 40px rgba(15, 23, 42, 0.12)' }}
                />
                <Legend verticalAlign="bottom" height={36} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="flex h-[360px] items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-slate-50 text-center text-slate-500">
            No room usage data available for selected filters.
          </div>
        )}
      </div>
    </Card>
  )
}
