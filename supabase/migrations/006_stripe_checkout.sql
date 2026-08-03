alter table public.entitlements
alter column profile_id drop not null;

alter table public.entitlements
add constraint entitlements_external_purchase_unique unique (external_purchase_id);

create index entitlements_purchase_email_product_idx
on public.entitlements (lower(purchase_email), product_code, status);

create or replace function public.claim_student_entitlement(target_profile_id uuid, target_email text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  direct_entitlement public.entitlements;
  pending_entitlement public.entitlements;
begin
  select * into direct_entitlement
  from public.entitlements
  where profile_id = target_profile_id
    and product_code = 'muv_starter'
  for update;

  if direct_entitlement.id is not null
    and direct_entitlement.status = 'active'
    and (direct_entitlement.expires_at is null or direct_entitlement.expires_at > now()) then
    return direct_entitlement.id;
  end if;

  select * into pending_entitlement
  from public.entitlements
  where profile_id is null
    and product_code = 'muv_starter'
    and status = 'active'
    and lower(purchase_email) = lower(trim(target_email))
    and (expires_at is null or expires_at > now())
  order by purchased_at desc nulls last, created_at desc
  limit 1
  for update;

  if pending_entitlement.id is null then
    return direct_entitlement.id;
  end if;

  if direct_entitlement.id is not null then
    delete from public.entitlements where id = pending_entitlement.id;
    update public.entitlements
    set source = pending_entitlement.source,
        external_purchase_id = pending_entitlement.external_purchase_id,
        purchase_email = pending_entitlement.purchase_email,
        status = pending_entitlement.status,
        purchased_at = pending_entitlement.purchased_at,
        expires_at = pending_entitlement.expires_at,
        updated_at = now()
    where id = direct_entitlement.id;
    return direct_entitlement.id;
  end if;

  update public.entitlements
  set profile_id = target_profile_id,
      updated_at = now()
  where id = pending_entitlement.id;
  return pending_entitlement.id;
end;
$$;

revoke all on function public.claim_student_entitlement(uuid, text) from public;
grant execute on function public.claim_student_entitlement(uuid, text) to service_role;
