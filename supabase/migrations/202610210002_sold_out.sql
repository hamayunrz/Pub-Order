-- Kitchen staff can mark a menu item sold out or available again.
-- Apply after 202610210001_profiles.sql. Students still cannot update the menu.

create or replace function public.set_item_availability(p_id text, p_available boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_kitchen() then
    raise exception 'set_item_availability: kitchen access required' using errcode = '42501';
  end if;
  if p_id is null or p_available is null then
    raise exception 'set_item_availability: item and availability are required' using errcode = '22023';
  end if;
  update public.menu_items
  set available = p_available
  where id = p_id;
  if not found then
    raise exception 'set_item_availability: item not found' using errcode = 'P0002';
  end if;
end;
$$;

revoke all on function public.set_item_availability(text, boolean) from public, anon;
grant execute on function public.set_item_availability(text, boolean) to authenticated;
