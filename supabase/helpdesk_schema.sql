-- RoundHQ helpdesk schema.
-- Run this in the Supabase SQL editor for the RoundHQ platform project.

create extension if not exists pgcrypto;

create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  created_by_user_id uuid references auth.users(id) on delete set null,
  customer_name text,
  customer_email text,
  subject text not null,
  category text not null default 'general',
  priority text not null default 'normal',
  status text not null default 'open' check (
    status in ('open', 'waiting_on_us', 'waiting_on_customer', 'resolved', 'closed')
  ),
  assigned_admin_email text,
  last_customer_reply_at timestamptz,
  last_admin_reply_at timestamptz,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.support_messages (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.support_tickets(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  author_type text not null default 'customer' check (author_type in ('customer', 'admin')),
  author_email text,
  body text not null,
  is_internal boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.support_attachments (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.support_tickets(id) on delete cascade,
  message_id uuid references public.support_messages(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  file_name text not null,
  file_type text,
  file_size bigint not null default 0,
  storage_bucket text,
  storage_path text,
  file_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.support_categories (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  slug text not null unique,
  description text,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.support_canned_replies (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  category text not null default 'general',
  body text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.support_priorities (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  slug text not null unique,
  description text,
  response_target_hours integer not null default 24,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.support_settings (
  id text primary key default 'primary',
  default_assigned_admin_email text,
  notify_admin_emails text,
  auto_acknowledge_enabled boolean not null default true,
  auto_acknowledge_subject text,
  auto_acknowledge_message text,
  max_attachment_mb integer not null default 8,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.support_categories
  add column if not exists description text;

alter table public.support_priorities
  add column if not exists description text,
  add column if not exists response_target_hours integer not null default 24,
  add column if not exists is_active boolean not null default true,
  add column if not exists sort_order integer not null default 0,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

alter table public.support_settings
  add column if not exists default_assigned_admin_email text,
  add column if not exists notify_admin_emails text,
  add column if not exists auto_acknowledge_enabled boolean not null default true,
  add column if not exists auto_acknowledge_subject text,
  add column if not exists auto_acknowledge_message text,
  add column if not exists max_attachment_mb integer not null default 8,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

alter table public.support_tickets
  drop constraint if exists support_tickets_category_check,
  drop constraint if exists support_tickets_priority_check;

alter table public.support_canned_replies
  drop constraint if exists support_canned_replies_category_check;

create index if not exists support_tickets_organization_idx
  on public.support_tickets (organization_id, updated_at desc);

create index if not exists support_tickets_status_idx
  on public.support_tickets (status, priority, updated_at desc);

create index if not exists support_messages_ticket_idx
  on public.support_messages (ticket_id, created_at);

create index if not exists support_attachments_ticket_idx
  on public.support_attachments (ticket_id, created_at);

alter table public.support_tickets enable row level security;
alter table public.support_messages enable row level security;
alter table public.support_attachments enable row level security;
alter table public.support_categories enable row level security;
alter table public.support_canned_replies enable row level security;
alter table public.support_priorities enable row level security;
alter table public.support_settings enable row level security;

drop policy if exists "Members can read support tickets" on public.support_tickets;
create policy "Members can read support tickets"
on public.support_tickets
for select
to authenticated
using (public.is_organization_member(organization_id));

drop policy if exists "Members can create support tickets" on public.support_tickets;
create policy "Members can create support tickets"
on public.support_tickets
for insert
to authenticated
with check (public.is_organization_member(organization_id));

drop policy if exists "Members can read non-internal support messages" on public.support_messages;
create policy "Members can read non-internal support messages"
on public.support_messages
for select
to authenticated
using (public.is_organization_member(organization_id) and is_internal = false);

drop policy if exists "Members can create customer support messages" on public.support_messages;
create policy "Members can create customer support messages"
on public.support_messages
for insert
to authenticated
with check (
  public.is_organization_member(organization_id)
  and author_type = 'customer'
  and is_internal = false
);

drop policy if exists "Members can read support attachments" on public.support_attachments;
create policy "Members can read support attachments"
on public.support_attachments
for select
to authenticated
using (public.is_organization_member(organization_id));

drop policy if exists "Members can create support attachments" on public.support_attachments;
create policy "Members can create support attachments"
on public.support_attachments
for insert
to authenticated
with check (public.is_organization_member(organization_id));

insert into public.support_categories (label, slug, sort_order)
values
  ('General', 'general', 10),
  ('Billing', 'billing', 20),
  ('Bug', 'bug', 30),
  ('Feature request', 'feature_request', 40),
  ('Account access', 'account_access', 50)
on conflict (slug) do nothing;

insert into public.support_priorities (
  label,
  slug,
  description,
  response_target_hours,
  sort_order
)
values
  ('Low', 'low', 'Useful but not time-sensitive.', 72, 10),
  ('Normal', 'normal', 'Standard support request.', 24, 20),
  ('High', 'high', 'Important issue affecting day-to-day use.', 8, 30),
  ('Urgent', 'urgent', 'Critical access, billing, or service issue.', 4, 40)
on conflict (slug) do nothing;

insert into public.support_settings (id)
values ('primary')
on conflict (id) do nothing;
