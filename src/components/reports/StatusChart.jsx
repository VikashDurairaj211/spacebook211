import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts'
import Card from '../../components/common/Card'

const COLORS = ['#1d4ed8', '#0ea5e9', '#f59e0b', '#ef4444']

export default function StatusChart({ data }) {
  return (
    <Card className="rounded-[24px] border border-line bg-white p-5 shadow-sm">
      <div className="mb-4">
        <h3 className="font-display text-sm font-700 text-ink">Booking Status Distribution</h3>
        <p className="text-sm text-slate">Breakdown of booking statuses for the selected period.</p>
      </div>
      <div className="h-[320px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" outerRadius={110} innerRadius={60} paddingAngle={3}>
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
