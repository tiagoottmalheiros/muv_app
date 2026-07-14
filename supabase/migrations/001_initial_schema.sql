-- Prepared for the next integration phase. Do not expose the service role key in the browser.
create extension if not exists pgcrypto;

create table profiles (
  id uuid primary key default gen_random_uuid(), clerk_user_id text unique not null, name text, primary_email text,
  avatar_url text, purchase_email text, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), last_access_at timestamptz
);
create table entitlements (
  id uuid primary key default gen_random_uuid(), profile_id uuid not null references profiles(id) on delete cascade, product_code text not null,
  source text, external_purchase_id text, purchase_email text, status text not null check (status in ('active','pending','blocked','refunded','canceled')),
  purchased_at timestamptz, expires_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index entitlements_profile_product_idx on entitlements(profile_id, product_code);
create table prompt_base_submissions (
  id uuid primary key default gen_random_uuid(), profile_id uuid not null references profiles(id) on delete cascade, answers jsonb not null default '{}',
  generated_text text, status text not null default 'draft', completed_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table funnel_xray_submissions (
  id uuid primary key default gen_random_uuid(), profile_id uuid not null references profiles(id) on delete cascade, answers jsonb not null default '[]',
  score numeric, classification text, generated_text text, status text not null default 'draft', completed_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table lesson_progress (
  id uuid primary key default gen_random_uuid(), profile_id uuid not null references profiles(id) on delete cascade, lesson_key text not null,
  status text not null default 'not_started', percent integer not null default 0 check (percent between 0 and 100), last_position_seconds integer,
  started_at timestamptz, completed_at timestamptz, updated_at timestamptz not null default now(), unique(profile_id, lesson_key)
);
create table student_outputs (
  id uuid primary key default gen_random_uuid(), profile_id uuid not null references profiles(id) on delete cascade, output_key text not null,
  title text, content text, structured_content jsonb not null default '{}', status text not null default 'draft', version integer not null default 1,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(profile_id, output_key)
);
create table immersion_registrations (
  id uuid primary key default gen_random_uuid(), profile_id uuid unique not null references profiles(id) on delete cascade, status text not null default 'pending',
  viewed_at timestamptz, clicked_at timestamptz, confirmed_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table activity_events (
  id uuid primary key default gen_random_uuid(), profile_id uuid references profiles(id) on delete set null, event_name text not null,
  event_data jsonb not null default '{}', created_at timestamptz not null default now()
);

alter table profiles enable row level security;
alter table entitlements enable row level security;
alter table prompt_base_submissions enable row level security;
alter table funnel_xray_submissions enable row level security;
alter table lesson_progress enable row level security;
alter table student_outputs enable row level security;
alter table immersion_registrations enable row level security;
alter table activity_events enable row level security;
-- Policies must be created together with the Clerk JWT/Supabase integration. Until then, access is server-side service-role only.
