alter table public.customers
  add column if not exists saved_addresses jsonb not null default '[]'::jsonb,
  add column if not exists service_address_id text null;

alter table public.customers
  drop constraint if exists customers_saved_addresses_array_check;

alter table public.customers
  add constraint customers_saved_addresses_array_check
  check (jsonb_typeof(saved_addresses) = 'array');
