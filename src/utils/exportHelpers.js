import { jsPDF } from 'jspdf'
import html2canvas from 'html2canvas'
import * as XLSX from 'xlsx'

export async function exportElementToPDF(element, fileName = 'report.pdf') {
  if (!element) return

  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    backgroundColor: '#ffffff',
  })

  const imageData = canvas.toDataURL('image/png')
  const pdf = new jsPDF({
    orientation: canvas.width > canvas.height ? 'landscape' : 'portrait',
    unit: 'px',
    format: [canvas.width, canvas.height],
  })

  pdf.addImage(imageData, 'PNG', 0, 0, canvas.width, canvas.height)
  pdf.save(fileName)
}

export function downloadCSV(data, fileName = 'report.csv') {
  if (!Array.isArray(data) || data.length === 0) {
    return
  }

  const headers = Object.keys(data[0])
  const csvRows = [headers.join(',')]

  for (const row of data) {
    const values = headers.map((header) => {
      const value = row[header] ?? ''
      const escaped = typeof value === 'string' ? value.replace(/"/g, '""') : value
      return `"${escaped}"`
    })
    csvRows.push(values.join(','))
  }

  const blob = new Blob([csvRows.join('\r\n')], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.setAttribute('download', fileName)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

export function exportToExcel(sheets, fileName = 'report.xlsx') {
  if (!Array.isArray(sheets) || sheets.length === 0) {
    return
  }

  const workbook = XLSX.utils.book_new()

  sheets.forEach((sheet) => {
    const formatted = Array.isArray(sheet.data) ? sheet.data : []
    const worksheet = XLSX.utils.json_to_sheet(formatted)
    XLSX.utils.book_append_sheet(workbook, worksheet, sheet.name || 'Sheet1')
  })

  XLSX.writeFile(workbook, fileName)
}

export function printReport() {
  if (typeof window === 'undefined') {
    return
  }

  const restorePrintState = () => {
    document.body.classList.remove('printing')
    window.removeEventListener('afterprint', restorePrintState)
  }

  window.addEventListener('afterprint', restorePrintState)
  document.body.classList.add('printing')
  window.print()
}
