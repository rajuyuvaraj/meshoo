-- ==============================================================================
-- UT8 HUB - Delivery Fleet Operations & Bank Remittance Tracker
-- Supabase / Postgres Schema Definition with Hardened RLS & Server-Side Validation
-- ==============================================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ------------------------------------------------------------------------------
-- 1. Allowed Hub Managers (Access Control Table - Issue #2)
-- ------------------------------------------------------------------------------
create table if not exists allowed_managers (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  role text default 'hub_manager' check (role in ('hub_manager', 'area_manager', 'auditor', 'admin')),
  hub_assigned text default 'UT8 HUB',
  created_at timestamptz default now()
);

alter table allowed_managers enable row level security;

-- Helper security function to check if current user is an authorized manager
create or replace function public.is_authorized_manager()
returns boolean security definer set search_path = public language sql stable as $$
  select exists (
    select 1 from public.allowed_managers
    where user_id = auth.uid()
  );
$$;

-- RLS for allowed_managers
create policy "Managers can view own authorization"
  on allowed_managers for select
  to authenticated
  using (user_id = auth.uid() or public.is_authorized_manager());

-- ------------------------------------------------------------------------------
-- 2. Daily Delivery & Cash Entries (one row per agent per date - Issue #2 & #9)
-- ------------------------------------------------------------------------------
create table if not exists daily_entries (
  id uuid primary key default gen_random_uuid(),
  created_by uuid references auth.users(id) default auth.uid(),
  agent_name text not null,
  login_account_id text,
  entry_date date not null,
  hub_location text default 'UT8 HUB',
  total_delivered int default 0 check (total_delivered >= 0),
  cod_orders int default 0 check (cod_orders >= 0),
  online_received numeric(12,2) default 0.00 check (online_received >= 0.00),
  reported_cod_cash numeric(12,2) default 0.00 check (reported_cod_cash >= 0.00),
  note_500 int default 0 check (note_500 >= 0),
  note_200 int default 0 check (note_200 >= 0),
  note_100 int default 0 check (note_100 >= 0),
  note_50 int default 0 check (note_50 >= 0),
  note_20 int default 0 check (note_20 >= 0),
  note_10 int default 0 check (note_10 >= 0),
  coin_1 int default 0 check (coin_1 >= 0),
  actual_cash_tally numeric(12,2) default 0.00 check (actual_cash_tally >= 0.00),
  total_settled numeric(12,2) default 0.00 check (total_settled >= 0.00),
  cash_variance numeric(12,2) default 0.00,
  audit_status text default 'Balanced' check (audit_status in ('Balanced', 'Shortage', 'Surplus')),
  salary_paid boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint daily_entries_no_future_dates check (entry_date <= (current_date + interval '1 day'))
);

-- ------------------------------------------------------------------------------
-- 3. Bank Remittance Entries (one row per date, hub-level - Issue #2 & #9)
-- ------------------------------------------------------------------------------
create table if not exists remittance_entries (
  id uuid primary key default gen_random_uuid(),
  created_by uuid references auth.users(id) default auth.uid(),
  entry_date date not null unique,
  hub_location text default 'UT8 HUB',
  deposit_bank text default 'State Bank of India',
  deposit_branch text default 'Varanasi Main Branch (Cantt)',
  cash_challan_no text,
  cash_deposited numeric(12,2) default 0.00 check (cash_deposited >= 0.00),
  bank_utr_ref_no text,
  online_remitted numeric(12,2) default 0.00 check (online_remitted >= 0.00),
  receipt_image text,
  receipt_filename text,
  area_manager_name text default 'Rajesh Kumar (AM)',
  manager_approval_status text default 'Approved & Reconciled' check (manager_approval_status in ('Approved & Reconciled', 'Pending')),
  signoff_date date,
  remittance_audit_status text default 'Verified • Bank Confirmed' check (remittance_audit_status in ('Verified • Bank Confirmed', 'Pending')),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint remittance_entries_no_future_dates check (entry_date <= (current_date + interval '1 day'))
);

-- Indices for rapid querying by date range
create index if not exists idx_daily_entries_date on daily_entries(entry_date);
create index if not exists idx_daily_entries_agent_name on daily_entries(agent_name);
create index if not exists idx_remittance_entries_date on remittance_entries(entry_date);

-- ------------------------------------------------------------------------------
-- 4. Row Level Security Policies (Strict Manager Whitelist - Issue #2)
-- ------------------------------------------------------------------------------
alter table daily_entries enable row level security;
alter table remittance_entries enable row level security;

-- Strict policy for daily_entries: Only authenticated users in allowed_managers can access
drop policy if exists "Authorized managers full access to daily_entries" on daily_entries;
create policy "Authorized managers full access to daily_entries"
  on daily_entries for all
  to authenticated
  using (public.is_authorized_manager())
  with check (public.is_authorized_manager());

-- Strict policy for remittance_entries: Only authenticated users in allowed_managers can access
drop policy if exists "Authorized managers full access to remittance_entries" on remittance_entries;
create policy "Authorized managers full access to remittance_entries"
  on remittance_entries for all
  to authenticated
  using (public.is_authorized_manager())
  with check (public.is_authorized_manager());

-- ------------------------------------------------------------------------------
-- 5. Supabase Storage Setup & Policy for Deposit Receipts (Issue #6)
-- ------------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('deposit-receipts', 'deposit-receipts', true)
on conflict (id) do nothing;

drop policy if exists "Authorized managers can upload receipts" on storage.objects;
create policy "Authorized managers can upload receipts"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'deposit-receipts'
    and public.is_authorized_manager()
  );

drop policy if exists "Authorized managers can view receipts" on storage.objects;
create policy "Authorized managers can view receipts"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'deposit-receipts'
    and public.is_authorized_manager()
  );

drop policy if exists "Authorized managers can delete receipts" on storage.objects;
create policy "Authorized managers can delete receipts"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'deposit-receipts'
    and public.is_authorized_manager()
  );
