-- Stores accounts synced from QuickBooks
create table if not exists public.quickbooks_accounts (
  account_id text primary key,
  realm_id text not null,
  name text,
  account_type text,
  account_sub_type text,
  current_balance numeric,
  updated_at timestamptz default now()
);