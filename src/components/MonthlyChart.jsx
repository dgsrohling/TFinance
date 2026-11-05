import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useTheme } from '../contexts/ThemeContext.jsx'
import {
  formatCompactCurrency,
  formatCurrency,
  formatMonthLabel,
} from '../lib/format.js'

const seriesNames = {
  incomeCents: 'Receitas',
  expenseCents: 'Despesas',
}

export default function MonthlyChart({ data, height = 300 }) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const gridColor = isDark ? '#1e293b' : '#e2e8f0'
  const axisColor = isDark ? '#64748b' : '#94a3b8'

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barGap={4}>
        <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
        <XAxis
          dataKey="month"
          tickFormatter={formatMonthLabel}
          tick={{ fill: axisColor, fontSize: 12 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tickFormatter={formatCompactCurrency}
          tick={{ fill: axisColor, fontSize: 12 }}
          axisLine={false}
          tickLine={false}
          width={72}
        />
        <Tooltip
          formatter={(value, key) => [formatCurrency(value), seriesNames[key] ?? key]}
          labelFormatter={formatMonthLabel}
          cursor={{ fill: isDark ? 'rgba(148, 163, 184, 0.08)' : 'rgba(148, 163, 184, 0.12)' }}
          contentStyle={{
            borderRadius: 12,
            border: `1px solid ${gridColor}`,
            backgroundColor: isDark ? '#0f172a' : '#ffffff',
            color: isDark ? '#e2e8f0' : '#0f172a',
            fontSize: 12,
          }}
        />
        <Legend
          formatter={(value) => seriesNames[value] ?? value}
          wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
        />
        <Bar dataKey="incomeCents" fill="#10b981" radius={[6, 6, 0, 0]} maxBarSize={42} />
        <Bar dataKey="expenseCents" fill="#f43f5e" radius={[6, 6, 0, 0]} maxBarSize={42} />
      </BarChart>
    </ResponsiveContainer>
  )
}
