-- SQL schema for user_devices table
create table if not exists public.user_devices (
  device_id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  user_agent text,
  platform text,
  ip_address text,
  path text,
  last_active timestamptz default now(),
  created_at timestamptz default now()
);

create index if not exists user_devices_user_id_idx on public.user_devices (user_id);
