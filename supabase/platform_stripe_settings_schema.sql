-- RoundHQ Stripe checkout settings.
--
-- Run this small file if the main tenant schema is already installed and you
-- only need the editable platform Stripe settings table.

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
