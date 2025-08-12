-- Stores invoices synced from Xero
create table if not exists xero_invoices (
  invoice_id uuid primary key,
  tenant_id uuid not null,
  invoice_number text,
  contact_name text,
  status text,
  currency_code text,
  amount_due numeric,
  amount_paid numeric,
  total numeric,
  issued_at timestamptz,
  due_at timestamptz,
  updated_utc timestamptz,
  reference text,
  created_at timestamptz not null default now()
);