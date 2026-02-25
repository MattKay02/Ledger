# Database — Ledger

## Overview
Ledger uses Supabase (PostgreSQL). All tables have Row Level Security (RLS) enabled. Users can only read and write their own data. Base currency is GBP — all monetary values are stored with both the original currency and the GBP-converted equivalent.

## Tables
- `expenses` — individual expense records (manual and auto-materialised from recurring templates)
- `recurring_expenses` — templates for recurring costs, auto-materialises rows into expenses on month view
- `income` — income records
- `budgets` — monthly budget targets per category
- `categories` — user-defined categories with colours
- `user_profiles` — plan tier and Ledger Bot rate limits per user (lazy-created on first bot call)
- `bot_usage` — daily completed transaction count per user, used for Ledger Bot rate limiting

## Schema

### recurring_expenses
Must be created BEFORE expenses due to the foreign key reference.
```sql
create table recurring_expenses (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null,
  amount_original decimal(12,2) not null,
  currency_original varchar(3) not null default 'GBP',
  amount_gbp decimal(12,2) not null,
  exchange_rate decimal(12,6) not null default 1,
  conversion_date timestamptz not null default now(),
  category text not null,
  notes text,
  start_date date not null,
  duration_type text not null check (duration_type in ('indefinite', 'months', 'until_date')),
  duration_months int,           -- populated when duration_type = 'months'
  end_date date,                 -- populated when duration_type = 'until_date'
  is_active boolean not null default true,
  stopped_at date,               -- set when user stops the recurring expense early
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
```

### expenses
```sql
create table expenses (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null,
  amount_original decimal(12,2) not null,
  currency_original varchar(3) not null default 'GBP',
  amount_gbp decimal(12,2) not null,
  exchange_rate decimal(12,6) not null default 1,
  conversion_date timestamptz not null default now(),
  category text not null,
  type text not null check (type in ('recurring', 'one_off')),
  date date not null,
  notes text,
  recurring_expense_id uuid references recurring_expenses(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
```

### income
```sql
create table income (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null,
  source_type text not null check (source_type in (
    'client_work',
    'software_product_sale',
    'app_store_apple',
    'google_play',
    'subscription_saas',
    'other'
  )),
  amount_original decimal(12,2) not null,
  currency_original varchar(3) not null default 'GBP',
  amount_gbp decimal(12,2) not null,
  exchange_rate decimal(12,6) not null default 1,
  conversion_date timestamptz not null default now(),
  date date not null,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
```

### budgets
```sql
create table budgets (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  category text not null,
  monthly_limit_gbp decimal(12,2) not null,
  month int not null check (month between 1 and 12),
  year int not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, category, month, year)
);
```

### categories
```sql
create table categories (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  type text not null check (type in ('expense', 'income', 'both')),
  colour varchar(7),  -- hex colour for charts e.g. '#6366f1'
  created_at timestamptz default now(),
  unique(user_id, name)
);
```

## Default Seed Categories
Insert these for a new user on first login (handle in an `onAuthStateChange` trigger or a Supabase database function):
```sql
-- Expense categories
('Hosting & Infrastructure', 'expense', '#6366f1')
('Software Subscriptions', 'expense', '#8b5cf6')
('Marketing & Ads', 'expense', '#ec4899')
('Equipment & Hardware', 'expense', '#f59e0b')
('Contractor Payments', 'expense', '#10b981')
('App Store Fees', 'expense', '#3b82f6')
('Office & Admin', 'expense', '#64748b')
('Other', 'expense', '#94a3b8')

-- Income categories
('Client Work', 'income', '#22c55e')
('Software Product Sales', 'income', '#06b6d4')
('App Store (Apple)', 'income', '#a855f7')
('Google Play', 'income', '#f97316')
('Subscriptions / SaaS', 'income', '#14b8a6')
('Other', 'income', '#94a3b8')
```

## Row Level Security (RLS) Policies

**Critical: RLS must be enabled on every table. Without this, any authenticated user can read all data.**

```sql
-- Enable RLS on all tables
alter table expenses enable row level security;
alter table recurring_expenses enable row level security;
alter table income enable row level security;
alter table budgets enable row level security;
alter table categories enable row level security;

-- Expenses
create policy "Users can view own expenses"
  on expenses for select using (auth.uid() = user_id);
create policy "Users can insert own expenses"
  on expenses for insert with check (auth.uid() = user_id);
create policy "Users can update own expenses"
  on expenses for update using (auth.uid() = user_id);
create policy "Users can delete own expenses"
  on expenses for delete using (auth.uid() = user_id);

-- Recurring expenses
create policy "Users can view own recurring expenses"
  on recurring_expenses for select using (auth.uid() = user_id);
create policy "Users can insert own recurring expenses"
  on recurring_expenses for insert with check (auth.uid() = user_id);
create policy "Users can update own recurring expenses"
  on recurring_expenses for update using (auth.uid() = user_id);
create policy "Users can delete own recurring expenses"
  on recurring_expenses for delete using (auth.uid() = user_id);

-- Income
create policy "Users can view own income"
  on income for select using (auth.uid() = user_id);
create policy "Users can insert own income"
  on income for insert with check (auth.uid() = user_id);
create policy "Users can update own income"
  on income for update using (auth.uid() = user_id);
create policy "Users can delete own income"
  on income for delete using (auth.uid() = user_id);

-- Budgets
create policy "Users can view own budgets"
  on budgets for select using (auth.uid() = user_id);
create policy "Users can insert own budgets"
  on budgets for insert with check (auth.uid() = user_id);
create policy "Users can update own budgets"
  on budgets for update using (auth.uid() = user_id);
create policy "Users can delete own budgets"
  on budgets for delete using (auth.uid() = user_id);

-- Categories
create policy "Users can view own categories"
  on categories for select using (auth.uid() = user_id);
create policy "Users can insert own categories"
  on categories for insert with check (auth.uid() = user_id);
create policy "Users can update own categories"
  on categories for update using (auth.uid() = user_id);
create policy "Users can delete own categories"
  on categories for delete using (auth.uid() = user_id);
```

