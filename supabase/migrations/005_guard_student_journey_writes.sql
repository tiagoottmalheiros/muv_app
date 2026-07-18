alter table public.prompt_base_submissions add column journey_reset_at timestamptz not null default '1970-01-01 00:00:00+00';
alter table public.funnel_xray_submissions add column journey_reset_at timestamptz not null default '1970-01-01 00:00:00+00';
alter table public.lesson_progress add column journey_reset_at timestamptz not null default '1970-01-01 00:00:00+00';
alter table public.student_outputs add column journey_reset_at timestamptz not null default '1970-01-01 00:00:00+00';
alter table public.immersion_registrations add column journey_reset_at timestamptz not null default '1970-01-01 00:00:00+00';
alter table public.ai_generations add column journey_reset_at timestamptz not null default '1970-01-01 00:00:00+00';
alter table public.activity_events add column journey_reset_at timestamptz not null default '1970-01-01 00:00:00+00';

create or replace function public.guard_student_journey_write()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  current_reset_at timestamptz;
begin
  if new.profile_id is null then
    return new;
  end if;

  select journey_reset_at
  into current_reset_at
  from public.profiles
  where id = new.profile_id
  for key share;

  if current_reset_at is null or new.journey_reset_at <> current_reset_at then
    raise exception 'stale student journey state' using errcode = '40001';
  end if;

  return new;
end;
$$;

create trigger guard_prompt_base_journey_write before insert or update on public.prompt_base_submissions for each row execute function public.guard_student_journey_write();
create trigger guard_funnel_xray_journey_write before insert or update on public.funnel_xray_submissions for each row execute function public.guard_student_journey_write();
create trigger guard_lesson_progress_journey_write before insert or update on public.lesson_progress for each row execute function public.guard_student_journey_write();
create trigger guard_student_outputs_journey_write before insert or update on public.student_outputs for each row execute function public.guard_student_journey_write();
create trigger guard_immersion_journey_write before insert or update on public.immersion_registrations for each row execute function public.guard_student_journey_write();
create trigger guard_ai_generations_journey_write before insert or update on public.ai_generations for each row execute function public.guard_student_journey_write();
create trigger guard_activity_events_journey_write before insert or update on public.activity_events for each row execute function public.guard_student_journey_write();

create or replace function public.reset_student_journey(target_profile_id uuid)
returns timestamptz
language plpgsql
security invoker
set search_path = ''
as $$
declare
  reset_at timestamptz := clock_timestamp();
begin
  perform 1 from public.profiles where id = target_profile_id for update;

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

revoke execute on function public.guard_student_journey_write() from public, anon, authenticated;
revoke execute on function public.reset_student_journey(uuid) from public, anon, authenticated;
grant execute on function public.reset_student_journey(uuid) to service_role;
