# Database — Ledger

## Overview
Ledger uses Supabase (PostgreSQL). All tables have Row Level Security (RLS) enabled. Users can only read and write their own data. Base currency is GBP — all monetary values are stored with both the original currency and the GBP-converted equivalent.

## Schema

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

-- Income categories (source_type maps directly but categories add labels)
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
alter table income enable row level security;
alter table budgets enable row level security;
alter table categories enable row level security;

-- Expenses policies
create policy "Users can view own expenses"
  on expenses for select
  using (auth.uid() = user_id);

create policy "Users can insert own expenses"
  on expenses for insert
  with check (auth.uid() = user_id);

create policy "Users can update own expenses"
  on expenses for update
  using (auth.uid() = user_id);

create policy "Users can delete own expenses"
  on expenses for delete
  using (auth.uid() = user_id);

-- Repeat the same four policies for income, budgets, and categories
-- replacing 'expenses' with the relevant table name
```

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

## Key Gotchas
- **If data isn't returning, check RLS first** — 90% of Supabase data issues are RLS policies missing or misconfigured
- `auth.uid()` in RLS policies refers to the currently authenticated user's ID — this is what links rows to users
- `on delete cascade` on `user_id` means if a user deletes their account, all their data is automatically removed
- Always store `exchange_rate` and `conversion_date` — if you only store `amount_gbp` you lose the ability to audit or recalculate
- The `updated_at` column should be kept current via a Supabase trigger (see below)

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

-- Repeat for income, budgets, categories
```
