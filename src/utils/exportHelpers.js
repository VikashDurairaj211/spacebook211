import { jsPDF } from 'jspdf'
import html2canvas from 'html2canvas'
import * as XLSX from 'xlsx'

export async function exportSectionsToPDF(pageElements, fileName = 'report.pdf') {
  if (!Array.isArray(pageElements) || pageElements.length === 0) return

  try {
    const pdf = new jsPDF('p', 'mm', 'a4')
    const pageWidth = pdf.internal.pageSize.getWidth() // 210mm
    const pageHeight = pdf.internal.pageSize.getHeight() // 297mm
    const margin = 10
    const usableWidth = pageWidth - margin * 2 // 190mm
    const usableHeight = pageHeight - margin * 2 // 277mm

    for (let i = 0; i < pageElements.length; i++) {
      const el = pageElements[i]
      if (!el) continue

      const canvas = await html2canvas(el, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: false,
        backgroundColor: '#ffffff',
        windowWidth: 1200,
      })

      const imgData = canvas.toDataURL('image/png')
      const imgHeight = (canvas.height * usableWidth) / canvas.width

      if (i > 0) {
        pdf.addPage()
      }

      // Check if image height fits in usable page height
      if (imgHeight > usableHeight) {
        const scaledWidth = (usableHeight * canvas.width) / canvas.height
        const xOffset = (pageWidth - scaledWidth) / 2
        pdf.addImage(imgData, 'PNG', xOffset, margin, scaledWidth, usableHeight)
      } else {
        pdf.addImage(imgData, 'PNG', margin, margin, usableWidth, imgHeight)
      }
    }

    pdf.save(fileName)
  } catch (error) {
    console.error('Error generating multi-page PDF report:', error)
    throw error
  }
}

export async function exportElementToPDF(element, fileName = 'report.pdf') {
  return exportSectionsToPDF([element], fileName)
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
