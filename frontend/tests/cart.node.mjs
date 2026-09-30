import test from 'node:test';
import assert from 'node:assert/strict';
import { filterMenu, formatMoney, getCartSummary, MAX_QUANTITY, restoreCart, setQuantity } from '../src/cart.js';

test('multiple items and quantities produce an exact subtotal in cents', () => {
  let cart = setQuantity({}, 'pub-burger', 2);
  cart = setQuantity(cart, 'fries', 1);
  const summary = getCartSummary(cart);
  assert.equal(summary.count, 3);
  assert.equal(summary.subtotalCents, 2585);
  assert.equal(formatMoney(summary.subtotalCents), '$25.85');
});

test('decreasing to zero removes the item without changing other items', () => {
  const original = { 'pub-burger': 1, fries: 2 };
  const updated = setQuantity(original, 'pub-burger', 0);
  assert.deepEqual(updated, { fries: 2 });
  assert.deepEqual(original, { 'pub-burger': 1, fries: 2 });
  assert.equal(getCartSummary(updated).subtotalCents, 790);
});

test('quantities are capped and invalid updates are ignored', () => {
  assert.deepEqual(setQuantity({}, 'fries', 100), { fries: MAX_QUANTITY });
  assert.deepEqual(setQuantity({}, 'missing-item', 1), {});
  assert.deepEqual(setQuantity({}, 'fries', 1.5), {});
  assert.deepEqual(setQuantity({}, 'fries', NaN), {});
});

test('saved cart survives serialization and recomputes prices from the catalog', () => {
  const cart = { 'pub-burger': 2, lemonade: 1 };
  const restored = restoreCart(JSON.stringify(cart));
  assert.deepEqual(restored, cart);
  assert.equal(getCartSummary(restored).subtotalCents, 2485);
});

test('corrupt storage and unexpected shapes safely return an empty cart', () => {
  for (const value of [null, '', '{broken', 'null', '[]', 'true', '42', '"text"']) {
    assert.deepEqual(restoreCart(value), {});
  }
});

test('restoring a cart rejects unknown items and invalid quantities', () => {
  assert.deepEqual(restoreCart(JSON.stringify({ fries: 2, unknown: 3, lemonade: -1, 'pub-burger': 21, 'veggie-burger': '2', 'iced-tea': 0, 'onion-rings': 1.5 })), { fries: 2 });
});

test('search combines with category and ignores case and surrounding spaces', () => {
  assert.deepEqual(filterMenu('  GARDEN  ', 'Burgers').map((item) => item.id), ['veggie-burger']);
  assert.equal(filterMenu('garden', 'Drinks').length, 0);
  assert.equal(filterMenu('', 'All').length, 8);
  assert.equal(filterMenu('does not exist', 'All').length, 0);
});

test('empty and cleared carts have zero subtotal and no line items', () => {
  assert.deepEqual(getCartSummary({}), { items: [], count: 0, subtotalCents: 0 });
  assert.equal(formatMoney(0), '$0.00');
});
