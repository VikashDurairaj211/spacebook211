import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts'
import Card from '../../components/common/Card'

const COLORS = ['#1d4ed8', '#0ea5e9', '#64748b', '#f97316']

export default function RoomUsageChart({ data }) {
  return (
    <Card className="rounded-[24px] border border-line bg-white p-5 shadow-sm">
      <div className="mb-4">
        <h3 className="font-display text-sm font-700 text-ink">Room Type Usage</h3>
        <p className="text-sm text-slate">Usage volume by room type in the current timeframe.</p>
      </div>
      <div className="h-[320px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" outerRadius={100} innerRadius={60} paddingAngle={3}>
              {data.map((entry, index) => (
                <Cell key={`cell-${entry.name}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend verticalAlign="bottom" height={36} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </Card>
  )
}
