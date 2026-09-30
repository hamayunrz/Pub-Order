import { MENU_ITEMS } from './menu-data.js';

export const CART_STORAGE_KEY = 'pub-order.sample-cart.v1';
export const MAX_QUANTITY = 20;
const knownIds = new Set(MENU_ITEMS.map((item) => item.id));

export function restoreCart(serialized) {
  try {
    const value = JSON.parse(serialized);
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
    return Object.fromEntries(Object.entries(value).filter(([id, quantity]) =>
      knownIds.has(id) && Number.isInteger(quantity) && quantity > 0 && quantity <= MAX_QUANTITY,
    ));
  } catch {
    return {};
  }
}

export function setQuantity(cart, id, quantity) {
  if (!knownIds.has(id) || !Number.isInteger(quantity)) return cart;
  const next = { ...cart };
  if (quantity <= 0) delete next[id];
  else next[id] = Math.min(quantity, MAX_QUANTITY);
  return next;
}

export function getCartSummary(cart) {
  const items = MENU_ITEMS.filter((item) => cart[item.id] > 0).map((item) => ({
    ...item,
    quantity: cart[item.id],
    lineTotalCents: item.priceCents * cart[item.id],
  }));
  return {
    items,
    count: items.reduce((sum, item) => sum + item.quantity, 0),
    subtotalCents: items.reduce((sum, item) => sum + item.lineTotalCents, 0),
  };
}

export function filterMenu(query, category) {
  const search = query.trim().toLowerCase();
  return MENU_ITEMS.filter((item) =>
    (category === 'All' || item.category === category) &&
    `${item.name} ${item.description} ${item.label}`.toLowerCase().includes(search),
  );
}

export const formatMoney = (cents) => new Intl.NumberFormat('en-US', {
  style: 'currency', currency: 'USD',
}).format(cents / 100);
