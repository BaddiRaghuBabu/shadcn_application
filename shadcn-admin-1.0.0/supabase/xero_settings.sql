-- Stores Xero OAuth app credentials (single row)
create table if not exists xero_settings (
  id integer primary key default 1,
  client_id text not null,
  client_secret text not null,
  redirect_uri text not null,
  scopes text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Enforce at most one row
alter table public.xero_settings enable row level security;
-- No policies: deny all to non-service roles