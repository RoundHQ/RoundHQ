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
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

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
  stripe_customer_id text null,
  stripe_subscription_id text null,
  stripe_price_id text null,
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
alter column status set default 'incomplete';

alter table public.subscriptions
alter column trial_ends_at drop default;

create unique index if not exists subscriptions_stripe_customer_unique_idx
on public.subscriptions (stripe_customer_id)
where stripe_customer_id is not null;

create unique index if not exists subscriptions_stripe_subscription_unique_idx
on public.subscriptions (stripe_subscription_id)
where stripe_subscription_id is not null;

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
    'Everything in one place',
    'Tools built for the way maintenance teams actually work.',
    'RoundHQ brings customer records, rounds, quotes, invoices, visits, payments, and staff access into one tidy workspace.',
    'Your team can plan the week, see what is due, track who has been visited, and keep a clean record of every customer without fighting spreadsheets.

Each feature is built around daily field work: quick scheduling, clear route visibility, simple quote creation, invoice tracking, and staff permissions that keep the right data in the right hands.',
    jsonb_build_array(
      'Customer management with notes, pricing, documents, and service history',
      'Rounds and scheduling for weekly, fortnightly, and monthly work',
      'Quotes, invoices, payments, route maps, staff roles, and reporting'
    ),
    'Start free trial',
    '/signup',
    10,
    true
  ),
  (
    'pricing',
    'Pricing',
    'Simple pricing',
    'One monthly price. Everything included.',
    'RoundHQ is GBP 30 per month for each business account, with no setup fees and no complicated feature tiers.',
    'The full platform is included from day one: unlimited customers, jobs and quotes, invoicing, payments, route planning, staff accounts, reminders, and reports.

Start with a 14-day free trial. No card is required for the trial, and you can cancel whenever you need to.',
    jsonb_build_array(
      'GBP 30 per month per business account',
      '14-day free trial with no card required',
      'All current RoundHQ features included'
    ),
    'Start free trial',
    '/signup',
    20,
    true
  ),
  (
    'about',
    'About',
    'Built for maintenance businesses',
    'RoundHQ helps practical teams run calmer days.',
    'RoundHQ was created for garden maintenance and field service businesses that need structure without heavy software.',
    'Most maintenance teams grow from hard work, repeat customers, and a lot of moving parts. RoundHQ gives that work a proper operating base so owners can see what is happening, staff know where they need to be, and customers get a more reliable service.

The aim is simple: fewer missed details, clearer schedules, faster admin, and more control over the business.',
    jsonb_build_array(
      'Designed around rounds, visits, quotes, invoices, and field teams',
      'Built for owners who want visibility without adding admin drag',
      'Focused on practical workflows rather than bloated software'
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
    'Questions, support, or setup help.',
    'Get in touch if you want to ask about RoundHQ, the free trial, billing, or setting up your business workspace.',
    'RoundHQ is here for maintenance businesses that want a cleaner way to manage the day-to-day work.

Use this page for contact details, support information, demo requests, or any launch messaging you want customers to see before they sign up.',
    jsonb_build_array(
      'Ask about the 14-day free trial',
      'Get help setting up your workspace',
      'Share product questions or customer support requests'
    ),
    'Start free trial',
    '/signup',
    50,
    true
  )
on conflict (slug) do nothing;

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
  role text not null check (role in ('Admin', 'Staff', 'Operator')),
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

create table if not exists public.role_permissions (
  organization_id uuid not null default public.current_organization_id()
    references public.organizations(id) on delete cascade,
  role text not null check (role in ('Admin', 'Staff', 'Operator')),
  page_key text not null check (
    page_key in (
      'dashboard',
      'schedule',
      'rounds',
      'history',
      'map',
      'actions',
      'commercial',
      'commercialDocs',
      'customers',
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
  week integer not null default 1 check (week in (1, 2)),
  day text null check (
    day is null or day in ('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday')
  ),
  customer_type text not null default 'Residential' check (
    customer_type in ('Residential', 'Commercial')
  ),
  cut_frequency text not null default 'Fortnightly' check (
    cut_frequency in ('Fortnightly', '3 Weekly', 'Monthly')
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

create index if not exists customers_org_name_idx
on public.customers (organization_id, name);

create index if not exists customers_org_round_idx
on public.customers (organization_id, week, day, customer_type, route_order);

create table if not exists public.visits (
  id bigint generated by default as identity primary key,
  organization_id uuid not null default public.current_organization_id()
    references public.organizations(id) on delete cascade,
  customer_id bigint not null references public.customers(id) on delete cascade,
  visit_date date not null,
  week integer null check (week is null or week in (1, 2)),
  day text null check (
    day is null or day in ('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday')
  ),
  status text not null check (status in ('completed', 'not_cut')),
  notes text null,
  payment_status text not null default 'Not Paid' check (payment_status in ('Paid', 'Not Paid')),
  paid_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  reason text null check (
    reason is null or reason in (
      'Too Wet',
      'Access Blocked',
      'Customer Request',
      'Overgrown - Requires Quote',
      'Unsafe',
      'Dog in Garden',
      'Gate Locked',
      'Other'
    )
  ),
  round_key text null,
  customer_type text null check (
    customer_type is null or customer_type in ('Residential', 'Commercial')
  ),
  price_at_visit numeric(10, 2) null
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
    source in ('website', 'email', 'facebook', 'whatsapp', 'manual')
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

create index if not exists customer_leads_org_status_idx
on public.customer_leads (organization_id, status);

create index if not exists customer_leads_org_submitted_at_idx
on public.customer_leads (organization_id, submitted_at desc);

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
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (jsonb_typeof(items) = 'array')
);

create unique index if not exists quotes_org_quote_number_unique_idx
on public.quotes (organization_id, quote_number);

create index if not exists quotes_org_date_idx
on public.quotes (organization_id, date desc);

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
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (jsonb_typeof(items) = 'array')
);

create unique index if not exists invoices_org_invoice_number_unique_idx
on public.invoices (organization_id, invoice_number);

create index if not exists invoices_org_date_idx
on public.invoices (organization_id, date desc);

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
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (jsonb_typeof(quote_ids) = 'array'),
  check (jsonb_typeof(invoice_ids) = 'array')
);

create index if not exists scheduled_jobs_org_date_idx
on public.scheduled_jobs (organization_id, date asc);

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
      'Grass Cutting',
      'Hedge Cutting',
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

grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;

alter table public.site_pages enable row level security;
alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.subscriptions enable row level security;
alter table public.app_state enable row level security;
alter table public.staff_members enable row level security;
alter table public.role_permissions enable row level security;
alter table public.customers enable row level security;
alter table public.visits enable row level security;
alter table public.customer_leads enable row level security;
alter table public.monthly_payments enable row level security;
alter table public.items enable row level security;
alter table public.quotes enable row level security;
alter table public.invoices enable row level security;
alter table public.recurring_invoice_templates enable row level security;
alter table public.scheduled_jobs enable row level security;
alter table public.commercial_rams_documents enable row level security;

drop policy if exists "Published site pages are public" on public.site_pages;
create policy "Published site pages are public"
on public.site_pages
for select
to anon, authenticated
using (is_published);

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
using (public.is_organization_member(organization_id));

drop policy if exists "Admins can write staff members" on public.staff_members;
create policy "Admins can write staff members"
on public.staff_members
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
using (public.is_organization_member(organization_id));

drop policy if exists "Members can write customers" on public.customers;
create policy "Members can write customers"
on public.customers
for all
to authenticated
using (public.is_organization_member(organization_id))
with check (public.is_organization_member(organization_id));

drop policy if exists "Members can read visits" on public.visits;
create policy "Members can read visits"
on public.visits
for select
to authenticated
using (public.is_organization_member(organization_id));

drop policy if exists "Members can write visits" on public.visits;
create policy "Members can write visits"
on public.visits
for all
to authenticated
using (public.is_organization_member(organization_id))
with check (public.is_organization_member(organization_id));

drop policy if exists "Members can read customer leads" on public.customer_leads;
create policy "Members can read customer leads"
on public.customer_leads
for select
to authenticated
using (public.is_organization_member(organization_id));

drop policy if exists "Members can write customer leads" on public.customer_leads;
create policy "Members can write customer leads"
on public.customer_leads
for all
to authenticated
using (public.is_organization_member(organization_id))
with check (public.is_organization_member(organization_id));

drop policy if exists "Members can read monthly payments" on public.monthly_payments;
create policy "Members can read monthly payments"
on public.monthly_payments
for select
to authenticated
using (public.is_organization_member(organization_id));

drop policy if exists "Members can write monthly payments" on public.monthly_payments;
create policy "Members can write monthly payments"
on public.monthly_payments
for all
to authenticated
using (public.is_organization_member(organization_id))
with check (public.is_organization_member(organization_id));

drop policy if exists "Members can read items" on public.items;
create policy "Members can read items"
on public.items
for select
to authenticated
using (public.is_organization_member(organization_id));

drop policy if exists "Members can write items" on public.items;
create policy "Members can write items"
on public.items
for all
to authenticated
using (public.is_organization_member(organization_id))
with check (public.is_organization_member(organization_id));

drop policy if exists "Members can read quotes" on public.quotes;
create policy "Members can read quotes"
on public.quotes
for select
to authenticated
using (public.is_organization_member(organization_id));

drop policy if exists "Members can write quotes" on public.quotes;
create policy "Members can write quotes"
on public.quotes
for all
to authenticated
using (public.is_organization_member(organization_id))
with check (public.is_organization_member(organization_id));

drop policy if exists "Members can read invoices" on public.invoices;
create policy "Members can read invoices"
on public.invoices
for select
to authenticated
using (public.is_organization_member(organization_id));

drop policy if exists "Members can write invoices" on public.invoices;
create policy "Members can write invoices"
on public.invoices
for all
to authenticated
using (public.is_organization_member(organization_id))
with check (public.is_organization_member(organization_id));

drop policy if exists "Members can read recurring invoice templates" on public.recurring_invoice_templates;
create policy "Members can read recurring invoice templates"
on public.recurring_invoice_templates
for select
to authenticated
using (public.is_organization_member(organization_id));

drop policy if exists "Members can write recurring invoice templates" on public.recurring_invoice_templates;
create policy "Members can write recurring invoice templates"
on public.recurring_invoice_templates
for all
to authenticated
using (public.is_organization_member(organization_id))
with check (public.is_organization_member(organization_id));

drop policy if exists "Members can read scheduled jobs" on public.scheduled_jobs;
create policy "Members can read scheduled jobs"
on public.scheduled_jobs
for select
to authenticated
using (public.is_organization_member(organization_id));

drop policy if exists "Members can write scheduled jobs" on public.scheduled_jobs;
create policy "Members can write scheduled jobs"
on public.scheduled_jobs
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
