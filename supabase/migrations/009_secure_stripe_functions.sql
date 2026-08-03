revoke execute on function public.claim_student_entitlement(uuid, text) from anon, authenticated;
revoke execute on function public.record_stripe_entitlement(text, text, text, timestamptz) from anon, authenticated;

grant execute on function public.claim_student_entitlement(uuid, text) to service_role;
grant execute on function public.record_stripe_entitlement(text, text, text, timestamptz) to service_role;

create index activity_events_profile_id_idx
on public.activity_events (profile_id);
