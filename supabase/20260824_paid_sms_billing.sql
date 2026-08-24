-- Paid SMS entitlement and immutable usage records.
-- Apply this migration once to the existing RoundHQ Supabase project.

alter table public.customer_account_settings
  add column if not exists sms_billing_enabled boolean not null default false,
  add column if not exists sms_terms_accepted boolean not null default false,
  add column if not exists sms_terms_accepted_at timestamptz null,
  add column if not exists sms_terms_accepted_by uuid null references auth.users(id) on delete set null,
  add column if not exists sms_price_per_message_pence integer not null default 10;

alter table public.customer_account_settings
  drop constraint if exists customer_account_settings_sms_price_positive;

alter table public.customer_account_settings
  add constraint customer_account_settings_sms_price_positive
  check (sms_price_per_message_pence > 0);

update public.customer_account_settings
set sms_billing_enabled = false,
    sms_terms_accepted = false,
    sms_terms_accepted_at = null,
    sms_terms_accepted_by = null,
    sms_price_per_message_pence = 10
where sms_billing_enabled is null
   or sms_terms_accepted is null
   or sms_price_per_message_pence is null;

create table if not exists public.sms_usage_records (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid null references auth.users(id) on delete set null,
  customer_id bigint null references public.customers(id) on delete set null,
  customer_message_id uuid not null references public.customer_messages(id) on delete restrict,
  provider_message_id text null,
  recipient text not null,
  quantity integer not null default 1 check (quantity > 0),
  unit_price_pence integer not null check (unit_price_pence > 0),
  total_price_pence integer not null check (total_price_pence = quantity * unit_price_pence),
  status text not null default 'sent' check (status in ('sent', 'delivered')),
  created_at timestamptz not null default now(),
  unique (customer_message_id)
);

create index if not exists sms_usage_records_billing_period_idx
  on public.sms_usage_records (organization_id, created_at desc);

create index if not exists sms_usage_records_provider_message_idx
  on public.sms_usage_records (provider_message_id)
  where provider_message_id is not null;

create table if not exists public.sms_billing_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  actor_user_id uuid null references auth.users(id) on delete set null,
  event_type text not null check (event_type in ('billing_enabled', 'billing_disabled', 'terms_accepted')),
  price_per_message_pence integer not null check (price_per_message_pence > 0),
  created_at timestamptz not null default now()
);

create index if not exists sms_billing_events_history_idx
  on public.sms_billing_events (organization_id, created_at desc);

alter table public.sms_usage_records enable row level security;
alter table public.sms_billing_events enable row level security;

grant select on public.sms_usage_records, public.sms_billing_events to authenticated;

drop policy if exists "Members read SMS usage records" on public.sms_usage_records;
create policy "Members read SMS usage records"
  on public.sms_usage_records for select to authenticated
  using (public.is_organization_member(organization_id));

drop policy if exists "Members read SMS billing events" on public.sms_billing_events;
create policy "Members read SMS billing events"
  on public.sms_billing_events for select to authenticated
  using (public.is_organization_member(organization_id));