## Recurring Expenses — How Auto-materialisation Works

When `useExpenses` fetches data for a given month/year it runs a second query for active `recurring_expenses` templates where that month falls within their active range. For any template that doesn't yet have a linked `expenses` row for that month, it inserts one automatically using `recurring_expense_id` as the link.

This is idempotent — if it runs twice it checks for existing rows first and never creates duplicates.

**Active range logic:**
- `indefinite` — active from `start_date` onwards while `is_active = true`
- `months` — active for `duration_months` months from `start_date`
- `until_date` — active from `start_date` until `end_date`

**Edit behaviour:**
- Editing updates the template and deletes auto-created rows for future months only
- Past months keep their recorded values untouched
- Current month row is updated in-place

**Stopping a recurring expense:**
- Sets `is_active = false` and stores `stopped_at` on the template
- Deletes auto-created expense rows for all future months
- Current and past months are untouched

## Useful Queries

### Monthly P&L summary
```sql
select
  sum(amount_gbp) filter (where type = 'income') as total_income,
  sum(amount_gbp) filter (where type = 'expense') as total_expenses,
  sum(amount_gbp) filter (where type = 'income') - sum(amount_gbp) filter (where type = 'expense') as net
from (
  select amount_gbp, 'income' as type from income
  where user_id = auth.uid()
  and date_part('month', date) = :month
  and date_part('year', date) = :year
  union all
  select amount_gbp, 'expense' as type from expenses
  where user_id = auth.uid()
  and date_part('month', date) = :month
  and date_part('year', date) = :year
) combined;
```

### Expenses by category for donut chart
```sql
select category, sum(amount_gbp) as total
from expenses
where user_id = auth.uid()
and date_part('month', date) = :month
and date_part('year', date) = :year
group by category
order by total desc;
```

### Active recurring expenses for a given month
```sql
select * from recurring_expenses
where user_id = auth.uid()
and is_active = true
and start_date <= :month_end
and (
  duration_type = 'indefinite'
  or (duration_type = 'until_date' and end_date >= :month_start)
  or (duration_type = 'months' and
      (start_date + (duration_months || ' months')::interval) >= :month_start)
);
```

## Key Gotchas
- **If data isn't returning, check RLS first** — 90% of Supabase data issues are RLS policies missing or misconfigured
- `auth.uid()` in RLS policies refers to the currently authenticated user's ID
- `on delete cascade` on `user_id` means if a user deletes their account, all their data is removed
- Always store `exchange_rate` and `conversion_date` — never discard source currency data
- `recurring_expense_id` on expenses is `on delete set null` — if a template is deleted, past expense rows are kept but unlinked
- Auto-materialisation must be idempotent — always check for an existing row before inserting
- `recurring_expenses` table must be created BEFORE `expenses` due to the foreign key reference

## Ledger Bot Tables

### user_profiles
Stores plan tier and Ledger Bot limits per user. Lazy-created on first bot call by the Vercel serverless function using the service role key.

```sql
create table user_profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  plan text not null default 'free' check (plan in ('free', 'pro', 'business')),
  bot_daily_limit int not null default 10,
  bot_weekly_limit int not null default 40,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table user_profiles enable row level security;

create policy "Users can view own profile"
  on user_profiles for select using (auth.uid() = id);
-- Writes are service-role only (plan upgrades happen server-side)

create trigger set_updated_at
before update on user_profiles
for each row execute function update_updated_at();
```

### bot_usage
One row per user per day. Tracks how many transactions have been completed via Ledger Bot. Used to enforce daily (default 10) and weekly rolling (default 40) limits.

```sql
create table bot_usage (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  usage_date date not null default current_date,
  completed_count int not null default 0,
  unique(user_id, usage_date)
);

alter table bot_usage enable row level security;

create policy "Users can view own usage"
  on bot_usage for select using (auth.uid() = user_id);
-- Writes are service-role only (incremented in api/ledger-bot.js)
```

**How rate limiting works:**
- Daily limit: count of `completed_count` for `usage_date = today`
- Weekly limit: sum of `completed_count` for `usage_date >= today - 6 days` (rolling 7-day window)
- The counter is only incremented when the AI returns `status: "complete"` (per transaction, not per message turn)
- The Vercel function checks limits before calling Anthropic and increments after a successful completion

---

## Auto-update `updated_at` trigger
```sql
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger set_updated_at
before update on expenses
for each row execute function update_updated_at();

create trigger set_updated_at
before update on recurring_expenses
for each row execute function update_updated_at();

create trigger set_updated_at
before update on income
for each row execute function update_updated_at();

create trigger set_updated_at
before update on budgets
for each row execute function update_updated_at();

create trigger set_updated_at
before update on categories
for each row execute function update_updated_at();
```