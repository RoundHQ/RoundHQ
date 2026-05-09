-- RoundHQ public page editor schema.
--
-- Run this small file if the main tenant schema is already installed and you
-- only need the editable public website pages table.

create table if not exists public.site_pages (
  slug text primary key check (
    slug in ('features', 'pricing', 'about', 'resources', 'contact')
  ),
  nav_label text not null,
  eyebrow text not null,
  title text not null,
  summary text not null,
  body text not null,
  highlights jsonb not null default '[]'::jsonb,
  primary_cta_label text not null default 'Start free trial',
  primary_cta_href text not null default '/signup',
  sort_order integer not null default 0,
  is_published boolean not null default true,
  updated_at timestamptz not null default now(),
  check (jsonb_typeof(highlights) = 'array')
);

grant select on public.site_pages to anon, authenticated;

alter table public.site_pages enable row level security;

drop policy if exists "Published site pages are public" on public.site_pages;

create policy "Published site pages are public"
on public.site_pages
for select
to anon, authenticated
using (is_published);
