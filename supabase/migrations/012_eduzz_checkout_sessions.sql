create table public.eduzz_checkout_sessions (
  id uuid primary key default gen_random_uuid(),
  order_id uuid unique not null,
  return_token_hash text unique not null,
  postback_token_hash text unique not null,
  eduzz_cart_id text,
  eduzz_cart_key text,
  sale_id text unique,
  purchase_email text,
  status text not null default 'pending' check (status in ('pending', 'paid', 'failed', 'canceled')),
  paid_at timestamptz,
  expires_at timestamptz not null default (now() + interval '2 hours'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index eduzz_checkout_sessions_status_expires_idx
on public.eduzz_checkout_sessions (status, expires_at);

alter table public.eduzz_checkout_sessions enable row level security;

revoke all on table public.eduzz_checkout_sessions from anon, authenticated;
grant all on table public.eduzz_checkout_sessions to service_role;
