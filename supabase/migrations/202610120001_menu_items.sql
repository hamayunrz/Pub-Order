-- Seed the existing project catalog, not an official live dining feed.
-- Run once in Supabase SQL Editor or with your normal migration process.
create table public.menu_items (
  id text primary key,
  name text not null,
  category text not null,
  swipe_type text not null check (swipe_type in ('Entry', 'Side', 'Drink')),
  description text not null default '',
  portion text not null default '',
  label text not null default '',
  image text not null default '',
  available boolean not null default true,
  sort_order integer not null default 0
);
alter table public.menu_items enable row level security;
create policy "Public menu read" on public.menu_items for select to anon, authenticated using (true);
revoke all on public.menu_items from public, anon, authenticated;
grant select on public.menu_items to anon, authenticated;

insert into public.menu_items (id, name, category, swipe_type, description, portion, label, image, sort_order) values
('beyond-burger-patty', 'Beyond Burger Patty', 'Grill Main', 'Entry', '', '1 patty', 'Vegan', 'beyond-burger-patty.jpg', 0),
('chicken-sandwich', 'Chicken Sandwich', 'Grill Main', 'Entry', '', '1 sandwich', '', 'chicken-sandwich.jpg', 1),
('chicken-tenders', 'Chicken Tenders', 'Grill Main', 'Entry', '', '3 tenders', '', 'chicken-tenders.jpg', 2),
('fried-cod-with-tartar-sauce', 'Fried Cod w/ Tartar Sauce', 'Grill Main', 'Entry', '', '4 oz. portion', '', 'fried-cod-with-tartar-sauce.jpg', 3),
('loaded-fries', 'Loaded Fries', 'Grill Main', 'Entry', '', '10 oz. portion', 'Vegetarian', 'loaded-fries.jpg', 4),
('philly-cheesesteak', 'Philly Cheesesteak', 'Grill Main', 'Entry', '', '1 sandwich', '', 'philly-cheesesteak.jpg', 5),
('pub-burger', 'Pub Burger', 'Grill Main', 'Entry', '', '1 burger', '', 'pub-burger.jpg', 6),
('seasoned-wings', 'Seasoned Wings', 'Grill Main', 'Entry', '', '5 wings', 'Halal', 'seasoned-wings.jpg', 7),
('cauliflower-wings', 'Cauliflower "Wings"', 'Grill Side', 'Side', '', '8 oz. portion', 'Vegetarian', 'cauliflower-wings.jpg', 8),
('pretzel-sticks', 'Pretzel Sticks', 'Grill Side', 'Side', '', '2 pretzels', 'Vegetarian', 'pretzel-sticks.jpg', 9),
('straight-cut-fries', 'Straight Cut Fries', 'Grill Side', 'Side', '', '3 oz. portion', 'Vegan', 'straight-cut-fries.jpg', 10),
('apple-juice', 'Apple Juice', 'Beverages', 'Drink', '', '8 oz. portion', 'Vegan', 'apple-juice.jpg', 11),
('cranberry-juice', 'Cranberry Juice', 'Beverages', 'Drink', '', '8 oz. portion', 'Vegan', 'cranberry-juice.jpg', 12),
('lemon-lime-gatorade', 'Lemon Lime Gatorade', 'Beverages', 'Drink', '', '12 oz. portion', 'Vegan', 'lemon-lime-gatorade.jpg', 13),
('orange-gatorade', 'Orange Gatorade', 'Beverages', 'Drink', '', '12 oz. portion', 'Vegan', 'orange-gatorade.jpg', 14),
('orange-juice', 'Orange Juice', 'Beverages', 'Drink', '', '8 oz. portion', 'Vegan', 'orange-juice.jpg', 15),
('sobe-yumberry-pomegranate', 'Sobe Yumberry Pomegranate', 'Beverages', 'Drink', '', '12 oz. portion', 'Vegan', 'sobe-yumberry-pomegranate.jpg', 16),
('sweet-tea', 'Sweet Tea', 'Beverages', 'Drink', '', '8 oz. portion', 'Vegan', 'sweet-tea.jpg', 17),
('tropicana-lemonade', 'Tropicana Lemonade', 'Beverages', 'Drink', '', '12 oz. portion', 'Vegan', 'tropicana-lemonade.jpg', 18),
('chocolate-milkshake', 'Chocolate Milkshake', 'Milkshakes', 'Entry', '', '1 shake', 'Vegetarian', 'chocolate-milkshake.jpg', 19),
('strawberry-milkshake', 'Strawberry Milkshake', 'Milkshakes', 'Entry', '', '1 shake', 'Vegetarian', 'strawberry-milkshake.jpg', 20),
('vanilla-milkshake', 'Vanilla Milkshake', 'Milkshakes', 'Entry', '', '1 shake', 'Vegetarian', 'vanilla-milkshake.jpg', 21);
