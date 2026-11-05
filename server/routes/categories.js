import { Router } from 'express'
import db from '../db.js'
import { serializeCategory } from '../lib/serialize.js'
import {
  HttpError,
  requireString,
  requireEnum,
  parseId,
} from '../lib/validate.js'

const router = Router()

const selectBase = `
  SELECT c.*, (
    (SELECT COUNT(*) FROM payables p WHERE p.category_id = c.id) +
    (SELECT COUNT(*) FROM receivables r WHERE r.category_id = c.id)
  ) AS usage_count
  FROM categories c
`

function isUniqueError(error) {
  return Boolean(
    error &&
      (error.code === 'SQLITE_CONSTRAINT_UNIQUE' || error.code === 'SQLITE_CONSTRAINT'),
  )
}

router.get('/', (req, res) => {
  const { type } = req.query
  let rows
  if (type) {
    requireEnum(type, ['income', 'expense'], 'Tipo')
    rows = db.prepare(`${selectBase} WHERE c.type = ? ORDER BY c.name COLLATE NOCASE`).all(type)
  } else {
    rows = db.prepare(`${selectBase} ORDER BY c.type, c.name COLLATE NOCASE`).all()
  }
  res.json(rows.map(serializeCategory))
})

router.post('/', (req, res) => {
  const body = req.body ?? {}
  const name = requireString(body.name, 'Nome', { max: 60 })
  const type = requireEnum(body.type, ['income', 'expense'], 'Tipo')

  try {
    const result = db
      .prepare('INSERT INTO categories (name, type) VALUES (?, ?)')
      .run(name, type)
    const row = db.prepare(`${selectBase} WHERE c.id = ?`).get(result.lastInsertRowid)
    res.status(201).json(serializeCategory(row))
  } catch (error) {
    if (isUniqueError(error)) {
      throw new HttpError(409, 'Já existe uma categoria com esse nome e tipo.')
    }
    throw error
  }
})

router.put('/:id', (req, res) => {
  const id = parseId(req.params.id)
  const existing = db.prepare(`${selectBase} WHERE c.id = ?`).get(id)
  if (!existing) throw new HttpError(404, 'Categoria não encontrada.')

  const body = req.body ?? {}
  const name = requireString(body.name, 'Nome', { max: 60 })
  let type = requireEnum(body.type ?? existing.type, ['income', 'expense'], 'Tipo')

  if (type !== existing.type && existing.usage_count > 0) {
    throw new HttpError(
      409,
      'Não é possível alterar o tipo de uma categoria já utilizada em lançamentos.',
    )
  }

  try {
    db.prepare('UPDATE categories SET name = ?, type = ? WHERE id = ?').run(name, type, id)
    const row = db.prepare(`${selectBase} WHERE c.id = ?`).get(id)
    res.json(serializeCategory(row))
  } catch (error) {
    if (isUniqueError(error)) {
      throw new HttpError(409, 'Já existe uma categoria com esse nome e tipo.')
    }
    throw error
  }
})

router.delete('/:id', (req, res) => {
  const id = parseId(req.params.id)
  const existing = db.prepare(`${selectBase} WHERE c.id = ?`).get(id)
  if (!existing) throw new HttpError(404, 'Categoria não encontrada.')
  if (existing.usage_count > 0) {
    throw new HttpError(
      409,
      'Não é possível excluir uma categoria utilizada em lançamentos. Edite ou exclua os lançamentos primeiro.',
    )
  }

  db.prepare('DELETE FROM categories WHERE id = ?').run(id)
  res.status(204).end()
})

export default router
