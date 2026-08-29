-- Commercial customer sites
-- Run once in the Supabase SQL Editor before deploying this feature.

alter table public.customers
  add column if not exists saved_sites jsonb not null default '[]'::jsonb;

alter table public.customers
  drop constraint if exists customers_saved_sites_array_check;

alter table public.customers
  add constraint customers_saved_sites_array_check
  check (jsonb_typeof(saved_sites) = 'array');
