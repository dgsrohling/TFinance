import express from 'express'
import cors from 'cors'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { dbPath } from './db.js'
import categoriesRouter from './routes/categories.js'
import { createBillsRouter } from './routes/bills.js'
import dashboardRouter from './routes/dashboard.js'
import reportsRouter from './routes/reports.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()
const PORT = Number(process.env.PORT) || 3000
const HOST = process.env.HOST || '127.0.0.1'

app.disable('x-powered-by')
app.use(cors())
app.use(express.json({ limit: '1mb' }))

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', database: dbPath })
})

app.use('/api/categories', categoriesRouter)
app.use(
  '/api/payables',
  createBillsRouter({
    table: 'payables',
    label: 'Conta a pagar',
    settledAdjective: 'paga',
    statusSettled: 'paid',
    settledDateColumn: 'paid_date',
    settledAmountColumn: 'paid_amount_cents',
    categoryType: 'expense',
  }),
)
app.use(
  '/api/receivables',
  createBillsRouter({
    table: 'receivables',
    label: 'Conta a receber',
    settledAdjective: 'recebida',
    statusSettled: 'received',
    settledDateColumn: 'received_date',
    settledAmountColumn: 'received_amount_cents',
    categoryType: 'income',
  }),
)
app.use('/api/dashboard', dashboardRouter)
app.use('/api/reports', reportsRouter)

app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Rota da API não encontrada.' })
})

const distDir = path.resolve(__dirname, '..', 'dist')
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir))
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next()
    res.sendFile(path.join(distDir, 'index.html'))
  })
}

app.use((err, req, res, next) => {
  if (res.headersSent) return next(err)
  const status = err.status || 500
  if (status >= 500) console.error(err)
  res.status(status).json({
    error: err.message || 'Erro interno do servidor.',
  })
})

app.listen(PORT, HOST, () => {
  console.log(`[T] Finance rodando em http://${HOST}:${PORT}`)
  if (process.env.NODE_ENV !== 'production') {
    console.log('Modo desenvolvimento: use o Vite em http://localhost:5173 (npm run dev).')
  }
})
