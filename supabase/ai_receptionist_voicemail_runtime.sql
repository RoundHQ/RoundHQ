-- AI Receptionist voicemail runtime repair for existing RoundHQ databases.
--
-- Apply this file once in the Supabase SQL editor when the Telnyx webhook
-- returns HTTP 500 before an incoming call is answered. Fresh databases should
-- continue to use roundhq_tenant_schema.sql instead.

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
  duration_seconds integer null,
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
  constraint ai_receptionist_call_logs_call_sid_not_blank
    check (btrim(call_sid) <> ''),
  constraint ai_receptionist_call_logs_provider_check
    check (provider in ('telnyx', 'twilio')),
  constraint ai_receptionist_call_logs_call_type_check
    check (call_type in ('voicemail', 'realtime')),
  constraint ai_receptionist_call_logs_priority_check
    check (priority in ('normal', 'high')),
  constraint ai_receptionist_call_logs_transcript_entries_check
    check (jsonb_typeof(transcript_entries) = 'array'),
  constraint ai_receptionist_call_logs_structured_data_check
    check (jsonb_typeof(structured_data) = 'object'),
  constraint ai_receptionist_call_logs_ai_summaries_check
    check (jsonb_typeof(ai_summaries) = 'object'),
  constraint ai_receptionist_call_logs_emergency_keywords_check
    check (jsonb_typeof(emergency_keywords) = 'array'),
  constraint ai_receptionist_call_logs_raw_payload_check
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

-- PostgREST requires an exact unique key for
-- onConflict: "organization_id,call_sid".
create unique index if not exists ai_receptionist_call_logs_org_call_sid_unique_idx
on public.ai_receptionist_call_logs (organization_id, call_sid);

-- Replace a legacy Twilio-only provider constraint, if present.
alter table public.ai_receptionist_call_logs
  drop constraint if exists ai_receptionist_call_logs_provider_check;

alter table public.ai_receptionist_call_logs
  add constraint ai_receptionist_call_logs_provider_check
  check (provider in ('telnyx', 'twilio'));

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

alter table public.ai_receptionist_call_logs enable row level security;

grant select, insert, update, delete
on table public.ai_receptionist_call_logs
to authenticated;

drop policy if exists "Admins can read AI Receptionist call logs"
on public.ai_receptionist_call_logs;

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

drop policy if exists "Admins can write AI Receptionist call logs"
on public.ai_receptionist_call_logs;

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
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_ai_receptionist_call_logs_updated_at
on public.ai_receptionist_call_logs;

create trigger set_ai_receptionist_call_logs_updated_at
before update on public.ai_receptionist_call_logs
for each row
execute function public.touch_ai_receptionist_call_logs_updated_at();
