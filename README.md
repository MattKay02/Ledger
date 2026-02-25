# Ledger

A personal business finance dashboard for tracking income, expenses, and monthly budgets. Built as a portfolio piece demonstrating full-stack development with real-time data, OAuth authentication, AI-powered transaction entry, and data visualisation.

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
| Serverless Functions | Vercel (`api/` directory) |
| AI | Anthropic Claude Haiku (`claude-haiku-4-5-20251001`) |
| Currency API | ExchangeRate-API (free tier) |
| PDF Parsing | pdfjs-dist |
| Export | CSV (custom) / jsPDF |
| Deployment | Vercel |

---

## Architecture

Ledger follows a **feature-oriented, component-driven** architecture with a clear separation between UI, data, and business logic.

### Frontend Structure

```
api/
└── ledger-bot.js    # Vercel serverless function — AI proxy, JWT auth, rate limiting

src/
├── components/
│   ├── ui/              # Reusable base components (Button, Card, Input, Modal)
│   ├── charts/          # Chart components (DonutChart, TrendLineChart)
│   ├── layout/          # Sidebar, Navbar, PageWrapper
│   ├── forms/           # ExpenseForm, IncomeForm, BudgetForm
│   └── ledger-bot/      # Chat UI (ChatBubble, ConfirmationCard, FileUploadButton)
├── pages/               # One file per route
├── hooks/               # Data-fetching hooks (useExpenses, useIncome, useBudgets)
├── lib/                 # Third-party clients and utilities (supabase.js, currency.js, export.js)
├── context/             # Global auth state (AuthContext)
└── routes/              # Route guards (ProtectedRoute)
```

### Data Layer

All data is persisted in **Supabase (PostgreSQL)**. There is no localStorage usage — state is either fetched from the database or held in React component state. Every table has **Row Level Security (RLS)** enforced, ensuring users can only access their own data.

Custom hooks (`useExpenses`, `useIncome`, `useBudgets`) abstract all Supabase queries, keeping pages and components free of data-fetching logic.

### Auth

Authentication is handled entirely by Supabase Auth. The `AuthContext` provider manages the session and exposes a clean API (`signInWithEmail`, `signInWithGoogle`, `signInWithApple`, `signOut`) to the rest of the app. Routes are protected via a `ProtectedRoute` layout component using React Router's `<Outlet />` pattern, which redirects unauthenticated users to `/login`.

### Currency Handling

All values are stored in their **original currency alongside a pre-converted GBP value**. Source data is never discarded. Live exchange rates are fetched from ExchangeRate-API and cached within the session.

### Ledger Bot

The `/ledger-bot` page is an AI-powered transaction entry interface. Users describe a transaction in plain text or upload a receipt, invoice, or CSV file. Claude Haiku parses the input, asks clarifying questions one at a time, then presents a confirmation card before writing the transaction to the database.

The Anthropic API is called via a **Vercel serverless function** (`api/ledger-bot.js`) that:
- Verifies the Supabase JWT on every request
- Enforces rate limits (10 transactions/day, 40/week on the free tier) using a `bot_usage` table
- Validates the AI's JSON output server-side before returning it to the client
- Guards against prompt injection in uploaded files

API keys (`ANTHROPIC_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`) are server-side only and never included in the client bundle.

---

## Pages

| Route | Purpose |
|---|---|
| `/` | Overview — P&L summary, charts, monthly snapshot |
| `/ledger-bot` | Ledger Bot — AI chat for logging transactions by text or file upload |
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

2. Copy `.env.example` to `.env` and fill in your credentials:
   ```
   VITE_SUPABASE_URL=
   VITE_SUPABASE_ANON_KEY=
   VITE_EXCHANGE_RATE_API_KEY=

   ANTHROPIC_API_KEY=
   SUPABASE_SERVICE_ROLE_KEY=
   ```

3. Run the dev server via **Vercel CLI** (required to serve the `api/` serverless functions locally):
   ```bash
   npx vercel dev
   ```
   > `npm run dev` (plain Vite) still works for all pages except Ledger Bot — the `/api/ledger-bot` endpoint won't be available without Vercel's local runtime.

4. On first run, execute the SQL in `.claude/database.md` in your Supabase SQL editor to create the required tables, including `user_profiles` and `bot_usage` for Ledger Bot rate limiting.
