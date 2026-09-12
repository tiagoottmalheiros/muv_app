create table public.ai_runtime_settings (
  id uuid primary key,
  settings jsonb not null,
  updated_at timestamptz not null default now(),
  constraint ai_runtime_settings_singleton check (id = '00000000-0000-0000-0000-000000000001')
);

alter table public.ai_runtime_settings enable row level security;

insert into public.ai_runtime_settings (id, settings)
values (
  '00000000-0000-0000-0000-000000000001',
  '{"dailyGenerationLimit":4,"cooldownSeconds":30,"minimumOutputCharacters":600,"minimumMarkdownSections":3,"requireKnowledgeBase":false}'::jsonb
)
on conflict (id) do nothing;
