import { Router } from 'express'
import crypto from 'node:crypto'
import db from '../db.js'
import { serializeBill } from '../lib/serialize.js'
import {
  HttpError,
  requireString,
  optionalString,
  requireDate,
  parseCents,
  parseId,
  todayISO,
  addMonths,
} from '../lib/validate.js'

export function createBillsRouter(config) {
  const {
    table,
    label,
    settledAdjective,
    statusSettled,
    settledDateColumn,
    settledAmountColumn,
    categoryType,
  } = config

  const router = Router()
  const selectBase = `
    SELECT b.*, c.name AS category_name
    FROM ${table} b
    LEFT JOIN categories c ON c.id = b.category_id
  `

  function resolveCategoryId(value) {
    if (value === undefined || value === null || value === '') return null
    const categoryId = parseId(value)
    const category = db.prepare('SELECT * FROM categories WHERE id = ?').get(categoryId)
    if (!category) throw new HttpError(400, 'Categoria não encontrada.')
    if (category.type !== categoryType) {
      throw new HttpError(
        400,
        `A categoria selecionada deve ser do tipo ${categoryType === 'expense' ? 'despesa' : 'receita'}.`,
      )
    }
    return category.id
  }

  function parseBody(body) {
    return {
      description: requireString(body.description, 'Descrição', { max: 160 }),
      categoryId: resolveCategoryId(body.categoryId),
      amountCents: parseCents(body.amountCents, 'Valor'),
      dueDate: requireDate(body.dueDate, 'Vencimento'),
      notes: optionalString(body.notes, 'Observações', { max: 1000 }),
    }
  }

  router.get('/', (req, res) => {
    const clauses = []
    const params = []
    const { from, to, categoryId, status, q } = req.query

    if (from) {
      clauses.push('b.due_date >= ?')
      params.push(requireDate(from, 'Data inicial'))
    }
    if (to) {
      clauses.push('b.due_date <= ?')
      params.push(requireDate(to, 'Data final'))
    }
    if (categoryId) {
      clauses.push('b.category_id = ?')
      params.push(parseId(categoryId))
    }
    if (q) {
      clauses.push('LOWER(b.description) LIKE ?')
      params.push(`%${String(q).toLowerCase()}%`)
    }
    if (status && status !== 'all') {
      if (status === 'overdue') {
        clauses.push("b.status = 'pending' AND b.due_date < ?")
        params.push(todayISO())
      } else if (status === 'pending') {
        clauses.push("b.status = 'pending'")
      } else if (status === 'settled') {
        clauses.push(`b.status = '${statusSettled}'`)
      } else {
        throw new HttpError(400, 'Situação inválida.')
      }
    }

    const where = clauses.length ? ` WHERE ${clauses.join(' AND ')}` : ''
    const rows = db
      .prepare(`${selectBase}${where} ORDER BY b.due_date ASC, b.id ASC`)
      .all(...params)

    res.json(rows.map((row) => serializeBill(row, config)))
  })

  router.post('/', (req, res) => {
    const body = req.body ?? {}
    const data = parseBody(body)

    let occurrences = 1
    if (body.occurrences !== undefined && body.occurrences !== null && body.occurrences !== '') {
      occurrences = Number(body.occurrences)
      if (!Number.isInteger(occurrences) || occurrences < 1 || occurrences > 60) {
        throw new HttpError(400, 'A recorrência deve ter entre 1 e 60 meses.')
      }
    }

    const recurrenceGroup = occurrences > 1 ? crypto.randomUUID() : null
    const insert = db.prepare(`
      INSERT INTO ${table}
        (description, category_id, amount_cents, due_date, notes, recurrence_group)
      VALUES (?, ?, ?, ?, ?, ?)
    `)

    const insertMany = db.transaction(() => {
      for (let index = 0; index < occurrences; index += 1) {
        const dueDate = index === 0 ? data.dueDate : addMonths(data.dueDate, index)
        insert.run(
          data.description,
          data.categoryId,
          data.amountCents,
          dueDate,
          data.notes,
          recurrenceGroup,
        )
      }
    })
    insertMany()

    res.status(201).json({ created: occurrences })
  })

  router.put('/:id', (req, res) => {
    const id = parseId(req.params.id)
    const existing = db.prepare(`SELECT id FROM ${table} WHERE id = ?`).get(id)
    if (!existing) throw new HttpError(404, `${label} não encontrada.`)

    const data = parseBody(req.body ?? {})
    db.prepare(`
      UPDATE ${table}
      SET description = ?, category_id = ?, amount_cents = ?, due_date = ?, notes = ?
      WHERE id = ?
    `).run(data.description, data.categoryId, data.amountCents, data.dueDate, data.notes, id)

    const row = db.prepare(`${selectBase} WHERE b.id = ?`).get(id)
    res.json(serializeBill(row, config))
  })

  router.delete('/:id', (req, res) => {
    const id = parseId(req.params.id)
    const result = db.prepare(`DELETE FROM ${table} WHERE id = ?`).run(id)
    if (result.changes === 0) throw new HttpError(404, `${label} não encontrada.`)
    res.status(204).end()
  })

  router.patch('/:id/settle', (req, res) => {
    const id = parseId(req.params.id)
    const existing = db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(id)
    if (!existing) throw new HttpError(404, `${label} não encontrada.`)
    if (existing.status === statusSettled) {
      throw new HttpError(409, `${label} já está ${settledAdjective}.`)
    }

    const body = req.body ?? {}
    const settledDate = body.settledDate
      ? requireDate(body.settledDate, 'Data')
      : todayISO()
    const settledAmountCents =
      body.settledAmountCents !== undefined && body.settledAmountCents !== null
        ? parseCents(body.settledAmountCents, 'Valor efetivo')
        : existing.amount_cents

    db.prepare(`
      UPDATE ${table}
      SET status = ?, ${settledDateColumn} = ?, ${settledAmountColumn} = ?
      WHERE id = ?
    `).run(statusSettled, settledDate, settledAmountCents, id)

    const row = db.prepare(`${selectBase} WHERE b.id = ?`).get(id)
    res.json(serializeBill(row, config))
  })

  router.patch('/:id/revert', (req, res) => {
    const id = parseId(req.params.id)
    const existing = db.prepare(`SELECT id FROM ${table} WHERE id = ?`).get(id)
    if (!existing) throw new HttpError(404, `${label} não encontrada.`)

    db.prepare(`
      UPDATE ${table}
      SET status = 'pending', ${settledDateColumn} = NULL, ${settledAmountColumn} = NULL
      WHERE id = ?
    `).run(id)

    const row = db.prepare(`${selectBase} WHERE b.id = ?`).get(id)
    res.json(serializeBill(row, config))
  })

  return router
}
