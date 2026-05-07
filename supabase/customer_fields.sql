alter table if exists public.customers
  add column if not exists is_grass_cutting_customer boolean;

update public.customers
set is_grass_cutting_customer = true
where is_grass_cutting_customer is null;

alter table if exists public.customers
  alter column is_grass_cutting_customer set default true;

alter table if exists public.customers
  alter column is_grass_cutting_customer set not null;

alter table if exists public.customers
  add column if not exists site_name text null;

alter table if exists public.customers
  add column if not exists town text null;

alter table if exists public.customers
  add column if not exists email text null;

alter table if exists public.customers
  add column if not exists contact_emails jsonb null;

alter table if exists public.customers
  add column if not exists grass_cut_areas jsonb null;

update public.customers
set contact_emails = case
  when contact_emails is not null and jsonb_typeof(contact_emails) = 'array' then contact_emails
  when email is not null and btrim(email) <> '' then jsonb_build_array(btrim(email))
  else '[]'::jsonb
end
where contact_emails is null
   or jsonb_typeof(contact_emails) <> 'array';

alter table if exists public.customers
  alter column contact_emails set default '[]'::jsonb;

alter table if exists public.customers
  alter column contact_emails set not null;

update public.customers
set grass_cut_areas = case
  when coalesce(is_grass_cutting_customer, true) then '["All"]'::jsonb
  else '[]'::jsonb
end
where grass_cut_areas is null
   or jsonb_typeof(grass_cut_areas) <> 'array'
   or jsonb_array_length(grass_cut_areas) = 0;

alter table if exists public.customers
  alter column grass_cut_areas set default '["All"]'::jsonb;

alter table if exists public.customers
  alter column grass_cut_areas set not null;

alter table if exists public.customers
  drop constraint if exists customers_grass_cut_areas_json_array_check;

alter table if exists public.customers
  add constraint customers_grass_cut_areas_json_array_check
  check (jsonb_typeof(grass_cut_areas) = 'array');

alter table if exists public.customers
  add column if not exists site_address text null;

alter table if exists public.customers
  add column if not exists site_town text null;

alter table if exists public.customers
  add column if not exists site_postcode text null;

alter table if exists public.customers
  add column if not exists day text null;

alter table if exists public.customers
  alter column day type text;

update public.customers
set day = case
  when lower(day) like 'mon%' then 'Monday'
  when lower(day) like 'tue%' then 'Tuesday'
  when lower(day) like 'wed%' then 'Wednesday'
  when lower(day) like 'thu%' then 'Thursday'
  when lower(day) like 'fri%' then 'Friday'
  else day
end
where day is not null;

alter table if exists public.customers
  drop constraint if exists customers_day_check;

alter table if exists public.customers
  add constraint customers_day_check
  check (
    day is null or day in ('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday')
  );
