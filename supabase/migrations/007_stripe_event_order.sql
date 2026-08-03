alter table public.entitlements
add column payment_event_created_at timestamptz;

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
    lower(trim(target_purchase_email)),
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

revoke all on function public.record_stripe_entitlement(text, text, text, timestamptz) from public;
grant execute on function public.record_stripe_entitlement(text, text, text, timestamptz) to service_role;
