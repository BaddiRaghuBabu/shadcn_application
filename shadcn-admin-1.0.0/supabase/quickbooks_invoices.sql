-- Stores invoices synced from QuickBooks
create table if not exists quickbooks_invoices (
  invoice_id text primary key,
  realm_id text not null,
  doc_number text,
  customer_name text,
  status text,
  currency_code text,
  balance numeric,
  total_amt numeric,
  txn_date date,
  due_date date,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);