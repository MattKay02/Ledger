# Features — Ledger

## Overview
Business logic, feature specs, and rules for each section of the app. Reference this file when building or modifying feature behaviour.

---

## Currency Conversion

### API
Use **ExchangeRate-API** free tier: `https://v6.exchangerate-api.com/v6/{API_KEY}/latest/GBP`
- Free tier: 1,500 requests/month
- Returns rates relative to GBP as the base
- Cache the rates in memory per session — do not call the API on every form input

### Logic
```js
// src/lib/currency.js
const CACHE_DURATION_MS = 60 * 60 * 1000 // 1 hour

let rateCache = { rates: null, fetchedAt: null }

export const getExchangeRates = async () => {
  const now = Date.now()
  if (rateCache.rates && (now - rateCache.fetchedAt) < CACHE_DURATION_MS) {
    return rateCache.rates
  }
  const res = await fetch(
    `https://v6.exchangerate-api.com/v6/${import.meta.env.VITE_EXCHANGE_RATE_API_KEY}/latest/GBP`
  )
  const data = await res.json()
  rateCache = { rates: data.conversion_rates, fetchedAt: now }
  return rateCache.rates
}

export const convertToGBP = (amount, fromCurrency, rates) => {
  if (fromCurrency === 'GBP') return { amountGBP: amount, rate: 1 }
  const rate = rates[fromCurrency]
  if (!rate) throw new Error(`Unknown currency: ${fromCurrency}`)
  return {
    amountGBP: parseFloat((amount / rate).toFixed(2)),
    rate: parseFloat((1 / rate).toFixed(6))
  }
}
```

### Storage rule
Always store:
- `amount_original` — what the user typed
- `currency_original` — e.g. 'USD'
- `amount_gbp` — converted value
- `exchange_rate` — rate used at time of entry
- `conversion_date` — timestamp of conversion

Never recalculate historical entries — the rate at time of entry is the source of truth.

---

## Expenses

### Types
- `recurring` — monthly fixed costs (hosting, subscriptions). These repeat every month.
- `one_off` — single purchases (equipment, licenses, ad spend campaigns).

### Rules
- Any past month can be viewed and edited — no read-only lock on historical data
- Category is freeform text but seeded defaults exist (see database.md)
- Deleting an expense is permanent — no soft delete needed for v1

### Custom Hook
```js
// src/hooks/useExpenses.js
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

export const useExpenses = (month, year) => {
  const { user } = useAuth()
  const [expenses, setExpenses] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!user) return
    const fetch = async () => {
      setLoading(true)
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .eq('user_id', user.id)
        .gte('date', `${year}-${String(month).padStart(2, '0')}-01`)
        .lt('date', month === 12
          ? `${year + 1}-01-01`
          : `${year}-${String(month + 1).padStart(2, '0')}-01`)
        .order('date', { ascending: false })
      if (error) setError(error)
      else setExpenses(data)
      setLoading(false)
    }
    fetch()
  }, [user, month, year])

  return { expenses, loading, error, refetch: fetch }
}
```

---

## Income

### Source Types
| Value | Label |
|---|---|
| `client_work` | Client Work |
| `software_product_sale` | Software Product Sale |
| `app_store_apple` | App Store (Apple) |
| `google_play` | Google Play |
| `subscription_saas` | Subscription / SaaS |
| `other` | Other |

### Rules
- Same edit history rules as expenses — all months editable
- Income entries are individual records — not recurring by default (client payments vary)
- Currency conversion applies identically to expenses

---

## Budgets

### Structure
- Monthly budget targets set per category
- One budget record per (user, category, month, year)
- Compared against actual expenses for that category in the same month
- Budget vs actual displayed as a progress bar on the Budgets page

### Budget status logic
```js
export const getBudgetStatus = (spent, limit) => {
  const percentage = (spent / limit) * 100
  if (percentage >= 100) return 'over'      // red
  if (percentage >= 80) return 'warning'    // amber
  return 'healthy'                          // green
}
```

---

## Overview / P&L Page

### Summary stat cards (top row)
1. **Total Income** — current month, GBP
2. **Total Expenses** — current month, GBP
3. **Net Profit/Loss** — income minus expenses, colour coded green/red
4. **Recurring Costs** — sum of recurring expense type only

### Charts
- **Donut chart** — expenses by category, current month
- **Line chart** — income vs expenses trend over last 6 months
- **Bar chart** — monthly income vs expenses comparison (last 6 months)

### Month selector
Dropdown to switch between months/years. Defaults to current month. All data on the page responds to the selected month.

---

## Reports / Analytics Page

### Sections
- Year-to-date P&L summary
- Income breakdown by source type (bar chart)
- Top expense categories (table + donut)
- Month-by-month table (income, expenses, net per month)

### CSV Export
```js
// src/lib/export.js
export const exportToCSV = (data, filename) => {
  const headers = Object.keys(data[0]).join(',')
  const rows = data.map(row => Object.values(row).join(',')).join('\n')
  const csv = `${headers}\n${rows}`
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${filename}.csv`
  a.click()
  URL.revokeObjectURL(url)
}
```

### PDF Export
Use `jsPDF` + `jspdf-autotable` for table-based PDF reports.
```js
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

export const exportToPDF = (title, columns, rows) => {
  const doc = new jsPDF()
  doc.text(title, 14, 16)
  autoTable(doc, { head: [columns], body: rows, startY: 24 })
  doc.save(`${title}.pdf`)
}
```

---

## Settings Page

### Sections
- **Profile** — display name, email (read only from auth provider)
- **Connected accounts** — shows which auth providers are linked (email, Google, Apple)
- **Categories** — add, rename, delete custom categories
- **Data** — export all data as CSV, delete account

---

## Error Handling Conventions
- Supabase errors always return `{ data, error }` — always destructure and check `error` before using `data`
- Show inline error messages on forms, not alerts
- Loading states on all async operations — use a `loading` boolean in hooks
- Never silently swallow errors — log to console minimum, show user feedback where appropriate
