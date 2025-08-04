-- Payment records for Razorpay transactions
create table if not exists payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  plan_id text not null,
  amount integer not null,
  currency text not null default 'INR',
  status text not null default 'pending', -- pending | success | failed
  razorpay_order_id text unique,
  razorpay_payment_id text,
  created_at timestamptz not null default now()
);

-- Enable Row-Level Security
alter table public.payments enable row level security;

-- Policies: allow users to access their own payment history
create policy select_own_payments on public.payments
  for select using (auth.uid() = user_id);

create policy insert_own_payment on public.payments
  for insert with check (auth.uid() = user_id);
