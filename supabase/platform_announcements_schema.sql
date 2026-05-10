-- RoundHQ platform-wide customer dashboard announcements.
-- Run this in the Supabase SQL editor for the RoundHQ platform project.

create table if not exists public.platform_announcements (
  id text primary key default 'primary',
  title text not null default 'RoundHQ updates',
  message text not null default '',
  cta_label text not null default '',
  cta_href text not null default '',
  tone text not null default 'info' check (tone in ('info', 'success', 'warning')),
  is_active boolean not null default false,
  published_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.platform_announcements
  add column if not exists title text not null default 'RoundHQ updates',
  add column if not exists message text not null default '',
  add column if not exists cta_label text not null default '',
  add column if not exists cta_href text not null default '',
  add column if not exists tone text not null default 'info',
  add column if not exists is_active boolean not null default false,
  add column if not exists published_at timestamptz null,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

alter table public.platform_announcements
drop constraint if exists platform_announcements_tone_check;

alter table public.platform_announcements
add constraint platform_announcements_tone_check
check (tone in ('info', 'success', 'warning'));

grant select on public.platform_announcements to authenticated;

alter table public.platform_announcements enable row level security;

drop policy if exists "Authenticated users can read active platform announcements"
on public.platform_announcements;

create policy "Authenticated users can read active platform announcements"
on public.platform_announcements
for select
to authenticated
using (is_active = true);

insert into public.platform_announcements (id)
values ('primary')
on conflict (id) do nothing;
