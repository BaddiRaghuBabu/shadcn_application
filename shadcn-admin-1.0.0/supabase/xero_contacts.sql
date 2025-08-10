-- Stores Xero contacts
create table if not exists xero_contacts (
  id bigserial primary key,
  tenant_id text not null,
  contact_id text not null,
  name text,
  email text,
  is_customer boolean,
  is_supplier boolean,
  created_at timestamptz not null default now()
);