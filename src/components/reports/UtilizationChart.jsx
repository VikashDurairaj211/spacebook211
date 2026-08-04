import { ResponsiveContainer, BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip } from 'recharts'
import Card from '../../components/common/Card'

export default function UtilizationChart({ data }) {
  return (
    <Card className="rounded-[24px] border border-line bg-white p-5 shadow-sm">
      <div className="mb-4">
        <h3 className="font-display text-sm font-700 text-ink">Room Utilization by Module</h3>
        <p className="text-sm text-slate">Percentage of room utilization for each module.</p>
      </div>
      <div className="h-[320px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis dataKey="module" tick={{ fill: '#64748b', fontSize: 12 }} />
            <YAxis tick={{ fill: '#64748b', fontSize: 12 }} unit="%" />
            <Tooltip />
            <Bar dataKey="utilization" fill="#0ea5e9" radius={[12, 12, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  )
}
