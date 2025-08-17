-- Stores QuickBooks OAuth tokens
create table if not exists quickbooks_tokens (
  id bigserial primary key,
  realm_id text not null unique,
  access_token text not null,
  refresh_token text not null,
  expires_at timestamptz,
  company_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);