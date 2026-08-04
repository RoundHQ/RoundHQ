-- RoundHQ tenant-safe schema for a fresh Supabase project.
--
-- Run this file in the Supabase SQL editor for the RoundHQ project.
-- Do not run the older Cleancut SQL files against the public SaaS database.

create extension if not exists pgcrypto;

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text null,
  owner_user_id uuid null references auth.users(id) on delete set null,
  default_rotation_weeks integer not null default 2 check (default_rotation_weeks in (1, 2, 3, 4)),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.organizations
add column if not exists default_rotation_weeks integer not null default 2;

update public.organizations
set default_rotation_weeks = 2
where default_rotation_weeks is null;

alter table public.organizations
drop constraint if exists organizations_default_rotation_weeks_check;

alter table public.organizations
add constraint organizations_default_rotation_weeks_check
check (default_rotation_weeks in (1, 2, 3, 4));

create unique index if not exists organizations_slug_unique_idx
on public.organizations (lower(slug))
where slug is not null;

create table if not exists public.organization_members (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  email text null,
  full_name text null,
  role text not null default 'owner' check (role in ('owner', 'admin', 'member')),
  status text not null default 'active' check (status in ('active', 'invited', 'disabled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);

create index if not exists organization_members_user_id_idx
on public.organization_members (user_id);

create table if not exists public.subscriptions (
  organization_id uuid primary key references public.organizations(id) on delete cascade,
  plan text not null default 'starter' check (plan in ('starter', 'growth')),
  stripe_customer_id text null,
  stripe_subscription_id text null,
  stripe_price_id text null,
  stripe_staff_addon_item_id text null,
  staff_addon_quantity integer not null default 0,
  status text not null default 'incomplete' check (
    status in (
      'incomplete',
      'incomplete_expired',
      'trialing',
      'active',
      'past_due',
      'canceled',
      'unpaid',
      'paused'
    )
  ),
  trial_ends_at timestamptz null,
  current_period_end timestamptz null,
  cancel_at_period_end boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.subscriptions
add column if not exists plan text default 'starter';

update public.subscriptions
set plan = 'starter'
where plan is null or plan not in ('starter', 'growth');

alter table public.subscriptions
alter column plan set default 'starter';

alter table public.subscriptions
alter column plan set not null;

alter table public.subscriptions
drop constraint if exists subscriptions_plan_check;

alter table public.subscriptions
add constraint subscriptions_plan_check
check (plan in ('starter', 'growth'));

alter table public.subscriptions
alter column status set default 'incomplete';

alter table public.subscriptions
alter column trial_ends_at drop default;

alter table public.subscriptions
add column if not exists stripe_staff_addon_item_id text null;

alter table public.subscriptions
add column if not exists staff_addon_quantity integer;

update public.subscriptions
set staff_addon_quantity = 0
where staff_addon_quantity is null;

alter table public.subscriptions
alter column staff_addon_quantity set default 0;

alter table public.subscriptions
alter column staff_addon_quantity set not null;

alter table public.subscriptions
drop constraint if exists subscriptions_staff_addon_quantity_check;

alter table public.subscriptions
add constraint subscriptions_staff_addon_quantity_check
check (staff_addon_quantity >= 0);

create unique index if not exists subscriptions_stripe_customer_unique_idx
on public.subscriptions (stripe_customer_id)
where stripe_customer_id is not null;

create unique index if not exists subscriptions_stripe_subscription_unique_idx
on public.subscriptions (stripe_subscription_id)
where stripe_subscription_id is not null;

create table if not exists public.customer_account_settings (
  organization_id uuid primary key references public.organizations(id) on delete cascade,
  account_status text not null default 'active' check (account_status in ('active', 'disabled')),
  disabled_reason text null,
  feature_access jsonb not null default '{"aiReceptionist": false}'::jsonb,
  internal_notes text not null default '',
  support_priority text not null default 'standard' check (
    support_priority in ('standard', 'priority', 'watch')
  ),
  updated_at timestamptz not null default now(),
  check (jsonb_typeof(feature_access) = 'object')
);

alter table public.customer_account_settings
alter column feature_access
set default '{"aiReceptionist": false}'::jsonb;

insert into public.customer_account_settings (organization_id)
select id from public.organizations
on conflict (organization_id) do nothing;

create table if not exists public.ai_receptionist_settings (
  organization_id uuid primary key default public.current_organization_id()
    references public.organizations(id) on delete cascade,
  enabled boolean not null default false,
  business_name text not null default '',
  greeting_message text not null default 'Hello, thanks for calling {{business_name}}. I can take your details and ask someone to get back to you.',
  fallback_phone_number text not null default '',
  notification_email text not null default '',
  telephony_provider text not null default 'telnyx',
  telnyx_api_key text not null default '',
  telnyx_connection_id text not null default '',
  telnyx_messaging_profile_id text not null default '',
  telnyx_public_key text not null default '',
  telnyx_phone_number text not null default '',
  phone_setup_mode text not null default 'new_number',
  existing_business_phone_number text not null default '',
  telnyx_phone_number_id text not null default '',
  telnyx_number_order_id text not null default '',
  telnyx_provisioning_status text not null default 'not_configured',
  telnyx_provisioning_reference text not null default '',
  telnyx_provisioning_error text not null default '',
  twilio_account_sid text not null default '',
  twilio_auth_token text not null default '',
  twilio_phone_number text not null default '',
  realtime_enabled boolean not null default false,
  voice_accent text not null default 'scottish',
  custom_conversation_enabled boolean not null default false,
  conversation_instructions text not null default '',
  transfer_to_number text not null default '',
  new_lead_sms_enabled boolean not null default false,
  new_lead_sms_phone_number text not null default '',
  business_hours_enabled boolean not null default false,
  business_hours jsonb not null default '{
    "monday": { "enabled": true, "start": "08:00", "end": "17:00" },
    "tuesday": { "enabled": true, "start": "08:00", "end": "17:00" },
    "wednesday": { "enabled": true, "start": "08:00", "end": "17:00" },
    "thursday": { "enabled": true, "start": "08:00", "end": "17:00" },
    "friday": { "enabled": true, "start": "08:00", "end": "17:00" },
    "saturday": { "enabled": false, "start": "09:00", "end": "13:00" },
    "sunday": { "enabled": false, "start": "09:00", "end": "13:00" }
  }'::jsonb,
  questions_to_ask jsonb not null default '[
    "Can I take your name?",
    "What is the best phone number to reach you on?",
    "What service do you need?",
    "What is the property address?",
    "Can you briefly describe the job?"
  ]'::jsonb,
  emergency_keywords jsonb not null default '[
    "urgent",
    "emergency",
    "today",
    "as soon as possible"
  ]'::jsonb,
  consent_message text not null default 'This call may be recorded and transcribed to help us handle your enquiry.',
  lead_source_label text not null default 'AI Receptionist',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (char_length(greeting_message) <= 1000),
  check (char_length(consent_message) <= 1000),
  check (char_length(conversation_instructions) <= 8000),
  check (jsonb_typeof(business_hours) = 'object'),
  check (jsonb_typeof(questions_to_ask) = 'array'),
  check (jsonb_typeof(emergency_keywords) = 'array'),
  check (telephony_provider in ('telnyx', 'twilio')),
  check (voice_accent in ('scottish', 'british', 'neutral')),
  check (phone_setup_mode in ('new_number', 'call_forwarding')),
  check (
    telnyx_provisioning_status in (
      'not_configured',
      'ordering',
      'pending',
      'action_required',
      'active',
      'failed'
    )
  )
);

alter table public.ai_receptionist_settings
  add column if not exists enabled boolean not null default false,
  add column if not exists business_name text not null default '',
  add column if not exists greeting_message text not null default 'Hello, thanks for calling {{business_name}}. I can take your details and ask someone to get back to you.',
  add column if not exists fallback_phone_number text not null default '',
  add column if not exists notification_email text not null default '',
  add column if not exists telephony_provider text not null default 'telnyx',
  add column if not exists telnyx_api_key text not null default '',
  add column if not exists telnyx_connection_id text not null default '',
  add column if not exists telnyx_messaging_profile_id text not null default '',
  add column if not exists telnyx_public_key text not null default '',
  add column if not exists telnyx_phone_number text not null default '',
  add column if not exists phone_setup_mode text not null default 'new_number',
  add column if not exists existing_business_phone_number text not null default '',
  add column if not exists telnyx_phone_number_id text not null default '',
  add column if not exists telnyx_number_order_id text not null default '',
  add column if not exists telnyx_provisioning_status text not null default 'not_configured',
  add column if not exists telnyx_provisioning_reference text not null default '',
  add column if not exists telnyx_provisioning_error text not null default '',
  add column if not exists twilio_account_sid text not null default '',
  add column if not exists twilio_auth_token text not null default '',
  add column if not exists twilio_phone_number text not null default '',
  add column if not exists realtime_enabled boolean not null default false,
  add column if not exists voice_accent text not null default 'scottish',
  add column if not exists custom_conversation_enabled boolean not null default false,
  add column if not exists conversation_instructions text not null default '',
  add column if not exists transfer_to_number text not null default '',
  add column if not exists new_lead_sms_enabled boolean not null default false,
  add column if not exists new_lead_sms_phone_number text not null default '',
  add column if not exists business_hours_enabled boolean not null default false,
  add column if not exists business_hours jsonb not null default '{}'::jsonb,
  add column if not exists questions_to_ask jsonb not null default '[]'::jsonb,
  add column if not exists emergency_keywords jsonb not null default '[]'::jsonb,
  add column if not exists consent_message text not null default 'This call may be recorded and transcribed to help us handle your enquiry.',
  add column if not exists lead_source_label text not null default 'AI Receptionist',
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

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
  primary_cta_label text not null default 'Sign up',
  primary_cta_href text not null default '/signup',
  sort_order integer not null default 0,
  is_published boolean not null default true,
  updated_at timestamptz not null default now(),
  check (jsonb_typeof(highlights) = 'array')
);

