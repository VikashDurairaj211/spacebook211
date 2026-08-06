import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
} from 'recharts'

import Card from '../../components/common/Card'
import Button from '../../components/common/Button'
import { downloadCSV } from '../../utils/exportHelpers'

const COLORS = [
  '#2563EB',
  '#06B6D4',
  '#10B981',
  '#F59E0B',
  '#8B5CF6',
  '#EF4444',
]

export default function StatusChart({ data }) {
  const handleDownload = () => {
    downloadCSV(data, 'booking-status-distribution.csv')
  }

  return (
    <Card className="rounded-2xl border border-gray-200 bg-white shadow-sm">

      {/* Header */}
      <div className="border-b border-gray-200 px-6 py-5">

        <div className="flex items-center justify-between">

          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Booking Status
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Snapshot of booking status distribution for selected filters.
            </p>
          </div>

          <Button
            size="sm"
            variant="secondary"
            onClick={handleDownload}
          >
            Download CSV
          </Button>

        </div>

      </div>

      {/* Chart */}
      <div className="p-6">

        <div className="h-[360px]">

          <ResponsiveContainer width="100%" height="100%">

            <PieChart>

              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                innerRadius={70}
                outerRadius={110}
                paddingAngle={3}
              >
                {data.map((entry, index) => (
                  <Cell
                    key={entry.name}
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}
              </Pie>

              <Tooltip />

              <Legend
                verticalAlign="bottom"
                iconType="circle"
              />

            </PieChart>

          </ResponsiveContainer>

        </div>

      </div>

    </Card>
  )
}