-- Stores contacts synced from Xero
create table if not exists xero_contacts (
  contact_id uuid primary key,
  tenant_id uuid not null,
  name text,
  email text,
  is_customer boolean,
  is_supplier boolean,
  updated_utc timestamptz,
  created_at timestamptz not null default now()
);

