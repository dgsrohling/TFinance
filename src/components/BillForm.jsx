import { useEffect, useId, useState } from 'react'
import { CalendarDays, Loader2, Repeat } from 'lucide-react'
import Modal from './Modal.jsx'
import {
  btnPrimary,
  btnSecondary,
  inputClass,
  labelClass,
  selectClass,
} from '../lib/ui.js'
import {
  centsToInput,
  formatCurrency,
  parseMoneyToCents,
  todayISO,
} from '../lib/format.js'

const configs = {
  payable: {
    titleNew: 'Nova conta a pagar',
    titleEdit: 'Editar conta a pagar',
    descriptionNew: 'Cadastre uma despesa e acompanhe o vencimento.',
    descriptionEdit: 'Atualize os dados da despesa.',
    categoryPlaceholder: 'Selecione uma categoria de despesa',
  },
  receivable: {
    titleNew: 'Nova conta a receber',
    titleEdit: 'Editar conta a receber',
    descriptionNew: 'Cadastre uma receita e acompanhe o recebimento.',
    descriptionEdit: 'Atualize os dados da receita.',
    categoryPlaceholder: 'Selecione uma categoria de receita',
  },
}

export default function BillForm({
  open,
  kind,
  initial,
  categories,
  saving,
  onClose,
  onSubmit,
}) {
  const config = configs[kind]
  const formId = useId()
  const isEditing = Boolean(initial)

  const [description, setDescription] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [amount, setAmount] = useState('')
  const [dueDate, setDueDate] = useState(todayISO())
  const [notes, setNotes] = useState('')
  const [recurring, setRecurring] = useState(false)
  const [occurrences, setOccurrences] = useState('12')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    setDescription(initial?.description ?? '')
    setCategoryId(initial?.categoryId ? String(initial.categoryId) : '')
    setAmount(initial ? centsToInput(initial.amountCents) : '')
    setDueDate(initial?.dueDate ?? todayISO())
    setNotes(initial?.notes ?? '')
    setRecurring(false)
    setOccurrences('12')
    setError('')
  }, [open, initial])

  function handleSubmit(event) {
    event.preventDefault()
    setError('')

    if (!description.trim()) {
      setError('Informe a descrição.')
      return
    }

    const amountCents = parseMoneyToCents(amount)
    if (amountCents === null || amountCents <= 0) {
      setError('Informe um valor maior que zero.')
      return
    }

    if (!dueDate) {
      setError('Informe a data de vencimento.')
      return
    }

    let months = null
    if (!isEditing && recurring) {
      months = Number(occurrences)
      if (!Number.isInteger(months) || months < 2 || months > 60) {
        setError('A recorrência deve ter entre 2 e 60 meses.')
        return
      }
    }

    onSubmit({
      description: description.trim(),
      categoryId: categoryId ? Number(categoryId) : null,
      amountCents,
      dueDate,
      notes: notes.trim() || null,
      ...(months ? { occurrences: months } : {}),
    })
  }

  return (
    <Modal
      open={open}
      title={isEditing ? config.titleEdit : config.titleNew}
      description={isEditing ? config.descriptionEdit : config.descriptionNew}
      onClose={saving ? () => {} : onClose}
      footer={
        <>
          <button type="button" onClick={onClose} className={btnSecondary} disabled={saving}>
            Cancelar
          </button>
          <button type="submit" form={formId} className={btnPrimary} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {isEditing ? 'Salvar alterações' : 'Cadastrar'}
          </button>
        </>
      }
    >
      <form id={formId} onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
            {error}
          </div>
        )}

        <div>
          <label htmlFor={`${formId}-description`} className={labelClass}>
            Descrição
          </label>
          <input
            id={`${formId}-description`}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            className={inputClass}
            placeholder="Ex.: Aluguel, salário, internet..."
            maxLength={160}
            autoFocus
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor={`${formId}-amount`} className={labelClass}>
              Valor previsto (R$)
            </label>
            <input
              id={`${formId}-amount`}
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              className={inputClass}
              placeholder="0,00"
              inputMode="decimal"
            />
          </div>
          <div>
            <label htmlFor={`${formId}-due`} className={labelClass}>
              Vencimento
            </label>
            <input
              id={`${formId}-due`}
              type="date"
              value={dueDate}
              onChange={(event) => setDueDate(event.target.value)}
              className={inputClass}
            />
          </div>
        </div>

        <div>
          <label htmlFor={`${formId}-category`} className={labelClass}>
            Categoria
          </label>
          <select
            id={`${formId}-category`}
            value={categoryId}
            onChange={(event) => setCategoryId(event.target.value)}
            className={selectClass}
          >
            <option value="">Sem categoria</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>

        {!isEditing && (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950/50">
            <label className="flex cursor-pointer items-center gap-2.5 text-sm font-medium text-slate-700 dark:text-slate-300">
              <input
                type="checkbox"
                checked={recurring}
                onChange={(event) => setRecurring(event.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 dark:border-slate-600 dark:bg-slate-900"
              />
              <Repeat className="h-4 w-4 text-slate-400" />
              Repetir mensalmente
            </label>
            {recurring && (
              <div className="mt-3 flex items-center gap-3">
                <input
                  type="number"
                  min={2}
                  max={60}
                  value={occurrences}
                  onChange={(event) => setOccurrences(event.target.value)}
                  className={`${inputClass} w-24`}
                />
                <span className="text-sm text-slate-500 dark:text-slate-400">
                  meses a partir do vencimento
                </span>
              </div>
            )}
          </div>
        )}

        <div>
          <label htmlFor={`${formId}-notes`} className={labelClass}>
            Observações
          </label>
          <textarea
            id={`${formId}-notes`}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            className={`${inputClass} min-h-[84px] resize-y`}
            placeholder="Informações opcionais sobre este lançamento"
            maxLength={1000}
          />
        </div>

        {isEditing && initial && (
          <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-500 dark:bg-slate-950/50 dark:text-slate-400">
            <CalendarDays className="h-4 w-4" />
            Valor original: {formatCurrency(initial.amountCents)} • Vencimento original:{' '}
            {initial.dueDate.split('-').reverse().join('/')}
          </div>
        )}
      </form>
    </Modal>
  )
}
