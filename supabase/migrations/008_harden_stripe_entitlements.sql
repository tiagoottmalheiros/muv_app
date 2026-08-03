create or replace function public.record_stripe_entitlement(
  target_external_purchase_id text,
  target_purchase_email text,
  target_status text,
  target_event_created_at timestamptz
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  entitlement_id uuid;
begin
  if target_status not in ('active', 'blocked', 'refunded', 'canceled') then
    raise exception 'invalid Stripe entitlement status';
  end if;

  insert into public.entitlements (
    profile_id,
    product_code,
    source,
    external_purchase_id,
    purchase_email,
    status,
    purchased_at,
    payment_event_created_at,
    updated_at
  ) values (
    null,
    'muv_starter',
    'stripe',
    target_external_purchase_id,
    nullif(lower(trim(target_purchase_email)), ''),
    target_status,
    case when target_status = 'active' then target_event_created_at else null end,
    target_event_created_at,
    now()
  )
  on conflict (external_purchase_id) do update
  set source = 'stripe',
      purchase_email = coalesce(excluded.purchase_email, public.entitlements.purchase_email),
      status = excluded.status,
      purchased_at = case
        when excluded.status = 'active' then coalesce(public.entitlements.purchased_at, excluded.purchased_at)
        else public.entitlements.purchased_at
      end,
      payment_event_created_at = excluded.payment_event_created_at,
      updated_at = now()
  where public.entitlements.payment_event_created_at is null
     or public.entitlements.payment_event_created_at <= excluded.payment_event_created_at
  returning id into entitlement_id;

  if entitlement_id is null then
    select id into entitlement_id
    from public.entitlements
    where external_purchase_id = target_external_purchase_id;
  end if;

  return entitlement_id;
end;
$$;

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
        payment_event_created_at = pending_entitlement.payment_event_created_at,
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
