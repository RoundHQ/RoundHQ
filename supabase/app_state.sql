create table if not exists public.app_state (
  id text,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.app_state
add column if not exists id text;

alter table public.app_state
add column if not exists data jsonb;

alter table public.app_state
add column if not exists updated_at timestamptz;

update public.app_state
set id = 'primary'
where id is null;

update public.app_state
set data = '{}'::jsonb
where data is null;

update public.app_state
set updated_at = now()
where updated_at is null;

delete from public.app_state
where id <> 'primary';

with ranked_app_state as (
  select
    ctid,
    row_number() over (order by updated_at desc, ctid desc) as row_number
  from public.app_state
  where id = 'primary'
)
delete from public.app_state
using ranked_app_state
where public.app_state.ctid = ranked_app_state.ctid
  and ranked_app_state.row_number > 1;

alter table public.app_state
alter column id set not null;

alter table public.app_state
alter column data set default '{}'::jsonb,
alter column data set not null;

alter table public.app_state
alter column updated_at set default now(),
alter column updated_at set not null;

alter table public.app_state
drop constraint if exists app_state_singleton_check;

alter table public.app_state
add constraint app_state_singleton_check check (id = 'primary');

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.app_state'::regclass
      and contype = 'p'
  ) then
    alter table public.app_state
    add constraint app_state_pkey primary key (id);
  end if;
end;
$$;

do $$
declare
  id_attnum smallint;
begin
  select attnum
  into id_attnum
  from pg_attribute
  where attrelid = 'public.app_state'::regclass
    and attname = 'id'
    and not attisdropped;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.app_state'::regclass
      and contype in ('p', 'u')
      and conkey = array[id_attnum]
  ) then
    alter table public.app_state
    add constraint app_state_id_key unique (id);
  end if;
end;
$$;

grant usage on schema public to authenticated;
grant select, insert, update, delete on table public.app_state to authenticated;

alter table public.app_state enable row level security;

drop policy if exists "Authenticated users can read app state" on public.app_state;
create policy "Authenticated users can read app state"
on public.app_state
for select
to authenticated
using (id = 'primary');

drop policy if exists "Authenticated users can insert app state" on public.app_state;
create policy "Authenticated users can insert app state"
on public.app_state
for insert
to authenticated
with check (id = 'primary');

drop policy if exists "Authenticated users can update app state" on public.app_state;
create policy "Authenticated users can update app state"
on public.app_state
for update
to authenticated
using (id = 'primary')
with check (id = 'primary');

drop policy if exists "Authenticated users can delete app state" on public.app_state;
create policy "Authenticated users can delete app state"
on public.app_state
for delete
to authenticated
using (id = 'primary');

insert into public.app_state (id, data)
values ('primary', '{}'::jsonb)
on conflict (id) do nothing;

create or replace function public.touch_app_state_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_app_state_updated_at on public.app_state;
create trigger set_app_state_updated_at
before update on public.app_state
for each row
execute function public.touch_app_state_updated_at();
