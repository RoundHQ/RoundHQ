-- First-party, privacy-conscious public marketing analytics.
-- Run once in Supabase SQL Editor after deploying the application code.

create table if not exists public.analytics_visitors (
  visitor_id uuid primary key,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  first_source text not null default 'Direct',
  first_referrer_domain text null,
  first_landing_path text not null default '/',
  first_utm_medium text null,
  first_utm_campaign text null,
  first_utm_term text null,
  first_utm_content text null,
  last_source text not null default 'Direct',
  last_referrer_domain text null,
  last_landing_path text not null default '/',
  last_utm_medium text null,
  last_utm_campaign text null,
  last_utm_term text null,
  last_utm_content text null
);

create table if not exists public.analytics_sessions (
  id uuid primary key,
  visitor_id uuid not null references public.analytics_visitors(visitor_id) on delete cascade,
  organization_id uuid null references public.organizations(id) on delete set null,
  converted_user_id uuid null references auth.users(id) on delete set null,
  started_at timestamptz not null default now(),
  last_activity_at timestamptz not null default now(),
  converted_at timestamptz null,
  landing_path text not null,
  exit_path text not null,
  referrer_domain text null,
  source text not null default 'Direct',
  medium text null,
  campaign text null,
  term text null,
  content text null,
  device_category text null check (device_category is null or device_category in ('desktop', 'mobile', 'tablet'))
);

create table if not exists public.analytics_page_views (
  id uuid primary key default gen_random_uuid(),
  visitor_id uuid not null references public.analytics_visitors(visitor_id) on delete cascade,
  session_id uuid not null references public.analytics_sessions(id) on delete cascade,
  pathname text not null,
  previous_path text null,
  page_title text null,
  occurred_at timestamptz not null default now()
);

create table if not exists public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  visitor_id uuid not null references public.analytics_visitors(visitor_id) on delete cascade,
  session_id uuid null references public.analytics_sessions(id) on delete set null,
  user_id uuid null references auth.users(id) on delete set null,
  organization_id uuid null references public.organizations(id) on delete set null,
  event_name text not null check (event_name in ('page_view', 'signup_page_view', 'signup_started', 'signup_completed', 'pricing_viewed', 'login_started', 'trial_started')),
  pathname text not null default '/',
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  occurred_at timestamptz not null default now()
);

create table if not exists public.analytics_signup_attribution (
  user_id uuid primary key references auth.users(id) on delete cascade,
  organization_id uuid unique null references public.organizations(id) on delete set null,
  visitor_id uuid not null references public.analytics_visitors(visitor_id) on delete restrict,
  session_id uuid null references public.analytics_sessions(id) on delete set null,
  first_source text not null default 'Unknown',
  first_referrer_domain text null,
  first_landing_path text null,
  first_utm_medium text null,
  first_utm_campaign text null,
  first_utm_term text null,
  first_utm_content text null,
  first_seen_at timestamptz null,
  last_source text not null default 'Unknown',
  last_referrer_domain text null,
  last_landing_path text null,
  last_utm_medium text null,
  last_utm_campaign text null,
  last_utm_term text null,
  last_utm_content text null,
  signup_completed_at timestamptz null,
  created_at timestamptz not null default now()
);

create index if not exists analytics_visitors_first_seen_idx on public.analytics_visitors(first_seen_at desc);
create index if not exists analytics_sessions_started_idx on public.analytics_sessions(started_at desc);
create index if not exists analytics_sessions_visitor_idx on public.analytics_sessions(visitor_id, started_at desc);
create index if not exists analytics_sessions_source_idx on public.analytics_sessions(source, started_at desc);
create index if not exists analytics_page_views_occurred_idx on public.analytics_page_views(occurred_at desc);
create index if not exists analytics_page_views_session_idx on public.analytics_page_views(session_id, occurred_at);
create index if not exists analytics_events_name_occurred_idx on public.analytics_events(event_name, occurred_at desc);
create index if not exists analytics_signup_completed_idx on public.analytics_signup_attribution(signup_completed_at desc) where signup_completed_at is not null;
create index if not exists analytics_signup_source_idx on public.analytics_signup_attribution(first_source, signup_completed_at desc);

alter table public.analytics_visitors enable row level security;
alter table public.analytics_sessions enable row level security;
alter table public.analytics_page_views enable row level security;
alter table public.analytics_events enable row level security;
alter table public.analytics_signup_attribution enable row level security;

-- No browser role receives a policy. Public writes are accepted only by the
-- controlled Next.js route using the Supabase service role; reporting is only
-- performed by server-side owner-console code.
revoke all on public.analytics_visitors, public.analytics_sessions, public.analytics_page_views, public.analytics_events, public.analytics_signup_attribution from anon, authenticated;
