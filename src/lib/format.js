const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
})

const compactFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  notation: 'compact',
  maximumFractionDigits: 1,
})

const monthFormatter = new Intl.DateTimeFormat('pt-BR', {
  month: 'short',
  year: 'numeric',
})

function pad(value) {
  return String(value).padStart(2, '0')
}

export function formatCurrency(cents) {
  return currencyFormatter.format((Number(cents) || 0) / 100)
}

export function formatCompactCurrency(cents) {
  return compactFormatter.format((Number(cents) || 0) / 100)
}

export function formatDate(isoDate) {
  if (!isoDate) return '—'
  const [year, month, day] = isoDate.split('-')
  if (!year || !month || !day) return isoDate
  return `${day}/${month}/${year}`
}

export function formatMonthLabel(monthKey) {
  if (!monthKey) return ''
  const [year, month] = monthKey.split('-').map(Number)
  if (!year || !month) return monthKey
  const label = monthFormatter.format(new Date(year, month - 1, 1))
  return label.replace('.', '')
}

export function todayISO() {
  const now = new Date()
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

export function getBillStatus(bill, settledLabel = 'Pago') {
  if (bill.status !== 'pending') {
    return { key: 'settled', label: settledLabel, tone: 'success' }
  }
  if (bill.dueDate < todayISO()) {
    return { key: 'overdue', label: 'Vencido', tone: 'danger' }
  }
  return { key: 'pending', label: 'Pendente', tone: 'warning' }
}

export function parseMoneyToCents(value) {
  if (typeof value === 'number') {
    if (!Number.isFinite(value) || value < 0) return null
    return Math.round(value * 100)
  }

  let text = String(value ?? '').trim()
  if (!text) return null

  text = text.replace(/R\$/gi, '').replace(/\s/g, '')
  if (!text) return null

  if (text.includes(',')) {
    text = text.replace(/\./g, '').replace(',', '.')
  } else {
    const parts = text.split('.')
    const isDecimal = parts.length === 2 && parts[1].length > 0 && parts[1].length <= 2
    if (!isDecimal) text = text.replace(/\./g, '')
  }

  const number = Number(text)
  if (!Number.isFinite(number) || number < 0) return null
  return Math.round(number * 100)
}

export function centsToInput(cents) {
  return ((Number(cents) || 0) / 100).toFixed(2).replace('.', ',')
}
