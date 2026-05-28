-- RoundHQ customer table field upgrade.
--
-- Run this whole file in the Supabase SQL editor if the dashboard says:
-- "the customers table needs the latest customer fields".
-- It is safe to run more than once.

alter table if exists public.customers
  add column if not exists postcode text null,
  add column if not exists town text null,
  add column if not exists phone text null,
  add column if not exists email text null,
  add column if not exists contact_emails jsonb null,
  add column if not exists is_grass_cutting_customer boolean null,
  add column if not exists grass_cut_areas jsonb null,
  add column if not exists week integer null,
  add column if not exists day text null,
  add column if not exists customer_type text null,
  add column if not exists cut_frequency text null,
  add column if not exists rotation_weeks_override integer null,
  add column if not exists site_name text null,
  add column if not exists site_address text null,
  add column if not exists site_town text null,
  add column if not exists site_postcode text null,
  add column if not exists payment_method text null,
  add column if not exists access_notes text null,
  add column if not exists notes text null,
  add column if not exists assigned_staff_id bigint null,
  add column if not exists route_order integer null,
  add column if not exists created_at timestamptz null,
  add column if not exists updated_at timestamptz null,
  add column if not exists price numeric(10, 2) null,
  add column if not exists lat double precision null,
  add column if not exists lng double precision null;

alter table if exists public.customers
  alter column week type integer
  using coalesce(nullif(regexp_replace(week::text, '\D', '', 'g'), '')::integer, 1);

update public.customers
set is_grass_cutting_customer = true
where is_grass_cutting_customer is null;

update public.customers
set contact_emails = case
  when contact_emails is not null and jsonb_typeof(contact_emails) = 'array' then contact_emails
  when email is not null and btrim(email) <> '' then jsonb_build_array(btrim(email))
  else '[]'::jsonb
end
where contact_emails is null
   or jsonb_typeof(contact_emails) <> 'array';

update public.customers
set grass_cut_areas = case
  when coalesce(is_grass_cutting_customer, true) then '["All"]'::jsonb
  else '[]'::jsonb
end
where grass_cut_areas is null
   or jsonb_typeof(grass_cut_areas) <> 'array'
   or jsonb_array_length(grass_cut_areas) = 0;

update public.customers
set week = case
  when week in (1, 2, 3, 4) then week
  else 1
end
where week is null or week not in (1, 2, 3, 4);

update public.customers
set day = case
  when lower(day) like 'mon%' then 'Monday'
  when lower(day) like 'tue%' then 'Tuesday'
  when lower(day) like 'wed%' then 'Wednesday'
  when lower(day) like 'thu%' then 'Thursday'
  when lower(day) like 'fri%' then 'Friday'
  when lower(day) like 'sat%' then 'Saturday'
  when lower(day) like 'sun%' then 'Sunday'
  else 'Monday'
end
where day is null
   or day not in ('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday');

update public.customers
set customer_type = case
  when customer_type = 'Commercial' then 'Commercial'
  else 'Residential'
end
where customer_type is null
   or customer_type not in ('Residential', 'Commercial');

update public.customers
set cut_frequency = case
  when cut_frequency in ('Weekly', 'Fortnightly', '3 Weekly', 'Monthly') then cut_frequency
  else 'Fortnightly'
end
where cut_frequency is null
   or cut_frequency not in ('Weekly', 'Fortnightly', '3 Weekly', 'Monthly');

update public.customers
set payment_method = null
where payment_method is not null
  and payment_method not in ('Monthly', 'On Day Transfer', 'Cash');

update public.customers
set rotation_weeks_override = null
where rotation_weeks_override is not null
  and rotation_weeks_override not in (1, 2, 3, 4);

update public.customers
set route_order = 0
where route_order is null;

update public.customers
set created_at = now()
where created_at is null;

update public.customers
set updated_at = now()
where updated_at is null;

update public.customers
set price = 0
where price is null;

alter table if exists public.customers
  alter column is_grass_cutting_customer set default true,
  alter column is_grass_cutting_customer set not null,
  alter column contact_emails set default '[]'::jsonb,
  alter column contact_emails set not null,
  alter column grass_cut_areas set default '["All"]'::jsonb,
  alter column grass_cut_areas set not null,
  alter column week set default 1,
  alter column week set not null,
  alter column customer_type set default 'Residential',
  alter column customer_type set not null,
  alter column cut_frequency set default 'Fortnightly',
  alter column cut_frequency set not null,
  alter column route_order set default 0,
  alter column route_order set not null,
  alter column created_at set default now(),
  alter column created_at set not null,
  alter column updated_at set default now(),
  alter column updated_at set not null,
  alter column price set default 0,
  alter column price set not null;

alter table if exists public.customers
  drop constraint if exists customers_contact_emails_json_array_check;

alter table if exists public.customers
  add constraint customers_contact_emails_json_array_check
  check (jsonb_typeof(contact_emails) = 'array');

alter table if exists public.customers
  drop constraint if exists customers_grass_cut_areas_json_array_check;

alter table if exists public.customers
  add constraint customers_grass_cut_areas_json_array_check
  check (jsonb_typeof(grass_cut_areas) = 'array');

alter table if exists public.customers
  drop constraint if exists customers_week_check;

alter table if exists public.customers
  add constraint customers_week_check
  check (week in (1, 2, 3, 4));

alter table if exists public.customers
  drop constraint if exists customers_day_check;

alter table if exists public.customers
  add constraint customers_day_check
  check (
    day is null or day in ('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday')
  );

alter table if exists public.customers
  drop constraint if exists customers_customer_type_check;

alter table if exists public.customers
  add constraint customers_customer_type_check
  check (customer_type in ('Residential', 'Commercial'));

alter table if exists public.customers
  drop constraint if exists customers_cut_frequency_check;

alter table if exists public.customers
  add constraint customers_cut_frequency_check
  check (cut_frequency in ('Weekly', 'Fortnightly', '3 Weekly', 'Monthly'));

alter table if exists public.customers
  drop constraint if exists customers_rotation_weeks_override_check;

alter table if exists public.customers
  add constraint customers_rotation_weeks_override_check
  check (rotation_weeks_override is null or rotation_weeks_override in (1, 2, 3, 4));

alter table if exists public.customers
  drop constraint if exists customers_payment_method_check;

alter table if exists public.customers
  add constraint customers_payment_method_check
  check (
    payment_method is null
    or payment_method in ('Monthly', 'On Day Transfer', 'Cash')
  );

do '
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = ''public''
      and table_name = ''customers''
      and column_name = ''organization_id''
  ) then
    execute ''create index if not exists customers_org_name_idx on public.customers (organization_id, name)'';
    execute ''create index if not exists customers_org_round_idx on public.customers (organization_id, week, day, customer_type, route_order)'';
    execute ''create index if not exists customers_org_assigned_staff_id_idx on public.customers (organization_id, assigned_staff_id)'';
  end if;
end'
language plpgsql;
