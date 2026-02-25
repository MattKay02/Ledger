import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useExpenses } from '../hooks/useExpenses'
import { useIncome } from '../hooks/useIncome'
import { useBudgets, getBudgetStatus } from '../hooks/useBudgets'
import { usePeriodSelector } from '../hooks/useAvailablePeriods'
import Select from '../components/ui/Select'
import PageWrapper from '../components/layout/PageWrapper'
import StatCard from '../components/ui/StatCard'
import Card from '../components/ui/Card'
import DonutChart from '../components/charts/DonutChart'
import TrendLineChart from '../components/charts/TrendLineChart'
import MonthlyBarChart from '../components/charts/MonthlyBarChart'

const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

// Returns n months ending at (inclusive) the given month/year, oldest first
const getMonths = (n, month, year) => {
  const result = []
  for (let i = n - 1; i >= 0; i--) {
    let m = month - i
    let y = year
    while (m <= 0) { m += 12; y -= 1 }
    result.push({ month: m, year: y })
  }
  return result
}

const formatGBP = (n) => {
  const abs = Math.abs(n)
  const str = abs.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return `${n < 0 ? '-' : ''}£${str}`
}

const BUDGET_STATUS_COLOUR = {
  healthy: 'text-success',
  warning: 'text-warning',
  over: 'text-danger',
}

