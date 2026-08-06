create table public.webhook_events (
  provider text not null,
  event_id text not null,
  event_type text not null,
  external_purchase_id text,
  received_at timestamptz not null default now(),
  primary key (provider, event_id)
);

alter table public.webhook_events enable row level security;

create index webhook_events_external_purchase_idx
on public.webhook_events (provider, external_purchase_id);

create or replace function public.record_eduzz_entitlement(
  target_event_id text,
  target_event_type text,
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
  entitlement_profile_id uuid;
  inserted_count integer;
begin
  if target_status not in ('active', 'blocked', 'refunded', 'canceled') then
    raise exception 'invalid Eduzz entitlement status';
  end if;

  insert into public.webhook_events (provider, event_id, event_type, external_purchase_id)
  values ('eduzz', target_event_id, target_event_type, target_external_purchase_id)
  on conflict (provider, event_id) do nothing;
  get diagnostics inserted_count = row_count;

  if inserted_count = 0 then
    select id into entitlement_id
    from public.entitlements
    where external_purchase_id = target_external_purchase_id;
    return entitlement_id;
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
    'eduzz',
    target_external_purchase_id,
    nullif(lower(trim(target_purchase_email)), ''),
    target_status,
    case when target_status = 'active' then target_event_created_at else null end,
    target_event_created_at,
    now()
  )
  on conflict (external_purchase_id) do update
  set source = 'eduzz',
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
  returning id, profile_id into entitlement_id, entitlement_profile_id;

  if entitlement_id is null then
    select id, profile_id into entitlement_id, entitlement_profile_id
    from public.entitlements
    where external_purchase_id = target_external_purchase_id;
  end if;

  insert into public.activity_events (profile_id, event_name, event_data)
  values (
    entitlement_profile_id,
    'eduzz.' || target_event_type,
    jsonb_build_object(
      'eventId', target_event_id,
      'externalPurchaseId', target_external_purchase_id,
      'status', target_status
    )
  );

  return entitlement_id;
end;
$$;

revoke all on function public.record_eduzz_entitlement(text, text, text, text, text, timestamptz) from public;
revoke execute on function public.record_eduzz_entitlement(text, text, text, text, text, timestamptz) from anon, authenticated;
grant execute on function public.record_eduzz_entitlement(text, text, text, text, text, timestamptz) to service_role;
