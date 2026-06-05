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
  twilio_account_sid text not null default '',
  twilio_auth_token text not null default '',
  twilio_phone_number text not null default '',
  realtime_enabled boolean not null default false,
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
  check (jsonb_typeof(business_hours) = 'object'),
  check (jsonb_typeof(questions_to_ask) = 'array'),
  check (jsonb_typeof(emergency_keywords) = 'array'),
  check (telephony_provider in ('telnyx', 'twilio'))
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
  add column if not exists twilio_account_sid text not null default '',
  add column if not exists twilio_auth_token text not null default '',
  add column if not exists twilio_phone_number text not null default '',
  add column if not exists realtime_enabled boolean not null default false,
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

alter table public.ai_receptionist_settings enable row level security;

grant select, insert, update, delete on table public.ai_receptionist_settings to authenticated;

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

create unique index if not exists ai_receptionist_settings_twilio_phone_number_unique_idx
on public.ai_receptionist_settings (
  (regexp_replace(twilio_phone_number, '[^0-9+]', '', 'g'))
)
where btrim(twilio_phone_number) <> '';

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
