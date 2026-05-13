-- Run this in Supabase SQL Editor to add RoundHQ paid staff add-on support
-- to an existing tenant database.

alter table public.subscriptions
add column if not exists stripe_staff_addon_item_id text null;

alter table public.subscriptions
add column if not exists staff_addon_quantity integer;

update public.subscriptions
set staff_addon_quantity = 0
where staff_addon_quantity is null;

alter table public.subscriptions
alter column staff_addon_quantity set default 0;

alter table public.subscriptions
alter column staff_addon_quantity set not null;

alter table public.subscriptions
drop constraint if exists subscriptions_staff_addon_quantity_check;

alter table public.subscriptions
add constraint subscriptions_staff_addon_quantity_check
check (staff_addon_quantity >= 0);
