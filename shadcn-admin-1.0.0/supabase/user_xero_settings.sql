-- Xero OAuth settings for each user
create table if not exists user_xero_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  client_id text not null,
  client_secret text not null,
  redirect_uri text not null,
  scopes text[] not null default '{}',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Enable Row-Level Security
alter table public.user_xero_settings enable row level security;

-- Policies: allow users to manage their own settings
create policy select_own_xero_settings on public.user_xero_settings
  for select using (auth.uid() = user_id);

create policy insert_own_xero_settings on public.user_xero_settings
  for insert with check (auth.uid() = user_id);

create policy update_own_xero_settings on public.user_xero_settings
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
