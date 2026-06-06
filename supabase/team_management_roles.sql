alter table public.staff_members
drop constraint if exists staff_members_role_check;

alter table public.staff_members
add constraint staff_members_role_check
check (role in ('Admin', 'Manager', 'Staff', 'Operator'));

alter table public.role_permissions
drop constraint if exists role_permissions_role_check;

alter table public.role_permissions
add constraint role_permissions_role_check
check (role in ('Admin', 'Manager', 'Staff', 'Operator'));

alter table public.role_permissions
drop constraint if exists role_permissions_page_key_check;

alter table public.role_permissions
add constraint role_permissions_page_key_check
check (
  page_key in (
    'technician',
    'dashboard',
    'schedule',
    'rounds',
    'history',
    'map',
    'actions',
    'commercial',
    'commercialDocs',
    'customers',
    'expenses',
    'quotes',
    'invoices',
    'staff',
    'settings'
  )
);

insert into public.role_permissions (organization_id, role, page_key, allowed)
select
  organizations.id,
  defaults.role,
  defaults.page_key,
  defaults.allowed
from public.organizations
cross join (
  values
    ('Admin', 'technician', true),
    ('Admin', 'dashboard', true),
    ('Admin', 'schedule', true),
    ('Admin', 'rounds', true),
    ('Admin', 'history', true),
    ('Admin', 'map', true),
    ('Admin', 'actions', true),
    ('Admin', 'commercial', true),
    ('Admin', 'commercialDocs', true),
    ('Admin', 'customers', true),
    ('Admin', 'expenses', true),
    ('Admin', 'quotes', true),
    ('Admin', 'invoices', true),
    ('Admin', 'staff', true),
    ('Admin', 'settings', true),
    ('Manager', 'technician', true),
    ('Manager', 'dashboard', true),
    ('Manager', 'schedule', true),
    ('Manager', 'rounds', true),
    ('Manager', 'history', true),
    ('Manager', 'map', true),
    ('Manager', 'actions', true),
    ('Manager', 'commercial', true),
    ('Manager', 'commercialDocs', true),
    ('Manager', 'customers', true),
    ('Manager', 'expenses', true),
    ('Manager', 'quotes', true),
    ('Manager', 'invoices', true),
    ('Manager', 'staff', false),
    ('Manager', 'settings', false),
    ('Staff', 'technician', true),
    ('Staff', 'dashboard', false),
    ('Staff', 'schedule', false),
    ('Staff', 'rounds', false),
    ('Staff', 'history', false),
    ('Staff', 'map', false),
    ('Staff', 'actions', false),
    ('Staff', 'commercial', false),
    ('Staff', 'commercialDocs', false),
    ('Staff', 'customers', false),
    ('Staff', 'expenses', false),
    ('Staff', 'quotes', false),
    ('Staff', 'invoices', false),
    ('Staff', 'staff', false),
    ('Staff', 'settings', false)
) as defaults(role, page_key, allowed)
on conflict (organization_id, role, page_key) do nothing;

create or replace function public.current_staff_member_id(target_organization_id uuid)
returns bigint
as 'select staff_members.id from public.staff_members where staff_members.organization_id = target_organization_id and staff_members.is_active = true and (staff_members.auth_user_id = auth.uid() or lower(staff_members.email) = lower(coalesce(auth.jwt() ->> ''email'', ''''))) order by staff_members.is_system_admin desc, staff_members.id asc limit 1'
language sql
stable
security definer
set search_path = public;

create or replace function public.current_staff_role(target_organization_id uuid)
returns text
as 'select case when staff_members.is_system_admin then ''Admin'' when staff_members.role = ''Operator'' then ''Manager'' else staff_members.role end from public.staff_members where staff_members.organization_id = target_organization_id and staff_members.is_active = true and (staff_members.auth_user_id = auth.uid() or lower(staff_members.email) = lower(coalesce(auth.jwt() ->> ''email'', ''''))) order by staff_members.is_system_admin desc, staff_members.id asc limit 1'
language sql
stable
security definer
set search_path = public;

