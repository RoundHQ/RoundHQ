create table if not exists public.staff_account_invites (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  staff_member_id bigint not null references public.staff_members(id) on delete cascade,
  email text not null,
  token_hash text not null unique,
  mode text not null default 'setup' check (mode in ('setup', 'owner_password')),
  created_by_user_id uuid null references auth.users(id) on delete set null,
  accepted_by_user_id uuid null references auth.users(id) on delete set null,
  expires_at timestamptz not null,
  accepted_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists staff_account_invites_org_staff_idx
on public.staff_account_invites (organization_id, staff_member_id, created_at desc);

create index if not exists staff_account_invites_pending_token_idx
on public.staff_account_invites (token_hash)
where accepted_at is null;

alter table public.staff_account_invites enable row level security;

grant select, insert, update, delete on public.staff_account_invites to authenticated;

drop policy if exists "Admins can read staff account invites" on public.staff_account_invites;
create policy "Admins can read staff account invites"
on public.staff_account_invites
for select
to authenticated
using (public.is_organization_admin(organization_id));

drop policy if exists "Admins can write staff account invites" on public.staff_account_invites;
create policy "Admins can write staff account invites"
on public.staff_account_invites
for all
to authenticated
using (public.is_organization_admin(organization_id))
with check (public.is_organization_admin(organization_id));
