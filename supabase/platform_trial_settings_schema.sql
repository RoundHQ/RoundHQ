-- RoundHQ free trial settings.
--
-- Run this small file if the main tenant schema is already installed and you
-- only need the editable platform free trial settings table.

create table if not exists public.platform_trial_settings (
  id text primary key default 'primary',
  free_trial_enabled boolean not null default true,
  free_trial_days integer not null default 30,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.platform_trial_settings
  add column if not exists free_trial_enabled boolean not null default true,
  add column if not exists free_trial_days integer not null default 30,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

alter table public.platform_trial_settings
  drop constraint if exists platform_trial_settings_days_check;

alter table public.platform_trial_settings
  add constraint platform_trial_settings_days_check
  check (free_trial_days between 1 and 365);

alter table public.platform_trial_settings enable row level security;

grant select on public.platform_trial_settings to authenticated;

drop policy if exists "Authenticated users can read platform trial settings"
on public.platform_trial_settings;

create policy "Authenticated users can read platform trial settings"
on public.platform_trial_settings
for select
to authenticated
using (true);

insert into public.platform_trial_settings (id)
values ('primary')
on conflict (id) do nothing;

update public.platform_trial_settings
set free_trial_enabled = case
      when free_trial_enabled = false and free_trial_days = 14 then true
      else free_trial_enabled
    end,
    free_trial_days = 30,
    updated_at = now()
where id = 'primary'
  and free_trial_days = 14;
