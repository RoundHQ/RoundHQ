-- RoundHQ owner email and invoice automation settings.
-- Run this in the Supabase SQL editor for the RoundHQ platform project.

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
