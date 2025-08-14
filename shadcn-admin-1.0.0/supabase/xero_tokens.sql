-- Stores Xero OAuth tokens
create table if not exists xero_tokens (
  id bigserial primary key,
  tenant_id text not null,
  access_token text not null,
  refresh_token text not null,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

