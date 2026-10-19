-- US3: orders that signed-in students place. Apply after 202610120001_menu_items.sql.
-- Students can read only their own orders. Nobody writes these tables directly through the
-- API: orders are created only by place_order(), which re-validates the meal against the
-- menu and saves the order and its items in one transaction.

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  swipes integer not null check (swipes between 1 and 10),
  status text not null default 'Received'
    check (status in ('Received', 'Preparing', 'Ready', 'Collected')),
  idempotency_key uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, idempotency_key)
);
create index orders_user_created_idx on public.orders (user_id, created_at desc);

-- Name and meal type are copied at order time, so later menu edits don't change past orders.
create table public.order_items (
  order_id uuid not null references public.orders (id) on delete cascade,
  menu_item_id text not null references public.menu_items (id),
  name text not null,
  swipe_type text not null check (swipe_type in ('Entry', 'Side', 'Drink')),
  quantity integer not null check (quantity between 1 and 10),
  primary key (order_id, menu_item_id)
);

alter table public.orders enable row level security;
alter table public.order_items enable row level security;
create policy "Students read own orders" on public.orders
  for select to authenticated using (user_id = (select auth.uid()));
create policy "Students read own order items" on public.order_items
  for select to authenticated using (
    exists (select 1 from public.orders o where o.id = order_id and o.user_id = (select auth.uid()))
  );
revoke all on public.orders, public.order_items from public, anon, authenticated;
grant select on public.orders, public.order_items to authenticated;

-- Returns the new order's id. Calling again with the same idempotency key returns the same
-- order instead of creating a duplicate. Invalid meals raise errcode 22023 with a message
-- starting "place_order:".
create function public.place_order(p_idempotency_key uuid, p_swipes integer, p_items jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_order uuid;
begin
  if v_user is null then
    raise exception 'place_order: sign in required' using errcode = '42501';
  end if;
  if p_idempotency_key is null then
    raise exception 'place_order: missing idempotency key' using errcode = '22023';
  end if;

  select o.id into v_order
  from public.orders o
  where o.user_id = v_user and o.idempotency_key = p_idempotency_key;
  if found then
    return v_order;
  end if;

  if p_swipes is null or p_swipes not between 1 and 10 then
    raise exception 'place_order: swipes must be between 1 and 10' using errcode = '22023';
  end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'place_order: the order has no items' using errcode = '22023';
  end if;
  if (select count(*) from jsonb_to_recordset(p_items) as r(id text))
     <> (select count(distinct r.id) from jsonb_to_recordset(p_items) as r(id text)) then
    raise exception 'place_order: each menu item may appear only once' using errcode = '22023';
  end if;
  if exists (
    select 1
    from jsonb_to_recordset(p_items) as r(id text, quantity integer)
    left join public.menu_items m on m.id = r.id
    where m.id is null or not m.available or r.quantity is null or r.quantity not between 1 and 10
  ) then
    raise exception 'place_order: an item is unavailable or has an invalid quantity' using errcode = '22023';
  end if;
  if exists (
    select 1
    from (values ('Entry'), ('Side'), ('Drink')) as t(swipe_type)
    where coalesce((
      select sum(r.quantity)
      from jsonb_to_recordset(p_items) as r(id text, quantity integer)
      join public.menu_items m on m.id = r.id
      where m.swipe_type = t.swipe_type
    ), 0) <> p_swipes
  ) then
    raise exception 'place_order: each meal swipe needs exactly one entry, side, and drink' using errcode = '22023';
  end if;

  insert into public.orders (user_id, swipes, idempotency_key)
  values (v_user, p_swipes, p_idempotency_key)
  returning id into v_order;

  insert into public.order_items (order_id, menu_item_id, name, swipe_type, quantity)
  select v_order, m.id, m.name, m.swipe_type, r.quantity
  from jsonb_to_recordset(p_items) as r(id text, quantity integer)
  join public.menu_items m on m.id = r.id;

  return v_order;
exception
  when unique_violation then
    -- A concurrent retry with the same key saved first: return that order.
    select o.id into v_order
    from public.orders o
    where o.user_id = v_user and o.idempotency_key = p_idempotency_key;
    return v_order;
end;
$$;

revoke all on function public.place_order(uuid, integer, jsonb) from public, anon;
grant execute on function public.place_order(uuid, integer, jsonb) to authenticated;
