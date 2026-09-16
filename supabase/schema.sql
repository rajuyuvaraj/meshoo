-- ==============================================================================
-- Varanasi Hub - Delivery Fleet Operations & Bank Remittance Tracker
-- Supabase / Postgres Schema Definition
-- ==============================================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. Daily Delivery & Cash Entries (one row per agent per date)
create table if not exists daily_entries (
  id uuid primary key default gen_random_uuid(),
  agent_name text not null,
  login_account_id text,
  entry_date date not null,
  hub_location text default 'Varanasi Hub',
  total_delivered int default 0,
  cod_orders int default 0,
  online_received numeric(12,2) default 0.00,
  reported_cod_cash numeric(12,2) default 0.00,
  note_500 int default 0,
  note_200 int default 0,
  note_100 int default 0,
  note_50 int default 0,
  note_20 int default 0,
  note_10 int default 0,
  coin_1 int default 0,
  actual_cash_tally numeric(12,2) default 0.00,
  total_settled numeric(12,2) default 0.00,
  cash_variance numeric(12,2) default 0.00,
  audit_status text default 'Balanced' check (audit_status in ('Balanced', 'Shortage', 'Surplus')),
  salary_paid boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 2. Bank Remittance Entries (one row per date, hub-level)
create table if not exists remittance_entries (
  id uuid primary key default gen_random_uuid(),
  entry_date date not null unique,
  hub_location text default 'Varanasi Hub',
  deposit_bank text,
  deposit_branch text,
  cash_challan_no text,
  cash_deposited numeric(12,2) default 0.00,
  bank_utr_ref_no text,
  online_remitted numeric(12,2) default 0.00,
  area_manager_name text default 'Rajesh Kumar (AM)',
  manager_approval_status text default 'Approved & Reconciled' check (manager_approval_status in ('Approved & Reconciled', 'Pending')),
  signoff_date date,
  remittance_audit_status text default 'Verified • Bank Confirmed' check (remittance_audit_status in ('Verified • Bank Confirmed', 'Pending')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Indices for rapid querying by date range
create index if not exists idx_daily_entries_date on daily_entries(entry_date);
create index if not exists idx_daily_entries_agent_name on daily_entries(agent_name);
create index if not exists idx_remittance_entries_date on remittance_entries(entry_date);

-- Enable Row Level Security (RLS) - Defaults allowing manager role
alter table daily_entries enable row level security;
alter table remittance_entries enable row level security;

-- Policies for Authenticated Hub Manager
create policy "Allow all authenticated operations on daily_entries"
  on daily_entries for all
  to authenticated
  using (true)
  with check (true);

create policy "Allow all authenticated operations on remittance_entries"
  on remittance_entries for all
  to authenticated
  using (true)
  with check (true);
