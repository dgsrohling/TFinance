export class HttpError extends Error {
  constructor(status, message) {
    super(message)
    this.status = status
  }
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

function pad(value) {
  return String(value).padStart(2, '0')
}

function toISO(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

function isRealDate(value) {
  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  )
}

export function requireString(value, field, { max = 255, min = 1 } = {}) {
  if (typeof value !== 'string') {
    throw new HttpError(400, `${field} é obrigatório.`)
  }
  const trimmed = value.trim()
  if (trimmed.length < min) {
    throw new HttpError(400, `${field} é obrigatório.`)
  }
  if (trimmed.length > max) {
    throw new HttpError(400, `${field} deve ter no máximo ${max} caracteres.`)
  }
  return trimmed
}

export function optionalString(value, field, { max = 255 } = {}) {
  if (value === undefined || value === null || String(value).trim() === '') {
    return null
  }
  if (typeof value !== 'string') {
    throw new HttpError(400, `${field} inválido.`)
  }
  const trimmed = value.trim()
  if (trimmed.length > max) {
    throw new HttpError(400, `${field} deve ter no máximo ${max} caracteres.`)
  }
  return trimmed
}

export function requireDate(value, field) {
  if (typeof value !== 'string' || !DATE_RE.test(value) || !isRealDate(value)) {
    throw new HttpError(400, `${field} deve ser uma data válida (AAAA-MM-DD).`)
  }
  return value
}

export function requireEnum(value, allowed, field) {
  if (!allowed.includes(value)) {
    throw new HttpError(400, `${field} inválido.`)
  }
  return value
}

export function parseCents(value, field = 'Valor') {
  const number = typeof value === 'string' ? Number(value) : value
  if (
    typeof number !== 'number' ||
    !Number.isInteger(number) ||
    number < 0 ||
    number > 99999999999
  ) {
    throw new HttpError(400, `${field} deve ser um valor inteiro em centavos maior ou igual a zero.`)
  }
  return number
}

export function parseId(value) {
  const number = Number(value)
  if (!Number.isInteger(number) || number <= 0) {
    throw new HttpError(400, 'Identificador inválido.')
  }
  return number
}

export function todayISO() {
  return toISO(new Date())
}

export function addMonths(dateString, months) {
  const [year, month, day] = dateString.split('-').map(Number)
  const base = new Date(year, month - 1 + months, 1)
  const targetYear = base.getFullYear()
  const targetMonth = base.getMonth()
  const lastDay = new Date(targetYear, targetMonth + 1, 0).getDate()
  const targetDay = Math.min(day, lastDay)
  return `${targetYear}-${pad(targetMonth + 1)}-${pad(targetDay)}`
}

export function addDays(dateString, days) {
  const [year, month, day] = dateString.split('-').map(Number)
  return toISO(new Date(year, month - 1, day + days))
}
