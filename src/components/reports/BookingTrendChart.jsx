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

export default function BookingTrendChart({
  data = [],
  xKey = 'month',
  chartType = 'bar',
  hasData = true,
}) {
  if (!hasData || !data || data.length === 0) {
    return (
      <div className="flex h-[380px] items-center justify-center rounded-2xl border border-dashed border-line bg-portal-bg text-center text-sm text-slate">
        No booking trend data available for the selected filters.
      </div>
    )
  }

  return (
    <div className="h-[380px] w-full">
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
                borderRadius: 12,
                borderColor: '#e2e8f0',
                boxShadow: '0 10px 25px rgba(15, 23, 42, 0.08)',
              }}
              labelStyle={{ color: '#0f172a' }}
            />
            <Legend verticalAlign="top" height={32} />
            <Line
              type="monotone"
              dataKey="bookings"
              stroke="#5c7a60"
              strokeWidth={3}
              dot={{ r: 4, fill: '#5c7a60' }}
              activeDot={{ r: 6 }}
              animationDuration={500}
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
                borderRadius: 12,
                borderColor: '#e2e8f0',
                boxShadow: '0 10px 25px rgba(15, 23, 42, 0.08)',
              }}
              labelStyle={{ color: '#0f172a' }}
            />
            <Legend verticalAlign="top" height={32} />
            <Bar
              dataKey="bookings"
              fill="#5c7a60"
              radius={[8, 8, 0, 0]}
              animationDuration={500}
            />
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
  )
}