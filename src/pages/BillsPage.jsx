import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  Check,
  HandCoins,
  Loader2,
  Pencil,
  Plus,
  Receipt,
  RefreshCw,
  RotateCcw,
  Search,
  Trash2,
  X,
} from 'lucide-react'
import { api } from '../api.js'
import BillForm from '../components/BillForm.jsx'
import SettleModal from '../components/SettleModal.jsx'
import ConfirmDialog from '../components/ConfirmDialog.jsx'
import EmptyState from '../components/EmptyState.jsx'
import { StatusBadge } from '../components/Badge.jsx'
import { useToast } from '../contexts/ToastContext.jsx'
import { useDebouncedValue } from '../lib/useDebouncedValue.js'
import {
  formatCurrency,
  formatDate,
  getBillStatus,
  todayISO,
} from '../lib/format.js'
import {
  btnGhost,
  btnPrimary,
  btnSecondary,
  iconButton,
  inputClass,
  selectClass,
  tableHead,
} from '../lib/ui.js'

const CONFIGS = {
  payable: {
    kind: 'payable',
    resource: 'payables',
    categoryType: 'expense',
    title: 'Contas a Pagar',
    subtitle: 'Acompanhe despesas, vencimentos e pagamentos.',
    newLabel: 'Nova conta',
    singular: 'conta a pagar',
    settledWord: 'Pago',
    settledDatePrefix: 'Pago em',
    settleTitle: 'Marcar como paga',
    revertTitle: 'Desfazer pagamento',
    emptyTitle: 'Nenhuma conta a pagar',
    emptyDescription:
      'Cadastre sua primeira despesa para acompanhar vencimentos e pagamentos.',
    createSuccess: 'Conta a pagar cadastrada.',
    updateSuccess: 'Conta a pagar atualizada.',
    deleteSuccess: 'Conta a pagar excluída.',
    settleSuccess: 'Conta marcada como paga.',
    revertSuccess: 'Pagamento desfeito.',
    summary: { pending: 'Pendente', settled: 'Pago', overdue: 'Vencido' },
    statusOptions: [
      { value: 'all', label: 'Todas as situações' },
      { value: 'pending', label: 'Pendentes' },
      { value: 'overdue', label: 'Vencidas' },
      { value: 'settled', label: 'Pagas' },
    ],
    emptyIcon: Receipt,
  },
  receivable: {
    kind: 'receivable',
    resource: 'receivables',
    categoryType: 'income',
    title: 'Contas a Receber',
    subtitle: 'Acompanhe receitas, vencimentos e recebimentos.',
    newLabel: 'Nova conta',
    singular: 'conta a receber',
    settledWord: 'Recebido',
    settledDatePrefix: 'Recebido em',
    settleTitle: 'Marcar como recebida',
    revertTitle: 'Desfazer recebimento',
    emptyTitle: 'Nenhuma conta a receber',
    emptyDescription:
      'Cadastre sua primeira receita para acompanhar vencimentos e recebimentos.',
    createSuccess: 'Conta a receber cadastrada.',
    updateSuccess: 'Conta a receber atualizada.',
    deleteSuccess: 'Conta a receber excluída.',
    settleSuccess: 'Conta marcada como recebida.',
    revertSuccess: 'Recebimento desfeito.',
    summary: { pending: 'Pendente', settled: 'Recebido', overdue: 'Vencido' },
    statusOptions: [
      { value: 'all', label: 'Todas as situações' },
      { value: 'pending', label: 'Pendentes' },
      { value: 'overdue', label: 'Vencidas' },
      { value: 'settled', label: 'Recebidas' },
    ],
    emptyIcon: HandCoins,
  },
}

function SummaryTile({ label, value, count, tone }) {
  const tones = {
    amber: 'bg-amber-500',
    emerald: 'bg-emerald-500',
    rose: 'bg-rose-500',
    indigo: 'bg-indigo-500',
  }
  return (
    <div className="card px-4 py-3">
      <div className="flex items-center gap-2">
        <span className={`h-2 w-2 rounded-full ${tones[tone]}`} />
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</p>
      </div>
      <p className="mt-1 text-lg font-semibold tabular-nums">{formatCurrency(value)}</p>
      <p className="text-xs text-slate-500 dark:text-slate-400">
        {count} lançamento{count === 1 ? '' : 's'}
      </p>
    </div>
  )
}

