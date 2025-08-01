-- enable extension for uuid generation if not already present
create extension if not exists "pgcrypto";

-- device tracking table
create table if not exists user_devices (
  id           uuid         primary key default gen_random_uuid(),
  user_id      uuid         not null references auth.users(id) on delete cascade,
  device_id    text         not null,
  session_id   text,
  user_agent   text,
  platform     text,
  ip_address   text,
  path         text,
  last_active  timestamptz  not null default now(),
  created_at   timestamptz  not null default now(),
  constraint unique_user_device unique (user_id, device_id)
);

-- indexes
create index if not exists user_devices_user_id_idx on public.user_devices (user_id);
create index if not exists user_devices_device_id_idx on public.user_devices (device_id);
create index if not exists user_devices_last_active_idx on public.user_devices (last_active);

-- Enable Row-Level Security
alter table public.user_devices enable row level security;

-- RLS policies
-- allow users to select only their own devices
create policy select_own_devices on public.user_devices
  for select using (auth.uid() = user_id);

-- allow users to insert their own device records
create policy insert_own_device on public.user_devices
  for insert with check (auth.uid() = user_id);

-- allow users to update their own device records
create policy update_own_device on public.user_devices
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- allow users to delete their own device record (local logout)
create policy delete_own_device on public.user_devices
  for delete using (auth.uid() = user_id);
