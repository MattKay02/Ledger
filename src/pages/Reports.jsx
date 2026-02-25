import { useState, useEffect, useMemo } from 'react'
import { usePeriodSelector } from '../hooks/useAvailablePeriods'
import Select from '../components/ui/Select'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import PageWrapper from '../components/layout/PageWrapper'
import Card from '../components/ui/Card'
import StatCard from '../components/ui/StatCard'
import Button from '../components/ui/Button'
import { exportToCSV, exportToPDF } from '../lib/export'

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

const SOURCE_LABELS = {
  client_work: 'Client Work',
  software_product_sale: 'Software Product Sale',
  app_store_apple: 'App Store (Apple)',
  google_play: 'Google Play',
  subscription_saas: 'Subscription / SaaS',
  other: 'Other',
}

const CHART_COLOURS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f59e0b',
  '#10b981', '#3b82f6', '#f97316', '#14b8a6',
]

const formatGBP = (n) => {
  const abs = Math.abs(n)
  const str = abs.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return `${n < 0 ? '-' : ''}£${str}`
}

// Parse month number directly from a YYYY-MM-DD string to avoid timezone issues
const monthFromDate = (dateStr) => parseInt(dateStr.slice(5, 7), 10)

export default function Reports() {
  const { user } = useAuth()

  const {
    year: selectedYear,
    setYear: setSelectedYear,
    periodsLoaded,
    yearOptions,
  } = usePeriodSelector('both')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [incomeRows, setIncomeRows] = useState([])
  const [expenseRows, setExpenseRows] = useState([])

  // ── Fetch all income + expenses for the selected year ──────────────────────

  useEffect(() => {
    if (!user) return
    const fetchYearData = async () => {
      setLoading(true)
      setError(null)
      const startDate = `${selectedYear}-01-01`
      const endDate = `${selectedYear + 1}-01-01`

      const [incResult, expResult] = await Promise.all([
        supabase
          .from('income')
          .select('date, amount_gbp, source_type')
          .eq('user_id', user.id)
          .gte('date', startDate)
          .lt('date', endDate),
        supabase
          .from('expenses')
          .select('date, amount_gbp, category')
          .eq('user_id', user.id)
          .gte('date', startDate)
          .lt('date', endDate),
      ])

      if (incResult.error) {
        console.error('Reports income fetch error:', incResult.error)
        setError(incResult.error)
        setLoading(false)
        return
      }
      if (expResult.error) {
        console.error('Reports expenses fetch error:', expResult.error)
        setError(expResult.error)
        setLoading(false)
        return
      }

      setIncomeRows(incResult.data || [])
      setExpenseRows(expResult.data || [])
      setLoading(false)
    }
    fetchYearData()
  }, [user, selectedYear])

  // ── YTD totals ─────────────────────────────────────────────────────────────

  const totalIncome = useMemo(
    () => incomeRows.reduce((s, r) => s + parseFloat(r.amount_gbp), 0),
    [incomeRows],
  )
  const totalExpenses = useMemo(
    () => expenseRows.reduce((s, r) => s + parseFloat(r.amount_gbp), 0),
    [expenseRows],
  )
  const netPL = totalIncome - totalExpenses

  // ── Month-by-month table data ───────────────────────────────────────────────

  const monthlyData = useMemo(() => {
    const buckets = {}
    for (let m = 1; m <= 12; m++) buckets[m] = { income: 0, expenses: 0 }

    incomeRows.forEach((r) => {
      const m = monthFromDate(r.date)
      buckets[m].income += parseFloat(r.amount_gbp)
    })
    expenseRows.forEach((r) => {
      const m = monthFromDate(r.date)
      buckets[m].expenses += parseFloat(r.amount_gbp)
    })

    return Array.from({ length: 12 }, (_, i) => {
      const m = i + 1
      const { income, expenses } = buckets[m]
      return {
        month: MONTH_NAMES[i],
        income: parseFloat(income.toFixed(2)),
        expenses: parseFloat(expenses.toFixed(2)),
        net: parseFloat((income - expenses).toFixed(2)),
      }
    })
  }, [incomeRows, expenseRows])

  // ── Best month (highest net, among months with any activity) ───────────────

  const bestMonth = useMemo(() => {
    const active = monthlyData.filter((m) => m.income > 0 || m.expenses > 0)
    if (active.length === 0) return null
    return active.reduce((best, m) => (m.net > best.net ? m : best), active[0])
  }, [monthlyData])

  // ── Income breakdown by source type (bar chart) ────────────────────────────

  const incomeBySource = useMemo(() => {
    const map = {}
    incomeRows.forEach((r) => {
      map[r.source_type] = (map[r.source_type] || 0) + parseFloat(r.amount_gbp)
    })
    return Object.entries(map)
      .map(([type, total]) => ({
        name: SOURCE_LABELS[type] || type,
        total: parseFloat(total.toFixed(2)),
      }))
      .sort((a, b) => b.total - a.total)
  }, [incomeRows])

  // ── Top expense categories (table) ─────────────────────────────────────────

  const expenseByCategory = useMemo(() => {
    const map = {}
    expenseRows.forEach((r) => {
      map[r.category] = (map[r.category] || 0) + parseFloat(r.amount_gbp)
    })
    return Object.entries(map)
      .map(([category, total]) => ({ category, total: parseFloat(total.toFixed(2)) }))
      .sort((a, b) => b.total - a.total)
  }, [expenseRows])

  // ── Export handlers ────────────────────────────────────────────────────────

  const handleCSVExport = () => {
    exportToCSV(
      monthlyData.map((row) => ({
        Month: row.month,
        'Income (£)': row.income,
        'Expenses (£)': row.expenses,
        'Net (£)': row.net,
      })),
      `Ledger_${selectedYear}_Report`,
    )
  }

  const handlePDFExport = () => {
    exportToPDF(
      `Ledger ${selectedYear} Annual Report`,
      ['Month', 'Income (£)', 'Expenses (£)', 'Net (£)'],
      monthlyData.map((row) => [
        row.month,
        formatGBP(row.income),
        formatGBP(row.expenses),
        formatGBP(row.net),
      ]),
    )
  }

  // ── Year selector + export actions ────────────────────────────────────────

  const headerActions = (
    <div className="flex items-center gap-3">
      <Select value={selectedYear} onChange={setSelectedYear} options={yearOptions} disabled={!periodsLoaded} />
      <Button
        variant="ghost"
        onClick={handleCSVExport}
        disabled={loading}
        className="disabled:opacity-40 disabled:cursor-not-allowed"
      >
        Export CSV
      </Button>
      <Button
        variant="ghost"
        onClick={handlePDFExport}
        disabled={loading}
        className="disabled:opacity-40 disabled:cursor-not-allowed"
      >
        Export PDF
      </Button>
    </div>
  )

  return (
    <PageWrapper title="Reports" action={headerActions}>

      {/* ── Loading ── */}
      {loading && (
        <div className="flex items-center justify-center py-24 text-muted text-sm">
          Loading report data…
        </div>
      )}

      {/* ── Error ── */}
      {!loading && error && (
        <div className="flex items-center justify-center py-24 text-danger text-sm">
          Failed to load report: {error.message}
        </div>
      )}

      {/* ── Main content ── */}
      {!loading && !error && (
        <>
          {/* YTD summary stat cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
            <StatCard
              label={`${selectedYear} Total Income`}
              value={formatGBP(totalIncome)}
              valueClassName="text-success"
            />
            <StatCard
              label={`${selectedYear} Total Expenses`}
              value={formatGBP(totalExpenses)}
              valueClassName="text-danger"
            />
            <StatCard
              label="Net Profit / Loss"
              value={formatGBP(netPL)}
              valueClassName={netPL >= 0 ? 'text-success' : 'text-danger'}
            />
            <StatCard
              label="Best Month"
              value={bestMonth ? bestMonth.month : '—'}
              valueClassName="text-white"
              trend={bestMonth?.net}
              trendLabel={bestMonth ? formatGBP(bestMonth.net) : undefined}
            />
          </div>

          {/* Income by source + top expense categories */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">

            {/* Income breakdown by source type (horizontal bar chart) */}
            <Card>
              <h2 className="text-white text-sm font-semibold mb-4">Income by Source</h2>
              {incomeBySource.length === 0 ? (
                <div className="flex items-center justify-center h-48 text-muted text-sm">
                  No income recorded for {selectedYear}
                </div>
              ) : (
                <ResponsiveContainer
                  width="100%"
                  height={Math.max(220, incomeBySource.length * 52)}
                >
                  <BarChart
                    data={incomeBySource}
                    layout="vertical"
                    margin={{ top: 4, right: 16, left: 8, bottom: 4 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#2d3149" horizontal={false} />
                    <XAxis
                      type="number"
                      stroke="#64748b"
                      tick={{ fill: '#64748b', fontSize: 11 }}
                      tickFormatter={(v) => `£${v}`}
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      stroke="#64748b"
                      tick={{ fill: '#64748b', fontSize: 11 }}
                      width={150}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1a1d27',
                        border: '1px solid #2d3149',
                        borderRadius: '8px',
                      }}
                      itemStyle={{ color: '#fff' }}
                      cursor={{ fill: '#2d3149', opacity: 0.4 }}
                      formatter={(v) => [formatGBP(v), 'Total']}
                    />
                    <Bar dataKey="total" radius={[0, 4, 4, 0]}>
                      {incomeBySource.map((_, i) => (
                        <Cell key={i} fill={CHART_COLOURS[i % CHART_COLOURS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </Card>

            {/* Top expense categories table */}
            <Card>
              <h2 className="text-white text-sm font-semibold mb-4">Top Expense Categories</h2>
              {expenseByCategory.length === 0 ? (
                <div className="flex items-center justify-center h-48 text-muted text-sm">
                  No expenses recorded for {selectedYear}
                </div>
              ) : (
                <div className="overflow-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-surface-border">
                        <th className="text-left text-muted font-medium pb-3 pr-4 w-8">#</th>
                        <th className="text-left text-muted font-medium pb-3 pr-4">Category</th>
                        <th className="text-right text-muted font-medium pb-3 pr-4">Total</th>
                        <th className="text-right text-muted font-medium pb-3">% of Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {expenseByCategory.map((row, i) => (
                        <tr
                          key={row.category}
                          className="border-b border-surface-border/50 last:border-0"
                        >
                          <td className="py-2.5 pr-4 text-muted">{i + 1}</td>
                          <td className="py-2.5 pr-4 text-white font-medium">{row.category}</td>
                          <td className="py-2.5 pr-4 text-right text-danger">
                            {formatGBP(row.total)}
                          </td>
                          <td className="py-2.5 text-right text-muted">
                            {totalExpenses > 0
                              ? ((row.total / totalExpenses) * 100).toFixed(1)
                              : '0.0'}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </div>

          {/* Month-by-month table */}
          <Card>
            <h2 className="text-white text-sm font-semibold mb-4">
              Monthly Breakdown — {selectedYear}
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-surface-border">
                    <th className="text-left text-muted font-medium pb-3 pr-6">Month</th>
                    <th className="text-right text-muted font-medium pb-3 pr-6">Income</th>
                    <th className="text-right text-muted font-medium pb-3 pr-6">Expenses</th>
                    <th className="text-right text-muted font-medium pb-3">Net</th>
                  </tr>
                </thead>
                <tbody>
                  {monthlyData.map((row) => (
                    <tr
                      key={row.month}
                      className="border-b border-surface-border/50 last:border-0"
                    >
                      <td className="py-2.5 pr-6 text-white">{row.month}</td>
                      <td className={`py-2.5 pr-6 text-right tabular-nums ${row.income > 0 ? 'text-success' : 'text-muted'}`}>
                        {formatGBP(row.income)}
                      </td>
                      <td className={`py-2.5 pr-6 text-right tabular-nums ${row.expenses > 0 ? 'text-danger' : 'text-muted'}`}>
                        {formatGBP(row.expenses)}
                      </td>
                      <td className={`py-2.5 text-right tabular-nums font-medium ${row.net > 0 ? 'text-success' : row.net < 0 ? 'text-danger' : 'text-muted'}`}>
                        {formatGBP(row.net)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-surface-border">
                    <td className="pt-3 pr-6 text-white font-semibold text-sm">YTD Total</td>
                    <td className="pt-3 pr-6 text-right tabular-nums font-semibold text-success">
                      {formatGBP(totalIncome)}
                    </td>
                    <td className="pt-3 pr-6 text-right tabular-nums font-semibold text-danger">
                      {formatGBP(totalExpenses)}
                    </td>
                    <td className={`pt-3 text-right tabular-nums font-semibold ${netPL >= 0 ? 'text-success' : 'text-danger'}`}>
                      {formatGBP(netPL)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </Card>
        </>
      )}
    </PageWrapper>
  )
}
