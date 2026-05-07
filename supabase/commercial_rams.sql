create table if not exists public.commercial_rams_documents (
  id text primary key,
  customer_id bigint references public.customers(id) on delete set null,
  customer_name text not null,
  customer_address text null,
  customer_town text null,
  customer_postcode text null,
  site_name text null,
  site_address text null,
  site_town text null,
  site_postcode text null,
  job_title text null,
  reference_number text null,
  revision text null,
  start_date date null,
  estimated_duration text null,
  prepared_by text null,
  work_type text not null check (
    work_type in (
      'Grass Cutting',
      'Hedge Cutting',
      'Pressure Washing',
      'Gutter Cleaning',
      'Grounds Maintenance',
      'Other'
    )
  ),
  operatives text null,
  site_supervisor text null,
  emergency_contact text null,
  custom_scope text null,
  public_access text not null check (public_access in ('Yes', 'No')),
  public_access_notes text null,
  working_at_height text not null check (working_at_height in ('Yes', 'No')),
  working_at_height_notes text null,
  chemicals text not null check (chemicals in ('Yes', 'No')),
  chemicals_notes text null,
  vehicle_movement text not null check (vehicle_movement in ('Yes', 'No')),
  vehicle_movement_notes text null,
  powered_machinery text not null check (powered_machinery in ('Yes', 'No')),
  powered_machinery_notes text null,
  services text not null check (services in ('Yes', 'No')),
  services_notes text null,
  method_notes text null,
  additional_hazards text null,
  site_contact text null,
  site_contact_number text null,
  nearest_hospital text null,
  emergency_procedure text null,
  client_approval_name text null,
  approval_role text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists commercial_rams_customer_id_idx
on public.commercial_rams_documents(customer_id);

create index if not exists commercial_rams_updated_at_idx
on public.commercial_rams_documents(updated_at desc);

grant usage on schema public to authenticated;
grant select, insert, update, delete on table public.commercial_rams_documents to authenticated;

alter table public.commercial_rams_documents enable row level security;

drop policy if exists "Authenticated users can read commercial RAMS" on public.commercial_rams_documents;
create policy "Authenticated users can read commercial RAMS"
on public.commercial_rams_documents
for select
to authenticated
using (true);

drop policy if exists "Authenticated users can insert commercial RAMS" on public.commercial_rams_documents;
create policy "Authenticated users can insert commercial RAMS"
on public.commercial_rams_documents
for insert
to authenticated
with check (true);

drop policy if exists "Authenticated users can update commercial RAMS" on public.commercial_rams_documents;
create policy "Authenticated users can update commercial RAMS"
on public.commercial_rams_documents
for update
to authenticated
using (true)
with check (true);

drop policy if exists "Authenticated users can delete commercial RAMS" on public.commercial_rams_documents;
create policy "Authenticated users can delete commercial RAMS"
on public.commercial_rams_documents
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

drop trigger if exists set_commercial_rams_updated_at on public.commercial_rams_documents;
create trigger set_commercial_rams_updated_at
before update on public.commercial_rams_documents
for each row
execute function public.touch_workflow_updated_at();
