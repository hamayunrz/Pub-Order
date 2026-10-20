-- Each account is a student or kitchen staff. Sign-up creates a student.
-- kitchen@puborder.test is the shared kitchen test account: creating that user in
-- Authentication, before or after this migration, marks it kitchen. Any other kitchen
-- account is made by editing its profiles.role in the Supabase table editor.

create table public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  role text not null default 'student' check (role in ('student', 'kitchen'))
);

alter table public.profiles enable row level security;
create policy "Read own role" on public.profiles
  for select to authenticated
  using (user_id = (select auth.uid()));

revoke all on public.profiles from public, anon, authenticated;
grant select on public.profiles to authenticated;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (user_id, role)
  values (
    new.id,
    case when lower(new.email) = 'kitchen@puborder.test' then 'kitchen' else 'student' end
  )
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

insert into public.profiles (user_id, role)
select id, case when lower(email) = 'kitchen@puborder.test' then 'kitchen' else 'student' end
from auth.users
on conflict (user_id) do update
set role = excluded.role
where excluded.role = 'kitchen' and public.profiles.role <> 'kitchen';

-- True only for the signed-in kitchen account. Students cannot change their own row.
create or replace function public.is_kitchen()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where user_id = (select auth.uid()) and role = 'kitchen'
  );
$$;

revoke all on function public.is_kitchen() from public, anon;
grant execute on function public.is_kitchen() to authenticated;

-- Kitchen staff can read every order. Students keep the "own orders only" policies.
create policy "Kitchen reads every order" on public.orders
  for select to authenticated
  using (public.is_kitchen());
create policy "Kitchen reads every order item" on public.order_items
  for select to authenticated
  using (public.is_kitchen());

-- Status changes go through this function, not a direct update. Collected orders can be
-- changed too, so the kitchen can correct a status.
create or replace function public.set_order_status(p_order_id uuid, p_status text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_kitchen() then
    raise exception 'set_order_status: kitchen access required' using errcode = '42501';
  end if;
  if p_status is null or p_status not in ('Received', 'Preparing', 'Ready', 'Collected') then
    raise exception 'set_order_status: unknown status' using errcode = '22023';
  end if;
  update public.orders
  set status = p_status, updated_at = now()
  where id = p_order_id;
  if not found then
    raise exception 'set_order_status: order not found' using errcode = 'P0002';
  end if;
end;
$$;

revoke all on function public.set_order_status(uuid, text) from public, anon;
grant execute on function public.set_order_status(uuid, text) to authenticated;
