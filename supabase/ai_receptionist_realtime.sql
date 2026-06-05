alter table public.ai_receptionist_settings
  add column if not exists realtime_enabled boolean not null default false,
  add column if not exists transfer_to_number text not null default '';

alter table public.ai_receptionist_call_logs
  add column if not exists call_type text not null default 'voicemail',
  add column if not exists session_id text null,
  add column if not exists transcript_entries jsonb not null default '[]'::jsonb,
  add column if not exists structured_data jsonb not null default '{}'::jsonb,
  add column if not exists ai_summaries jsonb not null default '{}'::jsonb,
  add column if not exists outcome text null,
  add column if not exists priority text not null default 'normal',
  add column if not exists emergency_detected boolean not null default false,
  add column if not exists emergency_keywords jsonb not null default '[]'::jsonb,
  add column if not exists answered_at timestamptz null,
  add column if not exists ended_at timestamptz null,
  add column if not exists drop_off boolean not null default false,
  add column if not exists escalated boolean not null default false,
  add column if not exists ai_success boolean not null default false;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'ai_receptionist_call_logs_call_type_check'
  ) then
    alter table public.ai_receptionist_call_logs
      add constraint ai_receptionist_call_logs_call_type_check
      check (call_type in ('voicemail', 'realtime'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'ai_receptionist_call_logs_priority_check'
  ) then
    alter table public.ai_receptionist_call_logs
      add constraint ai_receptionist_call_logs_priority_check
      check (priority in ('normal', 'high'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'ai_receptionist_call_logs_transcript_entries_check'
  ) then
    alter table public.ai_receptionist_call_logs
      add constraint ai_receptionist_call_logs_transcript_entries_check
      check (jsonb_typeof(transcript_entries) = 'array');
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'ai_receptionist_call_logs_structured_data_check'
  ) then
    alter table public.ai_receptionist_call_logs
      add constraint ai_receptionist_call_logs_structured_data_check
      check (jsonb_typeof(structured_data) = 'object');
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'ai_receptionist_call_logs_ai_summaries_check'
  ) then
    alter table public.ai_receptionist_call_logs
      add constraint ai_receptionist_call_logs_ai_summaries_check
      check (jsonb_typeof(ai_summaries) = 'object');
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'ai_receptionist_call_logs_emergency_keywords_check'
  ) then
    alter table public.ai_receptionist_call_logs
      add constraint ai_receptionist_call_logs_emergency_keywords_check
      check (jsonb_typeof(emergency_keywords) = 'array');
  end if;
end;
$$;

create index if not exists ai_receptionist_call_logs_org_outcome_idx
on public.ai_receptionist_call_logs (organization_id, outcome);

create index if not exists ai_receptionist_call_logs_org_emergency_idx
on public.ai_receptionist_call_logs (organization_id, emergency_detected)
where emergency_detected = true;
