alter table if exists public.visits
  add column if not exists round_key text null;

alter table if exists public.visits
  add column if not exists customer_type text null;

alter table if exists public.visits
  add column if not exists price_at_visit numeric(10, 2) null;

update public.visits as visit
set customer_type = customer.customer_type
from public.customers as customer
where visit.customer_id = customer.id
  and visit.customer_type is null;

update public.visits as visit
set price_at_visit = customer.price
from public.customers as customer
where visit.customer_id = customer.id
  and visit.price_at_visit is null;

update public.visits
set round_key = concat(
  case
    when week::text in ('2', 'Week 2', 'week 2') then 'Week 2'
    else 'Week 1'
  end,
  '-',
  case
    when lower(day::text) like 'mon%' then 'Monday'
    when lower(day::text) like 'tue%' then 'Tuesday'
    when lower(day::text) like 'wed%' then 'Wednesday'
    when lower(day::text) like 'thu%' then 'Thursday'
    when lower(day::text) like 'fri%' then 'Friday'
    else day::text
  end,
  '-',
  coalesce(customer_type, 'Residential')
)
where round_key is null
  and week is not null
  and day is not null;

alter table if exists public.visits
  drop constraint if exists visits_customer_type_check;

alter table if exists public.visits
  add constraint visits_customer_type_check
  check (customer_type is null or customer_type in ('Residential', 'Commercial'));

create index if not exists visits_round_key_idx
on public.visits (round_key);

create index if not exists visits_customer_round_key_idx
on public.visits (customer_id, round_key);
