import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

// Wrap values that contain commas, quotes, or newlines in double-quotes
const escapeCSVValue = (v) => {
  const str = String(v ?? '')
  return str.includes(',') || str.includes('"') || str.includes('\n')
    ? `"${str.replace(/"/g, '""')}"`
    : str
}

export const exportToCSV = (data, filename) => {
  if (!data || data.length === 0) return
  const headers = Object.keys(data[0])
  const lines = [
    headers.join(','),
    ...data.map((row) => headers.map((h) => escapeCSVValue(row[h])).join(',')),
  ]
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${filename}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export const exportToPDF = (title, columns, rows) => {
  const doc = new jsPDF()

  doc.setFontSize(16)
  doc.setTextColor(40, 40, 40)
  doc.text(title, 14, 16)

  doc.setFontSize(9)
  doc.setTextColor(120, 120, 120)
  doc.text(
    `Generated: ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}`,
    14,
    23,
  )

  autoTable(doc, {
    head: [columns],
    body: rows,
    startY: 28,
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: [99, 102, 241] },
    margin: { left: 14, right: 14 },
  })

  doc.save(`${title}.pdf`)
}
