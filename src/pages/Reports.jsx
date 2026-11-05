import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  Download,
  FileText,
  HandCoins,
  Loader2,
  Receipt,
  Scale,
  Wallet,
} from 'lucide-react'
import { api } from '../api.js'
import StatCard from '../components/StatCard.jsx'
import MonthlyChart from '../components/MonthlyChart.jsx'
import EmptyState from '../components/EmptyState.jsx'
import Badge, { StatusBadge } from '../components/Badge.jsx'
import {
  formatCurrency,
  formatDate,
  formatMonthLabel,
  getBillStatus,
  todayISO,
} from '../lib/format.js'
import {
  btnPrimary,
  btnSecondary,
  inputClass,
  labelClass,
  selectClass,
  tableHead,
} from '../lib/ui.js'

const typeOptions = [
  { value: 'all', label: 'Receitas e despesas' },
  { value: 'income', label: 'Somente receitas' },
  { value: 'expense', label: 'Somente despesas' },
]

function defaultFilters() {
  const today = todayISO()
  return {
    from: `${today.slice(0, 4)}-01-01`,
    to: today,
    type: 'all',
    categoryId: '',
  }
}

export default function Reports() {
  const [filters, setFilters] = useState(defaultFilters)
  const [categories, setCategories] = useState([])
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    api.categories
      .list()
      .then((data) => {
        if (active) setCategories(data)
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await api.reports({
        from: filters.from,
        to: filters.to,
        type: filters.type,
        categoryId: filters.categoryId,
      })
      setReport(data)
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setLoading(false)
    }
  }, [filters.from, filters.to, filters.type, filters.categoryId])

  useEffect(() => {
    load()
  }, [load])

  const categoryOptions = useMemo(
    () =>
      categories.filter(
        (category) => filters.type === 'all' || category.type === filters.type,
      ),
    [categories, filters.type],
  )

  function updateFilter(key, value) {
    setFilters((current) => {
      if (key === 'type') return { ...current, type: value, categoryId: '' }
      return { ...current, [key]: value }
    })
  }

  function handleExport() {
    const link = document.createElement('a')
    link.href = api.reportExportUrl(filters)
    link.rel = 'noopener'
    document.body.appendChild(link)
    link.click()
    link.remove()
  }

  const summary = report?.summary
  const monthly = report?.monthly ?? []
  const transactions = report?.transactions ?? []

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Relatórios</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Resumo mensal, histórico de lançamentos e exportação em CSV.
          </p>
        </div>
        <button
          type="button"
          onClick={handleExport}
          className={btnPrimary}
          disabled={loading || Boolean(error)}
        >
          <Download className="h-4 w-4" />
          Exportar CSV
        </button>
      </div>

      <div className="card p-4">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <div>
            <label htmlFor="report-from" className={labelClass}>
              De
            </label>
            <input
              id="report-from"
              type="date"
              value={filters.from}
              onChange={(event) => updateFilter('from', event.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="report-to" className={labelClass}>
              Até
            </label>
            <input
              id="report-to"
              type="date"
              value={filters.to}
              onChange={(event) => updateFilter('to', event.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="report-type" className={labelClass}>
              Tipo
            </label>
            <select
              id="report-type"
              value={filters.type}
              onChange={(event) => updateFilter('type', event.target.value)}
              className={selectClass}
            >
              {typeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="report-category" className={labelClass}>
              Categoria
            </label>
            <select
              id="report-category"
              value={filters.categoryId}
              onChange={(event) => updateFilter('categoryId', event.target.value)}
              className={selectClass}
            >
              <option value="">Todas as categorias</option>
              {categoryOptions.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <button
              type="button"
              onClick={() => setFilters(defaultFilters())}
              className={`${btnSecondary} w-full`}
            >
              Este ano
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="card flex flex-col items-center gap-3 p-10 text-center">
          <AlertTriangle className="h-8 w-8 text-rose-500" />
          <div>
            <p className="font-semibold text-slate-900 dark:text-slate-100">
              Não foi possível gerar o relatório
            </p>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{error}</p>
          </div>
          <button type="button" onClick={load} className={btnPrimary}>
            Tentar novamente
          </button>
        </div>
      )}

      {!error && loading && !report && (
        <div className="card flex items-center justify-center py-24">
          <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
        </div>
      )}

      {!error && report && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              title="Receitas previstas"
              value={formatCurrency(summary.incomeCents)}
              subtitle={`Recebido: ${formatCurrency(summary.incomeSettledCents)}`}
              icon={HandCoins}
              tone="emerald"
            />
            <StatCard
              title="Despesas previstas"
              value={formatCurrency(summary.expenseCents)}
              subtitle={`Pago: ${formatCurrency(summary.expenseSettledCents)}`}
              icon={Receipt}
              tone="rose"
            />
            <StatCard
              title="Saldo previsto"
              value={formatCurrency(summary.balanceCents)}
              subtitle="Receitas menos despesas do período"
              icon={Scale}
              tone="indigo"
              valueClassName={
                summary.balanceCents < 0 ? 'text-rose-600 dark:text-rose-400' : ''
              }
            />
            <StatCard
              title="Saldo efetivo"
              value={formatCurrency(summary.settledBalanceCents)}
              subtitle="Recebido menos pago no período"
              icon={Wallet}
              tone="sky"
              valueClassName={
                summary.settledBalanceCents < 0 ? 'text-rose-600 dark:text-rose-400' : ''
              }
            />
          </div>

          <div className="card p-5">
            <div className="mb-4">
              <h2 className="text-base font-semibold">Evolução mensal</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Receitas e despesas previstas por mês de vencimento
              </p>
            </div>
            <MonthlyChart data={monthly} height={300} />
          </div>

          <div className="card overflow-hidden">
            <div className="border-b border-slate-100 px-5 py-4 dark:border-slate-800">
              <h2 className="text-base font-semibold">Resumo mensal</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Totais previstos por mês
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-sm">
                <thead className={tableHead}>
                  <tr>
                    <th className="px-5 py-3">Mês</th>
                    <th className="px-5 py-3 text-right">Receitas</th>
                    <th className="px-5 py-3 text-right">Despesas</th>
                    <th className="px-5 py-3 text-right">Saldo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {monthly.map((row) => {
                    const balance = row.incomeCents - row.expenseCents
                    return (
                      <tr key={row.month}>
                        <td className="px-5 py-3 font-medium capitalize text-slate-700 dark:text-slate-200">
                          {formatMonthLabel(row.month)}
                        </td>
                        <td className="px-5 py-3 text-right tabular-nums text-emerald-600 dark:text-emerald-400">
                          {formatCurrency(row.incomeCents)}
                        </td>
                        <td className="px-5 py-3 text-right tabular-nums text-rose-600 dark:text-rose-400">
                          {formatCurrency(row.expenseCents)}
                        </td>
                        <td
                          className={`px-5 py-3 text-right font-semibold tabular-nums ${
                            balance < 0
                              ? 'text-rose-600 dark:text-rose-400'
                              : 'text-slate-800 dark:text-slate-100'
                          }`}
                        >
                          {formatCurrency(balance)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="card overflow-hidden">
            <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 dark:border-slate-800">
              <div>
                <h2 className="text-base font-semibold">Lançamentos</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {transactions.length} lançamento{transactions.length === 1 ? '' : 's'} no
                  período
                </p>
              </div>
            </div>

            {transactions.length === 0 ? (
              <EmptyState
                icon={FileText}
                title="Nenhum lançamento no período"
                description="Ajuste as datas ou os filtros para visualizar outros lançamentos."
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[840px] text-sm">
                  <thead className={tableHead}>
                    <tr>
                      <th className="px-5 py-3">Vencimento</th>
                      <th className="px-5 py-3">Tipo</th>
                      <th className="px-5 py-3">Descrição</th>
                      <th className="px-5 py-3">Categoria</th>
                      <th className="px-5 py-3 text-right">Valor</th>
                      <th className="px-5 py-3">Situação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {transactions.map((transaction) => {
                      const isIncome = transaction.type === 'income'
                      const status = getBillStatus(
                        transaction,
                        isIncome ? 'Recebido' : 'Pago',
                      )
                      return (
                        <tr
                          key={`${transaction.type}-${transaction.id}`}
                          className="transition hover:bg-slate-50/70 dark:hover:bg-slate-800/40"
                        >
                          <td className="px-5 py-3">
                            <span className="text-slate-700 dark:text-slate-200">
                              {formatDate(transaction.dueDate)}
                            </span>
                            {transaction.settledDate && (
                              <span className="block text-xs text-slate-500 dark:text-slate-400">
                                Efetiva: {formatDate(transaction.settledDate)}
                              </span>
                            )}
                          </td>
                          <td className="px-5 py-3">
                            <Badge tone={isIncome ? 'success' : 'danger'}>
                              {isIncome ? 'Receita' : 'Despesa'}
                            </Badge>
                          </td>
                          <td className="max-w-[260px] px-5 py-3">
                            <p className="truncate font-medium text-slate-800 dark:text-slate-100">
                              {transaction.description}
                            </p>
                            {transaction.notes && (
                              <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                                {transaction.notes}
                              </p>
                            )}
                          </td>
                          <td className="px-5 py-3 text-slate-600 dark:text-slate-300">
                            {transaction.categoryName ?? (
                              <span className="text-slate-400 dark:text-slate-500">
                                Sem categoria
                              </span>
                            )}
                          </td>
                          <td
                            className={`px-5 py-3 text-right font-semibold tabular-nums ${
                              isIncome
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-rose-600 dark:text-rose-400'
                            }`}
                          >
                            {formatCurrency(transaction.amountCents)}
                            {transaction.settledAmountCents !== null &&
                              transaction.settledAmountCents !== transaction.amountCents && (
                                <span className="block text-xs font-normal text-slate-500 dark:text-slate-400">
                                  Efetivo: {formatCurrency(transaction.settledAmountCents)}
                                </span>
                              )}
                          </td>
                          <td className="px-5 py-3">
                            <StatusBadge status={status} />
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
