// Presentation data only; prices and availability are not the live Pub menu.
export const MENU_ITEMS = [
  { id: 'pub-burger', name: 'Pub Burger', category: 'Burgers', priceCents: 1095, description: 'Beef patty, cheddar, lettuce, tomato, and house sauce on a toasted bun.', label: 'Classic' },
  { id: 'veggie-burger', name: 'Garden Burger', category: 'Burgers', priceCents: 995, description: 'Vegetable patty, crisp lettuce, tomato, and a tangy herb sauce.', label: 'Vegetarian' },
  { id: 'crispy-chicken', name: 'Crispy Chicken Sandwich', category: 'Sandwiches', priceCents: 1045, description: 'Crispy chicken, pickles, and slaw on a toasted bun.', label: 'Fan favorite' },
  { id: 'grilled-cheese', name: 'Grilled Cheese', category: 'Sandwiches', priceCents: 695, description: 'Melted cheddar and provolone on golden sourdough.', label: 'Vegetarian' },
  { id: 'fries', name: 'Seasoned Fries', category: 'Sides', priceCents: 395, description: 'Golden fries tossed with our sample house seasoning.', label: 'Vegetarian' },
  { id: 'onion-rings', name: 'Onion Rings', category: 'Sides', priceCents: 495, description: 'Crisp, battered onion rings with a side of dipping sauce.', label: 'Vegetarian' },
  { id: 'lemonade', name: 'Lemonade', category: 'Drinks', priceCents: 295, description: 'A bright, refreshing lemon drink served over ice.', label: 'Cold drink' },
  { id: 'iced-tea', name: 'Iced Tea', category: 'Drinks', priceCents: 245, description: 'Freshly brewed black tea, chilled and served over ice.', label: 'Cold drink' },
];

export const CATEGORIES = ['All', ...new Set(MENU_ITEMS.map((item) => item.category))];
