-- RoundHQ public blog setup.
--
-- Run this whole file in the Supabase SQL editor if /admin/blog shows
-- "Database setup needed". It is safe to run more than once.

create extension if not exists pgcrypto;

create table if not exists public.blog_settings (
  id text primary key default 'primary',
  hero_eyebrow text not null default 'Updates and guides',
  title text not null default 'RoundHQ updates and practical help guides.',
  summary text not null default 'Product news, setup guidance, and useful operating notes for garden and property maintenance teams using RoundHQ.',
  cta_label text not null default 'Contact RoundHQ',
  cta_href text not null default '/contact',
  seo_title text not null default 'RoundHQ Blog',
  seo_description text not null default 'Updates, product news, and practical guides for using RoundHQ.',
  posts_per_page integer not null default 12 check (posts_per_page between 1 and 48),
  show_featured_post boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.blog_settings
  add column if not exists hero_eyebrow text not null default 'Updates and guides',
  add column if not exists title text not null default 'RoundHQ updates and practical help guides.',
  add column if not exists summary text not null default 'Product news, setup guidance, and useful operating notes for garden and property maintenance teams using RoundHQ.',
  add column if not exists cta_label text not null default 'Contact RoundHQ',
  add column if not exists cta_href text not null default '/contact',
  add column if not exists seo_title text not null default 'RoundHQ Blog',
  add column if not exists seo_description text not null default 'Updates, product news, and practical guides for using RoundHQ.',
  add column if not exists posts_per_page integer not null default 12,
  add column if not exists show_featured_post boolean not null default true,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

alter table public.blog_settings
drop constraint if exists blog_settings_posts_per_page_check;

alter table public.blog_settings
add constraint blog_settings_posts_per_page_check
check (posts_per_page between 1 and 48);

insert into public.blog_settings (id)
values ('primary')
on conflict (id) do nothing;

create table if not exists public.blog_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null,
  description text not null default '',
  sort_order integer not null default 50,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.blog_categories
  add column if not exists name text not null default 'Blog category',
  add column if not exists slug text not null default 'blog-category',
  add column if not exists description text not null default '',
  add column if not exists sort_order integer not null default 50,
  add column if not exists is_published boolean not null default true,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

create unique index if not exists blog_categories_slug_unique_idx
on public.blog_categories (lower(slug));

create index if not exists blog_categories_public_order_idx
on public.blog_categories (is_published, sort_order, name);

insert into public.blog_categories (name, slug, description, sort_order)
values
  ('Updates', 'updates', 'Product updates, release notes, and RoundHQ news.', 10),
  ('Help Guides', 'help-guides', 'Practical guides for setting up and using RoundHQ.', 20)
on conflict do nothing;

create table if not exists public.blog_posts (
  id uuid primary key default gen_random_uuid(),
  category_id uuid null references public.blog_categories(id) on delete set null,
  title text not null,
  slug text not null,
  excerpt text not null default '',
  body text not null,
  author_name text not null default 'RoundHQ',
  status text not null default 'draft' check (status in ('draft', 'published')),
  featured_image_url text not null default '',
  featured_image_alt text not null default '',
  video_embed_url text not null default '',
  video_embed_title text not null default '',
  seo_title text not null default '',
  seo_description text not null default '',
  is_featured boolean not null default false,
  published_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.blog_posts
  add column if not exists category_id uuid null references public.blog_categories(id) on delete set null,
  add column if not exists title text not null default 'Untitled post',
  add column if not exists slug text not null default 'untitled-post',
  add column if not exists excerpt text not null default '',
  add column if not exists body text not null default '',
  add column if not exists author_name text not null default 'RoundHQ',
  add column if not exists status text not null default 'draft',
  add column if not exists featured_image_url text not null default '',
  add column if not exists featured_image_alt text not null default '',
  add column if not exists video_embed_url text not null default '',
  add column if not exists video_embed_title text not null default '',
  add column if not exists seo_title text not null default '',
  add column if not exists seo_description text not null default '',
  add column if not exists is_featured boolean not null default false,
  add column if not exists published_at timestamptz null,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

alter table public.blog_posts
drop constraint if exists blog_posts_status_check;

alter table public.blog_posts
add constraint blog_posts_status_check
check (status in ('draft', 'published'));

create unique index if not exists blog_posts_slug_unique_idx
on public.blog_posts (lower(slug));

create index if not exists blog_posts_public_idx
on public.blog_posts (status, published_at desc, is_featured desc);

create index if not exists blog_posts_category_idx
on public.blog_posts (category_id, status, published_at desc);

grant usage on schema public to anon, authenticated;
grant select on public.blog_settings to anon, authenticated;
grant select on public.blog_categories to anon, authenticated;
grant select on public.blog_posts to anon, authenticated;
grant select, insert, update, delete on public.blog_settings to authenticated;
grant select, insert, update, delete on public.blog_categories to authenticated;
grant select, insert, update, delete on public.blog_posts to authenticated;

alter table public.blog_settings enable row level security;
alter table public.blog_categories enable row level security;
alter table public.blog_posts enable row level security;

drop policy if exists "Blog settings are public" on public.blog_settings;
create policy "Blog settings are public"
on public.blog_settings
for select
to anon, authenticated
using (id = 'primary');

drop policy if exists "Published blog categories are public" on public.blog_categories;
create policy "Published blog categories are public"
on public.blog_categories
for select
to anon, authenticated
using (is_published);

drop policy if exists "Published blog posts are public" on public.blog_posts;
create policy "Published blog posts are public"
on public.blog_posts
for select
to anon, authenticated
using (
  status = 'published'
  and published_at <= now()
  and (
    category_id is null
    or exists (
      select 1
      from public.blog_categories
      where blog_categories.id = blog_posts.category_id
      and blog_categories.is_published = true
    )
  )
);
