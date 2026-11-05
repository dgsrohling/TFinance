import { Router } from 'express'
import db from '../db.js'
import {
  HttpError,
  requireDate,
  requireEnum,
  parseId,
  todayISO,
} from '../lib/validate.js'

const router = Router()

function toTransaction(row, type) {
  const isIncome = type === 'income'
  return {
    id: row.id,
    type,
    description: row.description,
    categoryId: row.category_id ?? null,
    categoryName: row.category_name ?? null,
    amountCents: row.amount_cents,
    dueDate: row.due_date,
    notes: row.notes ?? null,
    status: row.status,
    settledDate: isIncome ? row.received_date ?? null : row.paid_date ?? null,
    settledAmountCents: isIncome
      ? row.received_amount_cents ?? null
      : row.paid_amount_cents ?? null,
  }
}

function buildReport(query, today) {
  const yearStart = `${today.slice(0, 4)}-01-01`
  const from = query.from ? requireDate(query.from, 'Data inicial') : yearStart
  const to = query.to ? requireDate(query.to, 'Data final') : today
  if (from > to) {
    throw new HttpError(400, 'A data inicial não pode ser maior que a data final.')
  }

  const type =
    query.type && query.type !== 'all'
      ? requireEnum(query.type, ['income', 'expense'], 'Tipo')
      : 'all'
  const categoryId = query.categoryId ? parseId(query.categoryId) : null

  const includeIncome = type !== 'expense'
  const includeExpense = type !== 'income'

  const transactions = []
  let incomeCents = 0
  let expenseCents = 0
  let incomeSettledCents = 0
  let expenseSettledCents = 0

  if (includeIncome) {
    const clauses = ['r.due_date >= ?', 'r.due_date <= ?']
    const params = [from, to]
    if (categoryId) {
      clauses.push('r.category_id = ?')
      params.push(categoryId)
    }
    const rows = db
      .prepare(
        `SELECT r.*, c.name AS category_name
         FROM receivables r LEFT JOIN categories c ON c.id = r.category_id
         WHERE ${clauses.join(' AND ')}
         ORDER BY r.due_date DESC, r.id DESC`,
      )
      .all(...params)

    for (const row of rows) {
      incomeCents += row.amount_cents
      if (row.status === 'received') {
        incomeSettledCents += row.received_amount_cents ?? row.amount_cents
      }
      transactions.push(toTransaction(row, 'income'))
    }
  }

  if (includeExpense) {
    const clauses = ['p.due_date >= ?', 'p.due_date <= ?']
    const params = [from, to]
    if (categoryId) {
      clauses.push('p.category_id = ?')
      params.push(categoryId)
    }
    const rows = db
      .prepare(
        `SELECT p.*, c.name AS category_name
         FROM payables p LEFT JOIN categories c ON c.id = p.category_id
         WHERE ${clauses.join(' AND ')}
         ORDER BY p.due_date DESC, p.id DESC`,
      )
      .all(...params)

    for (const row of rows) {
      expenseCents += row.amount_cents
      if (row.status === 'paid') {
        expenseSettledCents += row.paid_amount_cents ?? row.amount_cents
      }
      transactions.push(toTransaction(row, 'expense'))
    }
  }

  transactions.sort((a, b) => {
    if (a.dueDate !== b.dueDate) return a.dueDate < b.dueDate ? 1 : -1
    return b.id - a.id
  })

  const monthlyMap = new Map()
  for (const transaction of transactions) {
    const month = transaction.dueDate.slice(0, 7)
    if (!monthlyMap.has(month)) {
      monthlyMap.set(month, { incomeCents: 0, expenseCents: 0 })
    }
    const entry = monthlyMap.get(month)
    if (transaction.type === 'income') entry.incomeCents += transaction.amountCents
    else entry.expenseCents += transaction.amountCents
  }

  const monthly = []
  const [startYear, startMonth] = from.split('-').map(Number)
  const [endYear, endMonth] = to.split('-').map(Number)
  let cursor = new Date(startYear, startMonth - 1, 1)
  const end = new Date(endYear, endMonth - 1, 1)
  let guard = 0
  while (cursor <= end && guard < 240) {
    const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`
    const entry = monthlyMap.get(key) ?? { incomeCents: 0, expenseCents: 0 }
    monthly.push({
      month: key,
      incomeCents: entry.incomeCents,
      expenseCents: entry.expenseCents,
    })
    cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1)
    guard += 1
  }

  return {
    filters: { from, to, type, categoryId },
    summary: {
      incomeCents,
      expenseCents,
      balanceCents: incomeCents - expenseCents,
      incomeSettledCents,
      expenseSettledCents,
      settledBalanceCents: incomeSettledCents - expenseSettledCents,
    },
    monthly,
    transactions,
  }
}

function csvField(value) {
  const text = value === null || value === undefined ? '' : String(value)
  return /[";\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

function csvMoney(cents) {
  return (Number(cents || 0) / 100).toFixed(2).replace('.', ',')
}

function situation(transaction, today) {
  if (transaction.status === 'pending') {
    return transaction.dueDate < today ? 'Vencido' : 'Pendente'
  }
  return transaction.type === 'income' ? 'Recebido' : 'Pago'
}

router.get('/export', (req, res) => {
  const today = todayISO()
  const report = buildReport(req.query, today)

  const header = [
    'Tipo',
    'Descrição',
    'Categoria',
    'Valor previsto (R$)',
    'Vencimento',
    'Situação',
    'Data efetiva',
    'Valor efetivo (R$)',
    'Observações',
  ]

  const lines = [header.map(csvField).join(';')]
  for (const transaction of report.transactions) {
    lines.push(
      [
        transaction.type === 'income' ? 'Receita' : 'Despesa',
        transaction.description,
        transaction.categoryName ?? '',
        csvMoney(transaction.amountCents),
        transaction.dueDate,
        situation(transaction, today),
        transaction.settledDate ?? '',
        transaction.settledAmountCents !== null
          ? csvMoney(transaction.settledAmountCents)
          : '',
        transaction.notes ?? '',
      ]
        .map(csvField)
        .join(';'),
    )
  }

  res.setHeader('Content-Type', 'text/csv; charset=utf-8')
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="relatorio-tfinance-${today}.csv"`,
  )
  res.send(`\uFEFF${lines.join('\r\n')}`)
})

router.get('/', (req, res) => {
  const today = todayISO()
  res.json(buildReport(req.query, today))
})

export default router
