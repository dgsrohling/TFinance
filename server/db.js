import Database from 'better-sqlite3'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const dataDir = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.resolve(__dirname, '..', 'data')

const dbPath = process.env.DB_PATH
  ? path.resolve(process.env.DB_PATH)
  : path.join(dataDir, 'tfinance.db')

fs.mkdirSync(path.dirname(dbPath), { recursive: true })

const db = new Database(dbPath)
db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

db.exec(`
  CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE (name, type)
  );

  CREATE TABLE IF NOT EXISTS payables (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    description TEXT NOT NULL,
    category_id INTEGER REFERENCES categories(id) ON DELETE RESTRICT,
    amount_cents INTEGER NOT NULL CHECK (amount_cents >= 0),
    due_date TEXT NOT NULL,
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid')),
    paid_date TEXT,
    paid_amount_cents INTEGER,
    recurrence_group TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS receivables (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    description TEXT NOT NULL,
    category_id INTEGER REFERENCES categories(id) ON DELETE RESTRICT,
    amount_cents INTEGER NOT NULL CHECK (amount_cents >= 0),
    due_date TEXT NOT NULL,
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'received')),
    received_date TEXT,
    received_amount_cents INTEGER,
    recurrence_group TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_payables_due_date ON payables (due_date);
  CREATE INDEX IF NOT EXISTS idx_payables_status ON payables (status);
  CREATE INDEX IF NOT EXISTS idx_payables_category ON payables (category_id);
  CREATE INDEX IF NOT EXISTS idx_receivables_due_date ON receivables (due_date);
  CREATE INDEX IF NOT EXISTS idx_receivables_status ON receivables (status);
  CREATE INDEX IF NOT EXISTS idx_receivables_category ON receivables (category_id);
`)

function seedCategories() {
  const { total } = db.prepare('SELECT COUNT(*) AS total FROM categories').get()
  if (total > 0) return

  const defaults = [
    ['Salário', 'income'],
    ['Freelance', 'income'],
    ['Investimentos', 'income'],
    ['Vendas', 'income'],
    ['Moradia', 'expense'],
    ['Alimentação', 'expense'],
    ['Transporte', 'expense'],
    ['Saúde', 'expense'],
    ['Educação', 'expense'],
    ['Lazer', 'expense'],
    ['Assinaturas', 'expense'],
    ['Outros', 'expense'],
  ]

  const insert = db.prepare('INSERT OR IGNORE INTO categories (name, type) VALUES (?, ?)')
  const insertAll = db.transaction(() => {
    for (const [name, type] of defaults) insert.run(name, type)
  })
  insertAll()
}

seedCategories()

if (!process.env.TFINANCE_QUIET) {
  console.log(`[T] Finance - banco de dados em ${dbPath}`)
}

export { db, dbPath }
export default db
