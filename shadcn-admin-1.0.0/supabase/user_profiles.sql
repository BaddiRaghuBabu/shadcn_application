-- Profile information for users
create table if not exists user_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  username text,
  name text,
  dob date,
  avatar text,
  language text,
  role text not null default 'default' check (role in ('default', 'admin')),
  updated_at timestamptz not null default now()
);

-- Enable Row-Level Security
alter table public.user_profiles enable row level security;

-- Policies: allow users to access their own profile
create policy select_own_profile on public.user_profiles
  for select using (auth.uid() = user_id);

create policy upsert_own_profile on public.user_profiles
  for insert with check (auth.uid() = user_id);

create policy update_own_profile on public.user_profiles
  for update using (auth.uid() = user_id);