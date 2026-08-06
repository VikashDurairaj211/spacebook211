import Button from "../../components/common/Button";

export default function ReportFilters({
  filters,
  onChange,
  onReset,
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
      {/* Header */}
      <div className="border-b border-gray-200 px-6 py-5">
        <h2 className="text-xl font-semibold text-gray-900">
          Reports Dashboard
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          Reports update automatically as filters are changed.
        </p>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 gap-5 p-6 md:grid-cols-3 lg:grid-cols-4">

        {/* Start Date */}
        <div>
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-gray-500">
            From
          </label>

          <input
            type="date"
            value={filters.startDate}
            onChange={(e) => onChange("startDate", e.target.value)}
            className="h-11 w-full rounded-xl border border-gray-300 px-3 text-sm outline-none transition focus:border-blue-600"
          />
        </div>

        {/* End Date */}
        <div>
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-gray-500">
            To
          </label>

          <input
            type="date"
            value={filters.endDate}
            onChange={(e) => onChange("endDate", e.target.value)}
            className="h-11 w-full rounded-xl border border-gray-300 px-3 text-sm outline-none transition focus:border-blue-600"
          />
        </div>

        {/* Reset Button */}
        <div className="flex items-end">
          <Button
            variant="secondary"
            onClick={onReset}
            className="h-11 w-full"
          >
            Reset Filters
          </Button>
        </div>

      </div>
    </div>
  );
}