create or replace function public.can_access_operational_data(target_organization_id uuid)
returns boolean
as 'select public.is_organization_admin(target_organization_id) or exists (
  select 1
  from public.staff_members
  join public.role_permissions
    on role_permissions.organization_id = target_organization_id
   and role_permissions.role = case
     when staff_members.is_system_admin then ''Admin''
     when staff_members.role = ''Operator'' then ''Manager''
     else staff_members.role
   end
   and role_permissions.allowed = true
   and role_permissions.page_key not in (''technician'', ''staff'', ''settings'')
  where staff_members.organization_id = target_organization_id
    and staff_members.is_active = true
    and (
      staff_members.auth_user_id = auth.uid()
      or lower(staff_members.email) = lower(coalesce(auth.jwt() ->> ''email'', ''''))
    )
)'
language sql
stable
security definer
set search_path = public;

drop policy if exists "Members can read staff members" on public.staff_members;
create policy "Members can read staff members"
on public.staff_members
for select
to authenticated
using (
  public.is_organization_member(organization_id)
  and (
    public.can_access_operational_data(organization_id)
    or auth_user_id = auth.uid()
    or lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  )
);

drop policy if exists "Members can read customers" on public.customers;
create policy "Members can read customers"
on public.customers
for select
to authenticated
using (
  public.is_organization_member(organization_id)
  and (
    public.can_access_operational_data(organization_id)
    or assigned_staff_id = public.current_staff_member_id(organization_id)
  )
);

drop policy if exists "Members can write customers" on public.customers;
create policy "Members can write customers"
on public.customers
for all
to authenticated
using (
  public.is_organization_member(organization_id)
  and public.can_access_operational_data(organization_id)
)
with check (
  public.is_organization_member(organization_id)
  and public.can_access_operational_data(organization_id)
);

drop policy if exists "Members can read visits" on public.visits;
create policy "Members can read visits"
on public.visits
for select
to authenticated
using (
  public.is_organization_member(organization_id)
  and (
    public.can_access_operational_data(organization_id)
    or exists (
      select 1
      from public.customers
      where customers.organization_id = visits.organization_id
        and customers.id = visits.customer_id
        and customers.assigned_staff_id = public.current_staff_member_id(visits.organization_id)
    )
  )
);

drop policy if exists "Members can write visits" on public.visits;
create policy "Members can write visits"
on public.visits
for all
to authenticated
using (
  public.is_organization_member(organization_id)
  and (
    public.can_access_operational_data(organization_id)
    or exists (
      select 1
      from public.customers
      where customers.organization_id = visits.organization_id
        and customers.id = visits.customer_id
        and customers.assigned_staff_id = public.current_staff_member_id(visits.organization_id)
    )
  )
)
with check (
  public.is_organization_member(organization_id)
  and (
    public.can_access_operational_data(organization_id)
    or exists (
      select 1
      from public.customers
      where customers.organization_id = visits.organization_id
        and customers.id = visits.customer_id
        and customers.assigned_staff_id = public.current_staff_member_id(visits.organization_id)
    )
  )
);

drop policy if exists "Members can read scheduled jobs" on public.scheduled_jobs;
create policy "Members can read scheduled jobs"
on public.scheduled_jobs
for select
to authenticated
using (
  public.is_organization_member(organization_id)
  and (
    public.can_access_operational_data(organization_id)
    or assigned_staff_id = public.current_staff_member_id(organization_id)
  )
);

drop policy if exists "Members can write scheduled jobs" on public.scheduled_jobs;
create policy "Members can write scheduled jobs"
on public.scheduled_jobs
for all
to authenticated
using (
  public.is_organization_member(organization_id)
  and (
    public.can_access_operational_data(organization_id)
    or assigned_staff_id = public.current_staff_member_id(organization_id)
  )
)
with check (
  public.is_organization_member(organization_id)
  and (
    public.can_access_operational_data(organization_id)
    or assigned_staff_id = public.current_staff_member_id(organization_id)
  )
);

drop policy if exists "Members can read customer leads" on public.customer_leads;
create policy "Members can read customer leads"
on public.customer_leads
for select
to authenticated
using (
  public.is_organization_member(organization_id)
  and public.can_access_operational_data(organization_id)
);

drop policy if exists "Members can write customer leads" on public.customer_leads;
create policy "Members can write customer leads"
on public.customer_leads
for all
to authenticated
using (
  public.is_organization_member(organization_id)
  and public.can_access_operational_data(organization_id)
)
with check (
  public.is_organization_member(organization_id)
  and public.can_access_operational_data(organization_id)
);

drop policy if exists "Members can read monthly payments" on public.monthly_payments;
create policy "Members can read monthly payments"
on public.monthly_payments
for select
to authenticated
using (
  public.is_organization_member(organization_id)
  and public.can_access_operational_data(organization_id)
);

drop policy if exists "Members can write monthly payments" on public.monthly_payments;
create policy "Members can write monthly payments"
on public.monthly_payments
for all
to authenticated
using (
  public.is_organization_member(organization_id)
  and public.can_access_operational_data(organization_id)
)
with check (
  public.is_organization_member(organization_id)
  and public.can_access_operational_data(organization_id)
);

drop policy if exists "Members can read items" on public.items;
create policy "Members can read items"
on public.items
for select
to authenticated
using (
  public.is_organization_member(organization_id)
  and public.can_access_operational_data(organization_id)
);

drop policy if exists "Members can write items" on public.items;
create policy "Members can write items"
on public.items
for all
to authenticated
using (
  public.is_organization_member(organization_id)
  and public.can_access_operational_data(organization_id)
)
with check (
  public.is_organization_member(organization_id)
  and public.can_access_operational_data(organization_id)
);

drop policy if exists "Members can read quotes" on public.quotes;
create policy "Members can read quotes"
on public.quotes
for select
to authenticated
using (
  public.is_organization_member(organization_id)
  and public.can_access_operational_data(organization_id)
);

drop policy if exists "Members can write quotes" on public.quotes;
create policy "Members can write quotes"
on public.quotes
for all
to authenticated
using (
  public.is_organization_member(organization_id)
  and public.can_access_operational_data(organization_id)
)
with check (
  public.is_organization_member(organization_id)
  and public.can_access_operational_data(organization_id)
);

drop policy if exists "Members can read invoices" on public.invoices;
create policy "Members can read invoices"
on public.invoices
for select
to authenticated
using (
  public.is_organization_member(organization_id)
  and public.can_access_operational_data(organization_id)
);

drop policy if exists "Members can write invoices" on public.invoices;
create policy "Members can write invoices"
on public.invoices
for all
to authenticated
using (
  public.is_organization_member(organization_id)
  and public.can_access_operational_data(organization_id)
)
with check (
  public.is_organization_member(organization_id)
  and public.can_access_operational_data(organization_id)
);

drop policy if exists "Members can read recurring invoice templates" on public.recurring_invoice_templates;
create policy "Members can read recurring invoice templates"
on public.recurring_invoice_templates
for select
to authenticated
using (
  public.is_organization_member(organization_id)
  and public.can_access_operational_data(organization_id)
);

drop policy if exists "Members can write recurring invoice templates" on public.recurring_invoice_templates;
create policy "Members can write recurring invoice templates"
on public.recurring_invoice_templates
for all
to authenticated
using (
  public.is_organization_member(organization_id)
  and public.can_access_operational_data(organization_id)
)
with check (
  public.is_organization_member(organization_id)
  and public.can_access_operational_data(organization_id)
);