insert into public.site_pages (
  slug,
  nav_label,
  eyebrow,
  title,
  summary,
  body,
  highlights,
  primary_cta_label,
  primary_cta_href,
  sort_order,
  is_published
)
values
  (
    'features',
    'Features',
    'Complete operating system',
    'Everything a maintenance business needs to run the week.',
    'RoundHQ replaces scattered spreadsheets, notes, diaries, route lists, quote documents, invoice trackers, and payment chasing with one focused workspace for garden and property maintenance teams.',
    'Start with your customer records: names, addresses, access notes, service prices, documents, visit history, and the small details that keep work moving smoothly.

Plan recurring rounds by week, day, rotation and customer type. See who is due, log completed or missed visits, keep the route visible on a map, and give staff the right level of access.

When work changes, RoundHQ keeps the admin close to the job: capture leads, create quotes, convert accepted quotes into scheduled work, send invoices, record payments, and understand what is still owed.',
    jsonb_build_array(
      'CRM, leads, quotes, invoices, payments, rounds, route map, and visit history',
      'Built for weekly, fortnightly, monthly, residential, and commercial maintenance work',
      'Growth tools include staff permissions, RAMS, advanced insights, and customer profitability'
    ),
    'Sign up',
    '/signup',
    10,
    true
  ),
  (
    'pricing',
    'Pricing',
    'Simple launch pricing',
    'Choose the plan that matches how your team works.',
    'Start with a 30-day free trial. Starter is GBP 30 per business / month for solo operators getting organised. Growth is GBP 60 per business / month for teams that need staff permissions, RAMS, commercial workflows, and deeper reporting.',
    'Starter gives a solo operator the core workspace: leads, customer CRM, scheduling, recurring rounds, route map, quotes, invoices, payment tracking, visit history, notes, one staff account, up to 250 customers, and the main dashboard.

Growth is built for businesses adding people and complexity. It includes everything in Starter plus up to 5 staff accounts, staff permissions, RAMS generator, advanced dashboard insights, customer profitability, workflow tracking, commercial customer tools, quote conversion workflows, operational reporting, and up to 1,500 customers.

Every new workspace starts with a 30-day free trial. There are no setup fees, and you can change plan as the business grows.',
    jsonb_build_array(
      'Starter: GBP 30 per business / month for solo operators',
      'Growth: GBP 60 per business / month for teams and commercial work',
      '30-day free trial, no setup fees, cancel anytime'
    ),
    'Choose a plan',
    '/signup',
    20,
    true
  ),
  (
    'about',
    'About',
    'Built for maintenance teams',
    'RoundHQ is for practical businesses that need less admin drag.',
    'RoundHQ is built around the real rhythm of garden maintenance, lawn care, property maintenance, and field service work: repeat visits, changing routes, customer details, quotes, invoices, payments, staff, and the daily pressure to stay organised.',
    'Most maintenance businesses grow from repeat customers, trusted local work, and a lot of moving parts. The problem is that the admin often grows faster than the systems: spreadsheets for customers, paper for rounds, separate quote and invoice files, messages for staff, and memory for the tiny details.

RoundHQ gives that work a proper operating base. Owners can see what is due, staff know where they need to be, customer records stay clean, and the business gets a clearer view of cashflow, workload, and service history.

The goal is simple: fewer missed details, calmer scheduling, faster admin, better visibility, and more control over the business without forcing teams into heavy generic software.',
    jsonb_build_array(
      'Designed around rounds, visits, quotes, invoices, payments, and field teams',
      'Built for owners who want visibility without adding unnecessary admin',
      'Focused on practical maintenance workflows rather than generic CRM complexity'
    ),
    'See the features',
    '/features',
    30,
    true
  ),
  (
    'resources',
    'Resources',
    'Guides and updates',
    'Helpful resources for growing maintenance teams.',
    'Find practical guidance, product updates, and workflow ideas for running a more organised maintenance business.',
    'This resources area is ready for guides, support articles, product updates, and practical templates as RoundHQ grows.

Use it to explain how to get the most from scheduling, customer management, quoting, invoicing, payments, and staff access.',
    jsonb_build_array(
      'Product updates and new feature notes',
      'Guides for scheduling, quoting, invoices, and payments',
      'Operational templates for garden and property maintenance teams'
    ),
    'Contact RoundHQ',
    '/contact',
    40,
    true
  ),
  (
    'contact',
    'Contact',
    'Talk to RoundHQ',
    'Questions, setup help, billing, or support.',
    'Use the right route for the quickest answer: public product questions, workspace support, billing help, or setup guidance for moving your maintenance business into RoundHQ.',
    'If you are looking at RoundHQ for the first time, contact us with the size of your team, the type of maintenance work you do, and what you currently use for scheduling, quotes, invoices, and payment tracking.

If you already have a RoundHQ workspace, the best place to get help is the support area inside your account. That keeps your ticket, replies, and files attached to your workspace so the conversation is easy to follow.

For billing questions, workspace setup, or product feedback, include the email address used for your RoundHQ account and any useful screenshots or files.',
    jsonb_build_array(
      'Product enquiries: mail@roundhq.co.uk',
      'Workspace support: use the in-app helpdesk from your account',
      'Billing or setup help: include your RoundHQ workspace email'
    ),
    'Sign up',
    '/signup',
    50,
    true
  )
on conflict (slug) do update set
  nav_label = excluded.nav_label,
  eyebrow = excluded.eyebrow,
  title = excluded.title,
  summary = excluded.summary,
  body = excluded.body,
  highlights = excluded.highlights,
  primary_cta_label = excluded.primary_cta_label,
  primary_cta_href = excluded.primary_cta_href,
  sort_order = excluded.sort_order,
  is_published = excluded.is_published,
  updated_at = now();

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

create or replace function public.current_organization_id()
returns uuid
as 'select organization_id from public.organization_members where user_id = auth.uid() and status = ''active'' order by case role when ''owner'' then 1 when ''admin'' then 2 else 3 end, created_at asc limit 1'
language sql
stable
security definer
set search_path = public;

create or replace function public.is_organization_member(target_organization_id uuid)
returns boolean
as 'select exists (select 1 from public.organization_members where organization_id = target_organization_id and user_id = auth.uid() and status = ''active'')'
language sql
stable
security definer
set search_path = public;

create or replace function public.is_organization_admin(target_organization_id uuid)
returns boolean
as 'select exists (select 1 from public.organization_members where organization_id = target_organization_id and user_id = auth.uid() and status = ''active'' and role in (''owner'', ''admin''))'
language sql
stable
security definer
set search_path = public;

create table if not exists public.app_state (
  organization_id uuid not null default public.current_organization_id()
    references public.organizations(id) on delete cascade,
  id text not null default 'primary',
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (organization_id, id)
);

