import { MENU_ITEMS } from './menu-data.js';

export const CART_STORAGE_KEY = 'pub-order.sample-cart.v1';
export const MAX_SWIPES = 10;
export const SWIPE_TYPES = ['Entry', 'Side', 'Drink'];

const knownIds = new Set(MENU_ITEMS.map((item) => item.id));
const swipeTypeById = new Map(MENU_ITEMS.map((item) => [item.id, item.swipeType]));

function emptyCart() {
  return { swipes: 1, items: {} };
}

function countsByType(items) {
  const counts = { Entry: 0, Side: 0, Drink: 0 };
  for (const [id, quantity] of Object.entries(items)) {
    counts[swipeTypeById.get(id)] += quantity;
  }
  return counts;
}

export function restoreCart(serialized) {
  try {
    const value = JSON.parse(serialized);
    if (!value || typeof value !== 'object' || Array.isArray(value)) return emptyCart();
    if (!Number.isInteger(value.swipes) || value.swipes < 1) return emptyCart();
    const swipes = Math.min(value.swipes, MAX_SWIPES);
    if (!value.items || typeof value.items !== 'object' || Array.isArray(value.items)) return { swipes, items: {} };

    const counts = { Entry: 0, Side: 0, Drink: 0 };
    const items = {};
    for (const [id, quantity] of Object.entries(value.items)) {
      const type = swipeTypeById.get(id);
      if (!type || !Number.isInteger(quantity) || quantity <= 0) continue;
      if (counts[type] + quantity > swipes) continue;
      items[id] = quantity;
      counts[type] += quantity;
    }
    return { swipes, items };
  } catch {
    return emptyCart();
  }
}

export function setSwipes(cart, swipes) {
  if (!Number.isInteger(swipes) || swipes < 1) return cart;
  const capped = Math.min(swipes, MAX_SWIPES);
  const counts = countsByType(cart.items);
  if (capped < counts.Entry || capped < counts.Side || capped < counts.Drink) return cart;
  return { ...cart, swipes: capped };
}

export function setQuantity(cart, id, quantity) {
  const type = swipeTypeById.get(id);
  if (!type || !Number.isInteger(quantity)) return cart;
  const currentQuantity = cart.items[id] || 0;
  const otherTypeCount = countsByType(cart.items)[type] - currentQuantity;
  const capped = Math.max(0, Math.min(quantity, cart.swipes - otherTypeCount));
  const items = { ...cart.items };
  if (capped <= 0) delete items[id];
  else items[id] = capped;
  return { ...cart, items };
}

export function getCartSummary(cart) {
  const items = MENU_ITEMS.filter((item) => cart.items[item.id] > 0).map((item) => ({
    ...item,
    quantity: cart.items[item.id],
  }));
  return {
    items,
    count: items.reduce((sum, item) => sum + item.quantity, 0),
    counts: countsByType(cart.items),
    swipes: cart.swipes,
  };
}

export function filterMenu(query, category) {
  const search = query.trim().toLowerCase();
  return MENU_ITEMS.filter((item) =>
    (category === 'All' || item.category === category) &&
    `${item.name} ${item.description} ${item.label}`.toLowerCase().includes(search),
  );
}
