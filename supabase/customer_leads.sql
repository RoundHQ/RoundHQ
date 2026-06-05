create table if not exists public.customer_leads (
  id uuid primary key default gen_random_uuid(),
  source text not null default 'website',
  status text not null default 'new',
  name text null,
  email text null,
  phone text null,
  address text null,
  town text null,
  postcode text null,
  customer_type text null,
  service text null,
  preferred_contact text null,
  message text not null default '',
  notes text null,
  extracted_data jsonb not null default '{}'::jsonb,
  raw_payload jsonb not null default '{}'::jsonb,
  reply_history jsonb not null default '[]'::jsonb,
  activity_history jsonb not null default '[]'::jsonb,
  submitted_at timestamptz not null default now(),
  converted_customer_id bigint null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.customer_leads
add column if not exists source text;

alter table public.customer_leads
add column if not exists status text;

alter table public.customer_leads
add column if not exists name text;

alter table public.customer_leads
add column if not exists email text;

alter table public.customer_leads
add column if not exists phone text;

alter table public.customer_leads
add column if not exists address text;

alter table public.customer_leads
add column if not exists town text;

alter table public.customer_leads
add column if not exists postcode text;

alter table public.customer_leads
add column if not exists customer_type text;

alter table public.customer_leads
add column if not exists service text;

alter table public.customer_leads
add column if not exists preferred_contact text;

alter table public.customer_leads
add column if not exists message text;

alter table public.customer_leads
add column if not exists notes text;

alter table public.customer_leads
add column if not exists extracted_data jsonb;

alter table public.customer_leads
add column if not exists raw_payload jsonb;

alter table public.customer_leads
add column if not exists reply_history jsonb;

alter table public.customer_leads
add column if not exists activity_history jsonb;

alter table public.customer_leads
add column if not exists submitted_at timestamptz;

alter table public.customer_leads
add column if not exists converted_customer_id bigint;

alter table public.customer_leads
add column if not exists created_at timestamptz;

alter table public.customer_leads
add column if not exists updated_at timestamptz;

update public.customer_leads
set source = 'website'
where source is null or btrim(source) = '';

update public.customer_leads
set status = 'new'
where status is null or btrim(status) = '';

update public.customer_leads
set message = ''
where message is null;

update public.customer_leads
set extracted_data = '{}'::jsonb
where extracted_data is null or jsonb_typeof(extracted_data) <> 'object';

update public.customer_leads
set raw_payload = '{}'::jsonb
where raw_payload is null or jsonb_typeof(raw_payload) <> 'object';

update public.customer_leads
set reply_history = '[]'::jsonb
where reply_history is null or jsonb_typeof(reply_history) <> 'array';

update public.customer_leads
set activity_history = '[]'::jsonb
where activity_history is null or jsonb_typeof(activity_history) <> 'array';

update public.customer_leads
set submitted_at = coalesce(created_at, now())
where submitted_at is null;

update public.customer_leads
set created_at = coalesce(submitted_at, now())
where created_at is null;

update public.customer_leads
set updated_at = coalesce(updated_at, created_at, submitted_at, now())
where updated_at is null;

alter table public.customer_leads
alter column source set default 'website',
alter column source set not null,
alter column status set default 'new',
alter column status set not null,
alter column message set default '',
alter column message set not null,
alter column extracted_data set default '{}'::jsonb,
alter column extracted_data set not null,
alter column raw_payload set default '{}'::jsonb,
alter column raw_payload set not null,
alter column reply_history set default '[]'::jsonb,
alter column reply_history set not null,
alter column activity_history set default '[]'::jsonb,
alter column activity_history set not null,
alter column submitted_at set default now(),
alter column submitted_at set not null,
alter column created_at set default now(),
alter column created_at set not null,
alter column updated_at set default now(),
alter column updated_at set not null;

alter table public.customer_leads
drop constraint if exists customer_leads_source_check;

alter table public.customer_leads
add constraint customer_leads_source_check
check (source in ('website', 'email', 'facebook', 'whatsapp', 'ai_receptionist', 'manual'));

alter table public.customer_leads
drop constraint if exists customer_leads_status_check;

alter table public.customer_leads
add constraint customer_leads_status_check
check (status in ('new', 'reviewing', 'replied', 'converted', 'archived'));

alter table public.customer_leads
drop constraint if exists customer_leads_customer_type_check;

alter table public.customer_leads
add constraint customer_leads_customer_type_check
check (customer_type is null or customer_type in ('Residential', 'Commercial'));

alter table public.customer_leads
drop constraint if exists customer_leads_preferred_contact_check;

alter table public.customer_leads
add constraint customer_leads_preferred_contact_check
check (preferred_contact is null or preferred_contact in ('email', 'text', 'phone'));

create index if not exists customer_leads_status_idx
on public.customer_leads (status);

create index if not exists customer_leads_submitted_at_idx
on public.customer_leads (submitted_at desc);

grant usage on schema public to anon, authenticated;
grant insert on table public.customer_leads to anon;
grant select, insert, update, delete on table public.customer_leads to authenticated;

alter table public.customer_leads enable row level security;

drop policy if exists "Anyone can submit website customer leads" on public.customer_leads;
create policy "Anyone can submit website customer leads"
on public.customer_leads
for insert
to anon
with check (source = 'website');

drop policy if exists "Authenticated users can read customer leads" on public.customer_leads;
create policy "Authenticated users can read customer leads"
on public.customer_leads
for select
to authenticated
using (true);

drop policy if exists "Authenticated users can insert customer leads" on public.customer_leads;
create policy "Authenticated users can insert customer leads"
on public.customer_leads
for insert
to authenticated
with check (true);

drop policy if exists "Authenticated users can update customer leads" on public.customer_leads;
create policy "Authenticated users can update customer leads"
on public.customer_leads
for update
to authenticated
using (true)
with check (true);

drop policy if exists "Authenticated users can delete customer leads" on public.customer_leads;
create policy "Authenticated users can delete customer leads"
on public.customer_leads
for delete
to authenticated
using (true);

create or replace function public.touch_customer_leads_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_customer_leads_updated_at on public.customer_leads;
create trigger set_customer_leads_updated_at
before update on public.customer_leads
for each row
execute function public.touch_customer_leads_updated_at();
