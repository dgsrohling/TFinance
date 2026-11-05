import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertTriangle,
  CalendarClock,
  HandCoins,
  Receipt,
  RefreshCw,
  Wallet,
} from 'lucide-react'
import { api } from '../api.js'
import StatCard from '../components/StatCard.jsx'
import MonthlyChart from '../components/MonthlyChart.jsx'
import { StatusBadge } from '../components/Badge.jsx'
import {
  formatCurrency,
  formatDate,
  getBillStatus,
} from '../lib/format.js'
import { btnSecondary, btnPrimary } from '../lib/ui.js'

function Skeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((item) => (
          <div key={item} className="card h-[118px] animate-pulse bg-slate-200/60 dark:bg-slate-800/60" />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="card h-[380px] animate-pulse bg-slate-200/60 lg:col-span-2 dark:bg-slate-800/60" />
        <div className="card h-[380px] animate-pulse bg-slate-200/60 dark:bg-slate-800/60" />
      </div>
    </div>
  )
}

export default function Dashboard() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setData(await api.dashboard())
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const overdueTotal = data
    ? data.payable.overdueCents + data.receivable.overdueCents
    : 0

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Visão geral das suas finanças e próximos vencimentos.
          </p>
        </div>
        <button type="button" onClick={load} className={btnSecondary} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Atualizar
        </button>
      </div>

      {loading && !data && <Skeleton />}

      {error && (
        <div className="card flex flex-col items-center gap-3 p-10 text-center">
          <AlertTriangle className="h-8 w-8 text-rose-500" />
          <div>
            <p className="font-semibold text-slate-900 dark:text-slate-100">
              Não foi possível carregar o dashboard
            </p>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{error}</p>
          </div>
          <button type="button" onClick={load} className={btnPrimary}>
            Tentar novamente
          </button>
        </div>
      )}

      {data && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              title="Saldo atual"
              value={formatCurrency(data.balance.actualCents)}
              subtitle={`Previsto: ${formatCurrency(data.balance.projectedCents)}`}
              icon={Wallet}
              tone="indigo"
              valueClassName={
                data.balance.actualCents < 0 ? 'text-rose-600 dark:text-rose-400' : ''
              }
            />
            <StatCard
              title="Contas a pagar"
              value={formatCurrency(data.payable.pendingCents)}
              subtitle={`${data.payable.pendingCount} pendente(s) • 7 dias: ${formatCurrency(
                data.payable.upcomingCents,
              )}`}
              icon={Receipt}
              tone="rose"
            />
            <StatCard
              title="Contas a receber"
              value={formatCurrency(data.receivable.pendingCents)}
              subtitle={`${data.receivable.pendingCount} pendente(s) • 7 dias: ${formatCurrency(
                data.receivable.upcomingCents,
              )}`}
              icon={HandCoins}
              tone="emerald"
            />
            <StatCard
              title="Valores vencidos"
              value={formatCurrency(overdueTotal)}
              subtitle={`${data.payable.overdueCount} a pagar • ${data.receivable.overdueCount} a receber`}
              icon={AlertTriangle}
              tone="amber"
              valueClassName={overdueTotal > 0 ? 'text-rose-600 dark:text-rose-400' : ''}
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <div className="card p-5 lg:col-span-2">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-base font-semibold">Receitas x Despesas</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Últimos 6 meses, por vencimento
                  </p>
                </div>
                <span className="hidden rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-500 sm:inline dark:bg-slate-800 dark:text-slate-400">
                  Previsto
                </span>
              </div>
              <MonthlyChart data={data.chart} height={300} />
            </div>

            <div className="card flex flex-col p-5">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-base font-semibold">Próximos vencimentos</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Contas pendentes nos próximos 7 dias
                  </p>
                </div>
                <CalendarClock className="h-5 w-5 text-slate-400" />
              </div>

              {data.upcoming.length === 0 ? (
                <div className="flex flex-1 flex-col items-center justify-center py-10 text-center">
                  <CalendarClock className="h-9 w-9 text-slate-300 dark:text-slate-600" />
                  <p className="mt-3 text-sm font-medium text-slate-600 dark:text-slate-300">
                    Nada para os próximos dias
                  </p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    Sem contas pendentes nos próximos 7 dias.
                  </p>
                </div>
              ) : (
                <ul className="-mx-2 flex-1 space-y-1">
                  {data.upcoming.map((item) => {
                    const isIncome = item.type === 'receivable'
                    const status = getBillStatus(item, isIncome ? 'Recebido' : 'Pago')
                    return (
                      <li key={`${item.type}-${item.id}`}>
                        <div className="flex items-center gap-3 rounded-xl px-2 py-2.5 transition hover:bg-slate-50 dark:hover:bg-slate-800/60">
                          <span
                            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                              isIncome
                                ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400'
                                : 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400'
                            }`}
                          >
                            {isIncome ? (
                              <HandCoins className="h-4 w-4" />
                            ) : (
                              <Receipt className="h-4 w-4" />
                            )}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-100">
                              {item.description}
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              {formatDate(item.dueDate)}
                              {item.categoryName ? ` • ${item.categoryName}` : ''}
                            </p>
                          </div>
                          <div className="text-right">
                            <p
                              className={`text-sm font-semibold tabular-nums ${
                                isIncome
                                  ? 'text-emerald-600 dark:text-emerald-400'
                                  : 'text-rose-600 dark:text-rose-400'
                              }`}
                            >
                              {isIncome ? '+' : '−'} {formatCurrency(item.amountCents)}
                            </p>
                            <StatusBadge status={status} />
                          </div>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}

              <div className="mt-4 flex gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
                <Link
                  to="/contas-a-pagar"
                  className="flex-1 rounded-lg bg-slate-50 px-3 py-2 text-center text-xs font-semibold text-slate-600 transition hover:bg-slate-100 dark:bg-slate-800/60 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Ver a pagar
                </Link>
                <Link
                  to="/contas-a-receber"
                  className="flex-1 rounded-lg bg-slate-50 px-3 py-2 text-center text-xs font-semibold text-slate-600 transition hover:bg-slate-100 dark:bg-slate-800/60 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Ver a receber
                </Link>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
