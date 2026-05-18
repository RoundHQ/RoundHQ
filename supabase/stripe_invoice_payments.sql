alter table if exists public.invoices
  add column if not exists stripe_checkout_session_id text null,
  add column if not exists stripe_payment_link_url text null,
  add column if not exists stripe_payment_status text null,
  add column if not exists stripe_payment_intent_id text null,
  add column if not exists stripe_payment_completed_at timestamptz null;

alter table if exists public.invoices
  drop constraint if exists invoices_stripe_payment_status_check;

alter table if exists public.invoices
  add constraint invoices_stripe_payment_status_check
  check (
    stripe_payment_status is null or stripe_payment_status in ('not_created', 'open', 'paid', 'expired')
  );

do 'begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = ''public''
      and table_name = ''invoices''
      and column_name = ''organization_id''
  ) then
    execute ''create index if not exists invoices_org_stripe_checkout_session_idx on public.invoices (organization_id, stripe_checkout_session_id) where stripe_checkout_session_id is not null'';
  end if;
end';

create index if not exists invoices_stripe_checkout_session_idx
on public.invoices (stripe_checkout_session_id)
where stripe_checkout_session_id is not null;
