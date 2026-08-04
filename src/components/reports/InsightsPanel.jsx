import Card from '../../components/common/Card'

export default function InsightsPanel({ insights }) {
  return (
    <Card className="rounded-[24px] border border-line bg-white p-5 shadow-sm">
      <div className="mb-4">
        <h3 className="font-display text-sm font-700 text-ink">Report Insights</h3>
        <p className="text-sm text-slate">Actionable takeaways from current reservation analytics.</p>
      </div>
      <ul className="space-y-3 text-sm text-slate">
        {insights.map((insight, index) => (
          <li key={index} className="rounded-2xl border border-line bg-portal-bg px-4 py-3">
            {insight}
          </li>
        ))}
      </ul>
    </Card>
  )
}
