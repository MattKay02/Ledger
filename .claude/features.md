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

---

## Ledger Bot

AI-powered transaction entry page at `/ledger-bot`. Users type a transaction description or upload a file; Claude Haiku parses it, asks clarifying questions one at a time, then presents a confirmation card before writing to the database.

### Architecture

```
Browser                          Vercel (api/ledger-bot.js)          Anthropic
  │                                       │                               │
  │── POST /api/ledger-bot ──────────────>│                               │
  │   { messages, currentDate }           │── verify Supabase JWT         │
  │   Authorization: Bearer <token>       │── check bot_usage limits      │
  │                                       │── build messages array        │
  │                                       │── POST claude-haiku ─────────>│
  │                                       │<─ JSON response ──────────────│
  │                                       │── validate transaction        │
  │                                       │── increment bot_usage         │
  │<─ { success, data } ─────────────────│                               │
  │                                       │
  │── addExpense / addIncome (Supabase) ──> (client-side, RLS enforced)
```

The serverless function handles: JWT verification, rate limiting, Anthropic calls, JSON retry, and server-side validation. DB writes happen client-side via existing hooks after the user confirms.

### AI Model
`claude-haiku-4-5-20251001` — fast and cheap. Aggressive system prompt with:
- Strict JSON-only output (no markdown, no prose)
- Complete JSON schema with worked examples
- One clarifying question per turn rule
- Current date injected at runtime
- File content wrapped in `<document>` tags with untrusted-content disclaimer (prompt injection guard)
- JSON parse retry loop: up to 3 attempts; each failure appends a correction instruction

### JSON Schema (Haiku output)
```json
{
  "status": "clarifying" | "complete",
  "message": "string",
  "transaction": null | {
    "type": "expense" | "income",
    "title": "string",
    "amount_original": number,
    "currency_original": "GBP",
    "category": "string (expense only — one of 8 allowed values)",
    "source_type": "string (income only — one of 6 allowed values)",
    "expense_type": "one_off" | "recurring",
    "date": "YYYY-MM-DD",
    "notes": "string | null",
    "duration_type": "indefinite" | "months" | "until_date" | null,
    "duration_months": number | null,
    "end_month": number | null,
    "end_year": number | null
  }
}
```

### Conversation Flow
1. User types or uploads file → `handleSend()` fires
2. Client POSTs full message history to `/api/ledger-bot` with JWT
3. If `status: 'clarifying'` → bot message added to thread, file cleared, user types next
4. If `status: 'complete'` → `ConfirmationCard` shown; usage counters incremented locally
5. User clicks **Confirm & Save**:
   - If non-GBP: `getExchangeRates()` + `convertToGBP()` called first
   - `addExpense()` / `addRecurring()` / `addIncome()` called with full payload
   - Conversation resets to empty (ready for next transaction)
6. User clicks **Edit** → bot says "Sure, what would you like to change?" — conversation continues with full history

### File Handling (client-side, before API call)
| Type | Processing |
|---|---|
| JPG / PNG / WEBP / GIF | `FileReader.readAsDataURL()` → base64 → sent as Anthropic vision content |
| CSV | `File.text()` → plain text → sent as text block |
| PDF | `pdfjs-dist` (dynamic import) → text extraction → sent as text block |

- Max file size: **10 MB** — enforced client-side before processing
- PDF worker loaded from CDN: `cdnjs.cloudflare.com/ajax/libs/pdf.js/{version}/pdf.worker.min.js`
- File is cleared from state after the first message send (not carried across turns)

### Rate Limiting
- Stored in `bot_usage` table (server-side, service role writes only)
- Free tier: **10 transactions/day**, **40 transactions/week** (rolling 7-day window)
- Counter increments only when Haiku returns `status: 'complete'` (per completed transaction, not per message turn)
- Limits stored in `user_profiles` table — upgrade a user by updating `bot_daily_limit` / `bot_weekly_limit`
- When limit hit: bot returns a friendly inline message with reset timing; input remains active
- Usage displayed in the page header as `X/10 today · X/40 this week`

### Server-side Validation (in api/ledger-bot.js)
Applied before rate limit increment and before returning `status: 'complete'` to client:
- `amount_original` > 0 (number)
- `date` matches `YYYY-MM-DD` and parses as a valid date
- `currency_original` is a 3-letter uppercase string
- For expense: `category` must be one of the 8 seeded values; `expense_type` must be `one_off` or `recurring`
- For income: `source_type` must be one of the 6 allowed values
- `title` must be a non-empty string
- Validation failure returns as a `clarifying` response (keeps conversation alive rather than crashing)

### Security
| Threat | Mitigation |
|---|---|
| API key exposure | `ANTHROPIC_API_KEY` server-only, never in Vite bundle |
| Unauthenticated abuse | Vercel function verifies Supabase JWT on every request |
| Rate limit bypass | Enforced server-side with service role key; client cannot self-report |
| Prompt injection via file | File text wrapped in `<document>` tags with explicit untrusted-content rule |
| Malformed AI output | Server validates all field types and enum values before returning to client |
| DB integrity | RLS enforces `user_id` ownership; DB CHECK constraints catch invalid enum values |

### Recurring Expenses via Bot
When `expense_type: 'recurring'`, the payload is routed to `addRecurring()` (not `addExpense()`). The `end_month` + `end_year` fields from the bot are converted to an `end_date` string:
```js
end_date = `${end_year}-${String(end_month).padStart(2, '0')}-01`
```
The recurring template is created in `recurring_expenses`, and the current month's expense row is materialised immediately by the hook.
