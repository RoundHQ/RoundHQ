-- Managed AI Receptionist phone-number provisioning.
-- Apply this once to existing RoundHQ databases. Fresh databases should use
-- roundhq_tenant_schema.sql instead.

alter table public.ai_receptionist_settings
  add column if not exists phone_setup_mode text not null default 'new_number',
  add column if not exists existing_business_phone_number text not null default '',
  add column if not exists telnyx_phone_number_id text not null default '',
  add column if not exists telnyx_number_order_id text not null default '',
  add column if not exists telnyx_provisioning_status text not null default 'not_configured',
  add column if not exists telnyx_provisioning_reference text not null default '',
  add column if not exists telnyx_provisioning_error text not null default '';

update public.ai_receptionist_settings
set telnyx_provisioning_status = 'active'
where btrim(telnyx_phone_number) <> ''
  and telnyx_provisioning_status = 'not_configured';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'ai_receptionist_settings_phone_setup_mode_check'
  ) then
    alter table public.ai_receptionist_settings
      add constraint ai_receptionist_settings_phone_setup_mode_check
      check (phone_setup_mode in ('new_number', 'call_forwarding'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'ai_receptionist_settings_provisioning_status_check'
  ) then
    alter table public.ai_receptionist_settings
      add constraint ai_receptionist_settings_provisioning_status_check
      check (
        telnyx_provisioning_status in (
          'not_configured',
          'ordering',
          'pending',
          'action_required',
          'active',
          'failed'
        )
      );
  end if;
end;
$$;


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
create unique index if not exists ai_receptionist_settings_provisioning_reference_unique_idx
on public.ai_receptionist_settings (telnyx_provisioning_reference)
where btrim(telnyx_provisioning_reference) <> '';

create unique index if not exists ai_receptionist_settings_telnyx_number_order_unique_idx
on public.ai_receptionist_settings (telnyx_number_order_id)
where btrim(telnyx_number_order_id) <> '';