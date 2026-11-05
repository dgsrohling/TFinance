import { Router } from 'express'
import db from '../db.js'
import { todayISO, addDays } from '../lib/validate.js'

const router = Router()

function sum(sql, ...params) {
  return db.prepare(sql).get(...params).total
}

function monthKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

function lastMonths(amount) {
  const now = new Date()
  const months = []
  for (let index = amount - 1; index >= 0; index -= 1) {
    months.push(monthKey(new Date(now.getFullYear(), now.getMonth() - index, 1)))
  }
  return months
}

router.get('/', (req, res) => {
  const today = todayISO()
  const upcomingLimit = addDays(today, 7)

  const receivedCents = sum(
    "SELECT COALESCE(SUM(received_amount_cents), 0) AS total FROM receivables WHERE status = 'received'",
  )
  const paidCents = sum(
    "SELECT COALESCE(SUM(paid_amount_cents), 0) AS total FROM payables WHERE status = 'paid'",
  )
  const allReceivableCents = sum(
    'SELECT COALESCE(SUM(amount_cents), 0) AS total FROM receivables',
  )
  const allPayableCents = sum('SELECT COALESCE(SUM(amount_cents), 0) AS total FROM payables')

  const payable = db
    .prepare(
      "SELECT COALESCE(SUM(amount_cents), 0) AS total, COUNT(*) AS count FROM payables WHERE status = 'pending'",
    )
    .get()
  const receivable = db
    .prepare(
      "SELECT COALESCE(SUM(amount_cents), 0) AS total, COUNT(*) AS count FROM receivables WHERE status = 'pending'",
    )
    .get()

  const payableOverdue = db
    .prepare(
      "SELECT COALESCE(SUM(amount_cents), 0) AS total, COUNT(*) AS count FROM payables WHERE status = 'pending' AND due_date < ?",
    )
    .get(today)
  const receivableOverdue = db
    .prepare(
      "SELECT COALESCE(SUM(amount_cents), 0) AS total, COUNT(*) AS count FROM receivables WHERE status = 'pending' AND due_date < ?",
    )
    .get(today)

  const payableUpcoming = db
    .prepare(
      "SELECT COALESCE(SUM(amount_cents), 0) AS total, COUNT(*) AS count FROM payables WHERE status = 'pending' AND due_date BETWEEN ? AND ?",
    )
    .get(today, upcomingLimit)
  const receivableUpcoming = db
    .prepare(
      "SELECT COALESCE(SUM(amount_cents), 0) AS total, COUNT(*) AS count FROM receivables WHERE status = 'pending' AND due_date BETWEEN ? AND ?",
    )
    .get(today, upcomingLimit)

  const months = lastMonths(6)
  const startMonth = months[0]
  const endMonth = months[months.length - 1]

  const incomeRows = db
    .prepare(
      "SELECT substr(due_date, 1, 7) AS month, COALESCE(SUM(amount_cents), 0) AS total FROM receivables WHERE substr(due_date, 1, 7) BETWEEN ? AND ? GROUP BY month",
    )
    .all(startMonth, endMonth)
  const expenseRows = db
    .prepare(
      "SELECT substr(due_date, 1, 7) AS month, COALESCE(SUM(amount_cents), 0) AS total FROM payables WHERE substr(due_date, 1, 7) BETWEEN ? AND ? GROUP BY month",
    )
    .all(startMonth, endMonth)

  const incomeByMonth = new Map(incomeRows.map((row) => [row.month, row.total]))
  const expenseByMonth = new Map(expenseRows.map((row) => [row.month, row.total]))

  const chart = months.map((month) => ({
    month,
    incomeCents: incomeByMonth.get(month) ?? 0,
    expenseCents: expenseByMonth.get(month) ?? 0,
  }))

  const upcomingPayables = db
    .prepare(
      `SELECT b.id, b.description, b.amount_cents, b.due_date, b.status, c.name AS category_name
       FROM payables b LEFT JOIN categories c ON c.id = b.category_id
       WHERE b.status = 'pending' AND b.due_date BETWEEN ? AND ?
       ORDER BY b.due_date ASC, b.id ASC LIMIT 8`,
    )
    .all(today, upcomingLimit)
  const upcomingReceivables = db
    .prepare(
      `SELECT b.id, b.description, b.amount_cents, b.due_date, b.status, c.name AS category_name
       FROM receivables b LEFT JOIN categories c ON c.id = b.category_id
       WHERE b.status = 'pending' AND b.due_date BETWEEN ? AND ?
       ORDER BY b.due_date ASC, b.id ASC LIMIT 8`,
    )
    .all(today, upcomingLimit)

  const upcoming = [
    ...upcomingPayables.map((row) => ({ ...row, type: 'payable' })),
    ...upcomingReceivables.map((row) => ({ ...row, type: 'receivable' })),
  ]
    .sort((a, b) => (a.due_date < b.due_date ? -1 : a.due_date > b.due_date ? 1 : a.id - b.id))
    .slice(0, 8)
    .map((row) => ({
      id: row.id,
      type: row.type,
      description: row.description,
      categoryName: row.category_name ?? null,
      amountCents: row.amount_cents,
      dueDate: row.due_date,
      status: row.status,
    }))

  res.json({
    today,
    balance: {
      actualCents: receivedCents - paidCents,
      projectedCents: allReceivableCents - allPayableCents,
      receivedCents,
      paidCents,
    },
    payable: {
      pendingCents: payable.total,
      pendingCount: payable.count,
      overdueCents: payableOverdue.total,
      overdueCount: payableOverdue.count,
      upcomingCents: payableUpcoming.total,
      upcomingCount: payableUpcoming.count,
    },
    receivable: {
      pendingCents: receivable.total,
      pendingCount: receivable.count,
      overdueCents: receivableOverdue.total,
      overdueCount: receivableOverdue.count,
      upcomingCents: receivableUpcoming.total,
      upcomingCount: receivableUpcoming.count,
    },
    chart,
    upcoming,
  })
})

export default router
