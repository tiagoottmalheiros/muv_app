alter table entitlements
add constraint entitlements_profile_product_unique unique (profile_id, product_code);

alter table profiles
add column if not exists last_route text;
