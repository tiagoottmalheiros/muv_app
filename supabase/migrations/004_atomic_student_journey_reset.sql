alter table public.profiles
  add column journey_reset_at timestamptz not null default '1970-01-01 00:00:00+00';

create or replace function public.reset_student_journey(target_profile_id uuid)
returns timestamptz
language plpgsql
security invoker
set search_path = ''
as $$
declare
  reset_at timestamptz := clock_timestamp();
begin
  delete from public.ai_generations where profile_id = target_profile_id;
  delete from public.student_outputs where profile_id = target_profile_id;
  delete from public.lesson_progress where profile_id = target_profile_id;
  delete from public.funnel_xray_submissions where profile_id = target_profile_id;
  delete from public.prompt_base_submissions where profile_id = target_profile_id;
  delete from public.immersion_registrations where profile_id = target_profile_id;
  delete from public.activity_events where profile_id = target_profile_id;

  update public.profiles
  set last_route = '/central/comece-aqui',
      last_access_at = reset_at,
      journey_reset_at = reset_at,
      updated_at = reset_at
  where id = target_profile_id;

  return reset_at;
end;
$$;

revoke execute on function public.reset_student_journey(uuid) from public, anon, authenticated;
grant execute on function public.reset_student_journey(uuid) to service_role;
