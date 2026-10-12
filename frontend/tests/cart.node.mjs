import test from 'node:test';
import assert from 'node:assert/strict';
import { filterMenu, getCartSummary, MAX_SWIPES, restoreCart, setQuantity, setSwipes } from '../src/cart.js';

function cartWith(swipes, items) {
  return { swipes, items };
}

test('one swipe allows exactly one entry, one side, and one drink', () => {
  let cart = cartWith(1, {});
  cart = setQuantity(cart, 'pub-burger', 1);
  cart = setQuantity(cart, 'straight-cut-fries', 1);
  cart = setQuantity(cart, 'sweet-tea', 1);
  const summary = getCartSummary(cart);
  assert.equal(summary.count, 3);
  assert.deepEqual(summary.counts, { Entry: 1, Side: 1, Drink: 1 });
});

test('adding beyond the swipe count for a type is ignored', () => {
  let cart = cartWith(1, {});
  cart = setQuantity(cart, 'pub-burger', 1);
  cart = setQuantity(cart, 'chicken-tenders', 1);
  assert.deepEqual(cart.items, { 'pub-burger': 1 });
  assert.equal(getCartSummary(cart).counts.Entry, 1);
});

test('milkshakes count toward the Entry allowance, not Drink', () => {
  let cart = cartWith(1, {});
  cart = setQuantity(cart, 'chocolate-milkshake', 1);
  assert.deepEqual(getCartSummary(cart).counts, { Entry: 1, Side: 0, Drink: 0 });
  cart = setQuantity(cart, 'pub-burger', 1);
  assert.deepEqual(cart.items, { 'chocolate-milkshake': 1 });
});

test('decreasing to zero removes the item without changing other items', () => {
  const original = cartWith(2, { 'pub-burger': 1, 'straight-cut-fries': 2 });
  const updated = setQuantity(original, 'pub-burger', 0);
  assert.deepEqual(updated.items, { 'straight-cut-fries': 2 });
  assert.deepEqual(original.items, { 'pub-burger': 1, 'straight-cut-fries': 2 });
});

test('increasing swipes unlocks more of each type, decreasing is capped by current usage', () => {
  let cart = cartWith(1, { 'pub-burger': 1, 'straight-cut-fries': 1, 'sweet-tea': 1 });
  cart = setSwipes(cart, 2);
  assert.equal(cart.swipes, 2);
  cart = setQuantity(cart, 'chicken-tenders', 1);
  assert.equal(getCartSummary(cart).counts.Entry, 2);

  const rejected = setSwipes(cart, 1);
  assert.equal(rejected.swipes, 2);
});

test('setSwipes ignores invalid values and respects MAX_SWIPES', () => {
  const cart = cartWith(1, {});
  assert.equal(setSwipes(cart, 0).swipes, 1);
  assert.equal(setSwipes(cart, 1.5).swipes, 1);
  assert.equal(setSwipes(cart, MAX_SWIPES + 5).swipes, MAX_SWIPES);
});

test('setQuantity ignores unknown items and invalid quantities', () => {
  const cart = cartWith(3, {});
  assert.deepEqual(setQuantity(cart, 'missing-item', 1).items, {});
  assert.deepEqual(setQuantity(cart, 'pub-burger', 1.5).items, {});
  assert.deepEqual(setQuantity(cart, 'pub-burger', NaN).items, {});
});

test('saved cart survives serialization', () => {
  const cart = cartWith(2, { 'pub-burger': 1, 'tropicana-lemonade': 1 });
  const restored = restoreCart(JSON.stringify(cart));
  assert.deepEqual(restored, cart);
});

test('corrupt storage and unexpected shapes safely return a fresh cart', () => {
  for (const value of [null, '', '{broken', 'null', '[]', 'true', '42', '"text"']) {
    assert.deepEqual(restoreCart(value), { swipes: 1, items: {} });
  }
});

test('restoring a cart rejects unknown items, invalid quantities, and over-cap entries', () => {
  const raw = JSON.stringify({
    swipes: 1,
    items: { 'straight-cut-fries': 1, unknown: 3, 'tropicana-lemonade': -1, 'pub-burger': 1, 'chicken-tenders': 1, 'sweet-tea': 0, 'pretzel-sticks': 1.5 },
  });
  assert.deepEqual(restoreCart(raw).items, { 'straight-cut-fries': 1, 'pub-burger': 1 });
});

test('search combines with category and ignores case and surrounding spaces', () => {
  assert.deepEqual(filterMenu('  BEYOND  ', 'Grill Main').map((item) => item.id), ['beyond-burger-patty']);
  assert.equal(filterMenu('beyond', 'Beverages').length, 0);
  assert.equal(filterMenu('', 'All').length, 22);
  assert.equal(filterMenu('does not exist', 'All').length, 0);
});

// Boundary-value tests for setQuantity (ICA 10, Worksheet 3).
// Rule: a quantity is kept between 0 and the swipes left for that item's type.

test('setQuantity boundary: zero and negative quantities remove the item, one keeps it', () => {
  const cart = cartWith(2, { 'pub-burger': 1 });
  assert.deepEqual(setQuantity(cart, 'pub-burger', -1).items, {});
  assert.deepEqual(setQuantity(cart, 'pub-burger', 0).items, {});
  assert.deepEqual(setQuantity(cart, 'pub-burger', 1).items, { 'pub-burger': 1 });
});

test('setQuantity boundary: quantities just below, at, and just above the swipe count', () => {
  const cart = cartWith(3, {});
  assert.equal(setQuantity(cart, 'pub-burger', 2).items['pub-burger'], 2);
  assert.equal(setQuantity(cart, 'pub-burger', 3).items['pub-burger'], 3);
  assert.equal(setQuantity(cart, 'pub-burger', 4).items['pub-burger'], 3);
});

test('setQuantity boundary: other items of the same type shrink the allowance', () => {
  const cart = cartWith(3, { 'pub-burger': 2 });
  assert.equal(setQuantity(cart, 'chicken-tenders', 1).items['chicken-tenders'], 1);
  assert.equal(setQuantity(cart, 'chicken-tenders', 2).items['chicken-tenders'], 1);

  const full = cartWith(3, { 'pub-burger': 3 });
  assert.deepEqual(setQuantity(full, 'chicken-tenders', 1).items, { 'pub-burger': 3 });
});

test('setQuantity boundary: an item does not count against its own allowance', () => {
  const cart = cartWith(2, { 'pub-burger': 2 });
  assert.equal(setQuantity(cart, 'pub-burger', 2).items['pub-burger'], 2);
  assert.equal(setQuantity(cart, 'pub-burger', 3).items['pub-burger'], 2);
});

test('setQuantity boundary: MAX_SWIPES is reachable but cannot be exceeded', () => {
  const cart = cartWith(MAX_SWIPES, {});
  assert.equal(setQuantity(cart, 'pub-burger', MAX_SWIPES).items['pub-burger'], MAX_SWIPES);
  assert.equal(setQuantity(cart, 'pub-burger', MAX_SWIPES + 1).items['pub-burger'], MAX_SWIPES);
});

test('empty cart has zero counts and no line items', () => {
  const summary = getCartSummary(cartWith(1, {}));
  assert.deepEqual(summary, { items: [], count: 0, counts: { Entry: 0, Side: 0, Drink: 0 }, swipes: 1 });
});
