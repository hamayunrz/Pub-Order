import { describe, expect, test } from 'vitest';
import { filterMenu, getCartSummary, MAX_SWIPES, restoreCart, setQuantity, setSwipes } from './cart.js';
import { MENU_ITEMS } from './menu-data.js';

function cartWith(swipes, items) {
  return { swipes, items };
}

test('one swipe allows exactly one entry, one side, and one drink', () => {
  let cart = cartWith(1, {});
  cart = setQuantity(cart, 'pub-burger', 1);
  cart = setQuantity(cart, 'straight-cut-fries', 1);
  cart = setQuantity(cart, 'sweet-tea', 1);
  const summary = getCartSummary(cart);
  expect(summary.count).toBe(3);
  expect(summary.counts).toEqual({ Entry: 1, Side: 1, Drink: 1 });
});

test('adding beyond the swipe count for a type is ignored', () => {
  let cart = cartWith(1, {});
  cart = setQuantity(cart, 'pub-burger', 1);
  cart = setQuantity(cart, 'chicken-tenders', 1);
  expect(cart.items).toEqual({ 'pub-burger': 1 });
  expect(getCartSummary(cart).counts.Entry).toBe(1);
});

test('milkshakes count toward the Entry allowance, not Drink', () => {
  let cart = cartWith(1, {});
  cart = setQuantity(cart, 'chocolate-milkshake', 1);
  expect(getCartSummary(cart).counts).toEqual({ Entry: 1, Side: 0, Drink: 0 });
  cart = setQuantity(cart, 'pub-burger', 1);
  expect(cart.items).toEqual({ 'chocolate-milkshake': 1 });
});

test('decreasing to zero removes the item without changing other items', () => {
  const original = cartWith(2, { 'pub-burger': 1, 'straight-cut-fries': 2 });
  const updated = setQuantity(original, 'pub-burger', 0);
  expect(updated.items).toEqual({ 'straight-cut-fries': 2 });
  expect(original.items).toEqual({ 'pub-burger': 1, 'straight-cut-fries': 2 });
});

test('increasing swipes unlocks more of each type, decreasing is capped by current usage', () => {
  let cart = cartWith(1, { 'pub-burger': 1, 'straight-cut-fries': 1, 'sweet-tea': 1 });
  cart = setSwipes(cart, 2);
  expect(cart.swipes).toBe(2);
  cart = setQuantity(cart, 'chicken-tenders', 1);
  expect(getCartSummary(cart).counts.Entry).toBe(2);

  const rejected = setSwipes(cart, 1);
  expect(rejected.swipes).toBe(2);
});

test('setSwipes ignores invalid values and respects MAX_SWIPES', () => {
  const cart = cartWith(1, {});
  expect(setSwipes(cart, 0).swipes).toBe(1);
  expect(setSwipes(cart, 1.5).swipes).toBe(1);
  expect(setSwipes(cart, MAX_SWIPES + 5).swipes).toBe(MAX_SWIPES);
});

test('setQuantity ignores unknown items and invalid quantities', () => {
  const cart = cartWith(3, {});
  expect(setQuantity(cart, 'missing-item', 1).items).toEqual({});
  expect(setQuantity(cart, 'pub-burger', 1.5).items).toEqual({});
  expect(setQuantity(cart, 'pub-burger', NaN).items).toEqual({});
});

test('saved cart survives serialization', () => {
  const cart = cartWith(2, { 'pub-burger': 1, 'tropicana-lemonade': 1 });
  const restored = restoreCart(JSON.stringify(cart));
  expect(restored).toEqual(cart);
});

test('corrupt storage and unexpected shapes safely return a fresh cart', () => {
  for (const value of [null, '', '{broken', 'null', '[]', 'true', '42', '"text"']) {
    expect(restoreCart(value)).toEqual({ swipes: 1, items: {} });
  }
});

test('restoring a cart rejects unknown items, invalid quantities, and over-cap entries', () => {
  const raw = JSON.stringify({
    swipes: 1,
    items: { 'straight-cut-fries': 1, unknown: 3, 'tropicana-lemonade': -1, 'pub-burger': 1, 'chicken-tenders': 1, 'sweet-tea': 0, 'pretzel-sticks': 1.5 },
  });
  expect(restoreCart(raw).items).toEqual({ 'straight-cut-fries': 1, 'pub-burger': 1 });
});

test('search combines with category and ignores case and surrounding spaces', () => {
  expect(filterMenu('  BEYOND  ', 'Grill Main').map((item) => item.id)).toEqual(['beyond-burger-patty']);
  expect(filterMenu('beyond', 'Beverages').length).toBe(0);
  expect(filterMenu('', 'All').length).toBe(22);
  expect(filterMenu('does not exist', 'All').length).toBe(0);
});

// Boundary-value tests for setQuantity (ICA 10, Worksheet 3).
// Rule: a quantity is kept between 0 and the swipes left for that item's type.

test('setQuantity boundary: zero and negative quantities remove the item, one keeps it', () => {
  const cart = cartWith(2, { 'pub-burger': 1 });
  expect(setQuantity(cart, 'pub-burger', -1).items).toEqual({});
  expect(setQuantity(cart, 'pub-burger', 0).items).toEqual({});
  expect(setQuantity(cart, 'pub-burger', 1).items).toEqual({ 'pub-burger': 1 });
});

