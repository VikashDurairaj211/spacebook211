export default function Table({ columns, rows, emptyMessage = 'No data available.' }) {
  if (!rows?.length) {
    return <div className="border border-line bg-white p-4 text-sm text-slate">{emptyMessage}</div>
  }

  return (
    <div className="overflow-x-auto border border-line bg-white">
      <table className="min-w-full text-sm">
        <thead className="bg-paper">
          <tr>
            {columns.map((column) => (
              <th key={column.key} className="px-4 py-3 text-left font-mono text-[11px] uppercase tracking-wider text-slate">
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={row.id || index} className="border-t border-line">
              {columns.map((column) => (
                <td key={column.key} className="px-4 py-3 text-ink">
                  {column.render ? column.render(row) : row[column.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
