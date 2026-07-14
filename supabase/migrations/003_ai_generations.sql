create table ai_generations (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  output_key text not null,
  model text not null,
  response_id text,
  status text not null check (status in ('completed', 'failed')),
  used_knowledge_base boolean not null default false,
  input_tokens integer,
  output_tokens integer,
  duration_ms integer,
  error_message text,
  created_at timestamptz not null default now()
);

create index ai_generations_profile_created_idx
on ai_generations(profile_id, created_at desc);

alter table ai_generations enable row level security;
