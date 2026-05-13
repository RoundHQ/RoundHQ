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
  primary_cta_label text not null default 'Sign up',
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
    'Starter is GBP 30 per business / month for solo operators getting organised. Growth is GBP 60 per business / month for teams that need staff permissions, RAMS, commercial workflows, and deeper reporting.',
    'Starter gives a solo operator the core workspace: leads, customer CRM, scheduling, recurring rounds, route map, quotes, invoices, payment tracking, visit history, notes, one staff account, up to 250 customers, and the main dashboard.

Growth is built for businesses adding people and complexity. It includes everything in Starter plus up to 5 staff accounts, staff permissions, RAMS generator, advanced dashboard insights, customer profitability, workflow tracking, commercial customer tools, quote conversion workflows, operational reporting, and up to 1,500 customers.

There are no setup fees, and you can change plan as the business grows.',
    jsonb_build_array(
      'Starter: GBP 30 per business / month for solo operators',
      'Growth: GBP 60 per business / month for teams and commercial work',
      'No setup fees, cancel anytime'
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