export default function BillsPage({ kind }) {
  const config = CONFIGS[kind]
  const toast = useToast()

  const [bills, setBills] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const [filters, setFilters] = useState({
    q: '',
    status: 'all',
    categoryId: '',
    from: '',
    to: '',
  })
  const debouncedQuery = useDebouncedValue(filters.q, 300)

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [settling, setSettling] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [reverting, setReverting] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await api.bills.list(config.resource, {
        q: debouncedQuery,
        status: filters.status,
        categoryId: filters.categoryId,
        from: filters.from,
        to: filters.to,
      })
      setBills(data)
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setLoading(false)
    }
  }, [
    config.resource,
    debouncedQuery,
    filters.status,
    filters.categoryId,
    filters.from,
    filters.to,
  ])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    let active = true
    api.categories
      .list(config.categoryType)
      .then((data) => {
        if (active) setCategories(data)
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [config.categoryType])

  const summary = useMemo(() => {
    const today = todayISO()
    let pendingCents = 0
    let pendingCount = 0
    let settledCents = 0
    let settledCount = 0
    let overdueCents = 0
    let overdueCount = 0

    for (const bill of bills) {
      if (bill.status === 'pending') {
        pendingCents += bill.amountCents
        pendingCount += 1
        if (bill.dueDate < today) {
          overdueCents += bill.amountCents
          overdueCount += 1
        }
      } else {
        settledCents += bill.settledAmountCents ?? bill.amountCents
        settledCount += 1
      }
    }

    return {
      pendingCents,
      pendingCount,
      settledCents,
      settledCount,
      overdueCents,
      overdueCount,
    }
  }, [bills])

  const hasFilters =
    Boolean(filters.q) ||
    filters.status !== 'all' ||
    Boolean(filters.categoryId) ||
    Boolean(filters.from) ||
    Boolean(filters.to)

  function updateFilter(key, value) {
    setFilters((current) => ({ ...current, [key]: value }))
  }

  function clearFilters() {
    setFilters({ q: '', status: 'all', categoryId: '', from: '', to: '' })
  }

  function openNew() {
    setEditing(null)
    setFormOpen(true)
  }

  function openEdit(bill) {
    setEditing(bill)
    setFormOpen(true)
  }

  function closeForm() {
    setFormOpen(false)
    setEditing(null)
  }

  async function handleFormSubmit(payload) {
    setSaving(true)
    try {
      if (editing) {
        await api.bills.update(config.resource, editing.id, payload)
        toast.success(config.updateSuccess)
      } else {
        await api.bills.create(config.resource, payload)
        toast.success(config.createSuccess)
      }
      closeForm()
      await load()
    } catch (requestError) {
      toast.error(requestError.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!deleting) return
    setSaving(true)
    try {
      await api.bills.remove(config.resource, deleting.id)
      toast.success(config.deleteSuccess)
      setDeleting(null)
      await load()
    } catch (requestError) {
      toast.error(requestError.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleSettle(payload) {
    if (!settling) return
    setSaving(true)
    try {
      await api.bills.settle(config.resource, settling.id, payload)
      toast.success(config.settleSuccess)
      setSettling(null)
      await load()
    } catch (requestError) {
      toast.error(requestError.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleRevert() {
    if (!reverting) return
    setSaving(true)
    try {
      await api.bills.revert(config.resource, reverting.id)
      toast.success(config.revertSuccess)
      setReverting(null)
      await load()
    } catch (requestError) {
      toast.error(requestError.message)
    } finally {
      setSaving(false)
    }
  }

  const today = todayISO()

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{config.title}</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{config.subtitle}</p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={load} className={btnGhost} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Atualizar</span>
          </button>
          <button type="button" onClick={openNew} className={btnPrimary}>
            <Plus className="h-4 w-4" />
            {config.newLabel}
          </button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <SummaryTile
          label={config.summary.pending}
          value={summary.pendingCents}
          count={summary.pendingCount}
          tone="amber"
        />
        <SummaryTile
          label={config.summary.settled}
          value={summary.settledCents}
          count={summary.settledCount}
          tone="emerald"
        />
        <SummaryTile
          label={config.summary.overdue}
          value={summary.overdueCents}
          count={summary.overdueCount}
          tone="rose"
        />
      </div>

      <div className="card p-4">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
          <div className="relative md:col-span-2">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={filters.q}
              onChange={(event) => updateFilter('q', event.target.value)}
              className={`${inputClass} pl-9`}
              placeholder="Buscar por descrição..."
              aria-label="Buscar por descrição"
            />
          </div>
          <select
            value={filters.categoryId}
            onChange={(event) => updateFilter('categoryId', event.target.value)}
            className={selectClass}
            aria-label="Filtrar por categoria"
          >
            <option value="">Todas as categorias</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
          <select
            value={filters.status}
            onChange={(event) => updateFilter('status', event.target.value)}
            className={selectClass}
            aria-label="Filtrar por situação"
          >
            {config.statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <input
            type="date"
            value={filters.from}
            onChange={(event) => updateFilter('from', event.target.value)}
            className={inputClass}
            aria-label="Vencimento a partir de"
            title="Vencimento a partir de"
          />
          <input
            type="date"
            value={filters.to}
            onChange={(event) => updateFilter('to', event.target.value)}
            className={inputClass}
            aria-label="Vencimento até"
            title="Vencimento até"
          />
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {bills.length} lançamento{bills.length === 1 ? '' : 's'} encontrado
            {bills.length === 1 ? '' : 's'}
          </p>
          {hasFilters && (
            <button type="button" onClick={clearFilters} className={btnGhost}>
              <X className="h-4 w-4" />
              Limpar filtros
            </button>
          )}
        </div>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
            <AlertTriangle className="h-8 w-8 text-rose-500" />
            <p className="text-sm text-slate-500 dark:text-slate-400">{error}</p>
            <button type="button" onClick={load} className={btnPrimary}>
              Tentar novamente
            </button>
          </div>
        ) : bills.length === 0 ? (
          <EmptyState
            icon={config.emptyIcon}
            title={hasFilters ? 'Nenhum resultado encontrado' : config.emptyTitle}
            description={
              hasFilters
                ? 'Ajuste os filtros para encontrar outros lançamentos.'
                : config.emptyDescription
            }
            action={
              hasFilters ? (
                <button type="button" onClick={clearFilters} className={btnSecondary}>
                  Limpar filtros
                </button>
              ) : (
                <button type="button" onClick={openNew} className={btnPrimary}>
                  <Plus className="h-4 w-4" />
                  {config.newLabel}
                </button>
              )
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-sm">
              <thead className={tableHead}>
                <tr>
                  <th className="px-4 py-3">Descrição</th>
                  <th className="px-4 py-3">Categoria</th>
                  <th className="px-4 py-3">Vencimento</th>
                  <th className="px-4 py-3 text-right">Valor previsto</th>
                  <th className="px-4 py-3">Situação</th>
                  <th className="px-4 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {bills.map((bill) => {
                  const status = getBillStatus(bill, config.settledWord)
                  const isOverdue = bill.status === 'pending' && bill.dueDate < today
                  return (
                    <tr
                      key={bill.id}
                      className="transition hover:bg-slate-50/70 dark:hover:bg-slate-800/40"
                    >
                      <td className="max-w-[280px] px-4 py-3">
                        <p className="truncate font-medium text-slate-800 dark:text-slate-100">
                          {bill.description}
                        </p>
                        {bill.notes && (
                          <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">
                            {bill.notes}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                        {bill.categoryName ?? (
                          <span className="text-slate-400 dark:text-slate-500">Sem categoria</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={
                            isOverdue
                              ? 'font-medium text-rose-600 dark:text-rose-400'
                              : 'text-slate-700 dark:text-slate-200'
                          }
                        >
                          {formatDate(bill.dueDate)}
                        </span>
                        {bill.status !== 'pending' && bill.settledDate && (
                          <span className="block text-xs text-slate-500 dark:text-slate-400">
                            {config.settledDatePrefix} {formatDate(bill.settledDate)}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="font-semibold tabular-nums text-slate-800 dark:text-slate-100">
                          {formatCurrency(bill.amountCents)}
                        </span>
                        {bill.status !== 'pending' &&
                          bill.settledAmountCents !== null &&
                          bill.settledAmountCents !== bill.amountCents && (
                            <span className="block text-xs text-slate-500 dark:text-slate-400">
                              Efetivo: {formatCurrency(bill.settledAmountCents)}
                            </span>
                          )}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={status} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          {bill.status === 'pending' ? (
                            <button
                              type="button"
                              onClick={() => setSettling(bill)}
                              className={`${iconButton} hover:text-emerald-600 dark:hover:text-emerald-400`}
                              title={config.settleTitle}
                              aria-label={config.settleTitle}
                            >
                              <Check className="h-4 w-4" />
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setReverting(bill)}
                              className={iconButton}
                              title={config.revertTitle}
                              aria-label={config.revertTitle}
                            >
                              <RotateCcw className="h-4 w-4" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => openEdit(bill)}
                            className={iconButton}
                            title="Editar"
                            aria-label="Editar"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleting(bill)}
                            className={`${iconButton} hover:text-rose-600 dark:hover:text-rose-400`}
                            title="Excluir"
                            aria-label="Excluir"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <BillForm
        open={formOpen}
        kind={config.kind}
        initial={editing}
        categories={categories}
        saving={saving}
        onClose={closeForm}
        onSubmit={handleFormSubmit}
      />

      <SettleModal
        open={Boolean(settling)}
        kind={config.kind}
        bill={settling}
        saving={saving}
        onClose={() => setSettling(null)}
        onConfirm={handleSettle}
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        title={`Excluir ${config.singular}?`}
        description={`A conta "${deleting?.description ?? ''}" será removida permanentemente. Essa ação não pode ser desfeita.`}
        confirmLabel="Excluir"
        loading={saving}
        onConfirm={handleDelete}
        onClose={() => setDeleting(null)}
      />

      <ConfirmDialog
        open={Boolean(reverting)}
        title={`${config.revertTitle}?`}
        description={`A conta "${reverting?.description ?? ''}" voltará para pendente e a data e o valor efetivo serão removidos.`}
        confirmLabel="Desfazer"
        danger={false}
        loading={saving}
        onConfirm={handleRevert}
        onClose={() => setReverting(null)}
      />
    </div>
  )
}
