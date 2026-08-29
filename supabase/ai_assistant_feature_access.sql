-- Keep the AI Assistant private until the RoundHQ owner enables it for a
-- specific customer in Admin > Customers > Feature access.

alter table public.customer_account_settings
alter column feature_access
set default '{"aiReceptionist": false}'::jsonb;

update public.customer_account_settings
set
  feature_access = jsonb_set(
    coalesce(feature_access, '{}'::jsonb),
    '{aiReceptionist}',
    'false'::jsonb,
    true
  ),
  updated_at = now()
where feature_access ->> 'aiReceptionist' is distinct from 'false';