create table if not exists public.staff_members (
  id bigint generated by default as identity primary key,
  organization_id uuid not null default public.current_organization_id()
    references public.organizations(id) on delete cascade,
  auth_user_id uuid null references auth.users(id) on delete set null,
  email text not null,
  full_name text not null,
  role text not null check (role in ('Admin', 'Manager', 'Staff', 'Operator')),
  is_active boolean not null default true,
  phone text null,
  notes text null,
  is_system_admin boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists staff_members_org_email_unique_idx
on public.staff_members (organization_id, lower(email));

create unique index if not exists staff_members_org_auth_user_id_unique_idx
on public.staff_members (organization_id, auth_user_id)
where auth_user_id is not null;

create table if not exists public.staff_account_invites (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  staff_member_id bigint not null references public.staff_members(id) on delete cascade,
  email text not null,
  token_hash text not null unique,
  mode text not null default 'setup' check (mode in ('setup', 'owner_password')),
  created_by_user_id uuid null references auth.users(id) on delete set null,
  accepted_by_user_id uuid null references auth.users(id) on delete set null,
  expires_at timestamptz not null,
  accepted_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists staff_account_invites_org_staff_idx
on public.staff_account_invites (organization_id, staff_member_id, created_at desc);

create index if not exists staff_account_invites_pending_token_idx
on public.staff_account_invites (token_hash)
where accepted_at is null;

create or replace function public.current_staff_member_id(target_organization_id uuid)
returns bigint
as 'select staff_members.id from public.staff_members where staff_members.organization_id = target_organization_id and staff_members.is_active = true and (staff_members.auth_user_id = auth.uid() or lower(staff_members.email) = lower(coalesce(auth.jwt() ->> ''email'', ''''))) order by staff_members.is_system_admin desc, staff_members.id asc limit 1'
language sql
stable
security definer
set search_path = public;

create or replace function public.current_staff_role(target_organization_id uuid)
returns text
as 'select case when staff_members.is_system_admin then ''Admin'' when staff_members.role = ''Operator'' then ''Manager'' else staff_members.role end from public.staff_members where staff_members.organization_id = target_organization_id and staff_members.is_active = true and (staff_members.auth_user_id = auth.uid() or lower(staff_members.email) = lower(coalesce(auth.jwt() ->> ''email'', ''''))) order by staff_members.is_system_admin desc, staff_members.id asc limit 1'
language sql
stable
security definer
set search_path = public;

create or replace function public.can_access_operational_data(target_organization_id uuid)
returns boolean
as 'select public.is_organization_admin(target_organization_id) or exists (
  select 1
  from public.staff_members
  join public.role_permissions
    on role_permissions.organization_id = target_organization_id
   and role_permissions.role = case
     when staff_members.is_system_admin then ''Admin''
     when staff_members.role = ''Operator'' then ''Manager''
     else staff_members.role
   end
   and role_permissions.allowed = true
   and role_permissions.page_key not in (''technician'', ''staff'', ''settings'')
  where staff_members.organization_id = target_organization_id
    and staff_members.is_active = true
    and (
      staff_members.auth_user_id = auth.uid()
      or lower(staff_members.email) = lower(coalesce(auth.jwt() ->> ''email'', ''''))
    )
)'
language sql
stable
security definer
set search_path = public;

create table if not exists public.role_permissions (
  organization_id uuid not null default public.current_organization_id()
    references public.organizations(id) on delete cascade,
  role text not null check (role in ('Admin', 'Manager', 'Staff', 'Operator')),
  page_key text not null check (
    page_key in (
      'technician',
      'dashboard',
      'schedule',
      'rounds',
      'history',
      'map',
      'actions',
      'commercial',
      'commercialDocs',
      'customers',
      'expenses',
      'quotes',
      'invoices',
      'staff',
      'settings'
    )
  ),
  allowed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (organization_id, role, page_key)
);

alter table public.role_permissions
drop constraint if exists role_permissions_page_key_check;

alter table public.staff_members
drop constraint if exists staff_members_role_check;

alter table public.staff_members
add constraint staff_members_role_check
check (role in ('Admin', 'Manager', 'Staff', 'Operator'));

alter table public.role_permissions
drop constraint if exists role_permissions_role_check;

alter table public.role_permissions
add constraint role_permissions_role_check
check (role in ('Admin', 'Manager', 'Staff', 'Operator'));

alter table public.role_permissions
add constraint role_permissions_page_key_check
check (
  page_key in (
    'technician',
    'dashboard',
    'schedule',
    'rounds',
    'history',
    'map',
    'actions',
    'commercial',
    'commercialDocs',
    'customers',
    'expenses',
    'quotes',
    'invoices',
    'staff',
    'settings'
  )
);

create table if not exists public.customers (
  id bigint generated by default as identity primary key,
  organization_id uuid not null default public.current_organization_id()
    references public.organizations(id) on delete cascade,
  name text not null,
  address text not null,
  postcode text null,
  town text null,
  phone text null,
  email text null,
  contact_emails jsonb not null default '[]'::jsonb,
  is_grass_cutting_customer boolean not null default true,
  grass_cut_areas jsonb not null default '["All"]'::jsonb,
  week integer not null default 1 check (week in (1, 2, 3, 4)),
  day text null check (
    day is null or day in ('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday')
  ),
  customer_type text not null default 'Residential' check (
    customer_type in ('Residential', 'Commercial')
  ),
  cut_frequency text not null default 'Fortnightly' check (
    cut_frequency in ('Weekly', 'Fortnightly', '3 Weekly', 'Monthly')
  ),
  rotation_weeks_override integer null check (
    rotation_weeks_override is null or rotation_weeks_override in (1, 2, 3, 4)
  ),
  site_name text null,
  site_address text null,
  site_town text null,
  site_postcode text null,
  payment_method text null check (
    payment_method is null or payment_method in ('Monthly', 'On Day Transfer', 'Cash')
  ),
  access_notes text null,
  notes text null,
  assigned_staff_id bigint null references public.staff_members(id) on delete set null,
  route_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  price numeric(10, 2) not null default 0,
  lat double precision null,
  lng double precision null,
  check (jsonb_typeof(contact_emails) = 'array'),
  check (jsonb_typeof(grass_cut_areas) = 'array')
);

alter table public.customers
add column if not exists rotation_weeks_override integer null;

alter table public.customers
drop constraint if exists customers_week_check;

alter table public.customers
add constraint customers_week_check
check (week in (1, 2, 3, 4));

alter table public.customers
drop constraint if exists customers_day_check;

alter table public.customers
add constraint customers_day_check
check (
  day is null or day in ('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday')
);

alter table public.customers
drop constraint if exists customers_cut_frequency_check;

alter table public.customers
add constraint customers_cut_frequency_check
check (cut_frequency in ('Weekly', 'Fortnightly', '3 Weekly', 'Monthly'));

alter table public.customers
drop constraint if exists customers_rotation_weeks_override_check;

alter table public.customers
add constraint customers_rotation_weeks_override_check
check (rotation_weeks_override is null or rotation_weeks_override in (1, 2, 3, 4));

update public.customers as customers
set rotation_weeks_override =
  case
    when
      case
        when customers.cut_frequency = 'Weekly' then 1
        when customers.cut_frequency = '3 Weekly' then 3
        when customers.cut_frequency = 'Monthly' then 4
        else 2
      end = coalesce(organizations.default_rotation_weeks, 2)
    then null
    else
      case
        when customers.cut_frequency = 'Weekly' then 1
        when customers.cut_frequency = '3 Weekly' then 3
        when customers.cut_frequency = 'Monthly' then 4
        else 2
      end
  end
from public.organizations as organizations
where customers.organization_id = organizations.id
  and customers.rotation_weeks_override is null;

update public.customers as customers
set week = least(
  customers.week,
  coalesce(customers.rotation_weeks_override, organizations.default_rotation_weeks, 2)
)
from public.organizations as organizations
where customers.organization_id = organizations.id
  and customers.week > coalesce(
    customers.rotation_weeks_override,
    organizations.default_rotation_weeks,
    2
  );

create or replace function public.validate_customer_rotation()
returns trigger
as '
declare
  effective_rotation_weeks integer;
begin
  if new.rotation_weeks_override is not null
    and new.rotation_weeks_override not in (1, 2, 3, 4) then
    raise exception ''rotationWeeksOverride must be null or one of 1, 2, 3, 4'';
  end if;

  select coalesce(new.rotation_weeks_override, organizations.default_rotation_weeks, 2)
  into effective_rotation_weeks
  from public.organizations as organizations
  where organizations.id = new.organization_id;

  effective_rotation_weeks := coalesce(
    effective_rotation_weeks,
    coalesce(new.rotation_weeks_override, 2)
  );

  if new.week > effective_rotation_weeks then
    raise exception ''customer cycle week cannot exceed effective rotation length'';
  end if;

  return new;
end'
language plpgsql
security definer
set search_path = public;

drop trigger if exists validate_customer_rotation_trigger on public.customers;
create trigger validate_customer_rotation_trigger
before insert or update of organization_id, week, rotation_weeks_override
on public.customers
for each row
execute function public.validate_customer_rotation();

create index if not exists customers_org_name_idx
on public.customers (organization_id, name);

create index if not exists customers_org_round_idx
on public.customers (organization_id, week, day, customer_type, route_order);

create index if not exists customers_org_assigned_staff_id_idx
on public.customers (organization_id, assigned_staff_id);

create table if not exists public.visits (
  id bigint generated by default as identity primary key,
  organization_id uuid not null default public.current_organization_id()
    references public.organizations(id) on delete cascade,
  customer_id bigint not null references public.customers(id) on delete cascade,
  visit_date date not null,
  week integer null check (week is null or week in (1, 2, 3, 4)),
  day text null check (
    day is null or day in ('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday')
  ),
  status text not null check (status in ('completed', 'not_cut')),
  notes text null,
  payment_status text not null default 'Not Paid' check (payment_status in ('Paid', 'Not Paid')),
  paid_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  reason text null,
  round_key text null,
  customer_type text null check (
    customer_type is null or customer_type in ('Residential', 'Commercial')
  ),
  price_at_visit numeric(10, 2) null
);

alter table public.visits
  drop constraint if exists visits_reason_check;

alter table public.visits
drop constraint if exists visits_week_check;

alter table public.visits
add constraint visits_week_check
check (week is null or week in (1, 2, 3, 4));

alter table public.visits
drop constraint if exists visits_day_check;

alter table public.visits
add constraint visits_day_check
check (
  day is null or day in ('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday')
);

create index if not exists visits_org_date_idx
on public.visits (organization_id, visit_date desc);

create index if not exists visits_org_customer_idx
on public.visits (organization_id, customer_id);

create index if not exists visits_org_round_key_idx
on public.visits (organization_id, round_key);

create table if not exists public.customer_leads (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null default public.current_organization_id()
    references public.organizations(id) on delete cascade,
  source text not null default 'website' check (
    source in ('website', 'email', 'facebook', 'whatsapp', 'ai_receptionist', 'manual')
  ),
  status text not null default 'new' check (
    status in ('new', 'reviewing', 'replied', 'converted', 'archived')
  ),
  name text null,
  email text null,
  phone text null,
  address text null,
  town text null,
  postcode text null,
  customer_type text null check (
    customer_type is null or customer_type in ('Residential', 'Commercial')
  ),
  service text null,
  preferred_contact text null check (
    preferred_contact is null or preferred_contact in ('email', 'text', 'phone')
  ),
  message text not null default '',
  notes text null,
  extracted_data jsonb not null default '{}'::jsonb,
  raw_payload jsonb not null default '{}'::jsonb,
  reply_history jsonb not null default '[]'::jsonb,
  activity_history jsonb not null default '[]'::jsonb,
  submitted_at timestamptz not null default now(),
  converted_customer_id bigint null references public.customers(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (jsonb_typeof(extracted_data) = 'object'),
  check (jsonb_typeof(raw_payload) = 'object'),
  check (jsonb_typeof(reply_history) = 'array'),
  check (jsonb_typeof(activity_history) = 'array')
);

alter table public.customer_leads
drop constraint if exists customer_leads_source_check;

alter table public.customer_leads
add constraint customer_leads_source_check
check (source in ('website', 'email', 'facebook', 'whatsapp', 'ai_receptionist', 'manual'));

create index if not exists customer_leads_org_status_idx
on public.customer_leads (organization_id, status);

create index if not exists customer_leads_org_submitted_at_idx
on public.customer_leads (organization_id, submitted_at desc);

create table if not exists public.ai_receptionist_call_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  provider text not null default 'twilio',
  provider_event_id text null,
  call_sid text not null,
  account_sid text null,
  caller_number text null,
  twilio_phone_number text null,
  call_type text not null default 'voicemail',
  session_id text null,
  recording_url text null,
  duration_seconds integer null check (duration_seconds is null or duration_seconds >= 0),
  transcript text null,
  transcript_entries jsonb not null default '[]'::jsonb,
  structured_data jsonb not null default '{}'::jsonb,
  ai_summaries jsonb not null default '{}'::jsonb,
  lead_id uuid null references public.customer_leads(id) on delete set null,
  call_status text null,
  outcome text null,
  priority text not null default 'normal',
  emergency_detected boolean not null default false,
  emergency_keywords jsonb not null default '[]'::jsonb,
  answered_at timestamptz null,
  ended_at timestamptz null,
  drop_off boolean not null default false,
  escalated boolean not null default false,
  ai_success boolean not null default false,
  notification_status text null,
  notification_error text null,
  raw_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, call_sid),
  check (btrim(call_sid) <> ''),
  check (provider in ('telnyx', 'twilio')),
  check (call_type in ('voicemail', 'realtime')),
  check (priority in ('normal', 'high')),
  check (jsonb_typeof(transcript_entries) = 'array'),
  check (jsonb_typeof(structured_data) = 'object'),
  check (jsonb_typeof(ai_summaries) = 'object'),
  check (jsonb_typeof(emergency_keywords) = 'array'),
  check (jsonb_typeof(raw_payload) = 'object')
);

alter table public.ai_receptionist_call_logs
  add column if not exists provider text not null default 'twilio',
  add column if not exists provider_event_id text null,
  add column if not exists account_sid text null,
  add column if not exists caller_number text null,
  add column if not exists twilio_phone_number text null,
  add column if not exists call_type text not null default 'voicemail',
  add column if not exists session_id text null,
  add column if not exists recording_url text null,
  add column if not exists duration_seconds integer null,
  add column if not exists transcript text null,
  add column if not exists transcript_entries jsonb not null default '[]'::jsonb,
  add column if not exists structured_data jsonb not null default '{}'::jsonb,
  add column if not exists ai_summaries jsonb not null default '{}'::jsonb,
  add column if not exists lead_id uuid null references public.customer_leads(id) on delete set null,
  add column if not exists call_status text null,
  add column if not exists outcome text null,
  add column if not exists priority text not null default 'normal',
  add column if not exists emergency_detected boolean not null default false,
  add column if not exists emergency_keywords jsonb not null default '[]'::jsonb,
  add column if not exists answered_at timestamptz null,
  add column if not exists ended_at timestamptz null,
  add column if not exists drop_off boolean not null default false,
  add column if not exists escalated boolean not null default false,
  add column if not exists ai_success boolean not null default false,
  add column if not exists notification_status text null,
  add column if not exists notification_error text null,
  add column if not exists raw_payload jsonb not null default '{}'::jsonb,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

create index if not exists ai_receptionist_settings_twilio_account_sid_idx
on public.ai_receptionist_settings (twilio_account_sid)
where btrim(twilio_account_sid) <> '';

create index if not exists ai_receptionist_settings_twilio_phone_number_idx
on public.ai_receptionist_settings (twilio_phone_number)
where btrim(twilio_phone_number) <> '';

create index if not exists ai_receptionist_settings_telnyx_phone_number_idx
on public.ai_receptionist_settings (telnyx_phone_number)
where btrim(telnyx_phone_number) <> '';

create unique index if not exists ai_receptionist_settings_telnyx_phone_number_unique_idx
on public.ai_receptionist_settings (
  (regexp_replace(telnyx_phone_number, '[^0-9+]', '', 'g'))
)
where btrim(telnyx_phone_number) <> '';

create unique index if not exists ai_receptionist_settings_provisioning_reference_unique_idx
on public.ai_receptionist_settings (telnyx_provisioning_reference)
where btrim(telnyx_provisioning_reference) <> '';

create unique index if not exists ai_receptionist_settings_telnyx_number_order_unique_idx
on public.ai_receptionist_settings (telnyx_number_order_id)
where btrim(telnyx_number_order_id) <> '';

create unique index if not exists ai_receptionist_settings_twilio_phone_number_unique_idx
on public.ai_receptionist_settings (
  (regexp_replace(twilio_phone_number, '[^0-9+]', '', 'g'))
)
where btrim(twilio_phone_number) <> '';

create index if not exists ai_receptionist_call_logs_org_created_at_idx
on public.ai_receptionist_call_logs (organization_id, created_at desc);

create index if not exists ai_receptionist_call_logs_org_provider_event_idx
on public.ai_receptionist_call_logs (organization_id, provider, provider_event_id)
where provider_event_id is not null;

create index if not exists ai_receptionist_call_logs_org_lead_id_idx
on public.ai_receptionist_call_logs (organization_id, lead_id);

create index if not exists ai_receptionist_call_logs_org_outcome_idx
on public.ai_receptionist_call_logs (organization_id, outcome);

create index if not exists ai_receptionist_call_logs_org_emergency_idx
on public.ai_receptionist_call_logs (organization_id, emergency_detected)
where emergency_detected = true;

create table if not exists public.monthly_payments (
  id bigint generated by default as identity primary key,
  organization_id uuid not null default public.current_organization_id()
    references public.organizations(id) on delete cascade,
  customer_id bigint not null references public.customers(id) on delete cascade,
  payment_month date not null,
  payment_date date null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint monthly_payments_month_start_check
    check (payment_month = date_trunc('month', payment_month)::date),
  constraint monthly_payments_customer_month_unique
    unique (customer_id, payment_month)
);

create index if not exists monthly_payments_org_month_idx
on public.monthly_payments (organization_id, payment_month asc);

create table if not exists public.statement_imports (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null default public.current_organization_id()
    references public.organizations(id) on delete cascade,
  file_name text not null,
  file_type text not null default 'csv',
  row_count integer not null default 0,
  imported_count integer not null default 0,
  skipped_count integer not null default 0,
  matched_count integer not null default 0,
  manual_matched_count integer not null default 0,
  ignored_count integer not null default 0,
  total_amount numeric(12, 2) not null default 0,
  status text not null default 'reviewing' check (
    status in ('reviewing', 'imported', 'partially_imported', 'undone')
  ),
  imported_by uuid null references auth.users(id) on delete set null,
  undone_at timestamptz null,
  undone_by uuid null references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists statement_imports_org_created_idx
on public.statement_imports (organization_id, created_at desc);

create table if not exists public.statement_import_rows (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null default public.current_organization_id()
    references public.organizations(id) on delete cascade,
  statement_import_id uuid not null references public.statement_imports(id) on delete cascade,
  transaction_date date not null,
  description text not null default '',
  customer_name_from_statement text null,
  amount numeric(12, 2) not null default 0,
  suggested_customer_id bigint null references public.customers(id) on delete set null,
  selected_customer_id bigint null references public.customers(id) on delete set null,
  selected_visit_ids jsonb not null default '[]'::jsonb,
  selected_invoice_ids jsonb not null default '[]'::jsonb,
  allocations jsonb not null default '[]'::jsonb,
  match_confidence integer not null default 0,
  match_reason text not null default '',
  match_status text not null default 'no_match' check (
    match_status in ('matched', 'possible_match', 'needs_review', 'no_match', 'already_imported', 'ignored')
  ),
  status text not null default 'no_match' check (
    status in ('matched', 'possible_match', 'needs_review', 'no_match', 'already_imported', 'ignored', 'confirmed', 'imported', 'undone')
  ),
  duplicate_of_payment_id text null,
  created_payment_id text null,
  raw_row jsonb not null default '{}'::jsonb,
  transaction_fingerprint text not null,
  created_at timestamptz not null default now(),
  check (jsonb_typeof(selected_visit_ids) = 'array'),
  check (jsonb_typeof(selected_invoice_ids) = 'array'),
  check (jsonb_typeof(allocations) = 'array'),
  check (jsonb_typeof(raw_row) = 'object')
);

create index if not exists statement_import_rows_org_import_idx
on public.statement_import_rows (organization_id, statement_import_id);

create index if not exists statement_import_rows_org_customer_idx
on public.statement_import_rows (organization_id, selected_customer_id, transaction_date desc);

create unique index if not exists statement_import_rows_org_fingerprint_active_unique_idx
on public.statement_import_rows (organization_id, transaction_fingerprint)
where status not in ('ignored', 'undone');

create table if not exists public.payment_matching_rules (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null default public.current_organization_id()
    references public.organizations(id) on delete cascade,
  customer_id bigint not null references public.customers(id) on delete cascade,
  match_type text not null check (
    match_type in (
      'description_contains',
      'customer_contains',
      'reference_contains',
      'address_contains',
      'postcode_contains',
      'amount_equals'
    )
  ),
  match_value text not null,
  confidence_weight integer not null default 90,
  created_by uuid null references auth.users(id) on delete set null,
  last_used_at timestamptz null,
  use_count integer not null default 0,
  is_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists payment_matching_rules_org_customer_idx
on public.payment_matching_rules (organization_id, customer_id);

create unique index if not exists payment_matching_rules_org_unique_idx
on public.payment_matching_rules (organization_id, customer_id, match_type, lower(match_value));

create table if not exists public.payment_ignore_rules (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null default public.current_organization_id()
    references public.organizations(id) on delete cascade,
  match_type text not null check (
    match_type in ('description_contains', 'customer_contains', 'amount_equals')
  ),
  match_value text not null,
  created_by uuid null references auth.users(id) on delete set null,
  is_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists payment_ignore_rules_org_unique_idx
on public.payment_ignore_rules (organization_id, match_type, lower(match_value));

create table if not exists public.customer_payment_fingerprints (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null default public.current_organization_id()
    references public.organizations(id) on delete cascade,
  customer_id bigint not null references public.customers(id) on delete cascade,
  typical_amount numeric(12, 2) null,
  typical_reference text null,
  typical_payment_delay_days integer null,
  usually_pays_multiple_visits boolean null,
  last_seen_at timestamptz null,
  confidence_score integer not null default 60,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists customer_payment_fingerprints_org_customer_idx
on public.customer_payment_fingerprints (organization_id, customer_id, last_seen_at desc);

create table if not exists public.customer_credit_balances (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null default public.current_organization_id()
    references public.organizations(id) on delete cascade,
  customer_id bigint not null references public.customers(id) on delete cascade,
  amount numeric(12, 2) not null default 0,
  source_import_row_id uuid null references public.statement_import_rows(id) on delete set null,
  note text null,
  is_reversed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists customer_credit_balances_org_customer_idx
on public.customer_credit_balances (organization_id, customer_id, created_at desc);

create table if not exists public.payment_audit_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null default public.current_organization_id()
    references public.organizations(id) on delete cascade,
  statement_import_id uuid null references public.statement_imports(id) on delete set null,
  statement_import_row_id uuid null references public.statement_import_rows(id) on delete set null,
  customer_id bigint null references public.customers(id) on delete set null,
  event_type text not null check (
    event_type in (
      'import_created',
      'row_confirmed',
      'row_ignored',
      'manual_match',
      'payment_created',
      'credit_created',
      'import_undone'
    )
  ),
  summary text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid null references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  check (jsonb_typeof(metadata) = 'object')
);

create index if not exists payment_audit_events_org_import_idx
on public.payment_audit_events (organization_id, statement_import_id, created_at desc);

create table if not exists public.items (
  id text primary key,
  organization_id uuid not null default public.current_organization_id()
    references public.organizations(id) on delete cascade,
  title text not null,
  category text null,
  item_type text not null check (item_type in ('service', 'product')),
  price numeric(12, 2) not null default 0,
  buy_price numeric(12, 2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists items_org_unique_catalog_idx
on public.items (organization_id, lower(title), lower(coalesce(category, '')), item_type);

create index if not exists items_org_category_idx
on public.items (organization_id, category);

create table if not exists public.quotes (
  id text primary key,
  organization_id uuid not null default public.current_organization_id()
    references public.organizations(id) on delete cascade,
  quote_number text not null,
  customer_id bigint null references public.customers(id) on delete set null,
  customer_name text not null,
  customer_type text null,
  customer_address text null,
  customer_town text null,
  customer_postcode text null,
  site_name text null,
  site_address text null,
  site_town text null,
  site_postcode text null,
  date date not null,
  status text not null check (
    status in ('Draft', 'Approved', 'Sent', 'Accepted', 'Scheduled', 'Declined', 'Rejected')
  ),
  items jsonb not null default '[]'::jsonb,
  notes text null,
  total numeric(12, 2) not null default 0,
  work_type text null,
  estimated_duration_minutes integer null,
  auto_scheduling_preference text null default 'default',
  auto_scheduling_disabled boolean not null default false,
  service_round_scheduling_preference text null default 'default',
  auto_scheduled_job_id text null,
  scheduling_status text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (jsonb_typeof(items) = 'array')
);

create unique index if not exists quotes_org_quote_number_unique_idx
on public.quotes (organization_id, quote_number);

create index if not exists quotes_org_date_idx
on public.quotes (organization_id, date desc);

alter table if exists public.quotes
  add column if not exists work_type text null,
  add column if not exists estimated_duration_minutes integer null,
  add column if not exists auto_scheduling_preference text null default 'default',
  add column if not exists auto_scheduling_disabled boolean not null default false,
  add column if not exists service_round_scheduling_preference text null default 'default',
  add column if not exists auto_scheduled_job_id text null,
  add column if not exists scheduling_status text null;

create table if not exists public.invoices (
  id text primary key,
  organization_id uuid not null default public.current_organization_id()
    references public.organizations(id) on delete cascade,
  invoice_number text not null,
  customer_id bigint null references public.customers(id) on delete set null,
  customer_name text not null,
  customer_type text null,
  customer_address text null,
  customer_town text null,
  customer_postcode text null,
  site_name text null,
  site_address text null,
  site_town text null,
  site_postcode text null,
  date date not null,
  due_date date null,
  status text not null check (
    status in ('Draft', 'Approved', 'Sent', 'Accepted', 'Declined', 'Unpaid', 'Paid')
  ),
  items jsonb not null default '[]'::jsonb,
  notes text null,
  terms text null,
  vat_rate numeric(5, 2) null,
  vat_amount numeric(12, 2) null,
  total numeric(12, 2) not null default 0,
  linked_quote_id text null references public.quotes(id) on delete set null,
  stripe_checkout_session_id text null,
  stripe_payment_link_url text null,
  stripe_payment_status text null check (
    stripe_payment_status is null or stripe_payment_status in ('not_created', 'open', 'paid', 'expired')
  ),
  stripe_payment_intent_id text null,
  stripe_payment_completed_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (jsonb_typeof(items) = 'array')
);

create unique index if not exists invoices_org_invoice_number_unique_idx
on public.invoices (organization_id, invoice_number);

create index if not exists invoices_org_date_idx
on public.invoices (organization_id, date desc);

alter table if exists public.invoices
  add column if not exists stripe_checkout_session_id text null,
  add column if not exists stripe_payment_link_url text null,
  add column if not exists stripe_payment_status text null,
  add column if not exists stripe_payment_intent_id text null,
  add column if not exists stripe_payment_completed_at timestamptz null;

alter table if exists public.invoices
  drop constraint if exists invoices_stripe_payment_status_check;

alter table if exists public.invoices
  add constraint invoices_stripe_payment_status_check
  check (
    stripe_payment_status is null or stripe_payment_status in ('not_created', 'open', 'paid', 'expired')
  );

create index if not exists invoices_org_stripe_checkout_session_idx
on public.invoices (organization_id, stripe_checkout_session_id)
where stripe_checkout_session_id is not null;

create table if not exists public.recurring_invoice_templates (
  id text primary key,
  organization_id uuid not null default public.current_organization_id()
    references public.organizations(id) on delete cascade,
  source_invoice_id text null references public.invoices(id) on delete set null,
  customer_id bigint null references public.customers(id) on delete set null,
  customer_name text not null,
  customer_type text null,
  customer_address text null,
  customer_town text null,
  customer_postcode text null,
  site_name text null,
  site_address text null,
  site_town text null,
  site_postcode text null,
  status text not null check (
    status in ('Draft', 'Approved', 'Sent', 'Accepted', 'Declined', 'Unpaid', 'Paid')
  ),
  items jsonb not null default '[]'::jsonb,
  notes text null,
  terms text null,
  vat_rate numeric(5, 2) null,
  due_days_after_issue integer null check (due_days_after_issue is null or due_days_after_issue >= 0),
  linked_quote_id text null references public.quotes(id) on delete set null,
  frequency text not null check (frequency in ('Monthly', 'Quarterly', 'Yearly')),
  next_send_date date not null,
  next_due_date date null check (next_due_date is null or next_due_date >= next_send_date),
  preferred_send_method text null check (preferred_send_method is null or preferred_send_method in ('email', 'text')),
  send_to text null,
  is_active boolean not null default true,
  last_generated_date date null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (jsonb_typeof(items) = 'array')
);

create index if not exists recurring_invoice_templates_org_next_send_date_idx
on public.recurring_invoice_templates (organization_id, next_send_date asc);

alter table if exists public.recurring_invoice_templates
  add column if not exists next_due_date date null;

alter table if exists public.recurring_invoice_templates
  drop constraint if exists recurring_invoice_templates_next_due_date_check;

alter table if exists public.recurring_invoice_templates
  add constraint recurring_invoice_templates_next_due_date_check
  check (next_due_date is null or next_due_date >= next_send_date);

create table if not exists public.scheduled_jobs (
  id text primary key,
  organization_id uuid not null default public.current_organization_id()
    references public.organizations(id) on delete cascade,
  title text not null,
  date date not null,
  notes text null,
  start_time time null,
  finish_time time null,
  customer_id bigint null references public.customers(id) on delete set null,
  customer_name text null,
  type text not null check (type in ('One Off', 'Quote Accepted', 'Grass Cut', 'Commercial')),
  status text not null check (status in ('Scheduled', 'In Progress', 'Completed', 'Cancelled')),
  quote_ids jsonb not null default '[]'::jsonb,
  invoice_ids jsonb not null default '[]'::jsonb,
  source_quote_id text null references public.quotes(id) on delete set null,
  work_type text null,
  estimated_duration_minutes integer null,
  postcode text null,
  auto_scheduled boolean not null default false,
  auto_schedule_reason text null,
  auto_schedule_reason_label text null,
  assigned_staff_id bigint null references public.staff_members(id) on delete set null,
  assigned_staff_name text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (jsonb_typeof(quote_ids) = 'array'),
  check (jsonb_typeof(invoice_ids) = 'array')
);

create index if not exists scheduled_jobs_org_date_idx
on public.scheduled_jobs (organization_id, date asc);

alter table if exists public.scheduled_jobs
  add column if not exists source_quote_id text null references public.quotes(id) on delete set null,
  add column if not exists work_type text null,
  add column if not exists estimated_duration_minutes integer null,
  add column if not exists postcode text null,
  add column if not exists auto_scheduled boolean not null default false,
  add column if not exists auto_schedule_reason text null,
  add column if not exists auto_schedule_reason_label text null,
  add column if not exists assigned_staff_id bigint null references public.staff_members(id) on delete set null,
  add column if not exists assigned_staff_name text null;

create index if not exists scheduled_jobs_org_source_quote_id_idx
on public.scheduled_jobs (organization_id, source_quote_id);

create index if not exists scheduled_jobs_org_assigned_staff_id_idx
on public.scheduled_jobs (organization_id, assigned_staff_id);

create table if not exists public.scheduling_recommendations (
  id text primary key,
  organization_id uuid not null default public.current_organization_id()
    references public.organizations(id) on delete cascade,
  quote_id text not null references public.quotes(id) on delete cascade,
  quote_number text not null,
  customer_id bigint references public.customers(id) on delete set null,
  customer_name text not null,
  slot jsonb not null,
  reason text not null,
  reason_label text not null,
  work_type text null,
  estimated_duration_minutes integer not null,
  postcode text null,
  rejected_candidates jsonb not null default '[]'::jsonb,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'rejected')),
  created_at timestamptz not null default now(),
  decided_at timestamptz null,
  check (jsonb_typeof(slot) = 'object'),
  check (jsonb_typeof(rejected_candidates) = 'array')
);

create index if not exists scheduling_recommendations_org_quote_id_idx
on public.scheduling_recommendations (organization_id, quote_id);

create table if not exists public.scheduling_audit_logs (
  id text primary key,
  organization_id uuid not null default public.current_organization_id()
    references public.organizations(id) on delete cascade,
  quote_id text not null references public.quotes(id) on delete cascade,
  quote_number text not null,
  customer_id bigint references public.customers(id) on delete set null,
  customer_name text not null,
  chosen_date date null,
  start_time time null,
  finish_time time null,
  estimated_duration_minutes integer null,
  work_type text null,
  postcode text null,
  reason text not null,
  reason_label text not null,
  rejected_candidates jsonb not null default '[]'::jsonb,
  status text not null,
  customer_email_sent boolean not null default false,
  operator_email_sent boolean not null default false,
  customer_email_error text null,
  operator_email_error text null,
  created_at timestamptz not null default now(),
  check (jsonb_typeof(rejected_candidates) = 'array')
);

create index if not exists scheduling_audit_logs_org_quote_id_idx
on public.scheduling_audit_logs (organization_id, quote_id);

create table if not exists public.commercial_rams_documents (
  id text primary key,
  organization_id uuid not null default public.current_organization_id()
    references public.organizations(id) on delete cascade,
  customer_id bigint null references public.customers(id) on delete set null,
  customer_name text not null,
  customer_address text null,
  customer_town text null,
  customer_postcode text null,
  site_name text null,
  site_address text null,
  site_town text null,
  site_postcode text null,
  job_title text null,
  reference_number text null,
  revision text null,
  start_date date null,
  estimated_duration text null,
  prepared_by text null,
  work_type text not null check (
    work_type in (
      'Grounds Maintenance',
      'Hedge Trimming',
      'Pressure Washing',
      'Gutter Cleaning',
      'Grounds Maintenance',
      'Other'
    )
  ),
  operatives text null,
  site_supervisor text null,
  emergency_contact text null,
  custom_scope text null,
  public_access text not null check (public_access in ('Yes', 'No')),
  public_access_notes text null,
  working_at_height text not null check (working_at_height in ('Yes', 'No')),
  working_at_height_notes text null,
  chemicals text not null check (chemicals in ('Yes', 'No')),
  chemicals_notes text null,
  vehicle_movement text not null check (vehicle_movement in ('Yes', 'No')),
  vehicle_movement_notes text null,
  powered_machinery text not null check (powered_machinery in ('Yes', 'No')),
  powered_machinery_notes text null,
  services text not null check (services in ('Yes', 'No')),
  services_notes text null,
  method_notes text null,
  additional_hazards text null,
  site_contact text null,
  site_contact_number text null,
  nearest_hospital text null,
  emergency_procedure text null,
  client_approval_name text null,
  approval_role text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists commercial_rams_org_updated_at_idx
on public.commercial_rams_documents (organization_id, updated_at desc);

drop trigger if exists on_auth_user_created_roundhq on auth.users;
drop function if exists public.handle_roundhq_new_user() cascade;
drop function if exists public.seed_roundhq_organization(uuid) cascade;
drop function if exists public.touch_updated_at() cascade;

grant usage on schema public to anon, authenticated;
grant execute on function public.current_organization_id() to authenticated;
grant execute on function public.is_organization_member(uuid) to authenticated;
grant execute on function public.is_organization_admin(uuid) to authenticated;
grant select on public.site_pages to anon, authenticated;
grant select on public.blog_settings to anon, authenticated;
grant select on public.blog_categories to anon, authenticated;
grant select on public.blog_posts to anon, authenticated;
grant select on public.customer_account_settings to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;

alter table public.site_pages enable row level security;
alter table public.blog_settings enable row level security;
alter table public.blog_categories enable row level security;
alter table public.blog_posts enable row level security;
alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.subscriptions enable row level security;
alter table public.customer_account_settings enable row level security;
alter table public.ai_receptionist_settings enable row level security;
alter table public.app_state enable row level security;
alter table public.staff_members enable row level security;
alter table public.staff_account_invites enable row level security;
alter table public.role_permissions enable row level security;
alter table public.customers enable row level security;
alter table public.visits enable row level security;
alter table public.customer_leads enable row level security;
alter table public.ai_receptionist_call_logs enable row level security;
alter table public.monthly_payments enable row level security;
alter table public.statement_imports enable row level security;
alter table public.statement_import_rows enable row level security;
alter table public.payment_matching_rules enable row level security;
alter table public.payment_ignore_rules enable row level security;
alter table public.customer_payment_fingerprints enable row level security;
alter table public.customer_credit_balances enable row level security;
alter table public.payment_audit_events enable row level security;
alter table public.items enable row level security;
alter table public.quotes enable row level security;
alter table public.invoices enable row level security;
alter table public.recurring_invoice_templates enable row level security;
alter table public.scheduled_jobs enable row level security;
alter table public.scheduling_recommendations enable row level security;
alter table public.scheduling_audit_logs enable row level security;
alter table public.commercial_rams_documents enable row level security;

drop policy if exists "Published site pages are public" on public.site_pages;
create policy "Published site pages are public"
on public.site_pages
for select
to anon, authenticated
using (is_published);

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

drop policy if exists "Members can read customer account settings" on public.customer_account_settings;
create policy "Members can read customer account settings"
on public.customer_account_settings
for select
to authenticated
using (public.is_organization_member(organization_id));

drop policy if exists "Admins can read AI Receptionist settings" on public.ai_receptionist_settings;
create policy "Admins can read AI Receptionist settings"
on public.ai_receptionist_settings
for select
to authenticated
using (
  public.is_organization_admin(organization_id)
  or exists (
    select 1
    from public.staff_members
    where staff_members.organization_id = ai_receptionist_settings.organization_id
      and staff_members.auth_user_id = auth.uid()
      and staff_members.is_active = true
      and (
        staff_members.is_system_admin = true
        or staff_members.role = 'Admin'
      )
  )
);

drop policy if exists "Admins can write AI Receptionist settings" on public.ai_receptionist_settings;
create policy "Admins can write AI Receptionist settings"
on public.ai_receptionist_settings
for all
to authenticated
using (
  public.is_organization_admin(organization_id)
  or exists (
    select 1
    from public.staff_members
    where staff_members.organization_id = ai_receptionist_settings.organization_id
      and staff_members.auth_user_id = auth.uid()
      and staff_members.is_active = true
      and (
        staff_members.is_system_admin = true
        or staff_members.role = 'Admin'
      )
  )
)
with check (
  public.is_organization_admin(organization_id)
  or exists (
    select 1
    from public.staff_members
    where staff_members.organization_id = ai_receptionist_settings.organization_id
      and staff_members.auth_user_id = auth.uid()
      and staff_members.is_active = true
      and (
        staff_members.is_system_admin = true
        or staff_members.role = 'Admin'
      )
  )
);

create or replace function public.touch_ai_receptionist_settings_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_ai_receptionist_settings_updated_at on public.ai_receptionist_settings;
create trigger set_ai_receptionist_settings_updated_at
before update on public.ai_receptionist_settings
for each row
execute function public.touch_ai_receptionist_settings_updated_at();

create or replace function public.protect_ai_receptionist_managed_number_fields()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if auth.role() = 'service_role' then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if btrim(new.telnyx_phone_number) <> ''
      or btrim(new.telnyx_phone_number_id) <> ''
      or btrim(new.telnyx_number_order_id) <> ''
      or btrim(new.telnyx_provisioning_reference) <> ''
      or new.telnyx_provisioning_status <> 'not_configured'
      or btrim(new.telnyx_provisioning_error) <> ''
      or new.phone_setup_mode <> 'new_number'
      or btrim(new.existing_business_phone_number) <> '' then
      raise exception 'AI Receptionist phone allocation is managed by RoundHQ.'
        using errcode = '42501';
    end if;

    return new;
  end if;

  if new.telnyx_phone_number is distinct from old.telnyx_phone_number
    or new.telnyx_phone_number_id is distinct from old.telnyx_phone_number_id
    or new.telnyx_number_order_id is distinct from old.telnyx_number_order_id
    or new.telnyx_provisioning_reference is distinct from old.telnyx_provisioning_reference
    or new.telnyx_provisioning_status is distinct from old.telnyx_provisioning_status
    or new.telnyx_provisioning_error is distinct from old.telnyx_provisioning_error
    or new.phone_setup_mode is distinct from old.phone_setup_mode
    or new.existing_business_phone_number is distinct from old.existing_business_phone_number then
    raise exception 'AI Receptionist phone allocation is managed by RoundHQ.'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

drop trigger if exists protect_ai_receptionist_managed_number_fields
on public.ai_receptionist_settings;
create trigger protect_ai_receptionist_managed_number_fields
before insert or update on public.ai_receptionist_settings
for each row
execute function public.protect_ai_receptionist_managed_number_fields();

drop policy if exists "Admins can read AI Receptionist call logs" on public.ai_receptionist_call_logs;
create policy "Admins can read AI Receptionist call logs"
on public.ai_receptionist_call_logs
for select
to authenticated
using (
  public.is_organization_admin(organization_id)
  or exists (
    select 1
    from public.staff_members
    where staff_members.organization_id = ai_receptionist_call_logs.organization_id
      and staff_members.auth_user_id = auth.uid()
      and staff_members.is_active = true
      and (
        staff_members.is_system_admin = true
        or staff_members.role = 'Admin'
      )
  )
);

drop policy if exists "Admins can write AI Receptionist call logs" on public.ai_receptionist_call_logs;
create policy "Admins can write AI Receptionist call logs"
on public.ai_receptionist_call_logs
for all
to authenticated
using (
  public.is_organization_admin(organization_id)
  or exists (
    select 1
    from public.staff_members
    where staff_members.organization_id = ai_receptionist_call_logs.organization_id
      and staff_members.auth_user_id = auth.uid()
      and staff_members.is_active = true
      and (
        staff_members.is_system_admin = true
        or staff_members.role = 'Admin'
      )
  )
)
with check (
  public.is_organization_admin(organization_id)
  or exists (
    select 1
    from public.staff_members
    where staff_members.organization_id = ai_receptionist_call_logs.organization_id
      and staff_members.auth_user_id = auth.uid()
      and staff_members.is_active = true
      and (
        staff_members.is_system_admin = true
        or staff_members.role = 'Admin'
      )
  )
);

create or replace function public.touch_ai_receptionist_call_logs_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_ai_receptionist_call_logs_updated_at on public.ai_receptionist_call_logs;
create trigger set_ai_receptionist_call_logs_updated_at
before update on public.ai_receptionist_call_logs
for each row
execute function public.touch_ai_receptionist_call_logs_updated_at();

drop policy if exists "Members can read organizations" on public.organizations;
create policy "Members can read organizations"
on public.organizations
for select
to authenticated
using (owner_user_id = auth.uid() or public.is_organization_member(id));

drop policy if exists "Admins can update organizations" on public.organizations;
create policy "Admins can update organizations"
on public.organizations
for update
to authenticated
using (public.is_organization_admin(id))
with check (public.is_organization_admin(id));

drop policy if exists "Users can create owned organizations" on public.organizations;
create policy "Users can create owned organizations"
on public.organizations
for insert
to authenticated
with check (owner_user_id = auth.uid());

drop policy if exists "Members can read organization members" on public.organization_members;
create policy "Members can read organization members"
on public.organization_members
for select
to authenticated
using (public.is_organization_member(organization_id));

drop policy if exists "Admins can manage organization members" on public.organization_members;
create policy "Admins can manage organization members"
on public.organization_members
for all
to authenticated
using (public.is_organization_admin(organization_id))
with check (public.is_organization_admin(organization_id));

drop policy if exists "Users can create their owner membership" on public.organization_members;
create policy "Users can create their owner membership"
on public.organization_members
for insert
to authenticated
with check (
  user_id = auth.uid()
  and role = 'owner'
  and status = 'active'
  and exists (
    select 1
    from public.organizations
    where organizations.id = organization_id
      and organizations.owner_user_id = auth.uid()
  )
);

drop policy if exists "Members can read subscriptions" on public.subscriptions;
create policy "Members can read subscriptions"
on public.subscriptions
for select
to authenticated
using (public.is_organization_member(organization_id));

drop policy if exists "Admins can update subscriptions" on public.subscriptions;
create policy "Admins can update subscriptions"
on public.subscriptions
for update
to authenticated
using (public.is_organization_admin(organization_id))
with check (public.is_organization_admin(organization_id));

drop policy if exists "Admins can insert subscriptions" on public.subscriptions;
create policy "Admins can insert subscriptions"
on public.subscriptions
for insert
to authenticated
with check (public.is_organization_admin(organization_id));

drop policy if exists "Members can read app state" on public.app_state;
create policy "Members can read app state"
on public.app_state
for select
to authenticated
using (public.is_organization_member(organization_id));

drop policy if exists "Members can write app state" on public.app_state;
create policy "Members can write app state"
on public.app_state
for all
to authenticated
using (public.is_organization_member(organization_id))
with check (public.is_organization_member(organization_id));

drop policy if exists "Members can read staff members" on public.staff_members;
create policy "Members can read staff members"
on public.staff_members
for select
to authenticated
using (
  public.is_organization_member(organization_id)
  and (
    public.can_access_operational_data(organization_id)
    or auth_user_id = auth.uid()
    or lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  )
);

drop policy if exists "Admins can write staff members" on public.staff_members;
create policy "Admins can write staff members"
on public.staff_members
for all
to authenticated
using (public.is_organization_admin(organization_id))
with check (public.is_organization_admin(organization_id));

drop policy if exists "Admins can read staff account invites" on public.staff_account_invites;
create policy "Admins can read staff account invites"
on public.staff_account_invites
for select
to authenticated
using (public.is_organization_admin(organization_id));

drop policy if exists "Admins can write staff account invites" on public.staff_account_invites;
create policy "Admins can write staff account invites"
on public.staff_account_invites
for all
to authenticated
using (public.is_organization_admin(organization_id))
with check (public.is_organization_admin(organization_id));

drop policy if exists "Members can read role permissions" on public.role_permissions;
create policy "Members can read role permissions"
on public.role_permissions
for select
to authenticated
using (public.is_organization_member(organization_id));

drop policy if exists "Admins can write role permissions" on public.role_permissions;
create policy "Admins can write role permissions"
on public.role_permissions
for all
to authenticated
using (public.is_organization_admin(organization_id))
with check (public.is_organization_admin(organization_id));

drop policy if exists "Members can read customers" on public.customers;
create policy "Members can read customers"
on public.customers
for select
to authenticated
using (
  public.is_organization_member(organization_id)
  and (
    public.can_access_operational_data(organization_id)
    or assigned_staff_id = public.current_staff_member_id(organization_id)
  )
);

drop policy if exists "Members can write customers" on public.customers;
create policy "Members can write customers"
on public.customers
for all
to authenticated
using (
  public.is_organization_member(organization_id)
  and public.can_access_operational_data(organization_id)
)
with check (
  public.is_organization_member(organization_id)
  and public.can_access_operational_data(organization_id)
);

drop policy if exists "Members can read visits" on public.visits;
create policy "Members can read visits"
on public.visits
for select
to authenticated
using (
  public.is_organization_member(organization_id)
  and (
    public.can_access_operational_data(organization_id)
    or exists (
      select 1
      from public.customers
      where customers.organization_id = visits.organization_id
        and customers.id = visits.customer_id
        and customers.assigned_staff_id = public.current_staff_member_id(visits.organization_id)
    )
  )
);

drop policy if exists "Members can write visits" on public.visits;
create policy "Members can write visits"
on public.visits
for all
to authenticated
using (
  public.is_organization_member(organization_id)
  and (
    public.can_access_operational_data(organization_id)
    or exists (
      select 1
      from public.customers
      where customers.organization_id = visits.organization_id
        and customers.id = visits.customer_id
        and customers.assigned_staff_id = public.current_staff_member_id(visits.organization_id)
    )
  )
)
with check (
  public.is_organization_member(organization_id)
  and (
    public.can_access_operational_data(organization_id)
    or exists (
      select 1
      from public.customers
      where customers.organization_id = visits.organization_id
        and customers.id = visits.customer_id
        and customers.assigned_staff_id = public.current_staff_member_id(visits.organization_id)
    )
  )
);

drop policy if exists "Members can read customer leads" on public.customer_leads;
create policy "Members can read customer leads"
on public.customer_leads
for select
to authenticated
using (
  public.is_organization_member(organization_id)
  and public.can_access_operational_data(organization_id)
);

drop policy if exists "Members can write customer leads" on public.customer_leads;
create policy "Members can write customer leads"
on public.customer_leads
for all
to authenticated
using (
  public.is_organization_member(organization_id)
  and public.can_access_operational_data(organization_id)
)
with check (
  public.is_organization_member(organization_id)
  and public.can_access_operational_data(organization_id)
);

drop policy if exists "Members can read monthly payments" on public.monthly_payments;
create policy "Members can read monthly payments"
on public.monthly_payments
for select
to authenticated
using (
  public.is_organization_member(organization_id)
  and public.can_access_operational_data(organization_id)
);

drop policy if exists "Members can write monthly payments" on public.monthly_payments;
create policy "Members can write monthly payments"
on public.monthly_payments
for all
to authenticated
using (
  public.is_organization_member(organization_id)
  and public.can_access_operational_data(organization_id)
)
with check (
  public.is_organization_member(organization_id)
  and public.can_access_operational_data(organization_id)
);

drop policy if exists "Members can read statement imports" on public.statement_imports;
create policy "Members can read statement imports"
on public.statement_imports
for select
to authenticated
using (
  public.is_organization_member(organization_id)
  and public.can_access_operational_data(organization_id)
);

drop policy if exists "Members can write statement imports" on public.statement_imports;
create policy "Members can write statement imports"
on public.statement_imports
for all
to authenticated
using (
  public.is_organization_member(organization_id)
  and public.can_access_operational_data(organization_id)
)
with check (
  public.is_organization_member(organization_id)
  and public.can_access_operational_data(organization_id)
);

drop policy if exists "Members can read statement import rows" on public.statement_import_rows;
create policy "Members can read statement import rows"
on public.statement_import_rows
for select
to authenticated
using (
  public.is_organization_member(organization_id)
  and public.can_access_operational_data(organization_id)
);

drop policy if exists "Members can write statement import rows" on public.statement_import_rows;
create policy "Members can write statement import rows"
on public.statement_import_rows
for all
to authenticated
using (
  public.is_organization_member(organization_id)
  and public.can_access_operational_data(organization_id)
)
with check (
  public.is_organization_member(organization_id)
  and public.can_access_operational_data(organization_id)
);

drop policy if exists "Members can read payment matching rules" on public.payment_matching_rules;
create policy "Members can read payment matching rules"
on public.payment_matching_rules
for select
to authenticated
using (
  public.is_organization_member(organization_id)
  and public.can_access_operational_data(organization_id)
);

drop policy if exists "Members can write payment matching rules" on public.payment_matching_rules;
create policy "Members can write payment matching rules"
on public.payment_matching_rules
for all
to authenticated
using (
  public.is_organization_member(organization_id)
  and public.can_access_operational_data(organization_id)
)
with check (
  public.is_organization_member(organization_id)
  and public.can_access_operational_data(organization_id)
);

drop policy if exists "Members can read payment ignore rules" on public.payment_ignore_rules;
create policy "Members can read payment ignore rules"
on public.payment_ignore_rules
for select
to authenticated
using (
  public.is_organization_member(organization_id)
  and public.can_access_operational_data(organization_id)
);

drop policy if exists "Members can write payment ignore rules" on public.payment_ignore_rules;
create policy "Members can write payment ignore rules"
on public.payment_ignore_rules
for all
to authenticated
using (
  public.is_organization_member(organization_id)
  and public.can_access_operational_data(organization_id)
)
with check (
  public.is_organization_member(organization_id)
  and public.can_access_operational_data(organization_id)
);

drop policy if exists "Members can read customer payment fingerprints" on public.customer_payment_fingerprints;
create policy "Members can read customer payment fingerprints"
on public.customer_payment_fingerprints
for select
to authenticated
using (
  public.is_organization_member(organization_id)
  and public.can_access_operational_data(organization_id)
);

drop policy if exists "Members can write customer payment fingerprints" on public.customer_payment_fingerprints;
create policy "Members can write customer payment fingerprints"
on public.customer_payment_fingerprints
for all
to authenticated
using (
  public.is_organization_member(organization_id)
  and public.can_access_operational_data(organization_id)
)
with check (
  public.is_organization_member(organization_id)
  and public.can_access_operational_data(organization_id)
);

drop policy if exists "Members can read customer credit balances" on public.customer_credit_balances;
create policy "Members can read customer credit balances"
on public.customer_credit_balances
for select
to authenticated
using (
  public.is_organization_member(organization_id)
  and public.can_access_operational_data(organization_id)
);

drop policy if exists "Members can write customer credit balances" on public.customer_credit_balances;
create policy "Members can write customer credit balances"
on public.customer_credit_balances
for all
to authenticated
using (
  public.is_organization_member(organization_id)
  and public.can_access_operational_data(organization_id)
)
with check (
  public.is_organization_member(organization_id)
  and public.can_access_operational_data(organization_id)
);

drop policy if exists "Members can read payment audit events" on public.payment_audit_events;
create policy "Members can read payment audit events"
on public.payment_audit_events
for select
to authenticated
using (
  public.is_organization_member(organization_id)
  and public.can_access_operational_data(organization_id)
);

drop policy if exists "Members can write payment audit events" on public.payment_audit_events;
create policy "Members can write payment audit events"
on public.payment_audit_events
for all
to authenticated
using (
  public.is_organization_member(organization_id)
  and public.can_access_operational_data(organization_id)
)
with check (
  public.is_organization_member(organization_id)
  and public.can_access_operational_data(organization_id)
);

drop policy if exists "Members can read items" on public.items;
create policy "Members can read items"
on public.items
for select
to authenticated
using (
  public.is_organization_member(organization_id)
  and public.can_access_operational_data(organization_id)
);

drop policy if exists "Members can write items" on public.items;
create policy "Members can write items"
on public.items
for all
to authenticated
using (
  public.is_organization_member(organization_id)
  and public.can_access_operational_data(organization_id)
)
with check (
  public.is_organization_member(organization_id)
  and public.can_access_operational_data(organization_id)
);

drop policy if exists "Members can read quotes" on public.quotes;
create policy "Members can read quotes"
on public.quotes
for select
to authenticated
using (
  public.is_organization_member(organization_id)
  and public.can_access_operational_data(organization_id)
);

drop policy if exists "Members can write quotes" on public.quotes;
create policy "Members can write quotes"
on public.quotes
for all
to authenticated
using (
  public.is_organization_member(organization_id)
  and public.can_access_operational_data(organization_id)
)
with check (
  public.is_organization_member(organization_id)
  and public.can_access_operational_data(organization_id)
);

drop policy if exists "Members can read invoices" on public.invoices;
create policy "Members can read invoices"
on public.invoices
for select
to authenticated
using (
  public.is_organization_member(organization_id)
  and public.can_access_operational_data(organization_id)
);

drop policy if exists "Members can write invoices" on public.invoices;
create policy "Members can write invoices"
on public.invoices
for all
to authenticated
using (
  public.is_organization_member(organization_id)
  and public.can_access_operational_data(organization_id)
)
with check (
  public.is_organization_member(organization_id)
  and public.can_access_operational_data(organization_id)
);

drop policy if exists "Members can read recurring invoice templates" on public.recurring_invoice_templates;
create policy "Members can read recurring invoice templates"
on public.recurring_invoice_templates
for select
to authenticated
using (
  public.is_organization_member(organization_id)
  and public.can_access_operational_data(organization_id)
);

drop policy if exists "Members can write recurring invoice templates" on public.recurring_invoice_templates;
create policy "Members can write recurring invoice templates"
on public.recurring_invoice_templates
for all
to authenticated
using (
  public.is_organization_member(organization_id)
  and public.can_access_operational_data(organization_id)
)
with check (
  public.is_organization_member(organization_id)
  and public.can_access_operational_data(organization_id)
);

drop policy if exists "Members can read scheduled jobs" on public.scheduled_jobs;
create policy "Members can read scheduled jobs"
on public.scheduled_jobs
for select
to authenticated
using (
  public.is_organization_member(organization_id)
  and (
    public.can_access_operational_data(organization_id)
    or assigned_staff_id = public.current_staff_member_id(organization_id)
  )
);

drop policy if exists "Members can write scheduled jobs" on public.scheduled_jobs;
create policy "Members can write scheduled jobs"
on public.scheduled_jobs
for all
to authenticated
using (
  public.is_organization_member(organization_id)
  and (
    public.can_access_operational_data(organization_id)
    or assigned_staff_id = public.current_staff_member_id(organization_id)
  )
)
with check (
  public.is_organization_member(organization_id)
  and (
    public.can_access_operational_data(organization_id)
    or assigned_staff_id = public.current_staff_member_id(organization_id)
  )
);

drop policy if exists "Members can read scheduling recommendations" on public.scheduling_recommendations;
create policy "Members can read scheduling recommendations"
on public.scheduling_recommendations
for select
to authenticated
using (public.is_organization_member(organization_id));

drop policy if exists "Members can write scheduling recommendations" on public.scheduling_recommendations;
create policy "Members can write scheduling recommendations"
on public.scheduling_recommendations
for all
to authenticated
using (public.is_organization_member(organization_id))
with check (public.is_organization_member(organization_id));

drop policy if exists "Members can read scheduling audit logs" on public.scheduling_audit_logs;
create policy "Members can read scheduling audit logs"
on public.scheduling_audit_logs
for select
to authenticated
using (public.is_organization_member(organization_id));

drop policy if exists "Members can write scheduling audit logs" on public.scheduling_audit_logs;
create policy "Members can write scheduling audit logs"
on public.scheduling_audit_logs
for all
to authenticated
using (public.is_organization_member(organization_id))
with check (public.is_organization_member(organization_id));

drop policy if exists "Members can read commercial RAMS" on public.commercial_rams_documents;
create policy "Members can read commercial RAMS"
on public.commercial_rams_documents
for select
to authenticated
using (public.is_organization_member(organization_id));

drop policy if exists "Members can write commercial RAMS" on public.commercial_rams_documents;
create policy "Members can write commercial RAMS"
on public.commercial_rams_documents
for all
to authenticated
using (public.is_organization_member(organization_id))
with check (public.is_organization_member(organization_id));

create table if not exists public.platform_stripe_settings (
  id text primary key default 'primary',
  stripe_secret_key text not null default '',
  stripe_webhook_secret text not null default '',
  stripe_connect_webhook_secret text not null default '',
  starter_price_id text not null default '',
  growth_price_id text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.platform_stripe_settings
  add column if not exists stripe_secret_key text not null default '',
  add column if not exists stripe_webhook_secret text not null default '',
  add column if not exists stripe_connect_webhook_secret text not null default '',
  add column if not exists starter_price_id text not null default '',
  add column if not exists growth_price_id text not null default '',
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

alter table public.platform_stripe_settings enable row level security;

insert into public.platform_stripe_settings (id)
values ('primary')
on conflict (id) do nothing;

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

create table if not exists public.platform_email_settings (
  id text primary key default 'primary',
  email_from_name text,
  email_from_address text,
  email_reply_to text,
  smtp_host text,
  smtp_port integer default 587,
  smtp_secure boolean default false,
  smtp_username text,
  smtp_password text,
  invoice_automation_enabled boolean default false,
  invoice_days_before_due integer default 7,
  invoice_subject_template text,
  invoice_message_template text,
  verification_subject_template text,
  verification_message_template text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.platform_email_settings
  add column if not exists email_from_name text,
  add column if not exists email_from_address text,
  add column if not exists email_reply_to text,
  add column if not exists smtp_host text,
  add column if not exists smtp_port integer default 587,
  add column if not exists smtp_secure boolean default false,
  add column if not exists smtp_username text,
  add column if not exists smtp_password text,
  add column if not exists invoice_automation_enabled boolean default false,
  add column if not exists invoice_days_before_due integer default 7,
  add column if not exists invoice_subject_template text,
  add column if not exists invoice_message_template text,
  add column if not exists verification_subject_template text,
  add column if not exists verification_message_template text,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

alter table public.platform_email_settings enable row level security;

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
