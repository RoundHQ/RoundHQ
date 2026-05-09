-- RoundHQ owner customer controls schema.
--
-- Run this small file if the main tenant schema is already installed and you
-- only need the owner-console customer controls table.

create table if not exists public.customer_account_settings (
  organization_id uuid primary key references public.organizations(id) on delete cascade,
  account_status text not null default 'active' check (account_status in ('active', 'disabled')),
  disabled_reason text null,
  feature_access jsonb not null default '{}'::jsonb,
  internal_notes text not null default '',
  support_priority text not null default 'standard' check (
    support_priority in ('standard', 'priority', 'watch')
  ),
  updated_at timestamptz not null default now(),
  check (jsonb_typeof(feature_access) = 'object')
);

insert into public.customer_account_settings (organization_id)
select id from public.organizations
on conflict (organization_id) do nothing;

grant select on public.customer_account_settings to authenticated;

alter table public.customer_account_settings enable row level security;

drop policy if exists "Members can read customer account settings" on public.customer_account_settings;

create policy "Members can read customer account settings"
on public.customer_account_settings
for select
to authenticated
using (public.is_organization_member(organization_id));
