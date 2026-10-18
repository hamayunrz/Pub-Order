import test from 'node:test';
import assert from 'node:assert/strict';
import { MENU_ITEMS } from '../src/menu-data.js';
import { filterMenu, getCartSummary, MAX_SWIPES, restoreCart, setQuantity, setSwipes, checkoutErrors, emptyCart } from '../src/cart.js';
const menu = MENU_ITEMS.map((item) => ({ ...item, available: true }));
const meal = () => ({ swipes: 1, items: { 'pub-burger': 1, 'straight-cut-fries': 1, 'sweet-tea': 1 }, reviewedTypes: {} });

test('one swipe holds exactly one entry, side, and drink', () => {
  let cart = emptyCart();
  for (const id of ['pub-burger', 'straight-cut-fries', 'sweet-tea']) cart = setQuantity(cart, id, 1, menu);
  assert.deepEqual(getCartSummary(cart, menu).counts, { Entry: 1, Side: 1, Drink: 1 });
  assert.equal(getCartSummary(cart, menu).count, 3);
  assert.deepEqual(checkoutErrors(cart, menu), []);
});
test('database-only IDs work without changes to frontend constants', () => {
  const catalog = [{ id: 'new-special', name: 'Special', swipeType: 'Entry', available: true }];
  assert.equal(setQuantity(emptyCart(), 'new-special', 1, catalog).items['new-special'], 1);
});
test('entry capacity is enforced and milkshakes remain entries', () => {
  const cart = setQuantity(emptyCart(), 'chocolate-milkshake', 1, menu);
  assert.equal(getCartSummary(cart, menu).counts.Entry, 1);
  assert.deepEqual(setQuantity(cart, 'pub-burger', 1, menu), cart);
});
test('removing an item is immutable and can remove a deleted catalog ID', () => {
  const original = meal();
  assert.equal(setQuantity(original, 'pub-burger', 0, []).items['pub-burger'], undefined);
  assert.equal(original.items['pub-burger'], 1);
});
test('more swipes unlock quantities and cannot be reduced below usage', () => {
  let cart = setSwipes(meal(), 2, menu);
  cart = setQuantity(cart, 'pub-burger', 2, menu);
  assert.equal(setSwipes(cart, 1, menu).swipes, 2);
});
test('invalid swipe counts are rejected rather than silently rounded or capped', () => {
  for (const value of [0, -1, 1.5, '2', true, NaN, MAX_SWIPES + 1]) {
    const cart = meal(); assert.equal(setSwipes(cart, value, menu), cart);
  }
});
test('invalid quantities and unknown or unavailable items are rejected', () => {
  const cart = emptyCart();
  for (const value of [-1, 1.5, NaN, '2', true, 11]) assert.equal(setQuantity(cart, 'pub-burger', value, menu), cart);
  assert.equal(setQuantity(cart, 'unknown', 1, menu), cart);
  assert.equal(setQuantity(cart, 'pub-burger', 1, menu.map((i) => ({ ...i, available: false }))), cart);
});
test('cart restoration retains removed IDs and original reviewed types', () => {
  const cart = { swipes: 2, items: { removed: 1 }, reviewedTypes: { removed: 'Drink' } };
  assert.deepEqual(restoreCart(JSON.stringify(cart)), cart);
  assert.equal(getCartSummary(cart, []).items[0].available, false);
});
test('corrupt storage and invalid shapes return a fresh cart', () => {
  for (const value of [null, '', '{broken', 'null', '[]', 'true', '42', '"text"', '{"swipes":11,"items":{}}']) assert.deepEqual(restoreCart(value), emptyCart());
});
test('restoration rejects invalid quantities and dangerous property names', () => {
  assert.deepEqual(restoreCart('{"swipes":2,"items":{"ok":2,"bad":1.5,"negative":-1,"string":"2","__proto__":1}}').items, { ok: 2 });
});
test('search combines categories with case-insensitive trimmed queries', () => {
  assert.deepEqual(filterMenu(' BEYOND ', 'Grill Main', menu).map((i) => i.id), ['beyond-burger-patty']);
  assert.equal(filterMenu('beyond', 'Beverages', menu).length, 0);
  assert.equal(filterMenu('', 'All', menu).length, 22);
});
test('empty, incomplete, over-capacity, and invalid carts cannot pass review', () => {
  for (const cart of [emptyCart(), { ...meal(), swipes: 2 }, { ...meal(), swipes: 0 }, { ...meal(), items: { 'pub-burger': 1.5 } }, { ...meal(), items: { ...meal().items, 'pub-burger': 2 } }]) assert.ok(checkoutErrors(cart, menu).length > 0);
});
test('unavailable items fail review', () => {
  assert.match(checkoutErrors(meal(), menu.map((i) => ({ ...i, available: i.id !== 'pub-burger' })))[0], /unavailable/);
});
test('quantity edits preserve original classification for server change detection', () => {
  let cart = setQuantity(emptyCart(), 'pub-burger', 1, menu);
  cart = setSwipes(cart, 2, menu);
  cart = setQuantity(cart, 'pub-burger', 2, menu.map((i) => ({ ...i, swipeType: i.id === 'pub-burger' ? 'Side' : i.swipeType })));
  assert.equal(cart.reviewedTypes['pub-burger'], 'Entry');
});
