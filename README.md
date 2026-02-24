# Ledger

A personal business finance dashboard for tracking income, expenses, and monthly budgets. Built as a portfolio piece demonstrating full-stack development with real-time data, OAuth authentication, and data visualisation.

Base currency is GBP (£) with support for foreign currencies via live exchange rate conversion.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 |
| Build Tool | Vite |
| Routing | React Router v6 |
| Styling | Tailwind CSS |
| Charts | Recharts |
| Backend / Database | Supabase (PostgreSQL) |
| Authentication | Supabase Auth (email, Google OAuth, Apple OAuth) |
| Currency API | ExchangeRate-API (free tier) |
| Export | CSV (custom) / jsPDF |
| Deployment | Vercel |

---

## Architecture

Ledger follows a **feature-oriented, component-driven** architecture with a clear separation between UI, data, and business logic.

### Frontend Structure

```
src/
├── components/
│   ├── ui/          # Reusable base components (Button, Card, Input, Modal)
│   ├── charts/      # Chart components (DonutChart, TrendLineChart)
│   ├── layout/      # Sidebar, Navbar, PageWrapper
│   └── forms/       # ExpenseForm, IncomeForm, BudgetForm
├── pages/           # One file per route (Overview, Expenses, Income, Budgets, Reports, Settings)
├── hooks/           # Data-fetching hooks (useExpenses, useIncome, useBudgets, useCurrency)
├── lib/             # Third-party clients and utilities (supabase.js, currency.js, export.js)
├── context/         # Global auth state (AuthContext)
└── routes/          # Route guards (ProtectedRoute)
```

### Data Layer

All data is persisted in **Supabase (PostgreSQL)**. There is no localStorage usage — state is either fetched from the database or held in React component state. Every table has **Row Level Security (RLS)** enforced, ensuring users can only access their own data.

Custom hooks (`useExpenses`, `useIncome`, `useBudgets`) abstract all Supabase queries, keeping pages and components free of data-fetching logic.

### Auth

Authentication is handled entirely by Supabase Auth. The `AuthContext` provider manages the session and exposes a clean API (`signInWithEmail`, `signInWithGoogle`, `signInWithApple`, `signOut`) to the rest of the app. Routes are protected via a `ProtectedRoute` layout component using React Router's `<Outlet />` pattern, which redirects unauthenticated users to `/login`.

### Currency Handling

All values are stored in their **original currency alongside a pre-converted GBP value**. Source data is never discarded. Live exchange rates are fetched from ExchangeRate-API and cached within the session via the `useCurrency` hook.

---

## Pages

| Route | Purpose |
|---|---|
| `/` | Overview — P&L summary, charts, monthly snapshot |
| `/expenses` | Expenses — card grid with add / edit / delete |
| `/income` | Income — card grid with add / edit / delete |
| `/budgets` | Budgets — monthly targets vs actuals by category |
| `/reports` | Reports — trends, breakdowns, CSV and PDF export |
| `/settings` | Settings — profile, auth providers, preferences |
| `/login` | Login — email/password and OAuth |

---

## Local Development

1. Clone the repo and install dependencies:
   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env` and fill in your Supabase credentials:
   ```
   VITE_SUPABASE_URL=
   VITE_SUPABASE_ANON_KEY=
   VITE_EXCHANGE_RATE_API_KEY=
   ```

3. Start the dev server:
   ```bash
   npm run dev
   ```
