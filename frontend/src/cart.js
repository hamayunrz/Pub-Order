export const CART_STORAGE_KEY = 'pub-order.sample-cart.v1';
export const MAX_SWIPES = 10;
export const SWIPE_TYPES = ['Entry', 'Side', 'Drink'];
export const emptyCart = () => ({ swipes: 1, items: {}, reviewedTypes: {} });
const record = (value) => value && typeof value === 'object' && !Array.isArray(value);
const validQuantity = (value) => Number.isInteger(value) && value >= 1 && value <= MAX_SWIPES;

// Restore before the asynchronous catalog arrives. Keep removed IDs so users can
// see and remove them instead of silently losing part of their intended order.
export function restoreCart(serialized) {
  try {
    const value = JSON.parse(serialized);
    if (!record(value) || !validQuantity(value.swipes) || !record(value.items)) return emptyCart();
    const entries = Object.entries(value.items).filter(([id, quantity]) =>
      id.length > 0 && id.length <= 100 && !['__proto__', 'constructor', 'prototype'].includes(id) && validQuantity(quantity));
    return {
      swipes: value.swipes,
      items: Object.fromEntries(entries),
      reviewedTypes: Object.fromEntries(entries.filter(([id]) => SWIPE_TYPES.includes(value.reviewedTypes?.[id])).map(([id]) => [id, value.reviewedTypes[id]])),
    };
  } catch { return emptyCart(); }
}

function countsByType(items, catalog) {
  const counts = { Entry: 0, Side: 0, Drink: 0 };
  for (const item of catalog) {
    const quantity = items[item.id];
    if (validQuantity(quantity)) counts[item.swipeType] += quantity;
  }
  return counts;
}

export function setSwipes(cart, swipes, catalog) {
  if (!validQuantity(swipes)) return cart;
  if (Object.values(countsByType(cart.items, catalog)).some((count) => count > swipes)) return cart;
  return { ...cart, swipes };
}

export function setQuantity(cart, id, quantity, catalog) {
  if (!Number.isInteger(quantity) || quantity < 0 || quantity > MAX_SWIPES) return cart;
  const items = { ...cart.items };
  const reviewedTypes = { ...cart.reviewedTypes };
  if (quantity === 0) {
    delete items[id]; delete reviewedTypes[id];
    return { ...cart, items, reviewedTypes };
  }
  const item = catalog.find((candidate) => candidate.id === id);
  if (!item || !item.available) return cart;
  const otherCount = countsByType(items, catalog)[item.swipeType] - (items[id] || 0);
  if (quantity + otherCount > cart.swipes) return cart;
  items[id] = quantity;
  // Keep the originally reviewed classification until an explicit acceptance.
  reviewedTypes[id] ??= item.swipeType;
  return { ...cart, items, reviewedTypes };
}

export function getCartSummary(cart, catalog) {
  const items = Object.entries(cart.items).map(([id, quantity]) => ({
    ...(catalog.find((item) => item.id === id) || { id, name: id, available: false, swipeType: 'Unavailable' }), quantity,
  }));
  return { items, count: items.reduce((sum, item) => sum + item.quantity, 0), counts: countsByType(cart.items, catalog), swipes: cart.swipes };
}

export function filterMenu(query, category, catalog) {
  const search = query.trim().toLowerCase();
  return catalog.filter((item) => (category === 'All' || item.category === category) &&
    `${item.name} ${item.description} ${item.label}`.toLowerCase().includes(search));
}

export function checkoutErrors(cart, catalog) {
  if (!validQuantity(cart.swipes)) return ['Choose between 1 and 10 meal swipes.'];
  if (!record(cart.items) || Object.keys(cart.items).length === 0) return ['Your cart is empty.'];
  const errors = [];
  for (const [id, quantity] of Object.entries(cart.items)) {
    if (!validQuantity(quantity)) errors.push(`Invalid quantity for ${id}. Choose a whole number from 1 to 10.`);
    const item = catalog.find((candidate) => candidate.id === id);
    if (!item?.available) errors.push(`${item?.name || id} is unavailable. Remove it before continuing.`);
  }
  const counts = countsByType(cart.items, catalog);
  for (const type of SWIPE_TYPES) {
    if (counts[type] !== cart.swipes) errors.push(`Choose exactly ${cart.swipes} ${type.toLowerCase()} item(s); your cart has ${counts[type]}.`);
  }
  return errors;
}
