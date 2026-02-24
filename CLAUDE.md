# Ledger — Business Finance Dashboard

## Project Overview
Ledger is a personal business finance dashboard for tracking income, expenses, and budgets. Built as a portfolio piece demonstrating full-stack skills: Supabase auth, OAuth, PostgreSQL with RLS, and real-time data visualisation. Base currency is GBP (£). Foreign currencies are supported with live conversion via a free exchange rate API.

## Tech Stack
- **Frontend:** React 18 + Vite
- **Routing:** React Router v6
- **Styling:** Tailwind CSS (dark mode only)
- **Charts:** Recharts
- **Backend/DB:** Supabase (PostgreSQL + Auth + RLS)
- **Deployment:** Vercel
- **Currency API:** ExchangeRate-API (free tier)
- **Export:** CSV (custom), PDF (react-pdf or jsPDF)

## Folder Structure
```
src/
├── components/
│   ├── ui/              # Reusable base components (Button, Card, Modal, Input)
│   ├── charts/          # Chart components (LineChart, BarChart, DonutChart)
│   ├── layout/          # Sidebar, Navbar, PageWrapper
│   └── forms/           # ExpenseForm, IncomeForm, BudgetForm
├── pages/
│   ├── Overview.jsx
│   ├── Expenses.jsx
│   ├── Income.jsx
│   ├── Budgets.jsx
│   ├── Reports.jsx
│   └── Settings.jsx
├── hooks/               # Custom hooks (useExpenses, useIncome, useBudgets, useCurrency)
├── lib/
│   ├── supabase.js      # Supabase client initialisation
│   ├── currency.js      # Exchange rate fetching and conversion logic
│   └── export.js        # CSV and PDF export utilities
├── context/
│   └── AuthContext.jsx  # Auth state, session management
└── routes/
    └── ProtectedRoute.jsx
```

## Hard Rules
- **Never use localStorage** for any data storage — Supabase only
- **Base currency is GBP (£)** — all display values must be in GBP
- **Always store original currency data** alongside GBP converted value — never discard source data
- **All tables must have RLS enabled** — no exceptions
- **No inline styles** — Tailwind classes only
- **Dark mode only** — no light mode variants needed
- **Budget period is monthly** — weekly views are out of scope
- **Full edit history** — past months can be viewed and edited
- **No notifications or alerts** — out of scope

## Pages
| Route | Page | Purpose |
|---|---|---|
| `/` | Overview/P&L | Summary stats, charts, monthly snapshot |
| `/expenses` | Expenses | Card grid of all expenses, add/edit/delete |
| `/income` | Income | Card grid of all income entries, add/edit/delete |
| `/budgets` | Budgets | Monthly budget targets vs actuals per category |
| `/reports` | Reports/Analytics | Trends, breakdowns, CSV + PDF export |
| `/settings` | Settings | Profile, auth providers, preferences |
| `/login` | Login | Supabase email + Google + Apple auth |

## Context Files
When working on specific domains, reference the relevant context file:
- **Auth & OAuth setup** → `.claude/auth.md`
- **Database schema & RLS** → `.claude/database.md`
- **UI components & Tailwind patterns** → `.claude/components.md`
- **Feature logic & business rules** → `.claude/features.md`
