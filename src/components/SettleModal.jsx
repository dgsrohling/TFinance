import { useEffect, useId, useState } from 'react'
import { Loader2 } from 'lucide-react'
import Modal from './Modal.jsx'
import {
  btnPrimary,
  btnSecondary,
  inputClass,
  labelClass,
} from '../lib/ui.js'
import {
  centsToInput,
  formatCurrency,
  parseMoneyToCents,
  todayISO,
} from '../lib/format.js'

const configs = {
  payable: {
    title: 'Registrar pagamento',
    description: 'Informe quando e quanto foi efetivamente pago.',
    dateLabel: 'Data do pagamento',
    amountLabel: 'Valor pago (R$)',
    confirm: 'Marcar como pago',
  },
  receivable: {
    title: 'Registrar recebimento',
    description: 'Informe quando e quanto foi efetivamente recebido.',
    dateLabel: 'Data do recebimento',
    amountLabel: 'Valor recebido (R$)',
    confirm: 'Marcar como recebido',
  },
}

export default function SettleModal({ open, kind, bill, saving, onClose, onConfirm }) {
  const config = configs[kind]
  const formId = useId()

  const [settledDate, setSettledDate] = useState(todayISO())
  const [settledAmount, setSettledAmount] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open || !bill) return
    setSettledDate(todayISO())
    setSettledAmount(centsToInput(bill.amountCents))
    setError('')
  }, [open, bill])

  function handleSubmit(event) {
    event.preventDefault()
    setError('')

    if (!settledDate) {
      setError('Informe a data.')
      return
    }

    const settledAmountCents = parseMoneyToCents(settledAmount)
    if (settledAmountCents === null || settledAmountCents <= 0) {
      setError('Informe um valor maior que zero.')
      return
    }

    onConfirm({ settledDate, settledAmountCents })
  }

  return (
    <Modal
      open={open}
      title={config.title}
      description={config.description}
      onClose={saving ? () => {} : onClose}
      size="sm"
      footer={
        <>
          <button type="button" onClick={onClose} className={btnSecondary} disabled={saving}>
            Cancelar
          </button>
          <button type="submit" form={formId} className={btnPrimary} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {config.confirm}
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

        {bill && (
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-950/50">
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
              {bill.description}
            </p>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              {bill.categoryName ?? 'Sem categoria'} • Vencimento:{' '}
              {bill.dueDate.split('-').reverse().join('/')} • Previsto:{' '}
              {formatCurrency(bill.amountCents)}
            </p>
          </div>
        )}

        <div>
          <label htmlFor={`${formId}-date`} className={labelClass}>
            {config.dateLabel}
          </label>
          <input
            id={`${formId}-date`}
            type="date"
            value={settledDate}
            onChange={(event) => setSettledDate(event.target.value)}
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor={`${formId}-amount`} className={labelClass}>
            {config.amountLabel}
          </label>
          <input
            id={`${formId}-amount`}
            value={settledAmount}
            onChange={(event) => setSettledAmount(event.target.value)}
            className={inputClass}
            placeholder="0,00"
            inputMode="decimal"
          />
          <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
            O valor efetivo pode ser diferente do previsto.
          </p>
        </div>
      </form>
    </Modal>
  )
}