test('setQuantity boundary: quantities just below, at, and just above the swipe count', () => {
  const cart = cartWith(3, {});
  expect(setQuantity(cart, 'pub-burger', 2).items['pub-burger']).toBe(2);
  expect(setQuantity(cart, 'pub-burger', 3).items['pub-burger']).toBe(3);
  expect(setQuantity(cart, 'pub-burger', 4).items['pub-burger']).toBe(3);
});

test('setQuantity boundary: other items of the same type shrink the allowance', () => {
  const cart = cartWith(3, { 'pub-burger': 2 });
  expect(setQuantity(cart, 'chicken-tenders', 1).items['chicken-tenders']).toBe(1);
  expect(setQuantity(cart, 'chicken-tenders', 2).items['chicken-tenders']).toBe(1);

  const full = cartWith(3, { 'pub-burger': 3 });
  expect(setQuantity(full, 'chicken-tenders', 1).items).toEqual({ 'pub-burger': 3 });
});

test('setQuantity boundary: an item does not count against its own allowance', () => {
  const cart = cartWith(2, { 'pub-burger': 2 });
  expect(setQuantity(cart, 'pub-burger', 2).items['pub-burger']).toBe(2);
  expect(setQuantity(cart, 'pub-burger', 3).items['pub-burger']).toBe(2);
});

test('setQuantity boundary: MAX_SWIPES is reachable but cannot be exceeded', () => {
  const cart = cartWith(MAX_SWIPES, {});
  expect(setQuantity(cart, 'pub-burger', MAX_SWIPES).items['pub-burger']).toBe(MAX_SWIPES);
  expect(setQuantity(cart, 'pub-burger', MAX_SWIPES + 1).items['pub-burger']).toBe(MAX_SWIPES);
});

test('empty cart has zero counts and no line items', () => {
  const summary = getCartSummary(cartWith(1, {}));
  expect(summary).toEqual({ items: [], count: 0, counts: { Entry: 0, Side: 0, Drink: 0 }, swipes: 1 });
});

describe('setSwipes edge cases', () => {
  test('MAX_SWIPES is reachable and one more is capped', () => {
    const cart = cartWith(1, {});
    expect(setSwipes(cart, MAX_SWIPES).swipes).toBe(MAX_SWIPES);
    expect(setSwipes(cart, MAX_SWIPES + 1).swipes).toBe(MAX_SWIPES);
  });

  test('swipes can drop to exactly the busiest type but not below it', () => {
    const cart = cartWith(3, { 'pub-burger': 2, 'sweet-tea': 1 });
    expect(setSwipes(cart, 2).swipes).toBe(2);
    expect(setSwipes(cart, 1)).toBe(cart);
  });

  test('negative, fractional, and NaN values leave the cart unchanged', () => {
    const cart = cartWith(2, {});
    for (const value of [-1, 2.5, NaN]) {
      expect(setSwipes(cart, value)).toBe(cart);
    }
  });

  test('does not modify the original cart', () => {
    const original = cartWith(1, { 'pub-burger': 1 });
    setSwipes(original, 4);
    expect(original).toEqual(cartWith(1, { 'pub-burger': 1 }));
  });
});

describe('restoreCart edge cases', () => {
  test('caps saved swipes at MAX_SWIPES and re-checks items against the cap', () => {
    const raw = JSON.stringify({ swipes: MAX_SWIPES + 5, items: { 'pub-burger': MAX_SWIPES, 'straight-cut-fries': MAX_SWIPES + 2 } });
    expect(restoreCart(raw)).toEqual({ swipes: MAX_SWIPES, items: { 'pub-burger': MAX_SWIPES } });
  });

  test('invalid saved swipe counts return a fresh cart', () => {
    for (const swipes of [0, -1, 1.5, '2', null]) {
      expect(restoreCart(JSON.stringify({ swipes, items: { 'pub-burger': 1 } }))).toEqual({ swipes: 1, items: {} });
    }
  });

  test('missing or array items keep the swipes but empty the cart', () => {
    expect(restoreCart(JSON.stringify({ swipes: 3 }))).toEqual({ swipes: 3, items: {} });
    expect(restoreCart(JSON.stringify({ swipes: 3, items: ['pub-burger'] }))).toEqual({ swipes: 3, items: {} });
  });
});

describe('summary and search details', () => {
  test('cart summary lists items in menu order, not the order they were added', () => {
    let cart = cartWith(1, {});
    for (const id of ['sweet-tea', 'straight-cut-fries', 'pub-burger']) {
      cart = setQuantity(cart, id, 1);
    }
    const menuOrder = MENU_ITEMS.map((item) => item.id).filter((id) => id in cart.items);
    expect(getCartSummary(cart).items.map((item) => item.id)).toEqual(menuOrder);
  });

  test('search matches dietary labels', () => {
    const vegan = filterMenu('vegan', 'All');
    expect(vegan.length).toBe(MENU_ITEMS.filter((item) => item.label === 'Vegan').length);
    expect(vegan.every((item) => item.label === 'Vegan')).toBe(true);
  });

  test('an empty search with a category returns exactly that category', () => {
    const sides = filterMenu('', 'Grill Side');
    expect(sides.length).toBe(MENU_ITEMS.filter((item) => item.category === 'Grill Side').length);
    expect(sides.every((item) => item.category === 'Grill Side')).toBe(true);
  });
});
