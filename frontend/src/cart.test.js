import { expect, test } from 'vitest';
import { MENU_ITEMS } from './menu-data.js';
import { filterMenu, getCartSummary, MAX_SWIPES, restoreCart, setQuantity, setSwipes, checkoutErrors, emptyCart } from './cart.js';
const menu = MENU_ITEMS.map((item) => ({ ...item, available: true }));
const meal = () => ({ swipes: 1, items: { 'pub-burger': 1, 'straight-cut-fries': 1, 'sweet-tea': 1 }, reviewedTypes: {} });

test('one swipe holds exactly one entry, side, and drink', () => {
  let cart = emptyCart();
  for (const id of ['pub-burger', 'straight-cut-fries', 'sweet-tea']) cart = setQuantity(cart, id, 1, menu);
  expect(getCartSummary(cart, menu).counts).toEqual({ Entry: 1, Side: 1, Drink: 1 });
  expect(getCartSummary(cart, menu).count).toBe(3);
  expect(checkoutErrors(cart, menu)).toEqual([]);
});
test('database-only IDs work without changes to frontend constants', () => {
  const catalog = [{ id: 'new-special', name: 'Special', swipeType: 'Entry', available: true }];
  expect(setQuantity(emptyCart(), 'new-special', 1, catalog).items['new-special']).toBe(1);
});
test('entry capacity is enforced and milkshakes remain entries', () => {
  const cart = setQuantity(emptyCart(), 'chocolate-milkshake', 1, menu);
  expect(getCartSummary(cart, menu).counts.Entry).toBe(1);
  expect(setQuantity(cart, 'pub-burger', 1, menu)).toEqual(cart);
});
test('removing an item is immutable and can remove a deleted catalog ID', () => {
  const original = meal();
  expect(setQuantity(original, 'pub-burger', 0, []).items['pub-burger']).toBe(undefined);
  expect(original.items['pub-burger']).toBe(1);
});
test('more swipes unlock quantities and cannot be reduced below usage', () => {
  let cart = setSwipes(meal(), 2, menu);
  cart = setQuantity(cart, 'pub-burger', 2, menu);
  expect(setSwipes(cart, 1, menu).swipes).toBe(2);
});
test('invalid swipe counts are rejected rather than silently rounded or capped', () => {
  for (const value of [0, -1, 1.5, '2', true, NaN, MAX_SWIPES + 1]) {
    const cart = meal(); expect(setSwipes(cart, value, menu)).toBe(cart);
  }
});
test('invalid quantities and unknown or unavailable items are rejected', () => {
  const cart = emptyCart();
  for (const value of [-1, 1.5, NaN, '2', true, 11]) expect(setQuantity(cart, 'pub-burger', value, menu)).toBe(cart);
  expect(setQuantity(cart, 'unknown', 1, menu)).toBe(cart);
  expect(setQuantity(cart, 'pub-burger', 1, menu.map((i) => ({ ...i, available: false })))).toBe(cart);
});
test('cart restoration retains removed IDs and original reviewed types', () => {
  const cart = { swipes: 2, items: { removed: 1 }, reviewedTypes: { removed: 'Drink' } };
  expect(restoreCart(JSON.stringify(cart))).toEqual(cart);
  expect(getCartSummary(cart, []).items[0].available).toBe(false);
});
test('corrupt storage and invalid shapes return a fresh cart', () => {
  for (const value of [null, '', '{broken', 'null', '[]', 'true', '42', '"text"', '{"swipes":11,"items":{}}']) expect(restoreCart(value)).toEqual(emptyCart());
});
test('restoration rejects invalid quantities and dangerous property names', () => {
  expect(restoreCart('{"swipes":2,"items":{"ok":2,"bad":1.5,"negative":-1,"string":"2","__proto__":1}}').items).toEqual({ ok: 2 });
});
test('search combines categories with case-insensitive trimmed queries', () => {
  expect(filterMenu(' BEYOND ', 'Grill Main', menu).map((i) => i.id)).toEqual(['beyond-burger-patty']);
  expect(filterMenu('beyond', 'Beverages', menu).length).toBe(0);
  expect(filterMenu('', 'All', menu).length).toBe(22);
});
test('empty, incomplete, over-capacity, and invalid carts cannot pass review', () => {
  for (const cart of [emptyCart(), { ...meal(), swipes: 2 }, { ...meal(), swipes: 0 }, { ...meal(), items: { 'pub-burger': 1.5 } }, { ...meal(), items: { ...meal().items, 'pub-burger': 2 } }]) expect(checkoutErrors(cart, menu).length).toBeGreaterThan(0);
});
test('unavailable items fail review', () => {
  expect(checkoutErrors(meal(), menu.map((i) => ({ ...i, available: i.id !== 'pub-burger' })))[0]).toMatch(/unavailable/);
});
test('quantity edits preserve original classification for server change detection', () => {
  let cart = setQuantity(emptyCart(), 'pub-burger', 1, menu);
  cart = setSwipes(cart, 2, menu);
  cart = setQuantity(cart, 'pub-burger', 2, menu.map((i) => ({ ...i, swipeType: i.id === 'pub-burger' ? 'Side' : i.swipeType })));
  expect(cart.reviewedTypes['pub-burger']).toBe('Entry');
});