export default function Overview() {
  const { user } = useAuth()

  const {
    month: selectedMonth,
    year: selectedYear,
    setMonth: setSelectedMonth,
    setYear: setSelectedYear,
    periodsLoaded,
    yearOptions,
    monthOptions,
  } = usePeriodSelector('both')

  const [historicPeriod, setHistoricPeriod] = useState(6)
  const [historyData, setHistoryData] = useState([])
  const [historyLoading, setHistoryLoading] = useState(true)

  const { expenses, loading: expensesLoading } = useExpenses(selectedMonth, selectedYear)
  const { income, loading: incomeLoading } = useIncome(selectedMonth, selectedYear)
  const { budgets, loading: budgetsLoading } = useBudgets(selectedMonth, selectedYear)

  // ── Stat card values ────────────────────────────────────────────────────────

  const totalIncome = useMemo(
    () => income.reduce((sum, row) => sum + parseFloat(row.amount_gbp), 0),
    [income],
  )

  const totalExpenses = useMemo(
    () => expenses.reduce((sum, row) => sum + parseFloat(row.amount_gbp), 0),
    [expenses],
  )

  const netPL = totalIncome - totalExpenses

  const recurringCosts = useMemo(
    () =>
      expenses
        .filter((e) => e.type === 'recurring')
        .reduce((sum, e) => sum + parseFloat(e.amount_gbp), 0),
    [expenses],
  )

  // ── Donut chart data (expenses by category, selected month) ─────────────────

  const donutData = useMemo(() => {
    const map = {}
    expenses.forEach((e) => {
      map[e.category] = (map[e.category] || 0) + parseFloat(e.amount_gbp)
    })
    return Object.entries(map)
      .map(([name, value]) => ({ name, value: parseFloat(value.toFixed(2)) }))
      .sort((a, b) => b.value - a.value)
  }, [expenses])

  // ── 6-month historical data for trend/bar charts ─────────────────────────────

  useEffect(() => {
    if (!user) return

    const fetchHistory = async () => {
      setHistoryLoading(true)

      const sixMonths = getMonths(historicPeriod, selectedMonth, selectedYear)
      const first = sixMonths[0]

      const startDate = `${first.year}-${String(first.month).padStart(2, '0')}-01`
      const endDate =
        selectedMonth === 12
          ? `${selectedYear + 1}-01-01`
          : `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-01`

      const [expResult, incResult] = await Promise.all([
        supabase
          .from('expenses')
          .select('date, amount_gbp')
          .eq('user_id', user.id)
          .gte('date', startDate)
          .lt('date', endDate),
        supabase
          .from('income')
          .select('date, amount_gbp')
          .eq('user_id', user.id)
          .gte('date', startDate)
          .lt('date', endDate),
      ])

      if (expResult.error) console.error('History expenses error:', expResult.error)
      if (incResult.error) console.error('History income error:', incResult.error)

      // Seed month buckets (reuse sixMonths variable which now holds n months)
      const buckets = {}
      sixMonths.forEach(({ month, year }) => {
        const key = `${year}-${month}`
        buckets[key] = {
          label: `${MONTH_SHORT[month - 1]} '${String(year).slice(2)}`,
          income: 0,
          expenses: 0,
        }
      })

      ;(expResult.data || []).forEach((row) => {
        const d = new Date(row.date)
        const key = `${d.getFullYear()}-${d.getMonth() + 1}`
        if (buckets[key]) buckets[key].expenses += parseFloat(row.amount_gbp)
      })

      ;(incResult.data || []).forEach((row) => {
        const d = new Date(row.date)
        const key = `${d.getFullYear()}-${d.getMonth() + 1}`
        if (buckets[key]) buckets[key].income += parseFloat(row.amount_gbp)
      })

      const ordered = sixMonths.map(({ month, year }) => {
        const key = `${year}-${month}`
        return {
          ...buckets[key],
          income: parseFloat(buckets[key].income.toFixed(2)),
          expenses: parseFloat(buckets[key].expenses.toFixed(2)),
        }
      })

      setHistoryData(ordered)
      setHistoryLoading(false)
    }

    fetchHistory()
  }, [user, selectedMonth, selectedYear, historicPeriod])

  const summaryLoading = expensesLoading || incomeLoading

  const monthName = new Date(selectedYear, selectedMonth - 1, 1).toLocaleString('en-GB', { month: 'long' })
  const periodLabel = `${monthName} ${selectedYear}`

  // ── Month/year selector (rendered as PageWrapper action) ─────────────────────

  const monthSelector = (
    <div className="flex items-center gap-2">
      <Select
        value={selectedMonth}
        onChange={setSelectedMonth}
        options={monthOptions}
        disabled={!periodsLoaded}
      />
      <Select
        value={selectedYear}
        onChange={setSelectedYear}
        options={yearOptions}
        disabled={!periodsLoaded}
      />
    </div>
  )

  return (
    <PageWrapper
      title={<>Overview <span className="text-muted text-lg font-normal">— {periodLabel}</span></>}
      action={monthSelector}
    >

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <StatCard
          label="Total Income"
          value={summaryLoading ? '—' : formatGBP(totalIncome)}
          valueClassName="text-success"
        />
        <StatCard
          label="Total Expenses"
          value={summaryLoading ? '—' : formatGBP(totalExpenses)}
          valueClassName="text-danger"
        />
        <StatCard
          label="Net Profit / Loss"
          value={summaryLoading ? '—' : formatGBP(netPL)}
          valueClassName={netPL >= 0 ? 'text-success' : 'text-danger'}
        />
        <StatCard
          label="Recurring Costs"
          value={summaryLoading ? '—' : formatGBP(recurringCosts)}
        />
      </div>

      {/* ── Budget health (shown only when budgets exist for the month) ── */}
      {!budgetsLoading && budgets.length > 0 && (
        <Card className="mb-6">
          <h2 className="text-white text-sm font-semibold mb-4">Budget Health</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {budgets.map((b) => {
              const status = getBudgetStatus(b.actual_spent, b.monthly_limit_gbp)
              const colourClass = BUDGET_STATUS_COLOUR[status]
              return (
                <div
                  key={b.id}
                  className="flex flex-col gap-1 bg-surface-elevated rounded-lg px-3 py-2.5"
                >
                  <p className="text-muted text-xs truncate">{b.category}</p>
                  <p className={`text-sm font-semibold ${colourClass}`}>
                    £{b.actual_spent.toFixed(0)}
                    <span className="text-muted font-normal">
                      {' '}/ £{Number(b.monthly_limit_gbp).toFixed(0)}
                    </span>
                  </p>
                </div>
              )
            })}
          </div>
        </Card>
      )}

      {/* ── Period toggle ── */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-muted text-sm">Trend period</p>
        <div className="flex items-center bg-surface-elevated border border-surface-border rounded-lg p-0.5 gap-0.5">
          {[{ label: '6 months', value: 6 }, { label: '1 year', value: 12 }].map(({ label, value }) => (
            <button
              key={value}
              onClick={() => setHistoricPeriod(value)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                historicPeriod === value
                  ? 'bg-accent text-white'
                  : 'text-muted hover:text-white'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Charts row: donut + line trend ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        <Card>
          <h2 className="text-white text-sm font-semibold mb-2">Expenses by Category</h2>
          {expensesLoading ? (
            <div className="flex items-center justify-center h-60 text-muted text-sm">Loading…</div>
          ) : (
            <DonutChart data={donutData} />
          )}
        </Card>

        <Card className="lg:col-span-2">
          <h2 className="text-white text-sm font-semibold mb-2">
            Income vs Expenses — Last {historicPeriod} Months
          </h2>
          {historyLoading ? (
            <div className="flex items-center justify-center h-60 text-muted text-sm">Loading…</div>
          ) : (
            <TrendLineChart data={historyData} />
          )}
        </Card>
      </div>

      {/* ── Bar chart: monthly comparison ── */}
      <Card>
        <h2 className="text-white text-sm font-semibold mb-2">
          Monthly Comparison — Last {historicPeriod} Months
        </h2>
        {historyLoading ? (
          <div className="flex items-center justify-center h-60 text-muted text-sm">Loading…</div>
        ) : (
          <MonthlyBarChart data={historyData} />
        )}
      </Card>

    </PageWrapper>
  )
}
