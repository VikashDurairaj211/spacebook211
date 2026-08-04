import Button from '../../components/common/Button'
import Card from '../../components/common/Card'
import { exportElementToPDF, exportToExcel, downloadCSV, printReport } from '../../utils/exportHelpers'

export default function ExportActions({ reportRef, exportSheets, csvRows }) {
  const handleExportPDF = async () => {
    if (!reportRef?.current) return
    await exportElementToPDF(reportRef.current, 'spacebook-report.pdf')
  }

  const handleExportExcel = () => {
    if (!Array.isArray(exportSheets) || exportSheets.length === 0) return
    exportToExcel(exportSheets, 'spacebook-report.xlsx')
  }

  const handleDownloadCSV = () => {
    if (!Array.isArray(csvRows) || csvRows.length === 0) return
    downloadCSV(csvRows, 'recent-bookings.csv')
  }

  const handlePrintReport = () => {
    printReport()
  }

  return (
    <Card className="rounded-[24px] border border-line bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="font-display text-sm font-700 text-ink">Export Report</h3>
          <p className="text-sm text-slate">Prepare your analytics for sharing or review.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button size="sm" onClick={handleExportPDF}>Export PDF</Button>
          <Button size="sm" variant="secondary" onClick={handleExportExcel}>Export Excel</Button>
          <Button size="sm" variant="secondary" onClick={handleDownloadCSV}>Download CSV</Button>
          <Button size="sm" variant="ghost" onClick={handlePrintReport}>Print Report</Button>
        </div>
      </div>
    </Card>
  )
}
