alter table public.ai_receptionist_settings
  add column if not exists telephony_provider text not null default 'telnyx',
  add column if not exists telnyx_api_key text not null default '',
  add column if not exists telnyx_connection_id text not null default '',
  add column if not exists telnyx_messaging_profile_id text not null default '',
  add column if not exists telnyx_public_key text not null default '',
  add column if not exists telnyx_phone_number text not null default '',
  add column if not exists new_lead_sms_enabled boolean not null default false,
  add column if not exists new_lead_sms_phone_number text not null default '';

update public.ai_receptionist_settings
set realtime_enabled = false
where realtime_enabled = true;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'ai_receptionist_settings_telephony_provider_check'
  ) then
    alter table public.ai_receptionist_settings
      add constraint ai_receptionist_settings_telephony_provider_check
      check (telephony_provider in ('telnyx', 'twilio'));
  end if;
end;
$$;

create index if not exists ai_receptionist_settings_telnyx_phone_number_idx
on public.ai_receptionist_settings (telnyx_phone_number)
where btrim(telnyx_phone_number) <> '';

create unique index if not exists ai_receptionist_settings_telnyx_phone_number_unique_idx
on public.ai_receptionist_settings (
  (regexp_replace(telnyx_phone_number, '[^0-9+]', '', 'g'))
)
where btrim(telnyx_phone_number) <> '';

alter table public.ai_receptionist_call_logs
  add column if not exists provider text not null default 'twilio',
  add column if not exists provider_event_id text null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'ai_receptionist_call_logs_provider_check'
  ) then
    alter table public.ai_receptionist_call_logs
      add constraint ai_receptionist_call_logs_provider_check
      check (provider in ('telnyx', 'twilio'));
  end if;
end;
$$;

create index if not exists ai_receptionist_call_logs_org_provider_event_idx
on public.ai_receptionist_call_logs (organization_id, provider, provider_event_id)
where provider_event_id is not null;
