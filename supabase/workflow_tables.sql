create table if not exists public.quotes (
  id text primary key,
  quote_number text not null unique,
  customer_id bigint references public.customers(id) on delete set null,
  customer_name text not null,
  customer_type text null,
  customer_address text null,
  customer_town text null,
  customer_postcode text null,
  site_name text null,
  site_address text null,
  site_town text null,
  site_postcode text null,
  date date not null,
  status text not null check (status in ('Draft', 'Approved', 'Sent', 'Accepted', 'Scheduled', 'Declined', 'Rejected')),
  items jsonb not null default '[]'::jsonb,
  notes text null,
  total numeric(12, 2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.invoices (
  id text primary key,
  invoice_number text not null unique,
  customer_id bigint references public.customers(id) on delete set null,
  customer_name text not null,
  customer_type text null,
  customer_address text null,
  customer_town text null,
  customer_postcode text null,
  site_name text null,
  site_address text null,
  site_town text null,
  site_postcode text null,
  date date not null,
  due_date date null,
  status text not null check (status in ('Draft', 'Approved', 'Sent', 'Accepted', 'Declined', 'Unpaid', 'Paid')),
  items jsonb not null default '[]'::jsonb,
  notes text null,
  terms text null,
  vat_rate numeric(5, 2) null,
  vat_amount numeric(12, 2) null,
  total numeric(12, 2) not null default 0,
  linked_quote_id text null references public.quotes(id) on delete set null,
  stripe_checkout_session_id text null,
  stripe_payment_link_url text null,
  stripe_payment_status text null check (
    stripe_payment_status is null or stripe_payment_status in ('not_created', 'open', 'paid', 'expired')
  ),
  stripe_payment_intent_id text null,
  stripe_payment_completed_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table if exists public.invoices
  add column if not exists due_date date null;

alter table if exists public.invoices
  add column if not exists notes text null;

alter table if exists public.invoices
  add column if not exists terms text null;

alter table if exists public.invoices
  add column if not exists vat_rate numeric(5, 2) null;

alter table if exists public.invoices
  add column if not exists vat_amount numeric(12, 2) null;

alter table if exists public.invoices
  add column if not exists stripe_checkout_session_id text null;

alter table if exists public.invoices
  add column if not exists stripe_payment_link_url text null;

alter table if exists public.invoices
  add column if not exists stripe_payment_status text null;

alter table if exists public.invoices
  add column if not exists stripe_payment_intent_id text null;

alter table if exists public.invoices
  add column if not exists stripe_payment_completed_at timestamptz null;

alter table if exists public.invoices
  drop constraint if exists invoices_stripe_payment_status_check;

alter table if exists public.invoices
  add constraint invoices_stripe_payment_status_check
  check (
    stripe_payment_status is null or stripe_payment_status in ('not_created', 'open', 'paid', 'expired')
  );

alter table if exists public.quotes
  add column if not exists customer_type text null;

alter table if exists public.quotes
  add column if not exists customer_address text null;

alter table if exists public.quotes
  add column if not exists customer_town text null;

alter table if exists public.quotes
  add column if not exists customer_postcode text null;

alter table if exists public.quotes
  add column if not exists site_name text null;

alter table if exists public.quotes
  add column if not exists site_address text null;

alter table if exists public.quotes
  add column if not exists site_town text null;

alter table if exists public.quotes
  add column if not exists site_postcode text null;

alter table if exists public.invoices
  add column if not exists customer_type text null;

alter table if exists public.invoices
  add column if not exists customer_address text null;

alter table if exists public.invoices
  add column if not exists customer_town text null;

alter table if exists public.invoices
  add column if not exists customer_postcode text null;

alter table if exists public.invoices
  add column if not exists site_name text null;

alter table if exists public.invoices
  add column if not exists site_address text null;

alter table if exists public.invoices
  add column if not exists site_town text null;

alter table if exists public.invoices
  add column if not exists site_postcode text null;

alter table if exists public.quotes
  drop constraint if exists quotes_status_check;

alter table if exists public.quotes
  add constraint quotes_status_check
  check (status in ('Draft', 'Approved', 'Sent', 'Accepted', 'Scheduled', 'Declined', 'Rejected'));

alter table if exists public.invoices
  drop constraint if exists invoices_status_check;

alter table if exists public.invoices
  add constraint invoices_status_check
  check (status in ('Draft', 'Approved', 'Sent', 'Accepted', 'Declined', 'Unpaid', 'Paid'));

create table if not exists public.recurring_invoice_templates (
  id text primary key,
  source_invoice_id text null references public.invoices(id) on delete set null,
  customer_id bigint references public.customers(id) on delete set null,
  customer_name text not null,
  customer_type text null,
  customer_address text null,
  customer_town text null,
  customer_postcode text null,
  site_name text null,
  site_address text null,
  site_town text null,
  site_postcode text null,
  status text not null check (status in ('Draft', 'Approved', 'Sent', 'Accepted', 'Declined', 'Unpaid', 'Paid')),
  items jsonb not null default '[]'::jsonb,
  notes text null,
  terms text null,
  vat_rate numeric(5, 2) null,
  due_days_after_issue integer null,
  linked_quote_id text null references public.quotes(id) on delete set null,
  frequency text not null check (frequency in ('Monthly', 'Quarterly', 'Yearly')),
  next_send_date date not null,
  preferred_send_method text null check (preferred_send_method in ('email', 'text')),
  send_to text null,
  is_active boolean not null default true,
  last_generated_date date null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table if exists public.recurring_invoice_templates
  add column if not exists source_invoice_id text null references public.invoices(id) on delete set null;

alter table if exists public.recurring_invoice_templates
  add column if not exists customer_id bigint references public.customers(id) on delete set null;

alter table if exists public.recurring_invoice_templates
  add column if not exists customer_name text null;

alter table if exists public.recurring_invoice_templates
  add column if not exists customer_type text null;

alter table if exists public.recurring_invoice_templates
  add column if not exists customer_address text null;

alter table if exists public.recurring_invoice_templates
  add column if not exists customer_town text null;

alter table if exists public.recurring_invoice_templates
  add column if not exists customer_postcode text null;

alter table if exists public.recurring_invoice_templates
  add column if not exists site_name text null;

alter table if exists public.recurring_invoice_templates
  add column if not exists site_address text null;

alter table if exists public.recurring_invoice_templates
  add column if not exists site_town text null;

alter table if exists public.recurring_invoice_templates
  add column if not exists site_postcode text null;

alter table if exists public.recurring_invoice_templates
  add column if not exists status text null;

alter table if exists public.recurring_invoice_templates
  add column if not exists items jsonb not null default '[]'::jsonb;

alter table if exists public.recurring_invoice_templates
  add column if not exists notes text null;

alter table if exists public.recurring_invoice_templates
  add column if not exists terms text null;

alter table if exists public.recurring_invoice_templates
  add column if not exists vat_rate numeric(5, 2) null;

alter table if exists public.recurring_invoice_templates
  add column if not exists due_days_after_issue integer null;

alter table if exists public.recurring_invoice_templates
  add column if not exists linked_quote_id text null references public.quotes(id) on delete set null;

alter table if exists public.recurring_invoice_templates
  add column if not exists frequency text null;

alter table if exists public.recurring_invoice_templates
  add column if not exists next_send_date date null;

alter table if exists public.recurring_invoice_templates
  add column if not exists preferred_send_method text null;

alter table if exists public.recurring_invoice_templates
  add column if not exists send_to text null;

alter table if exists public.recurring_invoice_templates
  add column if not exists is_active boolean not null default true;

alter table if exists public.recurring_invoice_templates
  add column if not exists last_generated_date date null;

alter table if exists public.recurring_invoice_templates
  add column if not exists created_at timestamptz not null default now();

alter table if exists public.recurring_invoice_templates
  add column if not exists updated_at timestamptz not null default now();

update public.recurring_invoice_templates
set status = coalesce(nullif(btrim(status), ''), 'Unpaid')
where status is null
   or btrim(status) = '';

update public.recurring_invoice_templates
set frequency = coalesce(nullif(btrim(frequency), ''), 'Monthly')
where frequency is null
   or btrim(frequency) = '';

update public.recurring_invoice_templates
set customer_name = coalesce(nullif(btrim(customer_name), ''), 'Recurring Invoice')
where customer_name is null
   or btrim(customer_name) = '';

alter table if exists public.recurring_invoice_templates
  alter column customer_name set not null;

alter table if exists public.recurring_invoice_templates
  alter column next_send_date set not null;

alter table if exists public.recurring_invoice_templates
  alter column status set not null;

alter table if exists public.recurring_invoice_templates
  alter column frequency set not null;

alter table if exists public.recurring_invoice_templates
  drop constraint if exists recurring_invoice_templates_status_check;

alter table if exists public.recurring_invoice_templates
  add constraint recurring_invoice_templates_status_check
  check (status in ('Draft', 'Approved', 'Sent', 'Accepted', 'Declined', 'Unpaid', 'Paid'));

alter table if exists public.recurring_invoice_templates
  drop constraint if exists recurring_invoice_templates_frequency_check;

alter table if exists public.recurring_invoice_templates
  add constraint recurring_invoice_templates_frequency_check
  check (frequency in ('Monthly', 'Quarterly', 'Yearly'));

alter table if exists public.recurring_invoice_templates
  drop constraint if exists recurring_invoice_templates_preferred_send_method_check;

alter table if exists public.recurring_invoice_templates
  add constraint recurring_invoice_templates_preferred_send_method_check
  check (preferred_send_method in ('email', 'text') or preferred_send_method is null);

alter table if exists public.recurring_invoice_templates
  drop constraint if exists recurring_invoice_templates_due_days_after_issue_check;

alter table if exists public.recurring_invoice_templates
  add constraint recurring_invoice_templates_due_days_after_issue_check
  check (due_days_after_issue is null or due_days_after_issue >= 0);

create table if not exists public.scheduled_jobs (
  id text primary key,
  title text not null,
  date date not null,
  notes text null,
  start_time time null,
  finish_time time null,
  customer_id bigint references public.customers(id) on delete set null,
  customer_name text null,
  type text not null check (type in ('One Off', 'Quote Accepted', 'Grass Cut', 'Commercial')),
  status text not null check (status in ('Scheduled', 'In Progress', 'Completed', 'Cancelled')),
  quote_ids jsonb not null default '[]'::jsonb,
  invoice_ids jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table if exists public.scheduled_jobs
  add column if not exists start_time time null;

alter table if exists public.scheduled_jobs
  add column if not exists finish_time time null;

create table if not exists public.items (
  id text primary key,
  title text not null,
  category text null,
  item_type text not null check (item_type in ('service', 'product')),
  price numeric(12, 2) not null default 0,
  buy_price numeric(12, 2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists quotes_customer_id_idx on public.quotes(customer_id);
create index if not exists quotes_date_idx on public.quotes(date desc);
create index if not exists invoices_customer_id_idx on public.invoices(customer_id);
create index if not exists invoices_date_idx on public.invoices(date desc);
create index if not exists invoices_stripe_checkout_session_idx
on public.invoices(stripe_checkout_session_id)
where stripe_checkout_session_id is not null;
create index if not exists recurring_invoice_templates_customer_id_idx on public.recurring_invoice_templates(customer_id);
create index if not exists recurring_invoice_templates_next_send_date_idx on public.recurring_invoice_templates(next_send_date asc);
create index if not exists scheduled_jobs_customer_id_idx on public.scheduled_jobs(customer_id);
create index if not exists scheduled_jobs_date_idx on public.scheduled_jobs(date asc);
create index if not exists items_category_idx on public.items(category);
create unique index if not exists items_unique_catalog_idx
on public.items (lower(title), lower(coalesce(category, '')), item_type);

grant usage on schema public to authenticated;
grant select, insert, update, delete on table public.quotes to authenticated;
grant select, insert, update, delete on table public.invoices to authenticated;
grant select, insert, update, delete on table public.recurring_invoice_templates to authenticated;
grant select, insert, update, delete on table public.scheduled_jobs to authenticated;
grant select, insert, update, delete on table public.items to authenticated;

alter table public.quotes enable row level security;
alter table public.invoices enable row level security;
alter table public.recurring_invoice_templates enable row level security;
alter table public.scheduled_jobs enable row level security;
alter table public.items enable row level security;

drop policy if exists "Authenticated users can read quotes" on public.quotes;
create policy "Authenticated users can read quotes"
on public.quotes
for select
to authenticated
using (true);

drop policy if exists "Authenticated users can insert quotes" on public.quotes;
create policy "Authenticated users can insert quotes"
on public.quotes
for insert
to authenticated
with check (true);

drop policy if exists "Authenticated users can update quotes" on public.quotes;
create policy "Authenticated users can update quotes"
on public.quotes
for update
to authenticated
using (true)
with check (true);

drop policy if exists "Authenticated users can delete quotes" on public.quotes;
create policy "Authenticated users can delete quotes"
on public.quotes
for delete
to authenticated
using (true);

drop policy if exists "Authenticated users can read invoices" on public.invoices;
create policy "Authenticated users can read invoices"
on public.invoices
for select
to authenticated
using (true);

drop policy if exists "Authenticated users can insert invoices" on public.invoices;
create policy "Authenticated users can insert invoices"
on public.invoices
for insert
to authenticated
with check (true);

drop policy if exists "Authenticated users can update invoices" on public.invoices;
create policy "Authenticated users can update invoices"
on public.invoices
for update
to authenticated
using (true)
with check (true);

drop policy if exists "Authenticated users can delete invoices" on public.invoices;
create policy "Authenticated users can delete invoices"
on public.invoices
for delete
to authenticated
using (true);

drop policy if exists "Authenticated users can read recurring invoice templates" on public.recurring_invoice_templates;
create policy "Authenticated users can read recurring invoice templates"
on public.recurring_invoice_templates
for select
to authenticated
using (true);

drop policy if exists "Authenticated users can insert recurring invoice templates" on public.recurring_invoice_templates;
create policy "Authenticated users can insert recurring invoice templates"
on public.recurring_invoice_templates
for insert
to authenticated
with check (true);

drop policy if exists "Authenticated users can update recurring invoice templates" on public.recurring_invoice_templates;
create policy "Authenticated users can update recurring invoice templates"
on public.recurring_invoice_templates
for update
to authenticated
using (true)
with check (true);

drop policy if exists "Authenticated users can delete recurring invoice templates" on public.recurring_invoice_templates;
create policy "Authenticated users can delete recurring invoice templates"
on public.recurring_invoice_templates
for delete
to authenticated
using (true);

drop policy if exists "Authenticated users can read scheduled jobs" on public.scheduled_jobs;
create policy "Authenticated users can read scheduled jobs"
on public.scheduled_jobs
for select
to authenticated
using (true);

drop policy if exists "Authenticated users can insert scheduled jobs" on public.scheduled_jobs;
create policy "Authenticated users can insert scheduled jobs"
on public.scheduled_jobs
for insert
to authenticated
with check (true);

drop policy if exists "Authenticated users can update scheduled jobs" on public.scheduled_jobs;
create policy "Authenticated users can update scheduled jobs"
on public.scheduled_jobs
for update
to authenticated
using (true)
with check (true);

drop policy if exists "Authenticated users can delete scheduled jobs" on public.scheduled_jobs;
create policy "Authenticated users can delete scheduled jobs"
on public.scheduled_jobs
for delete
to authenticated
using (true);

drop policy if exists "Authenticated users can read items" on public.items;
create policy "Authenticated users can read items"
on public.items
for select
to authenticated
using (true);

drop policy if exists "Authenticated users can insert items" on public.items;
create policy "Authenticated users can insert items"
on public.items
for insert
to authenticated
with check (true);

drop policy if exists "Authenticated users can update items" on public.items;
create policy "Authenticated users can update items"
on public.items
for update
to authenticated
using (true)
with check (true);

drop policy if exists "Authenticated users can delete items" on public.items;
create policy "Authenticated users can delete items"
on public.items
for delete
to authenticated
using (true);

create or replace function public.touch_workflow_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_quotes_updated_at on public.quotes;
create trigger set_quotes_updated_at
before update on public.quotes
for each row
execute function public.touch_workflow_updated_at();

drop trigger if exists set_invoices_updated_at on public.invoices;
create trigger set_invoices_updated_at
before update on public.invoices
for each row
execute function public.touch_workflow_updated_at();

drop trigger if exists set_recurring_invoice_templates_updated_at on public.recurring_invoice_templates;
create trigger set_recurring_invoice_templates_updated_at
before update on public.recurring_invoice_templates
for each row
execute function public.touch_workflow_updated_at();

drop trigger if exists set_scheduled_jobs_updated_at on public.scheduled_jobs;
create trigger set_scheduled_jobs_updated_at
before update on public.scheduled_jobs
for each row
execute function public.touch_workflow_updated_at();

drop trigger if exists set_items_updated_at on public.items;
create trigger set_items_updated_at
before update on public.items
for each row
execute function public.touch_workflow_updated_at();
