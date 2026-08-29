-- Adds safe per-business SMS sender preferences to the customer communications foundation.
-- A business mobile must still be held by the RoundHQ Telnyx account and assigned to its messaging profile.

alter table public.communication_settings
  add column if not exists sms_sender_mode text not null default 'platform_default',
  add column if not exists sms_sender_value text null;

alter table public.communication_settings
  drop constraint if exists communication_settings_sms_sender_mode_check;

alter table public.communication_settings
  add constraint communication_settings_sms_sender_mode_check
  check (sms_sender_mode in ('platform_default', 'business_name', 'business_mobile'));

update public.communication_settings
set sms_sender_mode = 'platform_default'
where sms_sender_mode is null
