-- Allow RoundHQ owners to grant an SMS fee waiver to a specific customer.
-- Waived messages remain in the usage log at £0.00 so they are never billed.

alter table public.customer_account_settings
  add column if not exists sms_fee_waived boolean not null default false;

alter table public.sms_usage_records
  drop constraint if exists sms_usage_records_unit_price_pence_check;

alter table public.sms_usage_records
  add constraint sms_usage_records_unit_price_pence_check
  check (unit_price_pence >= 0);

alter table public.sms_billing_events
  drop constraint if exists sms_billing_events_event_type_check,
  drop constraint if exists sms_billing_events_price_per_message_pence_check;

alter table public.sms_billing_events
  add constraint sms_billing_events_event_type_check
  check (event_type in ('billing_enabled', 'billing_disabled', 'terms_accepted', 'fee_waived', 'fee_reinstated')),
  add constraint sms_billing_events_price_per_message_pence_check
  check (price_per_message_pence >= 0);