-- Stores Xero invoices
create table if not exists xero_invoices (
  id bigserial primary key,
  tenant_id text not null,
  invoice_id text not null,
  invoice_number text,
  amount_due numeric,
  status text,
  created_at timestamptz not null default now()
);